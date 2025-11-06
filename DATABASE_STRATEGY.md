# Database Strategy for Granules Price Tracking

## Sequential Design Reasoning

### Problem Analysis
**Goal**: Identify the cheapest time to buy wood pellet granules by tracking prices across multiple retailers over time.

**Key Requirements**:
1. Store prices from multiple retailers
2. Track price changes over time (weeks, months, years)
3. Enable seasonal analysis (when is it cheapest?)
4. Compare retailers
5. Handle different product variants (15kg bags vs bulk)

---

## Database Schema Design

### Core Principle: Time-Series Architecture

Since the primary goal is analyzing prices **over time**, the database follows a time-series pattern where:
- Historical data is preserved (insert-only)
- Each scrape creates a new record
- No price updates (to avoid losing history)

### Tables Structure

#### 1. `retailers`
Stores information about sellers/vendors.

```sql
CREATE TABLE retailers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  website_url TEXT,
  location VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(name)
);
```

**Why separate table?**
- Avoids repeating retailer name thousands of times
- Allows adding retailer metadata (contact, location, reliability score)
- Easy to update retailer info without touching price data

---

#### 2. `products`
Master catalog of products across all retailers.

```sql
CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  product_name VARCHAR(500) NOT NULL,
  brand VARCHAR(255),
  category VARCHAR(100) DEFAULT 'wood_pellets',
  specifications JSONB,
  normalized_name VARCHAR(500),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_products_normalized_name ON products(normalized_name);
CREATE INDEX idx_products_specifications ON products USING GIN(specifications);
```

**Design Decisions**:
- `specifications` as JSONB: Flexible for varying product attributes (weight, type, quality)
- `normalized_name`: For matching similar products across retailers (e.g., "15kg bags" vs "15KG MAISOS")
- GIN index on JSONB for fast specification queries

**Example Data**:
```json
{
  "id": 1,
  "product_name": "6 mm kokskaidu granulas 15KG MAISOS",
  "brand": "SIA Staļi",
  "category": "wood_pellets",
  "specifications": {
    "weight": "15 kg",
    "type": "kokskaidu granulas",
    "diameter": "6 mm",
    "packaging": "bags"
  },
  "normalized_name": "wood_pellets_15kg_bags"
}
```

---

#### 3. `price_history` (Partitioned Time-Series Table)
The core table storing all price observations over time.

```sql
CREATE TABLE price_history (
  id BIGSERIAL,
  product_id INTEGER NOT NULL REFERENCES products(id),
  retailer_id INTEGER NOT NULL REFERENCES retailers(id),
  price NUMERIC(10, 2) NOT NULL CHECK (price > 0),
  currency VARCHAR(3) DEFAULT 'EUR',
  in_stock BOOLEAN DEFAULT true,
  quantity NUMERIC(10, 2),
  unit VARCHAR(50),
  source_url TEXT,
  scraped_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id, scraped_at)
) PARTITION BY RANGE (scraped_at);

-- Create monthly partitions (example for 2025)
CREATE TABLE price_history_2025_01 PARTITION OF price_history
  FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

CREATE TABLE price_history_2025_02 PARTITION OF price_history
  FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');

CREATE TABLE price_history_2025_03 PARTITION OF price_history
  FOR VALUES FROM ('2025-03-01') TO ('2025-04-01');

-- Indexes for fast queries
CREATE INDEX idx_price_history_scraped_at ON price_history(scraped_at);
CREATE INDEX idx_price_history_product_date ON price_history(product_id, scraped_at DESC);
CREATE INDEX idx_price_history_retailer_date ON price_history(retailer_id, scraped_at DESC);
CREATE INDEX idx_price_history_product_retailer ON price_history(product_id, retailer_id, scraped_at DESC);
```

**Why Partitioned?**
- **Performance**: Queries scan only relevant months (faster)
- **Maintenance**: Easy to archive old partitions
- **Compression**: Old partitions can be compressed differently
- **Scalability**: Handles millions of records efficiently

**Why These Fields?**
- `quantity` + `unit`: Essential for comparing prices (€235/ton vs €235/15kg)
- `in_stock`: Track availability patterns
- `source_url`: Audit trail back to source
- `scraped_at`: When data was collected (NOT when price changed)

---

## Data Insertion Strategy

### Sequential Workflow

```
┌─────────────────┐
│ 1. Scrape Data  │
│   (Firecrawl)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 2. Clean Data   │
│   (Normalize)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 3. Match/Create │
│   Retailer      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 4. Match/Create │
│   Product       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 5. Insert Price │
│   History       │
└─────────────────┘
```

### Pseudo-code

```python
def store_scraped_data(scraped_item):
    # Step 1: Get or create retailer
    retailer = get_or_create_retailer(
        name=scraped_item['brand'],
        url=scraped_item['url']
    )

    # Step 2: Match or create product
    product = match_product(
        name=scraped_item['product_name'],
        specifications=scraped_item['specifications']
    )

    if not product:
        product = create_product(
            product_name=scraped_item['product_name'],
            brand=scraped_item['brand'],
            specifications=scraped_item['specifications']
        )

    # Step 3: Insert price record (ALWAYS INSERT, NEVER UPDATE)
    insert_price_history(
        product_id=product.id,
        retailer_id=retailer.id,
        price=scraped_item['price'],
        currency=scraped_item['currency'],
        in_stock=scraped_item['in_stock'],
        quantity=scraped_item['specifications'].get('weight'),
        source_url=scraped_item['url'],
        scraped_at=datetime.now()
    )
```

### Key Principle: INSERT-ONLY Pattern

**Never update prices. Always insert new records.**

**Why?**
- ✅ Preserves complete history
- ✅ Enables "price on date X" queries
- ✅ Simpler code (no update logic)
- ✅ Audit trail for debugging

**Example**:
```sql
-- ❌ WRONG: Update approach loses history
UPDATE price_history
SET price = 240
WHERE product_id = 1 AND retailer_id = 1;

-- ✅ CORRECT: Insert new observation
INSERT INTO price_history
(product_id, retailer_id, price, scraped_at)
VALUES (1, 1, 240, NOW());
```

---

## Analytical Queries for Your Use Case

### 1. Find Cheapest Time to Buy (Seasonal Analysis)

```sql
-- Monthly average prices for a product
SELECT
    DATE_TRUNC('month', scraped_at) as month,
    AVG(price) as avg_price,
    MIN(price) as lowest_price,
    MAX(price) as highest_price,
    COUNT(*) as sample_count
FROM price_history
WHERE product_id = 1
GROUP BY DATE_TRUNC('month', scraped_at)
ORDER BY month DESC;
```

**Result**: Shows which months historically have lowest prices.

---

### 2. Compare Retailers

```sql
-- Average prices by retailer (last 30 days)
SELECT
    r.name as retailer,
    AVG(ph.price) as avg_price,
    MIN(ph.price) as best_price,
    COUNT(*) as price_checks
FROM price_history ph
JOIN retailers r ON ph.retailer_id = r.id
WHERE ph.product_id = 1
  AND ph.scraped_at >= NOW() - INTERVAL '30 days'
GROUP BY r.name
ORDER BY avg_price ASC;
```

**Result**: Identifies which retailer is consistently cheapest.

---

### 3. Price Trend Visualization

```sql
-- Daily prices for charting
SELECT
    DATE(scraped_at) as date,
    r.name as retailer,
    AVG(price) as price
FROM price_history ph
JOIN retailers r ON ph.retailer_id = r.id
WHERE ph.product_id = 1
  AND ph.scraped_at >= NOW() - INTERVAL '90 days'
GROUP BY DATE(scraped_at), r.name
ORDER BY date, retailer;
```

**Result**: Data ready for Chart.js line graph.

---

### 4. Price Drop Alerts

```sql
-- Detect significant price drops (>10%)
WITH latest_prices AS (
    SELECT DISTINCT ON (product_id, retailer_id)
        product_id,
        retailer_id,
        price as current_price,
        scraped_at
    FROM price_history
    ORDER BY product_id, retailer_id, scraped_at DESC
),
previous_prices AS (
    SELECT DISTINCT ON (product_id, retailer_id)
        product_id,
        retailer_id,
        price as previous_price
    FROM price_history
    WHERE scraped_at < NOW() - INTERVAL '7 days'
    ORDER BY product_id, retailer_id, scraped_at DESC
)
SELECT
    p.product_name,
    r.name as retailer,
    prev.previous_price,
    curr.current_price,
    ROUND((curr.current_price - prev.previous_price) / prev.previous_price * 100, 2) as percent_change
FROM latest_prices curr
JOIN previous_prices prev USING (product_id, retailer_id)
JOIN products p ON curr.product_id = p.id
JOIN retailers r ON curr.retailer_id = r.id
WHERE curr.current_price < prev.previous_price * 0.9  -- 10% drop
ORDER BY percent_change;
```

**Result**: Alerts when prices drop significantly.

---

## Performance Optimization

### Indexing Strategy

```sql
-- Time-based queries (most common)
CREATE INDEX idx_price_scraped ON price_history(scraped_at DESC);

-- Product lookups
CREATE INDEX idx_price_product_time ON price_history(product_id, scraped_at DESC);

-- Retailer comparisons
CREATE INDEX idx_price_retailer_time ON price_history(retailer_id, scraped_at DESC);

-- Combined queries (product + retailer + time)
CREATE INDEX idx_price_composite ON price_history(product_id, retailer_id, scraped_at DESC);
```

### Partitioning Maintenance

```sql
-- Automatically create next month's partition (run monthly)
CREATE TABLE price_history_2025_04 PARTITION OF price_history
  FOR VALUES FROM ('2025-04-01') TO ('2025-05-01');

-- Archive old partitions (after 2 years, detach and export)
ALTER TABLE price_history DETACH PARTITION price_history_2023_01;
```

### Query Performance Tips

1. **Use time bounds**: Always filter by date range
   ```sql
   WHERE scraped_at >= '2024-01-01' AND scraped_at < '2025-01-01'
   ```

2. **Limit results**: Don't fetch all history
   ```sql
   LIMIT 1000
   ```

3. **Use EXPLAIN ANALYZE**: Check query plans
   ```sql
   EXPLAIN ANALYZE SELECT ...;
   ```

---

## Handling Product Matching

### Challenge: Same product, different names across retailers

**Example**:
- Retailer A: "6mm Wood Pellets 15KG"
- Retailer B: "kokskaidu granulas 15 kg"
- → Same product? Probably yes!

### Solution: Normalization Function

```python
def normalize_product_name(name, specs):
    """Create standardized product identifier"""
    # Extract key attributes
    weight = specs.get('weight', '').lower().replace(' ', '')
    pellet_type = 'wood_pellets'
    packaging = 'bags' if 'bag' in name.lower() else 'bulk'

    # Create normalized name
    normalized = f"{pellet_type}_{weight}_{packaging}"
    return normalized

# Example:
# normalize_product_name("6mm granulas 15KG", {"weight": "15 kg"})
# → "wood_pellets_15kg_bags"
```

### Matching Strategy

```python
def match_product(name, specs):
    normalized = normalize_product_name(name, specs)

    # Try exact match first
    product = db.query(Product).filter_by(normalized_name=normalized).first()

    if not product:
        # Try fuzzy matching (optional)
        similar = find_similar_products(name, threshold=0.85)
        if similar:
            return similar[0]

    return product
```

---

## Data Validation Rules

Before inserting into database:

```python
def validate_scraped_data(data):
    assert data['price'] > 0, "Price must be positive"
    assert data['currency'] in ['EUR', 'USD', 'GBP'], "Invalid currency"
    assert isinstance(data['in_stock'], bool), "in_stock must be boolean"
    assert data['scraped_at'] <= datetime.now(), "Future timestamp not allowed"
    assert data['url'].startswith('http'), "Invalid URL"
    return True
```

---

## Summary: Why This Design Works

### ✅ Solves Your Core Problem
- **"When is it cheapest?"** → Time-series structure enables seasonal analysis
- **"Which seller?"** → Retailer comparison queries
- **"Track over time?"** → Complete price history preserved

### ✅ Scalability
- Partitioning handles millions of records
- Indexes optimize common queries
- Can archive old data easily

### ✅ Data Integrity
- Normalized structure (no redundancy)
- Foreign keys maintain relationships
- Validation prevents bad data

### ✅ Flexibility
- JSONB for varying product specs
- Easy to add new retailers/products
- Extensible for future features (alerts, predictions)

---

## Next Steps for Implementation

1. ✅ **Create database schema** (migration files)
2. ✅ **Build connection utility** (SQLAlchemy or psycopg2)
3. ✅ **Implement data pipeline** (scraper → DB)
4. ✅ **Add analytical queries** (price trends, comparisons)
5. ✅ **Create visualization** (Chart.js integration)
6. ✅ **Set up automation** (scheduled scraping + analysis)

---

## Additional Considerations

### TimescaleDB Extension (Optional)
For advanced time-series features:

```sql
-- Convert to hypertable
SELECT create_hypertable('price_history', 'scraped_at');

-- Automatic compression for old data
SELECT add_compression_policy('price_history', INTERVAL '90 days');

-- Continuous aggregates for dashboards
CREATE MATERIALIZED VIEW monthly_avg_prices
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 month', scraped_at) as month,
    product_id,
    AVG(price) as avg_price
FROM price_history
GROUP BY month, product_id;
```

### Backup Strategy
- Daily backups of entire database
- Point-in-time recovery enabled
- Export price_history monthly to CSV for redundancy

### Monitoring
- Track database size growth
- Monitor query performance
- Alert on failed scrapes (missing data)
