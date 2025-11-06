# Database Implementation Guide

## Overview

This document provides a complete guide to the PostgreSQL database implementation for the Granules Price Tracking system.

## Entity-Relationship Diagram

```
┌─────────────────────┐
│     retailers       │
├─────────────────────┤
│ PK  id              │──┐
│     name            │  │
│     website_url     │  │
│     location        │  │
│     created_at      │  │
│     updated_at      │  │
└─────────────────────┘  │
                         │
                         │
┌─────────────────────┐  │
│     products        │  │
├─────────────────────┤  │
│ PK  id              │──│──┐
│     product_name    │  │  │
│     brand           │  │  │
│     category        │  │  │
│     specifications  │  │  │  (JSONB)
│     normalized_name │  │  │
│     created_at      │  │  │
│     updated_at      │  │  │
└─────────────────────┘  │  │
                         │  │
                         │  │
         ┌───────────────┴──┴──────────────┐
         │                                  │
         │       price_history              │
         │      (Partitioned Table)         │
         ├──────────────────────────────────┤
         │ PK  id, scraped_at               │
         │ FK  product_id      ───────────────> products.id
         │ FK  retailer_id     ───────────────> retailers.id
         │     price                        │
         │     currency                     │
         │     in_stock                     │
         │     quantity                     │
         │     unit                         │
         │     source_url                   │
         │     scraped_at                   │
         └──────────────────────────────────┘
                      │
                      │ Partitioned by month
                      ▼
         ┌────────────────────────────┐
         │  price_history_2025_01     │
         │  price_history_2025_02     │
         │  price_history_2025_03     │
         │          ...               │
         └────────────────────────────┘
```

## Table Descriptions

### 1. `retailers`

Stores information about sellers/vendors.

| Column       | Type                        | Description                        |
|--------------|-----------------------------|-------------------------------------|
| id           | SERIAL PRIMARY KEY          | Unique retailer identifier          |
| name         | VARCHAR(255) NOT NULL       | Display name (unique)               |
| website_url  | TEXT                        | Main website URL                    |
| location     | VARCHAR(255)                | Physical location or country        |
| created_at   | TIMESTAMP WITH TIME ZONE    | Record creation timestamp           |
| updated_at   | TIMESTAMP WITH TIME ZONE    | Last update timestamp               |

**Indexes:**
- `idx_retailers_name` on `name`

---

### 2. `products`

Master catalog of products across all retailers.

| Column          | Type                        | Description                           |
|-----------------|-----------------------------|----------------------------------------|
| id              | SERIAL PRIMARY KEY          | Unique product identifier              |
| product_name    | VARCHAR(500) NOT NULL       | Original product name                  |
| brand           | VARCHAR(255)                | Brand or manufacturer                  |
| category        | VARCHAR(100)                | Product category (default: wood_pellets)|
| specifications  | JSONB                       | Flexible product attributes            |
| normalized_name | VARCHAR(500)                | Standardized name for matching         |
| created_at      | TIMESTAMP WITH TIME ZONE    | Record creation timestamp              |
| updated_at      | TIMESTAMP WITH TIME ZONE    | Last update timestamp                  |

**Indexes:**
- `idx_products_normalized_name` on `normalized_name`
- `idx_products_category` on `category`
- `idx_products_brand` on `brand`
- `idx_products_specifications` GIN index on `specifications`

**Example specifications JSONB:**
```json
{
  "weight": "15 kg",
  "type": "kokskaidu granulas",
  "diameter": "6 mm",
  "packaging": "bags"
}
```

---

### 3. `price_history` (Partitioned)

Time-series storage of all price observations. **This is the core table** for tracking prices over time.

| Column       | Type                        | Description                               |
|--------------|-----------------------------|-------------------------------------------|
| id           | BIGSERIAL                   | Unique record identifier                  |
| product_id   | INTEGER REFERENCES products | Foreign key to products                   |
| retailer_id  | INTEGER REFERENCES retailers| Foreign key to retailers                  |
| price        | NUMERIC(10, 2) NOT NULL     | Price value (must be > 0)                 |
| currency     | VARCHAR(3)                  | Currency code (EUR, USD, etc.)            |
| in_stock     | BOOLEAN                     | Product availability                      |
| quantity     | NUMERIC(10, 2)              | Quantity value (e.g., 15, 975)            |
| unit         | VARCHAR(50)                 | Unit description (kg, ton, bag)           |
| source_url   | TEXT                        | URL where price was scraped               |
| scraped_at   | TIMESTAMP WITH TIME ZONE    | When data was collected                   |

**Primary Key:** `(id, scraped_at)` - Composite key required for partitioning

**Partitioning:** Range partitioned by `scraped_at` (monthly partitions)

**Indexes:**
- `idx_price_history_scraped_at` on `scraped_at DESC`
- `idx_price_history_product_date` on `(product_id, scraped_at DESC)`
- `idx_price_history_retailer_date` on `(retailer_id, scraped_at DESC)`
- `idx_price_history_composite` on `(product_id, retailer_id, scraped_at DESC)`
- `idx_price_history_in_stock` on `(in_stock, scraped_at DESC)` WHERE `in_stock = true`

---

## Views

### `latest_prices`

Shows the most recent price for each product-retailer combination.

```sql
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
```

### `monthly_avg_prices`

Monthly price statistics for trend analysis.

```sql
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
```

---

## Setup Instructions

### 1. Prerequisites

```bash
# Install PostgreSQL 13+
# Windows: Download from postgresql.org
# Mac: brew install postgresql@15
# Linux: sudo apt install postgresql-15

# Verify installation
psql --version
```

### 2. Create Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE granules_tracker;

# Exit psql
\q
```

### 3. Configure Environment

Create or update your `.env` file:

```env
# Database Configuration
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/granules_tracker
DB_HOST=localhost
DB_PORT=5432
DB_NAME=granules_tracker
DB_USER=postgres
DB_PASSWORD=your_password

# Optional
LOG_QUERIES=false
```

### 4. Run Migrations

```bash
# From project root
cd backend

# Option 1: Using psql directly
psql -U postgres -d granules_tracker -f src/database/migrations/001_create_initial_schema.sql

# Option 2: Using node script (to be created)
node src/database/runMigrations.js
```

### 5. Verify Setup

```bash
psql -U postgres -d granules_tracker

# Check tables
\dt

# Check partitions
SELECT
  parent.relname AS parent_table,
  child.relname AS partition_name
FROM pg_inherits
JOIN pg_class parent ON pg_inherits.inhparent = parent.oid
JOIN pg_class child ON pg_inherits.inhrelid = child.oid
WHERE parent.relname = 'price_history';

# Check views
\dv

# Exit
\q
```

---

## Usage Examples

### Node.js Integration

```javascript
const db = require('./database/db');

// Test connection
await db.testConnection();

// Insert scraped data
const { processScrapedData } = require('./services/dataPipeline');

const scrapedItem = {
  brand: 'SIA Staļi',
  product_name: '6 mm kokskaidu granulas 15KG MAISOS',
  price: 235,
  currency: 'EUR',
  in_stock: true,
  url: 'https://www.stali.lv/lv/granulas',
  specifications: {
    weight: '15 kg',
    type: 'kokskaidu granulas',
    diameter: '6 mm',
    packaging: 'bags'
  }
};

const result = await processScrapedData(scrapedItem);
console.log('Saved:', result);
```

### Common Queries

```javascript
// Get latest prices
const latestPrices = await db.getLatestPrices();

// Get price history for a product
const history = await db.getPriceHistory(productId, { days: 90 });

// Compare retailers
const comparison = await db.compareRetailers(productId, 30);

// Detect price drops
const priceDrops = await db.detectPriceDrops(10); // 10% threshold

// Analytics
const { getPriceTrends, findCheapestTimes } = require('./services/analyticsService');

const trends = await getPriceTrends(productId, { days: 90, groupBy: 'week' });
const cheapestMonths = await findCheapestTimes(productId);
```

---

## Maintenance

### Create Next Month's Partition

```sql
-- Automated function (already in schema)
SELECT create_next_month_partition();

-- Manual creation (example for February 2026)
CREATE TABLE price_history_2026_02 PARTITION OF price_history
  FOR VALUES FROM ('2026-02-01 00:00:00+00') TO ('2026-03-01 00:00:00+00');
```

### Optimize Performance

```sql
-- Analyze tables (updates statistics for query planner)
ANALYZE retailers;
ANALYZE products;
ANALYZE price_history;

-- Vacuum (reclaim storage and update stats)
VACUUM ANALYZE price_history;
```

### Archive Old Data

```sql
-- Detach old partition (e.g., 2 years old)
ALTER TABLE price_history DETACH PARTITION price_history_2023_01;

-- Export to CSV
\copy (SELECT * FROM price_history_2023_01) TO '/backup/2023_01.csv' CSV HEADER;

-- Drop if no longer needed
DROP TABLE price_history_2023_01;
```

### Backup & Restore

```bash
# Backup entire database
pg_dump -U postgres granules_tracker > backup_$(date +%Y%m%d).sql

# Backup specific table
pg_dump -U postgres -t price_history granules_tracker > price_history_backup.sql

# Restore
psql -U postgres granules_tracker < backup_20251026.sql
```

---

## Performance Tips

1. **Always use time bounds** in queries:
   ```sql
   WHERE scraped_at >= '2025-01-01' AND scraped_at < '2025-02-01'
   ```

2. **Leverage partition pruning**:
   - PostgreSQL automatically skips irrelevant partitions
   - View query plan: `EXPLAIN ANALYZE SELECT ...`

3. **Use appropriate indexes**:
   - Already created for common patterns
   - Monitor slow queries and add indexes as needed

4. **Batch inserts** when possible:
   ```javascript
   await db.transaction(async (client) => {
     for (const item of items) {
       await insertPriceHistory(item, client);
     }
   });
   ```

5. **Limit result sets**:
   ```sql
   LIMIT 1000
   ```

---

## Troubleshooting

### Connection Issues

```javascript
// Test connection
const db = require('./database/db');
await db.testConnection();

// Check pool stats
console.log(db.getPoolStats());
```

### Query Performance

```sql
-- View execution plan
EXPLAIN ANALYZE
SELECT * FROM price_history
WHERE product_id = 1
  AND scraped_at >= '2025-01-01';

-- Check index usage
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;
```

### Partition Issues

```sql
-- List all partitions
SELECT
  parent.relname AS table_name,
  child.relname AS partition_name,
  pg_get_expr(child.relpartbound, child.oid) AS partition_bounds
FROM pg_inherits
JOIN pg_class parent ON pg_inherits.inhparent = parent.oid
JOIN pg_class child ON pg_inherits.inhrelid = child.oid
WHERE parent.relname = 'price_history';
```

---

## Future Enhancements

### TimescaleDB Extension (Optional)

For advanced time-series features:

```sql
-- Install extension
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Convert to hypertable
SELECT create_hypertable('price_history', 'scraped_at',
  chunk_time_interval => INTERVAL '1 month'
);

-- Add compression policy
SELECT add_compression_policy('price_history', INTERVAL '90 days');

-- Continuous aggregates
CREATE MATERIALIZED VIEW daily_avg_prices
WITH (timescaledb.continuous) AS
SELECT
  time_bucket('1 day', scraped_at) as day,
  product_id,
  AVG(price) as avg_price
FROM price_history
GROUP BY day, product_id;
```

### Additional Indexes

If needed based on query patterns:

```sql
-- Price range queries
CREATE INDEX idx_price_history_price ON price_history(price);

-- Currency-specific queries
CREATE INDEX idx_price_history_currency ON price_history(currency);

-- Full-text search on product names
CREATE INDEX idx_products_name_fts ON products
  USING gin(to_tsvector('english', product_name));
```

---

## Security Recommendations

1. **Use environment variables** for credentials (never commit `.env`)
2. **Create application-specific user** (don't use `postgres` superuser):
   ```sql
   CREATE USER app_user WITH PASSWORD 'secure_password';
   GRANT CONNECT ON DATABASE granules_tracker TO app_user;
   GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO app_user;
   GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;
   ```

3. **Enable SSL** in production:
   ```javascript
   const pool = new Pool({
     ...config,
     ssl: { rejectUnauthorized: true }
   });
   ```

4. **Regular backups** (automated daily)
5. **Monitor for SQL injection** (use parameterized queries only)

---

## Support

For issues or questions:
- Check [DATABASE_STRATEGY.md](../../DATABASE_STRATEGY.md) for design decisions
- Review [migrations README](./migrations/README.md) for migration details
- See example usage in [dataPipeline.js](../services/dataPipeline.js)
