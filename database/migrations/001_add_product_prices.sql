-- ============================================
-- Migration: Add generic product_prices table
-- ============================================
-- Description: Table for on-demand product price tracking
-- Created: 2025-10-25
-- ============================================

-- Generic table for any product price tracking
CREATE TABLE IF NOT EXISTS product_prices (
    id SERIAL PRIMARY KEY,

    -- Timestamp fields
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Source URL
    url TEXT NOT NULL,

    -- Product information
    product_name VARCHAR(255) NOT NULL,
    brand VARCHAR(100),
    description TEXT,

    -- Price information
    price DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'EUR',

    -- Availability
    in_stock BOOLEAN NOT NULL DEFAULT true,

    -- Additional metadata (flexible JSON field)
    specifications JSONB,

    -- Constraints
    CONSTRAINT valid_price CHECK (price > 0)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_product_timestamp ON product_prices(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_product_name ON product_prices(product_name);
CREATE INDEX IF NOT EXISTS idx_product_url ON product_prices(url);
CREATE INDEX IF NOT EXISTS idx_product_in_stock ON product_prices(in_stock);

-- GIN index for JSONB specifications queries
CREATE INDEX IF NOT EXISTS idx_product_specifications
    ON product_prices USING GIN (specifications);

-- Comment on table
COMMENT ON TABLE product_prices IS 'Generic product price tracking for on-demand scraping';

-- ============================================
-- VIEWS FOR PRODUCT PRICES
-- ============================================

-- Latest price per product URL
CREATE OR REPLACE VIEW latest_product_prices AS
SELECT DISTINCT ON (url)
    id,
    timestamp,
    url,
    product_name,
    brand,
    price,
    currency,
    in_stock,
    description
FROM product_prices
ORDER BY url, timestamp DESC;

COMMENT ON VIEW latest_product_prices IS 'Shows the most recent price for each tracked product URL';

-- Price change detection
CREATE OR REPLACE VIEW product_price_changes AS
WITH ranked_prices AS (
    SELECT
        url,
        product_name,
        price,
        currency,
        timestamp,
        in_stock,
        LAG(price) OVER (PARTITION BY url ORDER BY timestamp) AS prev_price,
        LAG(timestamp) OVER (PARTITION BY url ORDER BY timestamp) AS prev_timestamp
    FROM product_prices
)
SELECT
    url,
    product_name,
    prev_price,
    price AS current_price,
    currency,
    ROUND(((price - prev_price) / prev_price * 100)::NUMERIC, 2) AS change_percentage,
    prev_timestamp,
    timestamp AS current_timestamp,
    in_stock
FROM ranked_prices
WHERE prev_price IS NOT NULL
    AND prev_price != price
ORDER BY timestamp DESC;

COMMENT ON VIEW product_price_changes IS 'Tracks price changes over time for all products';

-- ============================================
-- FUNCTIONS FOR PRODUCT PRICES
-- ============================================

-- Function to get price history for a product
CREATE OR REPLACE FUNCTION get_product_price_history(
    p_product_name VARCHAR,
    p_limit INTEGER DEFAULT 30
)
RETURNS TABLE (
    timestamp TIMESTAMPTZ,
    price DECIMAL,
    currency VARCHAR,
    in_stock BOOLEAN,
    url TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        pp.timestamp,
        pp.price,
        pp.currency,
        pp.in_stock,
        pp.url
    FROM product_prices pp
    WHERE pp.product_name ILIKE '%' || p_product_name || '%'
    ORDER BY pp.timestamp DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_product_price_history IS 'Returns price history for a product by name';

-- Function to get price statistics
CREATE OR REPLACE FUNCTION get_product_price_stats(
    p_product_name VARCHAR
)
RETURNS TABLE (
    product_name VARCHAR,
    total_records BIGINT,
    avg_price DECIMAL,
    min_price DECIMAL,
    max_price DECIMAL,
    current_price DECIMAL,
    price_variance DECIMAL,
    first_seen TIMESTAMPTZ,
    last_seen TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        pp.product_name,
        COUNT(*) AS total_records,
        ROUND(AVG(pp.price)::NUMERIC, 2) AS avg_price,
        MIN(pp.price) AS min_price,
        MAX(pp.price) AS max_price,
        (SELECT price FROM product_prices
         WHERE product_name = pp.product_name
         ORDER BY timestamp DESC LIMIT 1) AS current_price,
        ROUND(STDDEV(pp.price)::NUMERIC, 2) AS price_variance,
        MIN(pp.timestamp) AS first_seen,
        MAX(pp.timestamp) AS last_seen
    FROM product_prices pp
    WHERE pp.product_name ILIKE '%' || p_product_name || '%'
    GROUP BY pp.product_name;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_product_price_stats IS 'Returns comprehensive price statistics for a product';

-- ============================================
-- COMPLETION MESSAGE
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '✅ Product prices migration completed';
    RAISE NOTICE '📊 Table created: product_prices';
    RAISE NOTICE '📈 Views created: latest_product_prices, product_price_changes';
    RAISE NOTICE '🔧 Functions created: get_product_price_history, get_product_price_stats';
END $$;
