-- ============================================
-- Migration: Add Heating Equipment Monitoring Tables
-- ============================================
-- Description: Tables for heating equipment monitoring (inspired by Centrometal portal)
-- Created: 2025-11-09
-- ============================================

-- ============================================
-- HEATING EQUIPMENT TABLE
-- ============================================

-- Main table for heating equipment (boilers, pellet stoves, etc.)
CREATE TABLE IF NOT EXISTS heating_equipment (
    id SERIAL PRIMARY KEY,

    -- Equipment details
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100) NOT NULL, -- 'boiler', 'pellet_stove', 'furnace', etc.
    brand VARCHAR(100),
    model VARCHAR(100),
    location VARCHAR(255),

    -- Installation details
    installation_date DATE,
    serial_number VARCHAR(100) UNIQUE,

    -- Connection status
    is_connected BOOLEAN NOT NULL DEFAULT false,
    last_connection TIMESTAMPTZ,

    -- Additional metadata
    metadata JSONB,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_heating_equipment_type ON heating_equipment(type);
CREATE INDEX IF NOT EXISTS idx_heating_equipment_connected ON heating_equipment(is_connected);
CREATE INDEX IF NOT EXISTS idx_heating_equipment_metadata ON heating_equipment USING GIN (metadata);

COMMENT ON TABLE heating_equipment IS 'Stores heating equipment information (boilers, stoves, furnaces)';

-- ============================================
-- EQUIPMENT STATUS TABLE
-- ============================================

-- Real-time status metrics (like Centrometal dashboard)
CREATE TABLE IF NOT EXISTS equipment_status (
    id SERIAL PRIMARY KEY,
    equipment_id INTEGER NOT NULL REFERENCES heating_equipment(id) ON DELETE CASCADE,

    -- Timestamp
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Burner metrics (in minutes)
    burner_work_min INTEGER,
    burner_starts_count INTEGER,
    feeder_work_min INTEGER,
    flame_duration_min INTEGER,
    fan_work_min INTEGER,

    -- Temperature readings (in Celsius)
    boiler_temp DECIMAL(5, 2),
    flue_gas_temp DECIMAL(5, 2),
    room_temp DECIMAL(5, 2),
    target_temp DECIMAL(5, 2),

    -- Power/consumption
    power_level INTEGER CHECK (power_level >= 0 AND power_level <= 100),
    fuel_consumption_kg DECIMAL(10, 2),

    -- Operational state
    is_running BOOLEAN NOT NULL DEFAULT false,
    work_phase VARCHAR(50), -- 'heating', 'idle', 'ignition', 'shutdown', etc.

    -- Additional metrics
    metrics JSONB,

    CONSTRAINT valid_burner_work CHECK (burner_work_min IS NULL OR burner_work_min >= 0),
    CONSTRAINT valid_starts CHECK (burner_starts_count IS NULL OR burner_starts_count >= 0)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_equipment_status_equipment_id ON equipment_status(equipment_id);
CREATE INDEX IF NOT EXISTS idx_equipment_status_timestamp ON equipment_status(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_equipment_status_composite ON equipment_status(equipment_id, timestamp DESC);

COMMENT ON TABLE equipment_status IS 'Real-time status metrics for heating equipment';

-- ============================================
-- EQUIPMENT PARAMETERS TABLE
-- ============================================

-- Operational parameters history
CREATE TABLE IF NOT EXISTS equipment_parameters (
    id SERIAL PRIMARY KEY,
    equipment_id INTEGER NOT NULL REFERENCES heating_equipment(id) ON DELETE CASCADE,

    -- Timestamp
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Parameter details
    parameter_name VARCHAR(255) NOT NULL,
    work_phase VARCHAR(50),
    description TEXT,
    value VARCHAR(255),
    unit VARCHAR(50),

    -- Time tracking
    time_on_regulator INTEGER, -- minutes
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,

    -- Additional data
    data JSONB
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_equipment_parameters_equipment_id ON equipment_parameters(equipment_id);
CREATE INDEX IF NOT EXISTS idx_equipment_parameters_timestamp ON equipment_parameters(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_equipment_parameters_name ON equipment_parameters(parameter_name);
CREATE INDEX IF NOT EXISTS idx_equipment_parameters_composite ON equipment_parameters(equipment_id, timestamp DESC);

COMMENT ON TABLE equipment_parameters IS 'Operational parameters and work phase history';

-- ============================================
-- EQUIPMENT ALERTS TABLE
-- ============================================

-- Errors, warnings, and information log
CREATE TABLE IF NOT EXISTS equipment_alerts (
    id SERIAL PRIMARY KEY,
    equipment_id INTEGER NOT NULL REFERENCES heating_equipment(id) ON DELETE CASCADE,

    -- Timestamp
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Alert details
    type VARCHAR(20) NOT NULL CHECK (type IN ('error', 'warning', 'info')),
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low', 'info')),
    code VARCHAR(50), -- Error/warning code
    message TEXT NOT NULL,
    description TEXT,

    -- Status
    acknowledged BOOLEAN NOT NULL DEFAULT false,
    acknowledged_at TIMESTAMPTZ,
    acknowledged_by VARCHAR(100),

    -- Resolution
    resolved BOOLEAN NOT NULL DEFAULT false,
    resolved_at TIMESTAMPTZ,
    resolution_notes TEXT,

    -- Additional data
    metadata JSONB
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_equipment_alerts_equipment_id ON equipment_alerts(equipment_id);
CREATE INDEX IF NOT EXISTS idx_equipment_alerts_timestamp ON equipment_alerts(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_equipment_alerts_type ON equipment_alerts(type);
CREATE INDEX IF NOT EXISTS idx_equipment_alerts_severity ON equipment_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_equipment_alerts_unresolved ON equipment_alerts(resolved) WHERE resolved = false;
CREATE INDEX IF NOT EXISTS idx_equipment_alerts_composite ON equipment_alerts(equipment_id, timestamp DESC);

COMMENT ON TABLE equipment_alerts IS 'Errors, warnings, and information alerts from heating equipment';

-- ============================================
-- VIEWS FOR COMMON QUERIES
-- ============================================

-- Latest status per equipment
CREATE OR REPLACE VIEW latest_equipment_status AS
SELECT DISTINCT ON (equipment_id)
    es.id,
    es.equipment_id,
    he.name AS equipment_name,
    he.type AS equipment_type,
    es.timestamp,
    es.burner_work_min,
    es.burner_starts_count,
    es.feeder_work_min,
    es.flame_duration_min,
    es.fan_work_min,
    es.boiler_temp,
    es.flue_gas_temp,
    es.room_temp,
    es.target_temp,
    es.power_level,
    es.fuel_consumption_kg,
    es.is_running,
    es.work_phase
FROM equipment_status es
JOIN heating_equipment he ON es.equipment_id = he.id
ORDER BY es.equipment_id, es.timestamp DESC;

COMMENT ON VIEW latest_equipment_status IS 'Most recent status for each heating equipment';

-- Daily equipment statistics
CREATE OR REPLACE VIEW daily_equipment_stats AS
SELECT
    DATE(timestamp) AS date,
    equipment_id,
    COUNT(*) AS reading_count,
    AVG(burner_work_min) AS avg_burner_work,
    MAX(burner_starts_count) AS total_starts,
    AVG(boiler_temp) AS avg_boiler_temp,
    AVG(room_temp) AS avg_room_temp,
    SUM(fuel_consumption_kg) AS total_fuel_consumption
FROM equipment_status
GROUP BY DATE(timestamp), equipment_id
ORDER BY date DESC, equipment_id;

COMMENT ON VIEW daily_equipment_stats IS 'Daily aggregated statistics per equipment';

-- Equipment alert summary
CREATE OR REPLACE VIEW equipment_alert_summary AS
SELECT
    equipment_id,
    type,
    severity,
    COUNT(*) AS alert_count,
    COUNT(*) FILTER (WHERE resolved = false) AS unresolved_count,
    MAX(timestamp) AS last_alert
FROM equipment_alerts
GROUP BY equipment_id, type, severity
ORDER BY equipment_id, severity DESC, type;

COMMENT ON VIEW equipment_alert_summary IS 'Alert summary by equipment, type, and severity';

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to get equipment uptime
CREATE OR REPLACE FUNCTION get_equipment_uptime(
    p_equipment_id INTEGER,
    p_days INTEGER DEFAULT 7
)
RETURNS TABLE (
    date DATE,
    total_runtime_hours DECIMAL,
    burner_starts INTEGER,
    avg_temp DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        DATE(timestamp) AS date,
        ROUND((MAX(burner_work_min) / 60.0)::NUMERIC, 2) AS total_runtime_hours,
        MAX(burner_starts_count) AS burner_starts,
        ROUND(AVG(boiler_temp)::NUMERIC, 2) AS avg_temp
    FROM equipment_status
    WHERE equipment_id = p_equipment_id
        AND timestamp >= NOW() - (p_days || ' days')::INTERVAL
    GROUP BY DATE(timestamp)
    ORDER BY date DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_equipment_uptime IS 'Returns daily uptime statistics for equipment';

-- Function to detect equipment issues
CREATE OR REPLACE FUNCTION detect_equipment_issues(
    p_equipment_id INTEGER
)
RETURNS TABLE (
    issue_type VARCHAR,
    issue_description TEXT,
    detected_at TIMESTAMPTZ,
    severity VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    -- Check for recent critical alerts
    SELECT
        'critical_alert'::VARCHAR AS issue_type,
        'Critical alert: ' || message AS issue_description,
        timestamp AS detected_at,
        severity
    FROM equipment_alerts
    WHERE equipment_id = p_equipment_id
        AND resolved = false
        AND severity IN ('critical', 'high')
        AND timestamp >= NOW() - INTERVAL '24 hours'

    UNION ALL

    -- Check for connection issues
    SELECT
        'connection_lost'::VARCHAR AS issue_type,
        'Equipment not connected' AS issue_description,
        last_connection AS detected_at,
        'high'::VARCHAR AS severity
    FROM heating_equipment
    WHERE id = p_equipment_id
        AND is_connected = false
        AND last_connection IS NOT NULL

    ORDER BY detected_at DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION detect_equipment_issues IS 'Detects potential issues with heating equipment';

-- ============================================
-- SAMPLE DATA (for testing)
-- ============================================

-- Insert sample equipment
INSERT INTO heating_equipment (
    name,
    type,
    brand,
    model,
    location,
    installation_date,
    is_connected,
    last_connection
) VALUES
    ('Main Boiler', 'boiler', 'Centrometal', 'PelTec-32', 'Basement', '2023-01-15', true, NOW()),
    ('Living Room Stove', 'pellet_stove', 'Centrometal', 'CentroPelet Z12', 'Living Room', '2023-06-20', true, NOW()),
    ('Garage Heater', 'furnace', 'Generic', 'Model-X', 'Garage', '2022-11-01', false, NOW() - INTERVAL '2 days')
ON CONFLICT DO NOTHING;

-- Insert sample status data
WITH equipment_ids AS (
    SELECT id FROM heating_equipment LIMIT 2
)
INSERT INTO equipment_status (
    equipment_id,
    timestamp,
    burner_work_min,
    burner_starts_count,
    feeder_work_min,
    flame_duration_min,
    fan_work_min,
    boiler_temp,
    room_temp,
    target_temp,
    power_level,
    is_running,
    work_phase
)
SELECT
    id,
    NOW() - (n || ' hours')::INTERVAL,
    120 + (n * 5),
    5 + n,
    110 + (n * 4),
    115 + (n * 5),
    125 + (n * 6),
    75.5 + (n * 0.5),
    21.0 + (n * 0.3),
    22.0,
    80,
    true,
    CASE WHEN n % 3 = 0 THEN 'heating' ELSE 'idle' END
FROM equipment_ids,
     generate_series(0, 23) AS n
ON CONFLICT DO NOTHING;

-- Insert sample alerts
WITH equipment_ids AS (
    SELECT id FROM heating_equipment LIMIT 1
)
INSERT INTO equipment_alerts (
    equipment_id,
    timestamp,
    type,
    severity,
    code,
    message,
    description,
    resolved
)
SELECT
    id,
    NOW() - (n || ' hours')::INTERVAL,
    CASE n % 3
        WHEN 0 THEN 'error'
        WHEN 1 THEN 'warning'
        ELSE 'info'
    END,
    CASE n % 3
        WHEN 0 THEN 'high'
        WHEN 1 THEN 'medium'
        ELSE 'low'
    END,
    'E' || LPAD(n::TEXT, 3, '0'),
    'Sample ' || CASE n % 3 WHEN 0 THEN 'error' WHEN 1 THEN 'warning' ELSE 'info' END || ' message #' || n,
    'This is a test alert for development purposes',
    n > 5
FROM equipment_ids,
     generate_series(1, 10) AS n
ON CONFLICT DO NOTHING;

-- ============================================
-- UPDATE TRIGGER FOR updated_at
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for heating_equipment
CREATE TRIGGER update_heating_equipment_updated_at
    BEFORE UPDATE ON heating_equipment
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- COMPLETION MESSAGE
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '✅ Heating equipment migration completed successfully';
    RAISE NOTICE '📊 Tables created: heating_equipment, equipment_status, equipment_parameters, equipment_alerts';
    RAISE NOTICE '📈 Views created: latest_equipment_status, daily_equipment_stats, equipment_alert_summary';
    RAISE NOTICE '🔧 Functions created: get_equipment_uptime, detect_equipment_issues';
    RAISE NOTICE '💾 Sample data inserted for testing';
    RAISE NOTICE '🔥 Ready for heating equipment monitoring!';
END $$;
