/**
 * Database Connection Utility
 *
 * Provides PostgreSQL connection pooling and helper functions
 * for the Granules Price Tracking application.
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
 * @param {Object} retailerData - { name, website_url, location }
 * @returns {Promise<Object>} Retailer record with id
 */
async function upsertRetailer(retailerData) {
  const { name, website_url, location } = retailerData;

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
 * @param {string} normalizedName - Normalized product name
 * @returns {Promise<Object|null>} Product record or null
 */
async function findProductByNormalizedName(normalizedName) {
  const result = await query(
    'SELECT * FROM products WHERE normalized_name = $1 LIMIT 1',
    [normalizedName]
  );

  return result.rows.length > 0 ? result.rows[0] : null;
}

/**
 * Create a new product
 * @param {Object} productData - { product_name, brand, category, specifications, normalized_name }
 * @returns {Promise<Object>} Product record with id
 */
async function createProduct(productData) {
  const { product_name, brand, category, specifications, normalized_name } = productData;

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
 * @param {Object} priceData - { product_id, retailer_id, price, currency, in_stock, quantity, unit, source_url }
 * @returns {Promise<Object>} Inserted price record
 */
async function insertPriceHistory(priceData) {
  const {
    product_id,
    retailer_id,
    price,
    currency = 'EUR',
    in_stock = true,
    quantity,
    unit,
    source_url,
    scraped_at = new Date()
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
 * @returns {Promise<Array>} Array of latest prices
 */
async function getLatestPrices() {
  const result = await query('SELECT * FROM latest_prices ORDER BY product_name, retailer_name');
  return result.rows;
}

/**
 * Get price history for a product
 * @param {number} productId - Product ID
 * @param {Object} options - { days, retailerId }
 * @returns {Promise<Array>} Price history records
 */
async function getPriceHistory(productId, options = {}) {
  const { days = 90, retailerId } = options;

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

  if (retailerId) {
    queryText += ' AND ph.retailer_id = $2';
    params.push(retailerId);
  }

  queryText += ' ORDER BY ph.scraped_at DESC';

  const result = await query(queryText, params);
  return result.rows;
}

/**
 * Get monthly average prices
 * @param {number} productId - Product ID
 * @param {number} months - Number of months to look back
 * @returns {Promise<Array>} Monthly statistics
 */
async function getMonthlyAveragePrices(productId, months = 12) {
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
 * @param {number} productId - Product ID
 * @param {number} days - Number of days to analyze (default 30)
 * @returns {Promise<Array>} Retailer comparison
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
       BOOL_AND(ph.in_stock) as always_in_stock
     FROM price_history ph
     JOIN retailers r ON ph.retailer_id = r.id
     WHERE ph.product_id = $1
       AND ph.scraped_at >= NOW() - INTERVAL '${days} days'
     GROUP BY r.name, r.location
     ORDER BY avg_price ASC`,
    [productId]
  );

  return result.rows;
}

/**
 * Detect significant price drops
 * @param {number} threshold - Percentage threshold (default 10%)
 * @returns {Promise<Array>} Products with price drops
 */
async function detectPriceDrops(threshold = 10) {
  const result = await query(
    `WITH latest_prices AS (
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
     WHERE curr.current_price < prev.previous_price * (1 - $1 / 100.0)
     ORDER BY percent_change ASC`,
    [threshold]
  );

  return result.rows;
}

/**
 * Create next month's partition
 * @returns {Promise<string>} Partition name created
 */
async function createNextMonthPartition() {
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
 * @param {Object} insightsData - { insights, summary, data_period, sample_count, product_id, days_analyzed, expires_at }
 * @returns {Promise<Object>} Saved insights record
 */
async function saveInsights(insightsData) {
  const {
    insights,
    summary,
    data_period,
    sample_count,
    product_id = null,
    days_analyzed = 30,
    expires_at = null
  } = insightsData;

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
 * @param {Object} options - { product_id, days }
 * @returns {Promise<Object|null>} Latest insights or null
 */
async function getLatestInsights(options = {}) {
  const { product_id = null, days = 30 } = options;

  const result = await query(
    `SELECT * FROM get_latest_insights($1, $2)`,
    [product_id, days]
  );

  if (result.rows.length === 0) {
    return null;
  }

  // Parse JSON insights back to object
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
