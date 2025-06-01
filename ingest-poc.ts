import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

// --- Database Connection Details (Modify as needed) ---
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'eventlog_db',
  password: process.env.DB_PASSWORD || 'password',
  port: parseInt(process.env.DB_PORT || '5432', 10),
});

// --- Define the structure of our normalized event (matches events table) ---
interface NormalizedEvent {
  timestamp: string;
  event_source_name: string;
  event_type_id: string;
  hostname?: string;
  ip_address?: string;
  user_id?: string;
  process_id?: number;
  process_name?: string;
  severity?: string;
  message_short?: string;
  message_full?: string;
  tags?: string[];
  parsed_fields: Record<string, any>;
  raw_log?: string;
}

// --- Normalization Function for Windows Events ---
function normalizeWinEvent(rawEvent: any): NormalizedEvent | null {
  if (!rawEvent || typeof rawEvent.Id === 'undefined' || !rawEvent.TimeCreated) {
    console.warn('Skipping invalid raw event:', rawEvent);
    return null;
  }

  const parsed_fields: Record<string, any> = {};
  if (rawEvent.Properties && Array.isArray(rawEvent.Properties)) {
    for (const prop of rawEvent.Properties) {
      if (prop && typeof prop.Name === 'string' && typeof prop.Value !== 'undefined') {
        parsed_fields[prop.Name] = prop.Value;
      }
    }
  } else if (rawEvent.EventData && typeof rawEvent.EventData === 'object') {
    // Handle cases where properties might be under EventData (common with some log shippers)
     for (const key in rawEvent.EventData) {
        parsed_fields[key] = rawEvent.EventData[key];
     }
  }


  const normalized: Partial<NormalizedEvent> = {
    timestamp: new Date(rawEvent.TimeCreated).toISOString(),
    event_source_name: 'Windows Security', // Or rawEvent.ProviderName
    event_type_id: String(rawEvent.Id),
    hostname: rawEvent.MachineName,
    message_short: rawEvent.Message?.substring(0, 255) || `Event ID ${rawEvent.Id}`,
    message_full: rawEvent.Message || undefined, // Ensure it's undefined if null/empty
    parsed_fields: parsed_fields,
    raw_log: JSON.stringify(rawEvent), // Store the original event as JSON string
  };

  // Event-specific normalization
  switch (rawEvent.Id) {
    case 4624: // Successful Logon
      normalized.user_id = parsed_fields.TargetUserName || undefined;
      normalized.ip_address = parsed_fields.IpAddress !== '-' ? parsed_fields.IpAddress : undefined;
      normalized.severity = 'Low';
      normalized.tags = ['authentication', 'windows', 'logon_success'];
      normalized.message_short = `Successful logon for ${normalized.user_id || 'unknown user'} from ${normalized.ip_address || 'unknown IP'}`;
      break;
    case 4625: // Failed Logon
      normalized.user_id = parsed_fields.TargetUserName || parsed_fields.SubjectUserName || undefined; // SubjectUserName if Target is empty
      normalized.ip_address = parsed_fields.IpAddress !== '-' ? parsed_fields.IpAddress : undefined;
      normalized.severity = 'Medium';
      normalized.tags = ['authentication', 'windows', 'logon_failure'];
      normalized.message_short = `Failed logon for ${normalized.user_id || 'unknown user'} from ${normalized.ip_address || 'unknown IP'}`;
      break;
    case 4688: // Process Create
      normalized.user_id = parsed_fields.SubjectUserName || undefined; // User who started the process
      normalized.process_name = parsed_fields.NewProcessName || parsed_fields.ProcessName || undefined;
      // ProcessId in Properties is often the Parent PID for 4688, NewProcessId is the actual new PID
      const newProcessId = parsed_fields.NewProcessId;
      if (newProcessId && !isNaN(parseInt(String(newProcessId), 16))) {
         normalized.process_id = parseInt(String(newProcessId), 16);
      } else if (parsed_fields.ProcessId && !isNaN(parseInt(String(parsed_fields.ProcessId),16)) && String(parsed_fields.NewProcessName).includes(String(rawEvent.ProcessId))) {
         // Fallback if NewProcessId is missing and ProcessId in properties seems to be the child
         // This is less reliable
      }

      // Ensure parent process name is captured if available
      if (parsed_fields.ParentProcessName) {
        normalized.parsed_fields.ParentProcessName = parsed_fields.ParentProcessName;
      } else if (rawEvent.ProcessName && rawEvent.ProcessId && normalized.process_name !== rawEvent.ProcessName) {
        // Sometimes the top-level ProcessName/ProcessId are the parent for 4688
        normalized.parsed_fields.ParentProcessName = rawEvent.ProcessName;
        normalized.parsed_fields.ParentProcessId = rawEvent.ProcessId;
      }


      normalized.severity = 'Information'; // Or 'Low' depending on policy
      normalized.tags = ['process', 'windows', 'process_create'];
      normalized.message_short = `Process ${normalized.process_name || 'unknown'} created by ${normalized.user_id || 'unknown user'}`;
      if (parsed_fields.CommandLine) {
        normalized.message_short += ` (Cmd: ${parsed_fields.CommandLine.substring(0,100)}${parsed_fields.CommandLine.length > 100 ? '...' : ''})`;
      }
      break;
    default:
      normalized.severity = 'Information';
      normalized.tags = ['windows', `event_id_${rawEvent.Id}`];
      break;
  }

  // Ensure default for message_full if it's undefined.
  if (typeof normalized.message_full === 'undefined' && normalized.message_short) {
    normalized.message_full = normalized.message_short;
  }


  return normalized as NormalizedEvent;
}

// --- Main Ingestion Logic ---
async function ingestEvents() {
  let client;
  try {
    const filePath = path.join(__dirname, 'sample-windows-events.json');
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const rawEvents: any[] = JSON.parse(fileContent);

    if (!Array.isArray(rawEvents)) {
      console.error('Error: sample-windows-events.json is not a JSON array.');
      return;
    }

    console.log(`Found ${rawEvents.length} events to process.`);

    client = await pool.connect();
    console.log('Connected to PostgreSQL.');

    for (const rawEvent of rawEvents) {
      const normalizedEvent = normalizeWinEvent(rawEvent);
      if (!normalizedEvent) {
        console.warn('Skipping event due to normalization failure:', rawEvent);
        continue;
      }

      const query = `
        INSERT INTO events (
          timestamp, event_source_name, event_type_id, hostname, ip_address,
          user_id, process_id, process_name, severity, message_short,
          message_full, tags, parsed_fields, raw_log
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
        ) RETURNING event_id;
      `;
      const values = [
        normalizedEvent.timestamp,
        normalizedEvent.event_source_name,
        normalizedEvent.event_type_id,
        normalizedEvent.hostname,
        normalizedEvent.ip_address, // Ensure this is null if undefined, INET type handles it
        normalizedEvent.user_id,
        normalizedEvent.process_id, // Ensure this is null if undefined
        normalizedEvent.process_name,
        normalizedEvent.severity,
        normalizedEvent.message_short,
        normalizedEvent.message_full,
        normalizedEvent.tags,
        normalizedEvent.parsed_fields,
        normalizedEvent.raw_log,
      ];

      try {
        const result = await client.query(query, values);
        console.log(`Inserted event ${normalizedEvent.event_type_id} for user ${normalizedEvent.user_id || 'N/A'}, event_id: ${result.rows[0].event_id}`);
      } catch (insertError) {
        console.error(`Error inserting event (ID: ${normalizedEvent.event_type_id}):`, insertError);
        console.error('Problematic event data:', JSON.stringify(normalizedEvent, null, 2));
      }
    }
    console.log('Finished processing all events.');

  } catch (error) {
    console.error('An error occurred during ingestion:', error);
  } finally {
    if (client) {
      client.release();
      console.log('Database client released.');
    }
    await pool.end();
    console.log('Database pool closed.');
  }
}

ingestEvents().catch(err => {
  console.error("Unhandled error in ingestEvents:", err);
  process.exit(1);
});
