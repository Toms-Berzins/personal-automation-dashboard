-- ================================================
-- Pellet/Granules Stock Tracking Database Schema
-- ================================================
-- This schema manages pellet inventory tracking including:
-- - Stock purchases (pallets, bags, weight)
-- - Weekly consumption logging
-- - Automated calculations for remaining stock
-- ================================================

-- Stock Purchases Table
-- Stores all pellet stock purchase records
CREATE TABLE IF NOT EXISTS pellet_stock (
    id SERIAL PRIMARY KEY,
    purchase_date DATE NOT NULL,
    num_pallets INTEGER NOT NULL CHECK (num_pallets > 0),
    bags_per_pallet INTEGER NOT NULL DEFAULT 65 CHECK (bags_per_pallet > 0),
    weight_per_bag DECIMAL(10, 2) NOT NULL DEFAULT 15.0 CHECK (weight_per_bag > 0),

    -- Calculated fields (automatically computed)
    total_bags INTEGER GENERATED ALWAYS AS (num_pallets * bags_per_pallet) STORED,
    total_weight_kg DECIMAL(12, 2) GENERATED ALWAYS AS (num_pallets * bags_per_pallet * weight_per_bag) STORED,
    total_weight_tons DECIMAL(12, 3) GENERATED ALWAYS AS ((num_pallets * bags_per_pallet * weight_per_bag) / 1000.0) STORED,

    -- Metadata
    notes TEXT,
    supplier VARCHAR(255),
    price_per_pallet DECIMAL(10, 2),
    total_cost DECIMAL(12, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Weekly Consumption Table
-- Logs weekly pellet usage for heating
CREATE TABLE IF NOT EXISTS pellet_consumption (
    id SERIAL PRIMARY KEY,
    week_year VARCHAR(10) NOT NULL UNIQUE, -- Format: "2025-W48"
    week_start_date DATE NOT NULL,
    week_end_date DATE NOT NULL,
    bags_used INTEGER NOT NULL CHECK (bags_used >= 0),

    -- Calculated weight (assumes 15kg per bag standard)
    weight_kg DECIMAL(10, 2) GENERATED ALWAYS AS (bags_used * 15.0) STORED,

    -- Optional manual override
    manual_weight_kg DECIMAL(10, 2),

    -- Additional context
    notes TEXT,
    temperature_avg DECIMAL(5, 2), -- Average temperature for the week (optional)
    heating_hours INTEGER, -- Hours heating system was active (optional)

    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_pellet_stock_purchase_date ON pellet_stock(purchase_date DESC);
CREATE INDEX IF NOT EXISTS idx_pellet_consumption_week ON pellet_consumption(week_year DESC);
CREATE INDEX IF NOT EXISTS idx_pellet_consumption_date ON pellet_consumption(week_start_date DESC);

-- View: Current Stock Summary
-- Provides real-time stock levels
CREATE OR REPLACE VIEW v_current_stock AS
SELECT
    COALESCE(SUM(ps.total_bags), 0) as total_purchased_bags,
    COALESCE(SUM(ps.total_weight_kg), 0) as total_purchased_kg,
    COALESCE(SUM(ps.total_weight_tons), 0) as total_purchased_tons,
    COALESCE(SUM(pc.bags_used), 0) as total_consumed_bags,
    COALESCE(SUM(COALESCE(pc.manual_weight_kg, pc.weight_kg)), 0) as total_consumed_kg,
    COALESCE(SUM(ps.total_bags), 0) - COALESCE(SUM(pc.bags_used), 0) as remaining_bags,
    COALESCE(SUM(ps.total_weight_kg), 0) - COALESCE(SUM(COALESCE(pc.manual_weight_kg, pc.weight_kg)), 0) as remaining_kg,
    (COALESCE(SUM(ps.total_weight_kg), 0) - COALESCE(SUM(COALESCE(pc.manual_weight_kg, pc.weight_kg)), 0)) / 1000.0 as remaining_tons,
    CASE
        WHEN COALESCE(SUM(ps.total_bags), 0) = 0 THEN 0
        ELSE ((COALESCE(SUM(ps.total_bags), 0) - COALESCE(SUM(pc.bags_used), 0))::DECIMAL / COALESCE(SUM(ps.total_bags), 1)::DECIMAL * 100)
    END as stock_percentage
FROM pellet_stock ps
LEFT JOIN pellet_consumption pc ON 1=1;

-- View: Consumption Statistics
-- Provides analytics on consumption patterns
CREATE OR REPLACE VIEW v_consumption_stats AS
SELECT
    COUNT(*) as total_weeks_logged,
    COALESCE(AVG(bags_used), 0) as avg_bags_per_week,
    COALESCE(MIN(bags_used), 0) as min_bags_per_week,
    COALESCE(MAX(bags_used), 0) as max_bags_per_week,
    COALESCE(SUM(bags_used), 0) as total_bags_consumed,
    COALESCE(AVG(COALESCE(manual_weight_kg, weight_kg)), 0) as avg_kg_per_week,
    COALESCE(SUM(COALESCE(manual_weight_kg, weight_kg)), 0) as total_kg_consumed
FROM pellet_consumption;

-- View: Stock Projection
-- Estimates when stock will run out based on average consumption
CREATE OR REPLACE VIEW v_stock_projection AS
SELECT
    cs.remaining_bags,
    cs.remaining_kg,
    cs.stock_percentage,
    cst.avg_bags_per_week,
    CASE
        WHEN cst.avg_bags_per_week > 0
        THEN ROUND(cs.remaining_bags / cst.avg_bags_per_week, 1)
        ELSE NULL
    END as estimated_weeks_remaining,
    CASE
        WHEN cst.avg_bags_per_week > 0
        THEN CURRENT_DATE + (cs.remaining_bags / cst.avg_bags_per_week * 7)::INTEGER
        ELSE NULL
    END as estimated_depletion_date,
    CASE
        WHEN cs.stock_percentage > 50 THEN 'good'
        WHEN cs.stock_percentage > 20 THEN 'low'
        WHEN cs.stock_percentage > 0 THEN 'critical'
        ELSE 'empty'
    END as stock_status
FROM v_current_stock cs
CROSS JOIN v_consumption_stats cst;

-- View: Recent Consumption History
-- Last 12 weeks of consumption data
CREATE OR REPLACE VIEW v_recent_consumption AS
SELECT
    id,
    week_year,
    week_start_date,
    week_end_date,
    bags_used,
    COALESCE(manual_weight_kg, weight_kg) as weight_kg,
    notes,
    temperature_avg,
    created_at
FROM pellet_consumption
ORDER BY week_start_date DESC
LIMIT 12;

-- Function: Get consumption for a specific month
CREATE OR REPLACE FUNCTION get_monthly_consumption(target_year INTEGER, target_month INTEGER)
RETURNS TABLE (
    week_year VARCHAR(10),
    week_start_date DATE,
    bags_used INTEGER,
    weight_kg DECIMAL(10, 2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        pc.week_year,
        pc.week_start_date,
        pc.bags_used,
        COALESCE(pc.manual_weight_kg, pc.weight_kg) as weight_kg
    FROM pellet_consumption pc
    WHERE EXTRACT(YEAR FROM pc.week_start_date) = target_year
      AND EXTRACT(MONTH FROM pc.week_start_date) = target_month
    ORDER BY pc.week_start_date;
END;
$$ LANGUAGE plpgsql;

-- Function: Calculate stock after a specific date
CREATE OR REPLACE FUNCTION get_stock_at_date(check_date DATE)
RETURNS TABLE (
    remaining_bags BIGINT,
    remaining_kg NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(SUM(ps.total_bags), 0) - COALESCE(SUM(pc.bags_used), 0) as remaining_bags,
        COALESCE(SUM(ps.total_weight_kg), 0) - COALESCE(SUM(COALESCE(pc.manual_weight_kg, pc.weight_kg)), 0) as remaining_kg
    FROM pellet_stock ps
    LEFT JOIN pellet_consumption pc ON pc.week_start_date <= check_date
    WHERE ps.purchase_date <= check_date;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Update timestamp on modification
CREATE OR REPLACE FUNCTION update_modified_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER pellet_stock_updated
    BEFORE UPDATE ON pellet_stock
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_timestamp();

CREATE TRIGGER pellet_consumption_updated
    BEFORE UPDATE ON pellet_consumption
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_timestamp();

-- Insert sample data for testing (optional - remove in production)
-- INSERT INTO pellet_stock (purchase_date, num_pallets, bags_per_pallet, weight_per_bag, notes, supplier, price_per_pallet, total_cost)
-- VALUES
--     ('2024-11-01', 3, 65, 15.0, 'Initial winter stock purchase', 'Local Supplier A', 325.00, 975.00),
--     ('2024-12-15', 2, 65, 15.0, 'Additional stock for peak winter', 'Local Supplier A', 330.00, 660.00);

-- INSERT INTO pellet_consumption (week_year, week_start_date, week_end_date, bags_used, temperature_avg, notes)
-- VALUES
--     ('2024-W45', '2024-11-04', '2024-11-10', 6, 8.5, 'Mild weather, minimal heating'),
--     ('2024-W46', '2024-11-11', '2024-11-17', 8, 5.2, 'Temperature drop, increased usage'),
--     ('2024-W47', '2024-11-18', '2024-11-24', 7, 6.8, 'Normal usage'),
--     ('2024-W48', '2024-11-25', '2024-12-01', 9, 3.5, 'Cold week, high consumption');

-- Permissions (adjust based on your user setup)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON pellet_stock TO dashboard_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON pellet_consumption TO dashboard_user;
-- GRANT SELECT ON v_current_stock, v_consumption_stats, v_stock_projection, v_recent_consumption TO dashboard_user;

COMMENT ON TABLE pellet_stock IS 'Stores pellet/granules stock purchase records with automatic weight calculations';
COMMENT ON TABLE pellet_consumption IS 'Logs weekly pellet consumption for heating system with analytics';
COMMENT ON VIEW v_current_stock IS 'Real-time view of current stock levels and remaining inventory';
COMMENT ON VIEW v_consumption_stats IS 'Statistical analysis of consumption patterns';
COMMENT ON VIEW v_stock_projection IS 'Projects when stock will run out based on average consumption';
