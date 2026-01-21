-- =============================================
-- Heater Data Tables
-- Stores Centrometal PelTec Lambda heater data
-- =============================================

-- Heater status snapshots (real-time data)
CREATE TABLE IF NOT EXISTS heater_status (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Operating State
    state VARCHAR(50) NOT NULL, -- OFF, S7-3, etc.
    is_live BOOLEAN DEFAULT false,

    -- Temperature Readings (°C)
    main_temperature DECIMAL(5, 2),
    supply_temperature DECIMAL(5, 2),
    return_temperature DECIMAL(5, 2),
    buffer_tank_temperature DECIMAL(5, 2),
    radiator_temperature DECIMAL(5, 2),
    external_temperature DECIMAL(5, 2),
    dhw_temperature DECIMAL(5, 2), -- Domestic hot water

    -- Fuel Status
    fuel_level_status VARCHAR(20), -- 'full', 'reserve', 'empty'
    oxygen_level DECIMAL(5, 2),

    -- Pump Status
    pump_p1_status BOOLEAN DEFAULT false, -- Main circulation
    pump_p2_status BOOLEAN DEFAULT false, -- Radiator circuit
    pump_p3_status BOOLEAN DEFAULT false, -- Buffer tank
    pump_p1_demand BOOLEAN DEFAULT false,
    pump_p2_demand BOOLEAN DEFAULT false,
    pump_p3_demand BOOLEAN DEFAULT false,

    -- Fan Status
    fan_status BOOLEAN DEFAULT false,

    -- System Configuration
    configuration_type INTEGER,
    installation_id VARCHAR(100),

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Heater statistics (cumulative data)
CREATE TABLE IF NOT EXISTS heater_statistics (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Burner Statistics
    burner_work_minutes DECIMAL(15, 4), -- Total burner operating time
    burner_start_count INTEGER, -- Number of burner starts
    fuel_consumed_kg DECIMAL(15, 3), -- Total fuel consumed in kg

    -- Component Working Times (minutes)
    pellet_accumulator_minutes DECIMAL(15, 4),
    fan_working_minutes DECIMAL(15, 4),
    vacuum_boiler_minutes DECIMAL(15, 4),
    vacuum_turbine_minutes DECIMAL(15, 4),
    vacuum_turbine_cycles INTEGER,

    -- State Times (minutes)
    time_on_state_01 DECIMAL(15, 4),
    time_on_state_02 DECIMAL(15, 4),
    time_on_state_03 DECIMAL(15, 4),
    time_on_state_04 DECIMAL(15, 4),
    time_on_state_05 DECIMAL(15, 4),
    time_on_state_06 DECIMAL(15, 4),

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Indexes for performance
    CONSTRAINT unique_timestamp UNIQUE (timestamp)
);

-- Heater events log (important events)
CREATE TABLE IF NOT EXISTS heater_events (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    event_type VARCHAR(50) NOT NULL, -- 'start', 'stop', 'error', 'alarm', 'fuel_low'
    event_data JSONB, -- Additional event details
    severity VARCHAR(20) DEFAULT 'info', -- 'info', 'warning', 'error', 'critical'
    message TEXT,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_heater_status_timestamp ON heater_status(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_heater_status_state ON heater_status(state);
CREATE INDEX IF NOT EXISTS idx_heater_statistics_timestamp ON heater_statistics(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_heater_events_timestamp ON heater_events(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_heater_events_type ON heater_events(event_type);
CREATE INDEX IF NOT EXISTS idx_heater_events_severity ON heater_events(severity);

-- View for latest heater status
CREATE OR REPLACE VIEW latest_heater_status AS
SELECT *
FROM heater_status
ORDER BY timestamp DESC
LIMIT 1;

-- View for latest statistics
CREATE OR REPLACE VIEW latest_heater_statistics AS
SELECT *
FROM heater_statistics
ORDER BY timestamp DESC
LIMIT 1;

-- View for combined heater dashboard data
CREATE OR REPLACE VIEW heater_dashboard_data AS
SELECT
    s.id as status_id,
    s.timestamp as status_timestamp,
    s.state,
    s.is_live,
    s.main_temperature,
    s.supply_temperature,
    s.return_temperature,
    s.buffer_tank_temperature,
    s.radiator_temperature,
    s.external_temperature,
    s.fuel_level_status,
    s.oxygen_level,
    s.pump_p1_status,
    s.pump_p2_status,
    s.pump_p3_status,
    s.fan_status,
    st.burner_work_minutes,
    st.burner_start_count,
    st.fuel_consumed_kg,
    st.fan_working_minutes
FROM latest_heater_status s
LEFT JOIN latest_heater_statistics st ON DATE(s.timestamp) = DATE(st.timestamp);

-- Comments for documentation
COMMENT ON TABLE heater_status IS 'Real-time heater operating status snapshots';
COMMENT ON TABLE heater_statistics IS 'Cumulative heater statistics and counters';
COMMENT ON TABLE heater_events IS 'Heater event log for monitoring and alerts';
COMMENT ON COLUMN heater_status.state IS 'Operating state: OFF, S7-3 (running), etc.';
COMMENT ON COLUMN heater_status.fuel_level_status IS 'Fuel level: full, reserve, empty';
COMMENT ON COLUMN heater_statistics.fuel_consumed_kg IS 'Total lifetime fuel consumption in kilograms';
