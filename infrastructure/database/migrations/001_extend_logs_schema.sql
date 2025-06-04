-- Migration: Extend logs schema with comprehensive security fields
-- Version: 001
-- Description: Add 100+ fields to support 50+ security use cases
-- Created: 2025-01-04

BEGIN;

-- Check if migration has already been applied
CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(50) PRIMARY KEY,
    applied_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    description TEXT
);

-- Check if this migration has already been applied
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM schema_migrations WHERE version = '001_extend_logs_schema') THEN
        RAISE NOTICE 'Migration 001_extend_logs_schema already applied, skipping';
        RETURN;
    END IF;
END $$;

-- Apply the extended schema
\i '/Users/ian/Scripts/SecureWatch/infrastructure/database/extended_schema.sql'

-- Run the migration function to update existing data
SELECT migrate_existing_logs_to_extended_schema();

-- Record the migration
INSERT INTO schema_migrations (version, description) 
VALUES ('001_extend_logs_schema', 'Extended logs schema with comprehensive security fields for 50+ use cases');

COMMIT;

-- Verify the migration
DO $$
DECLARE
    column_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO column_count 
    FROM information_schema.columns 
    WHERE table_name = 'logs' 
    AND table_schema = 'public';
    
    RAISE NOTICE 'Migration completed successfully. Logs table now has % columns', column_count;
    
    -- Verify key indexes exist
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_logs_threat_indicator') THEN
        RAISE NOTICE 'Threat intelligence indexes created successfully';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_logs_anomaly_score') THEN
        RAISE NOTICE 'Anomaly detection indexes created successfully';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_logs_attack_technique') THEN
        RAISE NOTICE 'MITRE ATT&CK indexes created successfully';
    END IF;
END $$;