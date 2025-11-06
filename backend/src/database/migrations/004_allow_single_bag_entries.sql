-- ================================================
-- Migration: Allow Single Bag Entries
-- ================================================
-- Modifies pellet_stock table to support both pallet-based
-- and individual bag entries without requiring pallets
-- ================================================

-- First, drop dependent views
DROP VIEW IF EXISTS v_stock_projection CASCADE;
DROP VIEW IF EXISTS v_recent_consumption CASCADE;
DROP VIEW IF EXISTS v_consumption_stats CASCADE;
DROP VIEW IF EXISTS v_current_stock CASCADE;

-- Drop existing calculated columns
ALTER TABLE pellet_stock
    DROP COLUMN IF EXISTS total_bags CASCADE,
    DROP COLUMN IF EXISTS total_weight_kg CASCADE,
    DROP COLUMN IF EXISTS total_weight_tons CASCADE;

-- Make num_pallets nullable and add direct bag count option
ALTER TABLE pellet_stock
    ALTER COLUMN num_pallets DROP NOT NULL,
    ALTER COLUMN num_pallets DROP DEFAULT,
    ADD COLUMN IF NOT EXISTS num_bags INTEGER CHECK (num_bags > 0);

-- Add constraint: must have either num_pallets or num_bags (but not both null)
ALTER TABLE pellet_stock
    ADD CONSTRAINT check_pallets_or_bags
    CHECK (num_pallets IS NOT NULL OR num_bags IS NOT NULL);

-- Recreate calculated columns with new logic
-- If num_bags is provided directly, use it; otherwise calculate from pallets
ALTER TABLE pellet_stock
    ADD COLUMN total_bags INTEGER
        GENERATED ALWAYS AS (
            COALESCE(num_bags, num_pallets * bags_per_pallet)
        ) STORED,
    ADD COLUMN total_weight_kg DECIMAL(12, 2)
        GENERATED ALWAYS AS (
            COALESCE(num_bags, num_pallets * bags_per_pallet) * weight_per_bag
        ) STORED,
    ADD COLUMN total_weight_tons DECIMAL(12, 3)
        GENERATED ALWAYS AS (
            (COALESCE(num_bags, num_pallets * bags_per_pallet) * weight_per_bag) / 1000.0
        ) STORED;

-- Update the schema to make bags_per_pallet nullable (not needed when entering bags directly)
ALTER TABLE pellet_stock
    ALTER COLUMN bags_per_pallet DROP NOT NULL;

COMMENT ON COLUMN pellet_stock.num_pallets IS 'Number of pallets purchased (optional if num_bags is provided)';
COMMENT ON COLUMN pellet_stock.num_bags IS 'Direct number of bags purchased (optional if num_pallets is provided)';
COMMENT ON COLUMN pellet_stock.bags_per_pallet IS 'Bags per pallet (required when using num_pallets, optional otherwise)';

-- Recreate views with updated logic
-- View: Current Stock Summary
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
