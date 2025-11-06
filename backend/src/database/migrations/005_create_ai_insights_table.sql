-- Migration 005: Create ai_insights table for storing generated insights
-- Description: Store AI-generated insights with caching to reduce API calls
-- Created: 2025-11-06

-- ============================================================================
-- TABLE: ai_insights
-- Purpose: Cache AI-generated insights to reduce OpenAI API usage
-- ============================================================================

CREATE TABLE IF NOT EXISTS ai_insights (
  id SERIAL PRIMARY KEY,

  -- Metadata
  data_period VARCHAR(50) NOT NULL,           -- e.g., "Last 30 days"
  sample_count INTEGER NOT NULL,              -- Number of data points analyzed

  -- Insight content (stored as JSON for flexibility)
  insights JSONB NOT NULL,                    -- Array of insight objects
  summary TEXT,                               -- Overall summary text

  -- Context used for generation
  product_id INTEGER,                         -- NULL for global insights
  days_analyzed INTEGER DEFAULT 30,           -- Days of data analyzed

  -- Timestamps
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP WITH TIME ZONE,        -- Optional expiration time

  -- Status
  is_active BOOLEAN DEFAULT true              -- Soft delete flag
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_ai_insights_generated_at
  ON ai_insights(generated_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_insights_product_id
  ON ai_insights(product_id) WHERE product_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ai_insights_active
  ON ai_insights(is_active, generated_at DESC) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_ai_insights_expires_at
  ON ai_insights(expires_at) WHERE expires_at IS NOT NULL;

-- Composite index for fetching latest active insights
CREATE INDEX IF NOT EXISTS idx_ai_insights_latest
  ON ai_insights(is_active, product_id, days_analyzed, generated_at DESC);

COMMENT ON TABLE ai_insights IS 'Cached AI-generated insights from OpenAI';
COMMENT ON COLUMN ai_insights.insights IS 'Array of insight objects in JSON format';
COMMENT ON COLUMN ai_insights.summary IS 'Overall summary of market conditions';
COMMENT ON COLUMN ai_insights.product_id IS 'Specific product ID or NULL for global insights';
COMMENT ON COLUMN ai_insights.generated_at IS 'When insights were generated';
COMMENT ON COLUMN ai_insights.expires_at IS 'Optional expiration timestamp for cache invalidation';
COMMENT ON COLUMN ai_insights.is_active IS 'Soft delete flag for deactivating old insights';

-- ============================================================================
-- FUNCTION: Get latest active insights
-- ============================================================================

CREATE OR REPLACE FUNCTION get_latest_insights(
  p_product_id INTEGER DEFAULT NULL,
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  id INTEGER,
  insights JSONB,
  summary TEXT,
  data_period VARCHAR(50),
  sample_count INTEGER,
  generated_at TIMESTAMP WITH TIME ZONE,
  days_analyzed INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ai.id,
    ai.insights,
    ai.summary,
    ai.data_period,
    ai.sample_count,
    ai.generated_at,
    ai.days_analyzed
  FROM ai_insights ai
  WHERE ai.is_active = true
    AND (p_product_id IS NULL AND ai.product_id IS NULL OR ai.product_id = p_product_id)
    AND ai.days_analyzed = p_days
    AND (ai.expires_at IS NULL OR ai.expires_at > CURRENT_TIMESTAMP)
  ORDER BY ai.generated_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_latest_insights IS 'Get the most recent active insights for given parameters';

-- ============================================================================
-- FUNCTION: Cleanup expired insights
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_expired_insights()
RETURNS INTEGER AS $$
DECLARE
  rows_updated INTEGER;
BEGIN
  UPDATE ai_insights
  SET is_active = false
  WHERE expires_at IS NOT NULL
    AND expires_at <= CURRENT_TIMESTAMP
    AND is_active = true;

  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  RETURN rows_updated;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_expired_insights IS 'Deactivate insights that have passed their expiration time';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

SELECT 'Migration 005 completed successfully' as status;
SELECT 'Table created: ai_insights' as info;
SELECT 'Function created: get_latest_insights()' as info;
SELECT 'Function created: cleanup_expired_insights()' as info;
