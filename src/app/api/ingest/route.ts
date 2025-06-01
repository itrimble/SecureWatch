// src/app/api/ingest/route.ts
import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { normalizeEvent, NormalizedEvent } from '@/lib/log_normalizer';

// --- Database Connection Details (Use environment variables for production) ---
const pool = new Pool({
  user: process.env.PGUSER || 'eventlogger', // Corrected to PGUSER
  host: process.env.PGHOST || 'localhost',   // Corrected to PGHOST
  database: process.env.PGDATABASE || 'eventlog_dev', // Corrected to PGDATABASE
  password: process.env.PGPASSWORD || 'localdevpassword', // Corrected to PGPASSWORD
  port: parseInt(process.env.PGPORT || '5432', 10), // Corrected to PGPORT
});

interface IngestRequestBody {
  log_source_identifier: string;
  events: any[]; // Array of raw event objects/strings
}

export async function POST(request: Request) {
  let requestBody: IngestRequestBody;
  try {
    requestBody = await request.json();
  } catch (e) {
    console.error('[IngestAPI] Invalid JSON payload:', e);
    return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 });
  }

  const { log_source_identifier, events } = requestBody;

  if (!log_source_identifier || typeof log_source_identifier !== 'string') {
    return NextResponse.json({ error: 'Missing or invalid "log_source_identifier".' }, { status: 400 });
  }
  if (!events || !Array.isArray(events)) {
    return NextResponse.json({ error: 'Missing or invalid "events" array.' }, { status: 400 });
  }
  if (events.length === 0) {
    return NextResponse.json({ message: 'No events provided for ingestion.', successful: 0, failed: 0 }, { status: 200 });
  }

  console.log(`[IngestAPI] Received ${events.length} events for source: ${log_source_identifier}`);

  let successfulCount = 0;
  let failedCount = 0;
  const errors: { eventIndex: number, error: string, eventData?: string }[] = [];

  // Consider using a single client for a batch if transactions are needed,
  // or for performance with many inserts. For PoC, one query per event is fine.
  // For bulk inserts, pg library supports passing an array of arrays for values.
  // This would require collecting all normalized events first.

  for (let i = 0; i < events.length; i++) {
    const rawEvent = events[i];
    let normalizedEvent: NormalizedEvent | null = null;
    try {
      normalizedEvent = await normalizeEvent(rawEvent, log_source_identifier);

      if (normalizedEvent) {
        const query = `
          INSERT INTO events (
            timestamp, event_source_name, event_type_id, hostname, ip_address,
            user_id, process_id, process_name, severity, message_short,
            message_full, tags, parsed_fields, raw_log
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
          );`; // Removed RETURNING event_id for bulk, can add if needed per event

        const values = [
          normalizedEvent.timestamp,
          normalizedEvent.event_source_name,
          normalizedEvent.event_type_id,
          normalizedEvent.hostname || null,
          normalizedEvent.ip_address || null,
          normalizedEvent.user_id || null,
          normalizedEvent.process_id === undefined ? null : normalizedEvent.process_id, // Handle undefined for numeric
          normalizedEvent.process_name || null,
          normalizedEvent.severity || null,
          normalizedEvent.message_short || null,
          normalizedEvent.message_full || null,
          normalizedEvent.tags || null,
          normalizedEvent.parsed_fields || {}, // Ensure JSONB field is not null
          normalizedEvent.raw_log || null,
        ];

        try {
          await pool.query(query, values);
          successfulCount++;
        } catch (dbError: any) {
          failedCount++;
          const errorMsg = `DB insert error for event [${i}]: ${dbError.message}`;
          console.error(`[IngestAPI] ${errorMsg}`, dbError.stack);
          errors.push({ eventIndex: i, error: errorMsg, eventData: JSON.stringify(normalizedEvent).substring(0, 500) });
        }
      } else {
        failedCount++;
        const errorMsg = `Normalization failed for event [${i}] from source ${log_source_identifier}.`;
        console.warn(`[IngestAPI] ${errorMsg}`);
        errors.push({ eventIndex: i, error: errorMsg, eventData: JSON.stringify(rawEvent).substring(0, 500) });
      }
    } catch (normError: any) {
        // Catch errors from within normalizeEvent itself (e.g., unexpected structure)
        failedCount++;
        const errorMsg = `Critical normalization error for event [${i}]: ${normError.message}`;
        console.error(`[IngestAPI] ${errorMsg}`, normError.stack);
        errors.push({ eventIndex: i, error: errorMsg, eventData: JSON.stringify(rawEvent).substring(0, 500) });
    }
  }

  console.log(`[IngestAPI] Ingestion complete for source ${log_source_identifier}. Successful: ${successfulCount}, Failed: ${failedCount}`);

  if (failedCount > 0 && successfulCount === 0) {
    // All events failed
    return NextResponse.json({
        error: 'All events failed to ingest.',
        successful: successfulCount,
        failed: failedCount,
        failures: errors
    }, { status: 500 });
  }
  if (failedCount > 0) {
    // Partial success
    return NextResponse.json({
        message: 'Ingestion process completed with some failures.',
        successful: successfulCount,
        failed: failedCount,
        failures: errors
    }, { status: 207 }); // Multi-Status
  }

  return NextResponse.json({
    message: 'Ingestion process completed successfully.',
    successful: successfulCount,
    failed: failedCount
  }, { status: 201 }); // 201 Created if all successful
}

// Optional: Add a GET handler for testing or to indicate the endpoint exists
export async function GET() {
  return NextResponse.json({ message: 'Automated Data Ingestion API. Use POST with JSON payload: { "log_source_identifier": "source_type", "events": [rawEvent1, ...] }' });
}
