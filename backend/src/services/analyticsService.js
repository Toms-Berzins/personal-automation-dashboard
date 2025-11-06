/**
 * Analytics Service
 *
 * Provides analytical queries for price tracking and insights
 */

import * as db from '../database/db.js';

/**
 * Get price trends for a product over time
 * @param {number} productId - Product ID
 * @param {Object} options - { days, groupBy: 'day'|'week'|'month' }
 * @returns {Promise<Array>} Price trend data
 */
async function getPriceTrends(productId, options = {}) {
  const { days = 90, groupBy = 'day' } = options;

  const truncFunction = {
    day: 'day',
    week: 'week',
    month: 'month'
  }[groupBy] || 'day';

  const result = await db.query(
    `SELECT
       DATE_TRUNC('${truncFunction}', scraped_at) as period,
       r.name as retailer,
       AVG(price) as avg_price,
       MIN(price) as min_price,
       MAX(price) as max_price,
       COUNT(*) as sample_count
     FROM price_history ph
     JOIN retailers r ON ph.retailer_id = r.id
     WHERE ph.product_id = $1
       AND ph.scraped_at >= NOW() - INTERVAL '${days} days'
     GROUP BY DATE_TRUNC('${truncFunction}', scraped_at), r.name
     ORDER BY period DESC, retailer`,
    [productId]
  );

  return result.rows;
}

/**
 * Find the cheapest time to buy (seasonal analysis)
 * @param {number} productId - Product ID
 * @returns {Promise<Array>} Monthly statistics showing cheapest months
 */
async function findCheapestTimes(productId) {
  const result = await db.query(
    `SELECT
       EXTRACT(MONTH FROM scraped_at) as month,
       TO_CHAR(scraped_at, 'Month') as month_name,
       AVG(price) as avg_price,
       MIN(price) as lowest_price,
       MAX(price) as highest_price,
       STDDEV(price) as price_stddev,
       COUNT(*) as sample_count
     FROM price_history
     WHERE product_id = $1
     GROUP BY EXTRACT(MONTH FROM scraped_at), TO_CHAR(scraped_at, 'Month')
     ORDER BY avg_price ASC`,
    [productId]
  );

  return result.rows;
}

/**
 * Compare all retailers for a product
 * @param {number} productId - Product ID
 * @param {number} days - Number of days to analyze
 * @returns {Promise<Array>} Retailer comparison with stats
 */
async function compareRetailersForProduct(productId, days = 30) {
  const result = await db.query(
    `SELECT
       r.id as retailer_id,
       r.name as retailer,
       r.location,
       r.website_url,
       AVG(ph.price) as avg_price,
       MIN(ph.price) as best_price,
       MAX(ph.price) as worst_price,
       STDDEV(ph.price) as price_volatility,
       COUNT(*) as price_checks,
       COUNT(CASE WHEN ph.in_stock THEN 1 END) as in_stock_count,
       ROUND(COUNT(CASE WHEN ph.in_stock THEN 1 END)::numeric / COUNT(*)::numeric * 100, 2) as availability_percent,
       MAX(ph.scraped_at) as last_checked
     FROM price_history ph
     JOIN retailers r ON ph.retailer_id = r.id
     WHERE ph.product_id = $1
       AND ph.scraped_at >= NOW() - INTERVAL '${days} days'
     GROUP BY r.id, r.name, r.location, r.website_url
     ORDER BY avg_price ASC`,
    [productId]
  );

  return result.rows;
}

/**
 * Get price alerts (significant price drops)
 * @param {Object} options - { threshold: number, days: number }
 * @returns {Promise<Array>} Products with significant price drops
 */
async function getPriceAlerts(options = {}) {
  const { threshold = 10, days = 7 } = options;

  const result = await db.query(
    `WITH latest_prices AS (
       SELECT DISTINCT ON (product_id, retailer_id)
         product_id,
         retailer_id,
         price as current_price,
         in_stock as current_stock,
         scraped_at as current_timestamp
       FROM price_history
       WHERE scraped_at >= NOW() - INTERVAL '24 hours'
       ORDER BY product_id, retailer_id, scraped_at DESC
     ),
     previous_prices AS (
       SELECT DISTINCT ON (product_id, retailer_id)
         product_id,
         retailer_id,
         price as previous_price,
         scraped_at as previous_timestamp
       FROM price_history
       WHERE scraped_at >= NOW() - INTERVAL '${days} days'
         AND scraped_at < NOW() - INTERVAL '24 hours'
       ORDER BY product_id, retailer_id, scraped_at DESC
     )
     SELECT
       p.id as product_id,
       p.product_name,
       p.brand,
       p.specifications,
       r.name as retailer,
       r.website_url as retailer_url,
       prev.previous_price,
       prev.previous_timestamp,
       curr.current_price,
       curr.current_timestamp,
       curr.current_stock as in_stock,
       ROUND((curr.current_price - prev.previous_price), 2) as price_change,
       ROUND((curr.current_price - prev.previous_price) / prev.previous_price * 100, 2) as percent_change
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
 * Get dashboard summary statistics
 * @returns {Promise<Object>} Dashboard stats
 */
async function getDashboardStats() {
  const [
    totalProducts,
    totalRetailers,
    totalPriceRecords,
    latestScrape,
    avgPriceToday
  ] = await Promise.all([
    db.query('SELECT COUNT(*) as count FROM products'),
    db.query('SELECT COUNT(*) as count FROM retailers'),
    db.query('SELECT COUNT(*) as count FROM price_history'),
    db.query('SELECT MAX(scraped_at) as last_scrape FROM price_history'),
    db.query(`
      SELECT AVG(price) as avg_price, currency
      FROM price_history
      WHERE scraped_at >= CURRENT_DATE
      GROUP BY currency
      LIMIT 1
    `)
  ]);

  return {
    total_products: parseInt(totalProducts.rows[0].count),
    total_retailers: parseInt(totalRetailers.rows[0].count),
    total_price_records: parseInt(totalPriceRecords.rows[0].count),
    last_scrape: latestScrape.rows[0].last_scrape,
    avg_price_today: avgPriceToday.rows[0]?.avg_price || null,
    currency: avgPriceToday.rows[0]?.currency || 'EUR'
  };
}

/**
 * Get best current deals (lowest prices with stock)
 * @param {number} limit - Number of results
 * @returns {Promise<Array>} Best current deals
 */
async function getBestDeals(limit = 10) {
  const result = await db.query(
    `SELECT DISTINCT ON (product_id)
       p.id as product_id,
       p.product_name,
       p.brand,
       p.specifications,
       r.name as retailer,
       r.website_url,
       ph.price,
       ph.currency,
       ph.in_stock,
       ph.source_url,
       ph.scraped_at
     FROM price_history ph
     JOIN products p ON ph.product_id = p.id
     JOIN retailers r ON ph.retailer_id = r.id
     WHERE ph.in_stock = true
       AND ph.scraped_at >= NOW() - INTERVAL '7 days'
     ORDER BY product_id, ph.price ASC, ph.scraped_at DESC
     LIMIT $1`,
    [limit]
  );

  return result.rows;
}

/**
 * Get price forecast (simple moving average)
 * @param {number} productId - Product ID
 * @param {number} retailerId - Retailer ID (optional)
 * @returns {Promise<Object>} Price forecast data
 */
async function getPriceForecast(productId, retailerId = null) {
  let query = `
    SELECT
      scraped_at,
      price,
      AVG(price) OVER (ORDER BY scraped_at ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) as moving_avg_7day,
      AVG(price) OVER (ORDER BY scraped_at ROWS BETWEEN 29 PRECEDING AND CURRENT ROW) as moving_avg_30day
    FROM price_history
    WHERE product_id = $1
  `;

  const params = [productId];

  if (retailerId) {
    query += ' AND retailer_id = $2';
    params.push(retailerId);
  }

  query += ' ORDER BY scraped_at DESC LIMIT 90';

  const result = await db.query(query, params);

  // Calculate simple trend
  const prices = result.rows.map(r => r.price);
  const avgLast7Days = prices.slice(0, 7).reduce((a, b) => a + b, 0) / Math.min(7, prices.length);
  const avgLast30Days = prices.reduce((a, b) => a + b, 0) / prices.length;

  const trend = avgLast7Days < avgLast30Days ? 'decreasing' :
                avgLast7Days > avgLast30Days ? 'increasing' : 'stable';

  return {
    history: result.rows,
    forecast: {
      current_avg_7day: avgLast7Days,
      current_avg_30day: avgLast30Days,
      trend,
      recommendation: trend === 'decreasing' ? 'Wait - prices are dropping' :
                      trend === 'increasing' ? 'Buy now - prices are rising' :
                      'Stable - buy when needed'
    }
  };
}

/**
 * Get stock availability insights
 * @param {number} productId - Product ID
 * @returns {Promise<Object>} Stock availability analysis
 */
async function getStockAvailability(productId) {
  const result = await db.query(
    `SELECT
       r.id as retailer_id,
       r.name as retailer,
       COUNT(*) as total_checks,
       COUNT(CASE WHEN in_stock THEN 1 END) as in_stock_count,
       ROUND(COUNT(CASE WHEN in_stock THEN 1 END)::numeric / COUNT(*)::numeric * 100, 2) as availability_percent,
       MAX(CASE WHEN in_stock THEN scraped_at END) as last_in_stock,
       MAX(scraped_at) as last_checked
     FROM price_history
     WHERE product_id = $1
       AND scraped_at >= NOW() - INTERVAL '30 days'
     GROUP BY r.id, r.name
     ORDER BY availability_percent DESC`,
    [productId]
  );

  return result.rows;
}

/**
 * Export price history to CSV format
 * @param {number} productId - Product ID
 * @returns {Promise<string>} CSV string
 */
async function exportPriceHistoryCSV(productId) {
  const result = await db.query(
    `SELECT
       p.product_name,
       p.brand,
       r.name as retailer,
       ph.price,
       ph.currency,
       ph.in_stock,
       ph.quantity,
       ph.unit,
       ph.scraped_at,
       ph.source_url
     FROM price_history ph
     JOIN products p ON ph.product_id = p.id
     JOIN retailers r ON ph.retailer_id = r.id
     WHERE ph.product_id = $1
     ORDER BY ph.scraped_at DESC`,
    [productId]
  );

  // Generate CSV
  const headers = ['Product Name', 'Brand', 'Retailer', 'Price', 'Currency', 'In Stock', 'Quantity', 'Unit', 'Scraped At', 'Source URL'];
  const csvLines = [headers.join(',')];

  for (const row of result.rows) {
    const line = [
      `"${row.product_name}"`,
      `"${row.brand}"`,
      `"${row.retailer}"`,
      row.price,
      row.currency,
      row.in_stock,
      row.quantity || '',
      `"${row.unit || ''}"`,
      row.scraped_at.toISOString(),
      `"${row.source_url || ''}"`
    ].join(',');
    csvLines.push(line);
  }

  return csvLines.join('\n');
}

export {
  getPriceTrends,
  findCheapestTimes,
  compareRetailersForProduct,
  getPriceAlerts,
  getDashboardStats,
  getBestDeals,
  getPriceForecast,
  getStockAvailability,
  exportPriceHistoryCSV,
};

export default {
  getPriceTrends,
  findCheapestTimes,
  compareRetailersForProduct,
  getPriceAlerts,
  getDashboardStats,
  getBestDeals,
  getPriceForecast,
  getStockAvailability,
  exportPriceHistoryCSV,
};
