-- Migration 001: Create Initial Schema for Granules Price Tracking
-- Description: Creates retailers, products, and price_history tables with partitioning
-- Created: 2025-10-26

-- ============================================================================
-- TABLE: retailers
-- Purpose: Store information about sellers/vendors
-- ============================================================================

CREATE TABLE IF NOT EXISTS retailers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  website_url TEXT,
  location VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_retailer_name UNIQUE(name)
);

CREATE INDEX idx_retailers_name ON retailers(name);

COMMENT ON TABLE retailers IS 'Stores information about granule sellers/vendors';
COMMENT ON COLUMN retailers.name IS 'Display name of the retailer (e.g., "SIA Staļi")';
COMMENT ON COLUMN retailers.website_url IS 'Main website URL of the retailer';
COMMENT ON COLUMN retailers.location IS 'Physical location or country of the retailer';

-- ============================================================================
-- TABLE: products
-- Purpose: Master catalog of products across all retailers
-- ============================================================================

CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  product_name VARCHAR(500) NOT NULL,
  brand VARCHAR(255),
  category VARCHAR(100) DEFAULT 'wood_pellets',
  specifications JSONB,
  normalized_name VARCHAR(500),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for product queries
CREATE INDEX idx_products_normalized_name ON products(normalized_name);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_brand ON products(brand);
CREATE INDEX idx_products_specifications ON products USING GIN(specifications);

COMMENT ON TABLE products IS 'Master catalog of granule products';
COMMENT ON COLUMN products.product_name IS 'Original product name as scraped';
COMMENT ON COLUMN products.brand IS 'Brand or manufacturer name';
COMMENT ON COLUMN products.category IS 'Product category (default: wood_pellets)';
COMMENT ON COLUMN products.specifications IS 'JSONB field for flexible product attributes (weight, type, diameter, packaging)';
COMMENT ON COLUMN products.normalized_name IS 'Standardized name for matching across retailers';

-- ============================================================================
-- TABLE: price_history (Partitioned by scraped_at)
-- Purpose: Time-series storage of all price observations
-- ============================================================================

CREATE TABLE IF NOT EXISTS price_history (
  id BIGSERIAL,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  retailer_id INTEGER NOT NULL REFERENCES retailers(id) ON DELETE CASCADE,
  price NUMERIC(10, 2) NOT NULL CHECK (price > 0),
  currency VARCHAR(3) DEFAULT 'EUR',
  in_stock BOOLEAN DEFAULT true,
  quantity NUMERIC(10, 2),
  unit VARCHAR(50),
  source_url TEXT,
  scraped_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id, scraped_at)
) PARTITION BY RANGE (scraped_at);

COMMENT ON TABLE price_history IS 'Time-series storage of price observations (partitioned by month)';
COMMENT ON COLUMN price_history.price IS 'Price value (must be positive)';
COMMENT ON COLUMN price_history.currency IS 'Currency code (e.g., EUR, USD)';
COMMENT ON COLUMN price_history.in_stock IS 'Product availability at time of scraping';
COMMENT ON COLUMN price_history.quantity IS 'Quantity value (e.g., 15 for 15kg, 975 for 975kg)';
COMMENT ON COLUMN price_history.unit IS 'Unit description (e.g., "kg", "ton", "bag")';
COMMENT ON COLUMN price_history.source_url IS 'URL where the price was scraped from';
COMMENT ON COLUMN price_history.scraped_at IS 'Timestamp when data was collected';

-- ============================================================================
-- PARTITIONS: Create initial monthly partitions for 2025
-- ============================================================================

CREATE TABLE IF NOT EXISTS price_history_2025_01 PARTITION OF price_history
  FOR VALUES FROM ('2025-01-01 00:00:00+00') TO ('2025-02-01 00:00:00+00');

CREATE TABLE IF NOT EXISTS price_history_2025_02 PARTITION OF price_history
  FOR VALUES FROM ('2025-02-01 00:00:00+00') TO ('2025-03-01 00:00:00+00');

CREATE TABLE IF NOT EXISTS price_history_2025_03 PARTITION OF price_history
  FOR VALUES FROM ('2025-03-01 00:00:00+00') TO ('2025-04-01 00:00:00+00');

CREATE TABLE IF NOT EXISTS price_history_2025_04 PARTITION OF price_history
  FOR VALUES FROM ('2025-04-01 00:00:00+00') TO ('2025-05-01 00:00:00+00');

CREATE TABLE IF NOT EXISTS price_history_2025_05 PARTITION OF price_history
  FOR VALUES FROM ('2025-05-01 00:00:00+00') TO ('2025-06-01 00:00:00+00');

CREATE TABLE IF NOT EXISTS price_history_2025_06 PARTITION OF price_history
  FOR VALUES FROM ('2025-06-01 00:00:00+00') TO ('2025-07-01 00:00:00+00');

CREATE TABLE IF NOT EXISTS price_history_2025_07 PARTITION OF price_history
  FOR VALUES FROM ('2025-07-01 00:00:00+00') TO ('2025-08-01 00:00:00+00');

CREATE TABLE IF NOT EXISTS price_history_2025_08 PARTITION OF price_history
  FOR VALUES FROM ('2025-08-01 00:00:00+00') TO ('2025-09-01 00:00:00+00');

CREATE TABLE IF NOT EXISTS price_history_2025_09 PARTITION OF price_history
  FOR VALUES FROM ('2025-09-01 00:00:00+00') TO ('2025-10-01 00:00:00+00');

CREATE TABLE IF NOT EXISTS price_history_2025_10 PARTITION OF price_history
  FOR VALUES FROM ('2025-10-01 00:00:00+00') TO ('2025-11-01 00:00:00+00');

CREATE TABLE IF NOT EXISTS price_history_2025_11 PARTITION OF price_history
  FOR VALUES FROM ('2025-11-01 00:00:00+00') TO ('2025-12-01 00:00:00+00');

CREATE TABLE IF NOT EXISTS price_history_2025_12 PARTITION OF price_history
  FOR VALUES FROM ('2025-12-01 00:00:00+00') TO ('2026-01-01 00:00:00+00');

-- ============================================================================
-- INDEXES: Optimize common query patterns
-- ============================================================================

-- Time-based queries (most common use case)
CREATE INDEX IF NOT EXISTS idx_price_history_scraped_at
  ON price_history(scraped_at DESC);

-- Product-specific price history
CREATE INDEX IF NOT EXISTS idx_price_history_product_date
  ON price_history(product_id, scraped_at DESC);

-- Retailer-specific price history
CREATE INDEX IF NOT EXISTS idx_price_history_retailer_date
  ON price_history(retailer_id, scraped_at DESC);

-- Combined queries (product + retailer + time)
CREATE INDEX IF NOT EXISTS idx_price_history_composite
  ON price_history(product_id, retailer_id, scraped_at DESC);

-- Stock availability queries
CREATE INDEX IF NOT EXISTS idx_price_history_in_stock
  ON price_history(in_stock, scraped_at DESC) WHERE in_stock = true;

-- ============================================================================
-- FUNCTIONS: Helper functions for database operations
-- ============================================================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for retailers table
CREATE TRIGGER update_retailers_updated_at
  BEFORE UPDATE ON retailers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for products table
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- VIEWS: Common analytical queries as views
-- ============================================================================

-- Latest prices for each product-retailer combination
CREATE OR REPLACE VIEW latest_prices AS
SELECT DISTINCT ON (product_id, retailer_id)
  ph.id,
  ph.product_id,
  ph.retailer_id,
  p.product_name,
  r.name as retailer_name,
  ph.price,
  ph.currency,
  ph.in_stock,
  ph.quantity,
  ph.unit,
  ph.scraped_at
FROM price_history ph
JOIN products p ON ph.product_id = p.id
JOIN retailers r ON ph.retailer_id = r.id
ORDER BY product_id, retailer_id, scraped_at DESC;

COMMENT ON VIEW latest_prices IS 'Shows the most recent price for each product-retailer combination';

-- Monthly average prices
CREATE OR REPLACE VIEW monthly_avg_prices AS
SELECT
  DATE_TRUNC('month', scraped_at) as month,
  product_id,
  retailer_id,
  AVG(price) as avg_price,
  MIN(price) as min_price,
  MAX(price) as max_price,
  COUNT(*) as sample_count
FROM price_history
GROUP BY DATE_TRUNC('month', scraped_at), product_id, retailer_id;

COMMENT ON VIEW monthly_avg_prices IS 'Monthly price statistics for trend analysis';

-- ============================================================================
-- SEED DATA: Initial test data
-- ============================================================================

-- Insert example retailer
INSERT INTO retailers (name, website_url, location)
VALUES
  ('SIA Staļi', 'https://www.stali.lv/', 'Latvia'),
  ('Example Retailer', 'https://example.com', 'Latvia')
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- PERMISSIONS (Optional - adjust based on your needs)
-- ============================================================================

-- Grant permissions to application user (replace 'app_user' with your user)
-- GRANT SELECT, INSERT, UPDATE ON retailers, products, price_history TO app_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Verify migration
SELECT 'Migration 001 completed successfully' as status;
SELECT 'Tables created: retailers, products, price_history (partitioned)' as info;
SELECT COUNT(*) as partition_count FROM pg_tables WHERE tablename LIKE 'price_history_%';
