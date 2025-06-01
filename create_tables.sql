-- Ensure the TimescaleDB extension is enabled
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;

-- Create the events table
CREATE TABLE events (
    event_id UUID DEFAULT gen_random_uuid(),
    timestamp TIMESTAMPTZ NOT NULL,
    ingestion_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    event_source_name VARCHAR(255),
    event_type_id VARCHAR(100), -- e.g., 'Windows-Security-4624', 'Linux-Syslog-AuthFail', 'Firewall-ConnectionDrop'
    hostname VARCHAR(255),
    ip_address INET,
    user_id VARCHAR(255), -- Can be username, email, or a system ID
    process_id INTEGER,
    process_name VARCHAR(255),
    severity VARCHAR(50), -- e.g., 'Low', 'Medium', 'High', 'Critical', or numerical
    message_short TEXT, -- A brief summary of the event
    message_full TEXT, -- Detailed event message, potentially multi-line (nullable)
    tags TEXT[], -- For categorization like 'authentication', 'network', 'malware'
    parsed_fields JSONB, -- For structured fields extracted from logs, e.g., {"src_ip": "192.168.1.100", "dst_port": 80}
    raw_log TEXT, -- The original unprocessed log entry (nullable)
    PRIMARY KEY (event_id, timestamp)
);

-- Create indexes on key fields
-- TimescaleDB automatically creates an index on the time column ('timestamp') for hypertables.
-- However, creating it explicitly before hypertable conversion is also fine.
CREATE INDEX idx_events_timestamp ON events (timestamp DESC);

-- Indexes for common query filters
CREATE INDEX idx_events_event_source_name ON events (event_source_name);
CREATE INDEX idx_events_event_type_id ON events (event_type_id);
CREATE INDEX idx_events_hostname ON events (hostname);
CREATE INDEX idx_events_ip_address ON events (ip_address);
CREATE INDEX idx_events_user_id ON events (user_id);
CREATE INDEX idx_events_severity ON events (severity);
CREATE INDEX idx_events_process_name ON events (process_name);

-- GIN index for array column 'tags' for efficient searching of array elements
CREATE INDEX idx_events_tags ON events USING GIN (tags);

-- GIN index for JSONB column 'parsed_fields' for efficient querying of JSONB key/value pairs
CREATE INDEX idx_events_parsed_fields ON events USING GIN (parsed_fields);

-- Optional: Composite indexes if you frequently query by multiple columns together
-- Example: CREATE INDEX idx_events_source_type ON events (event_source_name, event_type_id);
-- Example: CREATE INDEX idx_events_host_timestamp ON events (hostname, timestamp DESC);


-- Convert the events table into a TimescaleDB hypertable
-- This will partition the data by the 'timestamp' column.
-- chunk_time_interval can be adjusted based on expected data volume and retention.
-- Default is 7 days. For high volume, a shorter interval like 1 day might be better.
SELECT create_hypertable('events', 'timestamp', chunk_time_interval => INTERVAL '1 day');

-- Optional: Add further TimescaleDB specific configurations if needed,
-- such as compression policies or data retention policies.
-- Example: Enable compression
-- ALTER TABLE events SET (timescaledb.compress, timescaledb.compress_segmentby = 'event_source_name');
-- SELECT add_compression_policy('events', INTERVAL '7 days');

-- Example: Data retention policy (drop chunks older than 90 days)
-- SELECT add_retention_policy('events', INTERVAL '90 days');

COMMENT ON TABLE events IS 'Table to store normalized security event logs.';
COMMENT ON COLUMN events.event_id IS 'Unique identifier for each event.';
COMMENT ON COLUMN events.timestamp IS 'Timestamp of when the event originally occurred.';
COMMENT ON COLUMN events.ingestion_time IS 'Timestamp of when the event was ingested into the system.';
COMMENT ON COLUMN events.event_source_name IS 'Name of the source system or log type (e.g., "WinEventLog", "Sysmon", "Suricata").';
COMMENT ON COLUMN events.event_type_id IS 'Specific event code or type from the source (e.g., "4624", "AuthFail", "ConnectionDrop").';
COMMENT ON COLUMN events.hostname IS 'Hostname of the machine where the event originated.';
COMMENT ON COLUMN events.ip_address IS 'Primary IP address associated with the event (source or destination).';
COMMENT ON COLUMN events.user_id IS 'User identity associated with the event.';
COMMENT ON COLUMN events.process_id IS 'Process ID associated with the event.';
COMMENT ON COLUMN events.process_name IS 'Name of the process associated with the event.';
COMMENT ON COLUMN events.severity IS 'Normalized severity of the event.';
COMMENT ON COLUMN events.message_short IS 'A short, human-readable summary of the event.';
COMMENT ON COLUMN events.message_full IS 'The full event message, possibly multi-line or with more details.';
COMMENT ON COLUMN events.tags IS 'Array of tags for event categorization and searching.';
COMMENT ON COLUMN events.parsed_fields IS 'JSONB object containing key-value pairs extracted from the log.';
COMMENT ON COLUMN events.raw_log IS 'The original, unprocessed log entry.';

-- Add a default value for message_full if it's not always provided
-- ALTER TABLE events ALTER COLUMN message_full SET DEFAULT ''; -- Or NULL if preferred and not set during table creation

-- Note: gen_random_uuid() requires pgcrypto extension, but often available.
-- If not, ensure pgcrypto is enabled or use another UUID generation method if your PostgreSQL version is older.
-- CREATE EXTENSION IF NOT EXISTS "pgcrypto"; -- (Usually not needed if gen_random_uuid() is available by default)

-- Consider permissions for users accessing this table
-- GRANT SELECT ON events TO read_only_user;
-- GRANT INSERT, SELECT, UPDATE, DELETE ON events TO read_write_user;

-- Vacuum analyze after creation and data loading is good practice
-- VACUUM ANALYZE events;
