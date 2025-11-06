-- Migration 002: Create Consumption Tracking Tables
-- Description: Creates consumption_history table for tracking monthly granules usage
-- Created: 2025-10-27

-- ============================================================================
-- TABLE: consumption_history
-- Purpose: Track monthly granules consumption in kilograms
-- ============================================================================

CREATE TABLE IF NOT EXISTS consumption_history (
  id SERIAL PRIMARY KEY,
  consumption_date DATE NOT NULL,
  kg_consumed NUMERIC(10, 2) NOT NULL CHECK (kg_consumed >= 0),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_consumption_date UNIQUE(consumption_date)
);

-- Index for time-based queries
CREATE INDEX IF NOT EXISTS idx_consumption_date
  ON consumption_history(consumption_date DESC);

-- Index for consumption amount queries
CREATE INDEX IF NOT EXISTS idx_consumption_kg
  ON consumption_history(kg_consumed DESC);

COMMENT ON TABLE consumption_history IS 'Monthly granules consumption tracking';
COMMENT ON COLUMN consumption_history.consumption_date IS 'Date of consumption record (typically first day of month)';
COMMENT ON COLUMN consumption_history.kg_consumed IS 'Kilograms consumed in the period (must be >= 0)';
COMMENT ON COLUMN consumption_history.notes IS 'Optional notes about consumption (e.g., cold winter, vacation)';

-- ============================================================================
-- TRIGGER: Auto-update updated_at timestamp
-- ============================================================================

CREATE TRIGGER update_consumption_updated_at
  BEFORE UPDATE ON consumption_history
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- VIEWS: Analytical views for consumption data
-- ============================================================================

-- Monthly consumption summary
CREATE OR REPLACE VIEW monthly_consumption AS
SELECT
  DATE_TRUNC('month', consumption_date)::DATE as month,
  SUM(kg_consumed) as total_kg,
  AVG(kg_consumed) as avg_daily_kg,
  MAX(kg_consumed) as peak_kg,
  COUNT(*) as record_count
FROM consumption_history
GROUP BY DATE_TRUNC('month', consumption_date)
ORDER BY month DESC;

COMMENT ON VIEW monthly_consumption IS 'Monthly aggregated consumption statistics';

-- Yearly consumption summary
CREATE OR REPLACE VIEW yearly_consumption AS
SELECT
  EXTRACT(YEAR FROM consumption_date)::INTEGER as year,
  SUM(kg_consumed) as total_kg,
  AVG(kg_consumed) as avg_monthly_kg,
  MAX(kg_consumed) as peak_month_kg,
  MIN(kg_consumed) as lowest_month_kg,
  COUNT(*) as months_count
FROM consumption_history
GROUP BY EXTRACT(YEAR FROM consumption_date)
ORDER BY year DESC;

COMMENT ON VIEW yearly_consumption IS 'Yearly aggregated consumption statistics';

-- Seasonal consumption pattern (heating season vs non-heating season)
CREATE OR REPLACE VIEW seasonal_consumption AS
SELECT
  EXTRACT(YEAR FROM consumption_date)::INTEGER as year,
  CASE
    WHEN EXTRACT(MONTH FROM consumption_date) IN (10, 11, 12, 1, 2, 3, 4) THEN 'heating_season'
    ELSE 'non_heating_season'
  END as season,
  SUM(kg_consumed) as total_kg,
  AVG(kg_consumed) as avg_kg,
  COUNT(*) as months_count
FROM consumption_history
GROUP BY EXTRACT(YEAR FROM consumption_date), season
ORDER BY year DESC, season;

COMMENT ON VIEW seasonal_consumption IS 'Consumption patterns by heating season (Oct-Apr) vs summer (May-Sep)';

-- Recent consumption trend (last 12 months)
CREATE OR REPLACE VIEW recent_consumption_trend AS
SELECT
  consumption_date,
  kg_consumed,
  notes,
  AVG(kg_consumed) OVER (
    ORDER BY consumption_date
    ROWS BETWEEN 2 PRECEDING AND CURRENT ROW
  ) as moving_avg_3months
FROM consumption_history
WHERE consumption_date >= CURRENT_DATE - INTERVAL '12 months'
ORDER BY consumption_date DESC;

COMMENT ON VIEW recent_consumption_trend IS 'Last 12 months consumption with 3-month moving average';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

SELECT 'Migration 002 completed successfully' as status;
SELECT 'Tables created: consumption_history' as info;
SELECT 'Views created: monthly_consumption, yearly_consumption, seasonal_consumption, recent_consumption_trend' as info;
