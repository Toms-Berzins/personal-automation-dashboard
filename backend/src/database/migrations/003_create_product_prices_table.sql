-- Migration 003: Create product_prices table for scraper
-- Description: Simple table for scraped product prices (used by scraper)
-- Created: 2025-10-29

-- ============================================================================
-- TABLE: product_prices
-- Purpose: Store scraped product prices from various retailers (simple schema)
-- ============================================================================

CREATE TABLE IF NOT EXISTS product_prices (
  id SERIAL PRIMARY KEY,
  url TEXT NOT NULL,
  product_name VARCHAR(500) NOT NULL,
  price NUMERIC(10, 2) NOT NULL CHECK (price > 0),
  currency VARCHAR(3) DEFAULT 'EUR',
  brand VARCHAR(255),
  in_stock BOOLEAN DEFAULT true,
  description TEXT,
  specifications JSONB,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_product_prices_timestamp
  ON product_prices(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_product_prices_product_name
  ON product_prices(product_name);

CREATE INDEX IF NOT EXISTS idx_product_prices_month
  ON product_prices(DATE_TRUNC('month', timestamp));

COMMENT ON TABLE product_prices IS 'Scraped product prices (simple schema for scraper)';
COMMENT ON COLUMN product_prices.url IS 'Source URL where price was scraped';
COMMENT ON COLUMN product_prices.product_name IS 'Product name as shown on website';
COMMENT ON COLUMN product_prices.price IS 'Price value (must be positive)';
COMMENT ON COLUMN product_prices.timestamp IS 'When the price was scraped';

-- ============================================================================
-- VIEW: latest_product_prices
-- Purpose: Show latest price for each unique product
-- ============================================================================

CREATE OR REPLACE VIEW latest_product_prices AS
SELECT DISTINCT ON (product_name)
  id,
  url,
  product_name,
  price,
  currency,
  brand,
  in_stock,
  description,
  specifications,
  timestamp
FROM product_prices
ORDER BY product_name, timestamp DESC;

COMMENT ON VIEW latest_product_prices IS 'Latest price for each product';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

SELECT 'Migration 003 completed successfully' as status;
SELECT 'Table created: product_prices' as info;
SELECT 'View created: latest_product_prices' as info;
