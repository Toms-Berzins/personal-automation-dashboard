-- ============================================
-- Personal Automation Dashboard Database Schema
-- ============================================
-- Database: automation_db
-- Description: Stores scraped data from multiple tracking sections
-- Created: 2025-10-25
-- ============================================

-- Enable UUID extension for future use
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- GRANULES TRACKER TABLES
-- ============================================

-- Main table for granules/pellet price tracking
CREATE TABLE IF NOT EXISTS granules_prices (
    id SERIAL PRIMARY KEY,

    -- Timestamp fields
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Store/product information
    store VARCHAR(100) NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    brand VARCHAR(100),

    -- Price information
    price DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'EUR',
    unit VARCHAR(50) NOT NULL DEFAULT 'per_ton',
    quantity DECIMAL(10, 2),

    -- Availability
    in_stock BOOLEAN NOT NULL DEFAULT true,

    -- Source tracking
    url TEXT,

    -- Additional metadata (flexible JSON field)
    metadata JSONB,

    -- Constraints
    CONSTRAINT valid_price CHECK (price > 0),
    CONSTRAINT valid_quantity CHECK (quantity IS NULL OR quantity > 0)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_granules_timestamp ON granules_prices(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_granules_store ON granules_prices(store);
CREATE INDEX IF NOT EXISTS idx_granules_brand ON granules_prices(brand);
CREATE INDEX IF NOT EXISTS idx_granules_in_stock ON granules_prices(in_stock);
CREATE INDEX IF NOT EXISTS idx_granules_created_at ON granules_prices(created_at DESC);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_granules_store_timestamp
    ON granules_prices(store, timestamp DESC);

-- GIN index for JSONB metadata queries
CREATE INDEX IF NOT EXISTS idx_granules_metadata
    ON granules_prices USING GIN (metadata);

-- Comment on table
COMMENT ON TABLE granules_prices IS 'Tracks wood pellet/granule prices from multiple retailers over time';

-- ============================================
-- VIEWS FOR COMMON QUERIES
-- ============================================

-- Latest prices per store
CREATE OR REPLACE VIEW latest_granules_prices AS
SELECT DISTINCT ON (store, product_name)
    id,
    timestamp,
    store,
    product_name,
    brand,
    price,
    currency,
    unit,
    quantity,
    in_stock,
    url
FROM granules_prices
ORDER BY store, product_name, timestamp DESC;

COMMENT ON VIEW latest_granules_prices IS 'Shows the most recent price for each product at each store';

-- Monthly average prices
CREATE OR REPLACE VIEW monthly_average_prices AS
SELECT
    DATE_TRUNC('month', timestamp) AS month,
    store,
    brand,
    AVG(price) AS avg_price,
    MIN(price) AS min_price,
    MAX(price) AS max_price,
    COUNT(*) AS sample_count,
    currency,
    unit
FROM granules_prices
WHERE in_stock = true
GROUP BY DATE_TRUNC('month', timestamp), store, brand, currency, unit
ORDER BY month DESC, store, brand;

COMMENT ON VIEW monthly_average_prices IS 'Monthly price statistics by store and brand';

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to get price trend for a specific product
CREATE OR REPLACE FUNCTION get_price_trend(
    p_store VARCHAR,
    p_product VARCHAR,
    p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
    date DATE,
    price DECIMAL,
    in_stock BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        DATE(timestamp) AS date,
        AVG(price)::DECIMAL(10,2) AS price,
        BOOL_OR(in_stock) AS in_stock
    FROM granules_prices
    WHERE store = p_store
        AND product_name = p_product
        AND timestamp >= NOW() - (p_days || ' days')::INTERVAL
    GROUP BY DATE(timestamp)
    ORDER BY date DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_price_trend IS 'Returns daily price trend for a specific product';

-- Function to detect price drops
CREATE OR REPLACE FUNCTION detect_price_drops(
    p_threshold DECIMAL DEFAULT 5.0
)
RETURNS TABLE (
    store VARCHAR,
    product_name VARCHAR,
    old_price DECIMAL,
    new_price DECIMAL,
    drop_percentage DECIMAL,
    detected_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    WITH ranked_prices AS (
        SELECT
            gp.store,
            gp.product_name,
            gp.price,
            gp.timestamp,
            ROW_NUMBER() OVER (
                PARTITION BY gp.store, gp.product_name
                ORDER BY gp.timestamp DESC
            ) AS rn
        FROM granules_prices gp
        WHERE gp.in_stock = true
    ),
    latest AS (
        SELECT * FROM ranked_prices WHERE rn = 1
    ),
    previous AS (
        SELECT * FROM ranked_prices WHERE rn = 2
    )
    SELECT
        l.store,
        l.product_name,
        p.price AS old_price,
        l.price AS new_price,
        ROUND(((p.price - l.price) / p.price * 100)::NUMERIC, 2) AS drop_percentage,
        l.timestamp AS detected_at
    FROM latest l
    INNER JOIN previous p ON l.store = p.store AND l.product_name = p.product_name
    WHERE ((p.price - l.price) / p.price * 100) >= p_threshold
    ORDER BY drop_percentage DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION detect_price_drops IS 'Detects products with significant price drops';

-- ============================================
-- SCRAPER METADATA TABLE
-- ============================================

-- Track scraper runs for monitoring
CREATE TABLE IF NOT EXISTS scraper_runs (
    id SERIAL PRIMARY KEY,
    section_name VARCHAR(50) NOT NULL,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    status VARCHAR(20) NOT NULL CHECK (status IN ('running', 'completed', 'failed')),
    records_scraped INTEGER DEFAULT 0,
    records_saved INTEGER DEFAULT 0,
    error_message TEXT,
    metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_scraper_runs_section
    ON scraper_runs(section_name, started_at DESC);

COMMENT ON TABLE scraper_runs IS 'Tracks scraper execution history and performance';

-- ============================================
-- SAMPLE DATA (for testing)
-- ============================================

INSERT INTO granules_prices (
    timestamp,
    store,
    product_name,
    brand,
    price,
    currency,
    unit,
    quantity,
    in_stock,
    url,
    metadata
) VALUES
    (NOW() - INTERVAL '1 day', 'Store A', 'Premium Wood Pellets', 'Brand X', 299.99, 'EUR', 'per_ton', 1.0, true, 'https://storea.example.com/product1', '{"quality": "premium", "source": "test_data"}'),
    (NOW() - INTERVAL '1 day', 'Store B', 'Standard Wood Pellets', 'Brand Y', 285.50, 'EUR', 'per_ton', 1.0, true, 'https://storeb.example.com/product2', '{"quality": "standard", "source": "test_data"}'),
    (NOW() - INTERVAL '1 day', 'Store C', 'Economy Wood Pellets', 'Brand Z', 270.00, 'EUR', 'per_ton', 1.0, false, 'https://storec.example.com/product3', '{"quality": "economy", "source": "test_data"}'),
    (NOW(), 'Store A', 'Premium Wood Pellets', 'Brand X', 295.00, 'EUR', 'per_ton', 1.0, true, 'https://storea.example.com/product1', '{"quality": "premium", "source": "test_data"}'),
    (NOW(), 'Store B', 'Standard Wood Pellets', 'Brand Y', 280.00, 'EUR', 'per_ton', 1.0, true, 'https://storeb.example.com/product2', '{"quality": "standard", "source": "test_data"}'),
    (NOW(), 'Store C', 'Economy Wood Pellets', 'Brand Z', 265.00, 'EUR', 'per_ton', 1.0, true, 'https://storec.example.com/product3', '{"quality": "economy", "source": "test_data"}')
ON CONFLICT DO NOTHING;

-- ============================================
-- GRANT PERMISSIONS (if needed)
-- ============================================

-- Grant necessary permissions to application user
-- GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO automation_app;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO automation_app;

-- ============================================
-- COMPLETION MESSAGE
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '✅ Database initialization completed successfully';
    RAISE NOTICE '📊 Tables created: granules_prices, scraper_runs';
    RAISE NOTICE '📈 Views created: latest_granules_prices, monthly_average_prices';
    RAISE NOTICE '🔧 Functions created: get_price_trend, detect_price_drops';
    RAISE NOTICE '💾 Sample data inserted for testing';
END $$;
