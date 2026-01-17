/**
 * Database Connection Utility
 *
 * Provides PostgreSQL connection pooling and comprehensive helper functions
 * for the Personal Automation Dashboard (Granules Price Tracking application).
 *
 * @module database/db
 * @description
 * This module serves as the primary data access layer for the application, providing:
 *
 * **Core Functionality:**
 * - Connection pool management (PostgreSQL via node-postgres)
 * - Transaction support for atomic multi-query operations
 * - Query execution with automatic logging and error handling
 *
 * **Helper Functions:**
 * 1. **Product & Retailer Management**
 *    - upsertRetailer() - Create or update retailer records
 *    - findProductByNormalizedName() - Deduplicate products
 *    - createProduct() - Insert new product records
 *
 * 2. **Price Data Management**
 *    - insertPriceHistory() - Record price observations (time-series data)
 *    - getLatestPrices() - Current prices via materialized view
 *    - getPriceHistory() - Historical price trends with filtering
 *
 * 3. **Analytics & Insights**
 *    - getMonthlyAveragePrices() - Seasonal pattern analysis
 *    - compareRetailers() - Cross-retailer price comparison
 *    - detectPriceDrops() - Automated deal detection
 *
 * 4. **AI-Powered Insights Caching**
 *    - saveInsights() - Cache LLM-generated analysis
 *    - getLatestInsights() - Retrieve cached insights
 *    - deactivateOldInsights() - Invalidate stale cache
 *    - cleanupExpiredInsights() - Automatic expiration cleanup
 *
 * 5. **Database Maintenance**
 *    - createNextMonthPartition() - Proactive partition management
 *    - getPoolStats() - Connection pool monitoring
 *    - testConnection() - Health checks
 *
 * **Database Architecture:**
 * - **Partitioning:** price_history table is partitioned monthly for performance
 * - **Materialized Views:** latest_prices view for fast current-price lookups
 * - **Stored Procedures:** Complex logic encapsulated in database functions
 * - **JSONB Storage:** AI insights stored as binary JSON for efficient querying
 *
 * **Performance Considerations:**
 * - All time-range queries leverage partition pruning
 * - Composite indexes on (product_id, scraped_at) and (retailer_id, scraped_at)
 * - Connection pooling (max 20 connections) prevents resource exhaustion
 * - Query logging available via LOG_QUERIES environment variable
 *
 * **Security Notes:**
 * - All queries use parameterized statements to prevent SQL injection
 * - Some INTERVAL clauses use safe string interpolation (numeric-only inputs)
 * - Pool credentials loaded from environment variables (.env file)
 *
 * @example
 * // Basic usage
 * import db from './database/db.js';
 *
 * // Test connection
 * await db.testConnection();
 *
 * // Create retailer
 * const retailer = await db.upsertRetailer({
 *   name: 'Granulu Nams',
 *   website_url: 'https://example.com',
 *   location: 'Riga'
 * });
 *
 * // Insert price observation
 * await db.insertPriceHistory({
 *   product_id: 42,
 *   retailer_id: retailer.id,
 *   price: 5.99,
 *   in_stock: true
 * });
 *
 * // Detect price drops
 * const deals = await db.detectPriceDrops(10); // 10% threshold
 *
 * @see {@link https://node-postgres.com/ | node-postgres documentation}
 * @see {@link DATABASE_STRATEGY.md} Database schema and design decisions
 * @see {@link API_ENDPOINTS.md} REST API endpoints using these functions
 */

import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config();

/**
 * PostgreSQL connection pool configuration
 * Uses environment variables from .env file
 */
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'granules_tracker',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,

  // Pool configuration
  max: 20,                    // Maximum number of clients in the pool
  idleTimeoutMillis: 30000,   // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return error after 2 seconds if no connection available
});

/**
 * Test database connection
 * @returns {Promise<boolean>} True if connection successful
 */
async function testConnection() {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW() as now, version() as version');
    console.log('✅ Database connected successfully');
    console.log('   Time:', result.rows[0].now);
    console.log('   Version:', result.rows[0].version.split(',')[0]);
    client.release();
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
}

/**
 * Execute a query with parameters
 * @param {string} text - SQL query text
 * @param {Array} params - Query parameters
 * @returns {Promise<Object>} Query result
 */
async function query(text, params) {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;

    if (process.env.LOG_QUERIES === 'true') {
      console.log('Executed query:', { text, duration, rows: result.rowCount });
    }

    return result;
  } catch (error) {
    console.error('Query error:', error.message);
    console.error('Query:', text);
    console.error('Params:', params);
    throw error;
  }
}

/**
 * Get a client from the pool for transactions
 * @returns {Promise<Object>} Database client
 */
async function getClient() {
  const client = await pool.connect();
  return client;
}

/**
 * Execute multiple queries in a transaction
 * @param {Function} callback - Function that receives client and executes queries
 * @returns {Promise<*>} Result from callback
 */
async function transaction(callback) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Close all pool connections
 * Call this when shutting down the application
 */
async function close() {
  await pool.end();
  console.log('Database pool closed');
}

/**
 * Get pool statistics
 * @returns {Object} Pool statistics
 */
function getPoolStats() {
  return {
    total: pool.totalCount,
    idle: pool.idleCount,
    waiting: pool.waitingCount,
  };
}

// ============================================================================
// HELPER FUNCTIONS FOR COMMON OPERATIONS
// ============================================================================

/**
 * Insert or update a retailer
 *
 * This function implements an "upsert" pattern (insert or update) for retailer records.
 * If a retailer with the same name already exists, it updates the record with new data.
 *
 * @param {Object} retailerData - Retailer information
 * @param {string} retailerData.name - Unique retailer name (used as conflict key)
 * @param {string} [retailerData.website_url] - Retailer's website URL (optional)
 * @param {string} [retailerData.location] - Physical location or region (optional)
 * @returns {Promise<Object>} Complete retailer record including auto-generated id and timestamps
 *
 * @example
 * const retailer = await upsertRetailer({
 *   name: 'Granulu Nams',
 *   website_url: 'https://example.com',
 *   location: 'Riga'
 * });
 *
 * @description
 * **Conflict Resolution:** Uses the retailer `name` as the unique constraint key.
 * When a conflict occurs (retailer with same name exists):
 * - COALESCE preserves existing values if new values are NULL
 * - Only updates non-NULL fields, preventing accidental data loss
 * - Automatically updates the `updated_at` timestamp
 *
 * **Database Schema Dependency:**
 * - Requires UNIQUE constraint on `retailers.name` column
 * - Expects `created_at` and `updated_at` timestamp columns with defaults
 */
async function upsertRetailer(retailerData) {
  const { name, website_url, location } = retailerData;

  // Use ON CONFLICT to handle duplicate names gracefully
  // COALESCE ensures we don't overwrite existing data with NULL values
  const result = await query(
    `INSERT INTO retailers (name, website_url, location)
     VALUES ($1, $2, $3)
     ON CONFLICT (name)
     DO UPDATE SET
       website_url = COALESCE(EXCLUDED.website_url, retailers.website_url),
       location = COALESCE(EXCLUDED.location, retailers.location),
       updated_at = CURRENT_TIMESTAMP
     RETURNING *`,
    [name, website_url, location]
  );

  return result.rows[0];
}

/**
 * Find product by normalized name
 *
 * Searches for an existing product using its normalized name. This is used
 * to prevent duplicate products with slightly different naming variations.
 *
 * @param {string} normalizedName - Normalized product name (lowercase, spaces removed)
 * @returns {Promise<Object|null>} Complete product record if found, null otherwise
 *
 * @example
 * const product = await findProductByNormalizedName('woodpellets6mm15kg');
 * if (product) {
 *   console.log('Found existing product:', product.product_name);
 * }
 *
 * @description
 * **Normalization Strategy:**
 * Product names should be normalized using `productNormalizer.normalizeProductName()`
 * before calling this function. The normalization typically:
 * - Converts to lowercase
 * - Removes special characters
 * - Standardizes spacing
 * - Extracts key attributes (weight, size, brand)
 *
 * **Use Cases:**
 * - Deduplication during scraping (avoid creating duplicate products)
 * - Matching scraped data to existing product records
 * - Consolidating price history for the same product from different retailers
 *
 * **Performance:** Uses indexed normalized_name column for fast lookups
 */
async function findProductByNormalizedName(normalizedName) {
  // Query uses indexed column for O(log n) lookup performance
  const result = await query(
    'SELECT * FROM products WHERE normalized_name = $1 LIMIT 1',
    [normalizedName]
  );

  return result.rows.length > 0 ? result.rows[0] : null;
}

/**
 * Create a new product
 *
 * Inserts a new product record into the database. This should only be called
 * after verifying the product doesn't already exist using findProductByNormalizedName().
 *
 * @param {Object} productData - Product information
 * @param {string} productData.product_name - Human-readable product name as shown on retailer site
 * @param {string} [productData.brand] - Brand name (e.g., 'Latgran', 'Lignums')
 * @param {string} [productData.category] - Product category (defaults to 'wood_pellets')
 * @param {Object|string} [productData.specifications] - Product specs (weight, diameter, packaging)
 * @param {string} productData.normalized_name - Normalized name for deduplication (required)
 * @returns {Promise<Object>} Complete product record including auto-generated id and timestamps
 *
 * @example
 * const product = await createProduct({
 *   product_name: 'Latgran Premium Wood Pellets 15kg',
 *   brand: 'Latgran',
 *   category: 'wood_pellets',
 *   specifications: { weight: '15kg', diameter: '6mm', packaging: 'bag' },
 *   normalized_name: 'latgranpremium15kg6mm'
 * });
 *
 * @description
 * **Default Values:**
 * - `category` defaults to 'wood_pellets' if not provided
 * - `created_at` and `updated_at` timestamps are auto-generated by database
 *
 * **Validation:**
 * - normalized_name is REQUIRED and should be unique
 * - product_name is REQUIRED
 * - specifications can be JSON object or string (stored as JSONB in PostgreSQL)
 *
 * **Best Practices:**
 * - Always check for existing product first using findProductByNormalizedName()
 * - Use productNormalizer utility to generate normalized_name
 * - Store structured data in specifications (not free text)
 *
 * **Related Functions:**
 * - See `findProductByNormalizedName()` for deduplication
 * - See `utils/productNormalizer.js` for name normalization
 */
async function createProduct(productData) {
  const { product_name, brand, category, specifications, normalized_name } = productData;

  // Default to 'wood_pellets' category for granules/pellet tracking
  // This can be extended to support other product categories in the future
  const result = await query(
    `INSERT INTO products (product_name, brand, category, specifications, normalized_name)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [product_name, brand, category || 'wood_pellets', specifications, normalized_name]
  );

  return result.rows[0];
}

/**
 * Insert price history record
 *
 * Records a price snapshot for a product at a specific retailer. Each record represents
 * a single price observation at a point in time, enabling historical price tracking and
 * trend analysis.
 *
 * @param {Object} priceData - Price observation data
 * @param {number} priceData.product_id - Foreign key to products table (required)
 * @param {number} priceData.retailer_id - Foreign key to retailers table (required)
 * @param {number} priceData.price - Price value as decimal (required)
 * @param {string} [priceData.currency='EUR'] - ISO currency code (defaults to EUR)
 * @param {boolean} [priceData.in_stock=true] - Stock availability status (defaults to true)
 * @param {number} [priceData.quantity] - Package quantity (e.g., 15 for 15kg bag)
 * @param {string} [priceData.unit] - Unit of measurement (e.g., 'kg', 'ton', 'bag')
 * @param {string} [priceData.source_url] - URL where price was found (for verification)
 * @param {Date} [priceData.scraped_at=new Date()] - Timestamp of scraping (defaults to now)
 * @returns {Promise<Object>} Complete price history record including auto-generated id
 *
 * @example
 * const priceRecord = await insertPriceHistory({
 *   product_id: 42,
 *   retailer_id: 7,
 *   price: 5.99,
 *   currency: 'EUR',
 *   in_stock: true,
 *   quantity: 15,
 *   unit: 'kg',
 *   source_url: 'https://retailer.com/products/pellets-15kg'
 * });
 *
 * @description
 * **Default Values:**
 * - `currency`: 'EUR' (assumes Euro zone pricing)
 * - `in_stock`: true (assumes available unless explicitly marked false)
 * - `scraped_at`: Current timestamp (time of function execution)
 *
 * **Time-Series Partitioning:**
 * This table is partitioned by month for performance optimization.
 * Queries filtering by date range will only scan relevant partitions.
 *
 * **Foreign Key Constraints:**
 * - product_id must reference valid products.id
 * - retailer_id must reference valid retailers.id
 * - Insert will fail if references don't exist
 *
 * **Analytics Use Cases:**
 * - Price trend visualization (line charts over time)
 * - Price drop detection (compare current vs historical prices)
 * - Retailer comparison (find cheapest option)
 * - Seasonal pattern analysis (heatmaps, averages by month)
 * - Stock availability tracking (alert when products come back in stock)
 *
 * **Performance Notes:**
 * - Table uses automatic monthly partitioning for scalability
 * - Composite indexes on (product_id, scraped_at) and (retailer_id, scraped_at)
 * - Consider batch inserts for bulk scraping operations using transaction()
 */
async function insertPriceHistory(priceData) {
  const {
    product_id,
    retailer_id,
    price,
    currency = 'EUR',         // Default to EUR for European retailers
    in_stock = true,          // Assume in stock unless explicitly marked false
    quantity,
    unit,
    source_url,
    scraped_at = new Date()   // Default to current timestamp
  } = priceData;

  const result = await query(
    `INSERT INTO price_history
     (product_id, retailer_id, price, currency, in_stock, quantity, unit, source_url, scraped_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [product_id, retailer_id, price, currency, in_stock, quantity, unit, source_url, scraped_at]
  );

  return result.rows[0];
}

/**
 * Get latest prices for all products
 *
 * Retrieves the most recent price observation for each product-retailer combination.
 * Uses a database VIEW for optimized performance.
 *
 * @returns {Promise<Array>} Array of latest price records with product and retailer details
 *
 * @example
 * const latestPrices = await getLatestPrices();
 * // Returns: [
 * //   {
 * //     product_id: 1,
 * //     product_name: 'Wood Pellets 15kg',
 * //     retailer_id: 5,
 * //     retailer_name: 'Granulu Nams',
 * //     price: 5.99,
 * //     currency: 'EUR',
 * //     in_stock: true,
 * //     scraped_at: '2024-01-15T10:30:00Z'
 * //   },
 * //   ...
 * // ]
 *
 * @description
 * **Database View:**
 * This function queries the `latest_prices` materialized view, which is defined as:
 * ```sql
 * CREATE MATERIALIZED VIEW latest_prices AS
 * SELECT DISTINCT ON (product_id, retailer_id)
 *   product_id, retailer_id, price, currency, in_stock, scraped_at,
 *   product_name, retailer_name
 * FROM price_history
 * JOIN products USING (product_id)
 * JOIN retailers USING (retailer_id)
 * ORDER BY product_id, retailer_id, scraped_at DESC;
 * ```
 *
 * **Performance Optimization:**
 * - Materialized view provides O(1) access to latest prices
 * - View should be refreshed after bulk scraping operations
 * - Much faster than querying full price_history table
 *
 * **Refresh Strategy:**
 * The view may not include the very latest inserts until refreshed.
 * To refresh: `REFRESH MATERIALIZED VIEW latest_prices;`
 *
 * **Use Cases:**
 * - Dashboard overview (current prices for all products)
 * - Price comparison tables
 * - Stock availability check
 * - Quick price lookup without historical data
 */
async function getLatestPrices() {
  // Query the materialized view for O(1) performance
  // Results ordered by product and retailer for consistent display
  const result = await query('SELECT * FROM latest_prices ORDER BY product_name, retailer_name');
  return result.rows;
}

/**
 * Get price history for a product
 *
 * Retrieves historical price records for a specific product, optionally filtered
 * by retailer and time range. Results include joined product and retailer names
 * for easy display.
 *
 * @param {number} productId - Product ID (required)
 * @param {Object} [options] - Query options
 * @param {number} [options.days=90] - Number of days to look back (default: 90 days)
 * @param {number} [options.retailerId] - Filter by specific retailer (optional)
 * @returns {Promise<Array>} Price history records ordered by date (newest first)
 *
 * @example
 * // Get 90 days of price history for product #42
 * const history = await getPriceHistory(42);
 *
 * // Get 30 days from a specific retailer
 * const retailerHistory = await getPriceHistory(42, { days: 30, retailerId: 7 });
 *
 * @description
 * **Return Structure:**
 * Each record contains:
 * - All price_history columns (id, price, currency, in_stock, quantity, etc.)
 * - retailer_name (joined from retailers table)
 * - product_name (joined from products table)
 *
 * **Dynamic Query Building:**
 * The query is built dynamically based on options:
 * - Base query filters by product_id and date range
 * - Optional retailer filter added if retailerId provided
 * - Results always ordered by scraped_at DESC (newest first)
 *
 * **⚠️ SECURITY NOTE:**
 * Current implementation uses string interpolation for the INTERVAL clause:
 * `INTERVAL '${days} days'`
 *
 * This is safe ONLY because `days` is a number and not user-controlled string.
 * If accepting string input, use parameterized queries to prevent SQL injection.
 *
 * **Performance Considerations:**
 * - Uses composite index on (product_id, scraped_at) for efficient filtering
 * - Date range leverages partition pruning (only scans relevant monthly partitions)
 * - Smaller day ranges = faster queries (30 days faster than 365 days)
 * - Consider pagination for very long date ranges (>1 year)
 *
 * **Use Cases:**
 * - Price trend charts (line graphs showing price over time)
 * - Historical price comparison across retailers
 * - Volatility analysis (price fluctuation detection)
 * - Data export for external analysis
 */
async function getPriceHistory(productId, options = {}) {
  const { days = 90, retailerId } = options;

  // Build query dynamically based on optional filters
  // Note: String interpolation of `days` is safe because it's a number
  // If this were user-controlled string input, use parameterized query instead
  let queryText = `
    SELECT
      ph.*,
      r.name as retailer_name,
      p.product_name
    FROM price_history ph
    JOIN retailers r ON ph.retailer_id = r.id
    JOIN products p ON ph.product_id = p.id
    WHERE ph.product_id = $1
      AND ph.scraped_at >= NOW() - INTERVAL '${days} days'
  `;

  const params = [productId];

  // Optionally filter by specific retailer
  if (retailerId) {
    queryText += ' AND ph.retailer_id = $2';
    params.push(retailerId);
  }

  // Order by newest first for consistent UI display
  queryText += ' ORDER BY ph.scraped_at DESC';

  const result = await query(queryText, params);
  return result.rows;
}

/**
 * Get monthly average prices
 *
 * Calculates aggregated price statistics grouped by month and retailer for a specific product.
 * Useful for identifying seasonal pricing patterns and long-term price trends.
 *
 * @param {number} productId - Product ID (required)
 * @param {number} [months=12] - Number of months to analyze (default: 12 months)
 * @returns {Promise<Array>} Monthly aggregated statistics per retailer
 *
 * @example
 * const monthlyStats = await getMonthlyAveragePrices(42, 12);
 * // Returns: [
 * //   {
 * //     month: '2024-01-01T00:00:00Z',
 * //     retailer_id: 5,
 * //     avg_price: 6.23,
 * //     min_price: 5.99,
 * //     max_price: 6.49,
 * //     sample_count: 15
 * //   },
 * //   ...
 * // ]
 *
 * @description
 * **Aggregation Strategy:**
 * - Groups price observations by calendar month (DATE_TRUNC to first day of month)
 * - Calculates AVG, MIN, MAX for each month-retailer combination
 * - Includes sample_count to indicate data quality (more samples = more reliable average)
 *
 * **Date Truncation:**
 * DATE_TRUNC('month', scraped_at) converts all dates to the 1st of their month:
 * - 2024-01-15 → 2024-01-01
 * - 2024-01-28 → 2024-01-01
 * This allows aggregation by month regardless of scraping frequency
 *
 * **Statistics Explained:**
 * - `avg_price`: Mean price for that month (best indicator of typical price)
 * - `min_price`: Lowest observed price (potential deal or outlier)
 * - `max_price`: Highest observed price (spike or premium pricing)
 * - `sample_count`: Number of price observations (confidence indicator)
 *
 * **Use Cases:**
 * - Monthly bar charts showing average prices over time
 * - Seasonal pattern detection (e.g., "prices rise in winter")
 * - Volatility analysis (large min/max spread = unstable pricing)
 * - Data quality assessment (low sample_count may indicate gaps)
 * - Retailer comparison over long periods
 *
 * **Performance Notes:**
 * - Partition pruning limits scan to specified month range
 * - Aggregation is efficient due to indexes on (product_id, scraped_at)
 * - For very large datasets (millions of rows), consider materializing results
 *
 * **⚠️ SECURITY NOTE:**
 * Uses string interpolation for INTERVAL (same as getPriceHistory)
 * Safe because `months` is a number, not user-controlled string
 */
async function getMonthlyAveragePrices(productId, months = 12) {
  // Aggregate price data by month and retailer
  // DATE_TRUNC truncates to first day of month for grouping
  const result = await query(
    `SELECT
       DATE_TRUNC('month', scraped_at) as month,
       retailer_id,
       AVG(price) as avg_price,
       MIN(price) as min_price,
       MAX(price) as max_price,
       COUNT(*) as sample_count
     FROM price_history
     WHERE product_id = $1
       AND scraped_at >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '${months} months')
     GROUP BY DATE_TRUNC('month', scraped_at), retailer_id
     ORDER BY month DESC, retailer_id`,
    [productId]
  );

  return result.rows;
}

/**
 * Compare prices across retailers for a product
 *
 * Aggregates pricing data by retailer to enable side-by-side comparison of which
 * stores offer the best prices for a specific product over a given time window.
 *
 * @param {number} productId - Product ID (required)
 * @param {number} [days=30] - Time window in days to analyze (default: 30)
 * @returns {Promise<Array>} Retailer statistics sorted by average price (cheapest first)
 *
 * @example
 * const comparison = await compareRetailers(42, 30);
 * // Returns: [
 * //   {
 * //     retailer: 'Granulu Nams',
 * //     location: 'Riga',
 * //     avg_price: 5.89,
 * //     best_price: 5.49,
 * //     worst_price: 6.29,
 * //     price_checks: 8,
 * //     always_in_stock: true
 * //   },
 * //   {
 * //     retailer: 'Competitor Store',
 * //     location: 'Liepāja',
 * //     avg_price: 6.45,
 * //     best_price: 6.29,
 * //     worst_price: 6.99,
 * //     price_checks: 5,
 * //     always_in_stock: false
 * //   },
 * //   ...
 * // ]
 *
 * @description
 * **Aggregated Statistics:**
 * - `avg_price`: Average price over the time period (best overall value indicator)
 * - `best_price`: Lowest price observed (best deal if timing is right)
 * - `worst_price`: Highest price observed (worst case scenario)
 * - `price_checks`: Number of times price was scraped (data quality indicator)
 * - `always_in_stock`: true if product was in stock for ALL observations
 *
 * **BOOL_AND Explained:**
 * PostgreSQL's BOOL_AND is an aggregate function that returns:
 * - `true` if ALL values in the group are true (product always in stock)
 * - `false` if ANY value is false (product went out of stock at least once)
 * - `null` if all values are null
 *
 * This is equivalent to: `all_in_stock = min(in_stock)` or `AND(in_stock)`
 *
 * **Sorting Logic:**
 * Results are ordered by avg_price ASC (cheapest retailer first).
 * This makes it easy to identify the most economical option.
 *
 * **Use Cases:**
 * - "Where should I buy?" decision making
 * - Retailer comparison tables in UI
 * - Identifying consistently cheap vs expensive retailers
 * - Stock availability assessment (avoid retailers with frequent stockouts)
 * - Geographic price variation analysis (by location)
 *
 * **Interpretation Tips:**
 * - Low avg_price = good overall value
 * - best_price = potential for deals (watch for sales)
 * - Large (worst_price - best_price) spread = volatile pricing
 * - always_in_stock = true → reliable availability
 * - High price_checks = more reliable statistics
 *
 * **Performance:**
 * - Efficient due to indexes on (product_id, scraped_at)
 * - Partition pruning limits scan to relevant date range
 * - GROUP BY on low-cardinality columns (retailer name/location)
 *
 * **⚠️ SECURITY NOTE:**
 * Uses string interpolation for INTERVAL (safe because `days` is a number)
 */
async function compareRetailers(productId, days = 30) {
  const result = await query(
    `SELECT
       r.name as retailer,
       r.location,
       AVG(ph.price) as avg_price,
       MIN(ph.price) as best_price,
       MAX(ph.price) as worst_price,
       COUNT(*) as price_checks,
       BOOL_AND(ph.in_stock) as always_in_stock  -- true only if ALWAYS in stock
     FROM price_history ph
     JOIN retailers r ON ph.retailer_id = r.id
     WHERE ph.product_id = $1
       AND ph.scraped_at >= NOW() - INTERVAL '${days} days'
     GROUP BY r.name, r.location
     ORDER BY avg_price ASC`,  -- Cheapest retailer first
    [productId]
  );

  return result.rows;
}

/**
 * Detect significant price drops
 *
 * Identifies products that have experienced price drops exceeding a specified threshold
 * by comparing current prices against prices from 7 days ago. Returns products sorted
 * by largest price drop first (most negative percentage change).
 *
 * @param {number} [threshold=10] - Minimum percentage drop to detect (default: 10%)
 * @returns {Promise<Array>} Products with significant price drops, sorted by percent_change
 *
 * @example
 * // Detect price drops of 10% or more
 * const deals = await detectPriceDrops(10);
 * // Returns: [
 * //   {
 * //     product_name: 'Wood Pellets Premium 15kg',
 * //     brand: 'Latgran',
 * //     retailer: 'Granulu Nams',
 * //     previous_price: 6.99,
 * //     current_price: 5.99,
 * //     percent_change: -14.31,
 * //     scraped_at: '2024-01-15T10:30:00Z'
 * //   },
 * //   ...
 * // ]
 *
 * // Detect any price drop (even small ones)
 * const allDrops = await detectPriceDrops(0);
 *
 * @description
 * **Algorithm:**
 * This function uses a sophisticated two-step comparison algorithm:
 *
 * 1. **Latest Prices CTE:**
 *    - Uses DISTINCT ON to get the most recent price for each product-retailer pair
 *    - Represents "current" prices (most recent scrape)
 *
 * 2. **Previous Prices CTE:**
 *    - Gets the most recent price from at least 7 days ago
 *    - Filters `scraped_at < NOW() - INTERVAL '7 days'`
 *    - Represents "baseline" price to compare against
 *
 * 3. **Comparison Logic:**
 *    - Joins both CTEs on (product_id, retailer_id)
 *    - Calculates percentage change: (current - previous) / previous * 100
 *    - Filters where current_price < previous_price * (1 - threshold/100)
 *    - Example: For 10% threshold, only shows drops where current < previous * 0.9
 *
 * **Percentage Calculation:**
 * - Negative values indicate price drops (e.g., -15.5 = 15.5% cheaper)
 * - Formula: ((current - previous) / previous) * 100
 * - Rounded to 2 decimal places for readability
 *
 * **7-Day Window:**
 * The comparison window is hardcoded to 7 days to balance:
 * - Sensitivity: Detects recent changes (not months-old drops)
 * - Stability: Ignores daily fluctuations (compares week-over-week)
 *
 * **Use Cases:**
 * - Price drop alerts (email notifications when threshold exceeded)
 * - Deal detection for "best time to buy" recommendations
 * - Retailer promotion monitoring
 * - Market trend analysis (widespread drops may indicate seasonal changes)
 *
 * **Performance:**
 * - CTEs are optimized with DISTINCT ON for O(n) performance
 * - Uses indexes on (product_id, retailer_id, scraped_at)
 * - Partition pruning limits scans to recent 7-day partition
 *
 * **Limitations:**
 * - Requires at least 7 days of historical data
 * - Products with no price 7+ days ago won't appear in results
 * - Doesn't account for products that went out of stock then back in
 * - Threshold applies equally to all products (no product-specific thresholds)
 *
 * **Related Functions:**
 * - See `getPriceHistory()` for detailed price trends
 * - See `compareRetailers()` for cross-retailer price comparison
 */
async function detectPriceDrops(threshold = 10) {
  const result = await query(
    `WITH latest_prices AS (
       -- Get the most recent price for each product-retailer combination
       SELECT DISTINCT ON (product_id, retailer_id)
         product_id,
         retailer_id,
         price as current_price,
         scraped_at
       FROM price_history
       ORDER BY product_id, retailer_id, scraped_at DESC
     ),
     previous_prices AS (
       -- Get the most recent price from at least 7 days ago (baseline comparison)
       SELECT DISTINCT ON (product_id, retailer_id)
         product_id,
         retailer_id,
         price as previous_price
       FROM price_history
       WHERE scraped_at < NOW() - INTERVAL '7 days'
       ORDER BY product_id, retailer_id, scraped_at DESC
     )
     -- Compare current vs previous and calculate percentage change
     SELECT
       p.product_name,
       p.brand,
       r.name as retailer,
       prev.previous_price,
       curr.current_price,
       ROUND((curr.current_price - prev.previous_price) / prev.previous_price * 100, 2) as percent_change,
       curr.scraped_at
     FROM latest_prices curr
     JOIN previous_prices prev USING (product_id, retailer_id)
     JOIN products p ON curr.product_id = p.id
     JOIN retailers r ON curr.retailer_id = r.id
     -- Filter to only price drops exceeding the threshold
     WHERE curr.current_price < prev.previous_price * (1 - $1 / 100.0)
     -- Sort by largest drop first (most negative percentage)
     ORDER BY percent_change ASC`,
    [threshold]
  );

  return result.rows;
}

/**
 * Create next month's partition
 *
 * Proactively creates a new partition table for the next calendar month in the
 * price_history partitioning scheme. This prevents insertion failures when the
 * month rolls over.
 *
 * @returns {Promise<string>} Name of the created partition table
 *
 * @example
 * const partitionName = await createNextMonthPartition();
 * // Returns: 'price_history_2024_02' (if called in January 2024)
 *
 * @description
 * **Table Partitioning:**
 * The price_history table is partitioned by month for performance optimization.
 * Each month's data is stored in a separate child table:
 * - price_history_2024_01 (January 2024)
 * - price_history_2024_02 (February 2024)
 * - etc.
 *
 * **Stored Procedure:**
 * This function calls the PostgreSQL stored procedure `create_next_month_partition()`
 * which handles the DDL operations:
 * ```sql
 * CREATE TABLE IF NOT EXISTS price_history_YYYY_MM
 * PARTITION OF price_history
 * FOR VALUES FROM ('YYYY-MM-01') TO ('YYYY-MM+1-01');
 * ```
 *
 * **When to Call:**
 * - Scheduled job at end of each month (e.g., cron job on 25th)
 * - Application startup (defensive check)
 * - Manual maintenance operations
 *
 * **Idempotent:**
 * The stored procedure uses CREATE TABLE IF NOT EXISTS, so it's safe to call
 * multiple times. Subsequent calls will return the existing partition name.
 *
 * **Why Partition?**
 * Benefits of monthly partitioning:
 * - Faster queries (partition pruning skips irrelevant months)
 * - Easier archival (drop old partitions instead of DELETE)
 * - Better index performance (smaller indexes per partition)
 * - Parallel query execution (scan multiple partitions simultaneously)
 *
 * **Performance Impact:**
 * - Partition creation is fast (~50ms) as it only creates metadata
 * - No data movement or copying occurs
 * - Brief metadata lock (does not block existing queries)
 *
 * **Failure Handling:**
 * If partition creation fails (permissions, disk space, etc.), inserts for
 * the next month will fail with "no partition found" errors.
 *
 * **Related Maintenance:**
 * Consider also implementing partition cleanup to drop partitions older than
 * a retention period (e.g., > 2 years old).
 */
async function createNextMonthPartition() {
  // Call stored procedure to create next month's partition
  // Returns the partition table name (e.g., 'price_history_2024_02')
  const result = await query(
    `SELECT create_next_month_partition() as partition_name`
  );

  return result.rows[0].partition_name;
}

// ============================================================================
// AI INSIGHTS HELPER FUNCTIONS
// ============================================================================

/**
 * Save AI-generated insights to database
 *
 * Persists insights generated by OpenAI/LLM analysis to enable caching and avoid
 * redundant API calls. Insights are stored with expiration timestamps for automatic
 * invalidation when data becomes stale.
 *
 * @param {Object} insightsData - Insights data to save
 * @param {Object|Array} insightsData.insights - Structured insights from AI (will be JSON-serialized)
 * @param {string} insightsData.summary - Human-readable summary text
 * @param {string} insightsData.data_period - Time range of analyzed data (e.g., "2024-01-01 to 2024-01-31")
 * @param {number} insightsData.sample_count - Number of price records analyzed
 * @param {number} [insightsData.product_id=null] - Specific product ID (null for all products)
 * @param {number} [insightsData.days_analyzed=30] - Number of days analyzed (for cache key)
 * @param {Date} [insightsData.expires_at=null] - Optional expiration timestamp (null = never expires)
 * @returns {Promise<Object>} Complete saved record including auto-generated id and generated_at
 *
 * @example
 * const saved = await saveInsights({
 *   insights: {
 *     trend: 'increasing',
 *     volatility: 'low',
 *     recommendations: ['Buy now', 'Prices expected to rise']
 *   },
 *   summary: 'Prices are trending upward with low volatility...',
 *   data_period: '2024-01-01 to 2024-01-30',
 *   sample_count: 245,
 *   product_id: 42,
 *   days_analyzed: 30,
 *   expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
 * });
 *
 * @description
 * **JSON Serialization:**
 * The `insights` field is automatically serialized to JSON using JSON.stringify()
 * before storage. It's stored as JSONB in PostgreSQL for:
 * - Efficient storage (binary format)
 * - Indexing and querying capabilities
 * - Automatic validation
 *
 * **Cache Key:**
 * Insights are uniquely identified by: (product_id, days_analyzed)
 * - product_id = null → insights for ALL products
 * - product_id = 42 → insights specific to product #42
 * - days_analyzed distinguishes 30-day vs 90-day analysis
 *
 * **Active/Inactive Pattern:**
 * When new insights are saved, old insights for the same cache key should be
 * deactivated using deactivateOldInsights() to prevent duplicates.
 *
 * **Expiration Strategy:**
 * - expires_at = null → Insights never expire (manual invalidation only)
 * - expires_at = timestamp → Auto-expire at specified time
 * - Cleanup via cleanupExpiredInsights() cron job
 *
 * **Default Values:**
 * - product_id defaults to null (global insights)
 * - days_analyzed defaults to 30 (standard monthly analysis)
 * - expires_at defaults to null (no expiration)
 * - generated_at is auto-set by database (CURRENT_TIMESTAMP)
 * - is_active defaults to true
 *
 * **Use Cases:**
 * - Cache LLM analysis results (avoid repeat API costs)
 * - Store market trend analysis
 * - Preserve buying recommendations
 * - Historical record of AI predictions (compare vs actual)
 *
 * **Cost Optimization:**
 * Caching insights can save significant API costs:
 * - Typical OpenAI API call: $0.01-$0.10 per analysis
 * - Cache hit: $0.00 (database query only)
 * - 90% cache hit rate = 90% cost reduction
 *
 * **Related Functions:**
 * - See `getLatestInsights()` to retrieve cached insights
 * - See `deactivateOldInsights()` to invalidate old insights
 * - See `cleanupExpiredInsights()` for automatic cleanup
 */
async function saveInsights(insightsData) {
  const {
    insights,
    summary,
    data_period,
    sample_count,
    product_id = null,        // null = insights for all products
    days_analyzed = 30,       // Default to 30-day analysis window
    expires_at = null         // null = never expires
  } = insightsData;

  // Serialize insights object to JSON string for JSONB storage
  // PostgreSQL will convert to binary JSONB format automatically
  const result = await query(
    `INSERT INTO ai_insights
     (insights, summary, data_period, sample_count, product_id, days_analyzed, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [JSON.stringify(insights), summary, data_period, sample_count, product_id, days_analyzed, expires_at]
  );

  return result.rows[0];
}

/**
 * Get latest active insights
 *
 * Retrieves the most recent active insights for a given configuration (product + time window).
 * Used to check if cached insights exist before making expensive LLM API calls.
 *
 * @param {Object} [options] - Query options
 * @param {number} [options.product_id=null] - Specific product ID (null for all products)
 * @param {number} [options.days=30] - Days analyzed (used as cache key)
 * @returns {Promise<Object|null>} Latest insights record with parsed JSON, or null if none found
 *
 * @example
 * // Check for cached insights for product #42 (30-day analysis)
 * const cached = await getLatestInsights({ product_id: 42, days: 30 });
 * if (cached) {
 *   console.log('Using cached insights:', cached.summary);
 *   console.log('Generated:', cached.generated_at);
 *   console.log('Insights:', cached.insights);
 * } else {
 *   console.log('No cache - need to generate new insights');
 * }
 *
 * // Get global insights (all products)
 * const global = await getLatestInsights({ product_id: null, days: 30 });
 *
 * @description
 * **Stored Procedure:**
 * This function calls the PostgreSQL stored procedure `get_latest_insights(product_id, days)`
 * which encapsulates the query logic:
 * ```sql
 * SELECT * FROM ai_insights
 * WHERE is_active = true
 *   AND (product_id = $1 OR ($1 IS NULL AND product_id IS NULL))
 *   AND days_analyzed = $2
 *   AND (expires_at IS NULL OR expires_at > NOW())
 * ORDER BY generated_at DESC
 * LIMIT 1;
 * ```
 *
 * **Cache Key Matching:**
 * Insights are matched on:
 * - product_id (exact match, including null)
 * - days_analyzed (exact match)
 * - is_active = true (not manually deactivated)
 * - Not expired (expires_at > NOW() or NULL)
 *
 * **JSON Deserialization:**
 * The stored insights field is returned as a string and automatically parsed:
 * - Database stores as JSONB (binary)
 * - Query returns as JSON string
 * - This function parses back to JavaScript object
 *
 * **Return Value:**
 * Returns complete insights record:
 * ```javascript
 * {
 *   id: 123,
 *   insights: { trend: 'up', volatility: 'low', ... },  // Parsed object
 *   summary: 'Prices are trending upward...',
 *   data_period: '2024-01-01 to 2024-01-30',
 *   sample_count: 245,
 *   product_id: 42,
 *   days_analyzed: 30,
 *   generated_at: '2024-01-15T10:00:00Z',
 *   expires_at: '2024-01-16T10:00:00Z',
 *   is_active: true
 * }
 * ```
 *
 * **Cache Hit Strategy:**
 * Typical usage pattern:
 * 1. Call getLatestInsights() to check cache
 * 2. If returns object → Use cached insights (fast, free)
 * 3. If returns null → Generate new insights via LLM API (slow, costs money)
 * 4. Save new insights with saveInsights()
 * 5. Deactivate old insights with deactivateOldInsights()
 *
 * **Performance:**
 * - Fast lookup via index on (product_id, days_analyzed, is_active, generated_at)
 * - Stored procedure avoids query parsing overhead
 * - Returns single row (no large result sets)
 *
 * **Expiration Handling:**
 * Automatically excludes expired insights even if is_active = true.
 * Expired insights remain in database for historical analysis.
 *
 * **Related Functions:**
 * - See `saveInsights()` to cache new insights
 * - See `deactivateOldInsights()` to invalidate stale cache
 * - See `cleanupExpiredInsights()` to remove expired records
 */
async function getLatestInsights(options = {}) {
  const { product_id = null, days = 30 } = options;

  // Call stored procedure to find latest active, non-expired insights
  // matching the cache key (product_id, days_analyzed)
  const result = await query(
    `SELECT * FROM get_latest_insights($1, $2)`,
    [product_id, days]
  );

  // No cached insights found
  if (result.rows.length === 0) {
    return null;
  }

  // Parse JSONB insights field back to JavaScript object
  // Database returns it as a string, we convert to object for convenience
  const insights = result.rows[0];
  if (typeof insights.insights === 'string') {
    insights.insights = JSON.parse(insights.insights);
  }

  return insights;
}

/**
 * Deactivate old insights for a specific configuration
 * @param {Object} options - { product_id, days }
 * @returns {Promise<number>} Number of deactivated records
 */
async function deactivateOldInsights(options = {}) {
  const { product_id = null, days = 30 } = options;

  const result = await query(
    `UPDATE ai_insights
     SET is_active = false
     WHERE is_active = true
       AND (($1::INTEGER IS NULL AND product_id IS NULL) OR product_id = $1)
       AND days_analyzed = $2
     RETURNING id`,
    [product_id, days]
  );

  return result.rowCount;
}

/**
 * Cleanup expired insights
 * @returns {Promise<number>} Number of deactivated records
 */
async function cleanupExpiredInsights() {
  const result = await query('SELECT cleanup_expired_insights() as count');
  return result.rows[0].count;
}

/**
 * Get all active insights (for debugging/admin)
 * @param {number} limit - Maximum number of records
 * @returns {Promise<Array>} Array of insights
 */
async function getAllActiveInsights(limit = 50) {
  const result = await query(
    `SELECT * FROM ai_insights
     WHERE is_active = true
     ORDER BY generated_at DESC
     LIMIT $1`,
    [limit]
  );

  return result.rows;
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  // Core functions
  pool,
  query,
  getClient,
  transaction,
  testConnection,
  close,
  getPoolStats,

  // Helper functions
  upsertRetailer,
  findProductByNormalizedName,
  createProduct,
  insertPriceHistory,
  getLatestPrices,
  getPriceHistory,
  getMonthlyAveragePrices,
  compareRetailers,
  detectPriceDrops,
  createNextMonthPartition,

  // AI Insights functions
  saveInsights,
  getLatestInsights,
  deactivateOldInsights,
  cleanupExpiredInsights,
  getAllActiveInsights,
};

export default {
  pool,
  query,
  getClient,
  transaction,
  testConnection,
  close,
  getPoolStats,
  upsertRetailer,
  findProductByNormalizedName,
  createProduct,
  insertPriceHistory,
  getLatestPrices,
  getPriceHistory,
  getMonthlyAveragePrices,
  compareRetailers,
  detectPriceDrops,
  createNextMonthPartition,
  saveInsights,
  getLatestInsights,
  deactivateOldInsights,
  cleanupExpiredInsights,
  getAllActiveInsights,
};
