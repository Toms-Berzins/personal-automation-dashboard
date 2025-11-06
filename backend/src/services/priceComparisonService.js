/**
 * Price Comparison Service
 *
 * Compares scraped prices with historical data to determine:
 * - New products (never seen before)
 * - Price changes (existing products with different prices)
 * - Unchanged products (same price as last scrape)
 */

import * as db from '../database/db.js';

/**
 * Compare scraped products with existing database records
 * @param {Array} scrapedProducts - Array of products from scraper
 * @param {Object} options - { priceChangeThreshold: number }
 * @returns {Promise<Object>} Comparison results
 */
export async function compareWithHistory(scrapedProducts, options = {}) {
  const { priceChangeThreshold = 0.01 } = options; // 1% threshold by default

  const results = {
    newProducts: [],
    priceIncreases: [],
    priceDecreases: [],
    unchanged: [],
    summary: {
      total: scrapedProducts.length,
      new: 0,
      updated: 0,
      unchanged: 0,
    },
  };

  for (const product of scrapedProducts) {
    try {
      const comparison = await compareProduct(product, priceChangeThreshold);

      if (comparison.isNew) {
        results.newProducts.push({
          ...product,
          status: 'new',
        });
        results.summary.new++;
      } else if (comparison.priceChange > 0) {
        results.priceIncreases.push({
          ...product,
          status: 'price_increase',
          oldPrice: comparison.oldPrice,
          newPrice: product.price,
          changePercent: comparison.changePercent,
          changeAmount: comparison.priceChange,
        });
        results.summary.updated++;
      } else if (comparison.priceChange < 0) {
        results.priceDecreases.push({
          ...product,
          status: 'price_decrease',
          oldPrice: comparison.oldPrice,
          newPrice: product.price,
          changePercent: comparison.changePercent,
          changeAmount: comparison.priceChange,
        });
        results.summary.updated++;
      } else {
        results.unchanged.push({
          ...product,
          status: 'unchanged',
          lastChecked: comparison.lastChecked,
        });
        results.summary.unchanged++;
      }
    } catch (error) {
      console.error(`Error comparing product ${product.product_name}:`, error.message);
    }
  }

  return results;
}

/**
 * Compare single product with its history
 * @param {Object} product - Product data from scraper
 * @param {number} threshold - Price change threshold (percentage as decimal)
 * @returns {Promise<Object>} Comparison result
 */
async function compareProduct(product, threshold) {
  // Query for the most recent price of this product
  const query = `
    SELECT
      ph.price,
      ph.currency,
      ph.scraped_at,
      ph.in_stock,
      p.id as product_id,
      p.product_name
    FROM price_history ph
    JOIN products p ON ph.product_id = p.id
    WHERE
      LOWER(p.product_name) = LOWER($1)
      OR p.normalized_name = $1
    ORDER BY ph.scraped_at DESC
    LIMIT 1
  `;

  const result = await db.query(query, [product.product_name]);

  // New product (never seen before)
  if (result.rows.length === 0) {
    return {
      isNew: true,
      priceChange: 0,
      changePercent: 0,
      oldPrice: null,
      lastChecked: null,
    };
  }

  const lastRecord = result.rows[0];
  const oldPrice = parseFloat(lastRecord.price);
  const newPrice = parseFloat(product.price);
  const priceChange = newPrice - oldPrice;
  const changePercent = (priceChange / oldPrice) * 100;

  // Check if price change is significant (beyond threshold)
  const isSignificant = Math.abs(changePercent) > threshold;

  return {
    isNew: false,
    priceChange: isSignificant ? priceChange : 0, // Return 0 if change is insignificant
    changePercent: isSignificant ? changePercent : 0,
    oldPrice,
    newPrice,
    lastChecked: lastRecord.scraped_at,
    productId: lastRecord.product_id,
  };
}

/**
 * Get price trends for products
 * @param {Array} productNames - Array of product names
 * @param {number} days - Number of days to analyze
 * @returns {Promise<Array>} Price trend data
 */
export async function getPriceTrends(productNames, days = 30) {
  const query = `
    SELECT
      p.product_name,
      p.brand,
      DATE(ph.scraped_at) as date,
      AVG(ph.price) as avg_price,
      MIN(ph.price) as min_price,
      MAX(ph.price) as max_price,
      COUNT(*) as sample_count
    FROM price_history ph
    JOIN products p ON ph.product_id = p.id
    WHERE p.product_name = ANY($1)
      AND ph.scraped_at >= NOW() - INTERVAL '${days} days'
    GROUP BY p.product_name, p.brand, DATE(ph.scraped_at)
    ORDER BY date DESC, p.product_name
  `;

  const result = await db.query(query, [productNames]);
  return result.rows;
}

/**
 * Detect significant price alerts
 * @param {number} dropThreshold - Percentage drop to alert on (e.g., 5 = 5%)
 * @param {number} increaseThreshold - Percentage increase to alert on
 * @returns {Promise<Object>} Price alerts
 */
export async function detectPriceAlerts(dropThreshold = 5, increaseThreshold = 10) {
  const query = `
    WITH latest AS (
      SELECT DISTINCT ON (product_id)
        product_id,
        price as current_price,
        scraped_at as current_date
      FROM price_history
      ORDER BY product_id, scraped_at DESC
    ),
    previous AS (
      SELECT DISTINCT ON (product_id)
        product_id,
        price as previous_price,
        scraped_at as previous_date
      FROM price_history
      WHERE scraped_at < NOW() - INTERVAL '1 day'
      ORDER BY product_id, scraped_at DESC
    )
    SELECT
      p.product_name,
      p.brand,
      prev.previous_price,
      curr.current_price,
      ROUND((curr.current_price - prev.previous_price) / prev.previous_price * 100, 2) as change_percent,
      curr.current_price - prev.previous_price as change_amount,
      CASE
        WHEN curr.current_price < prev.previous_price THEN 'drop'
        WHEN curr.current_price > prev.previous_price THEN 'increase'
        ELSE 'stable'
      END as trend,
      prev.previous_date,
      curr.current_date
    FROM latest curr
    JOIN previous prev ON curr.product_id = prev.product_id
    JOIN products p ON curr.product_id = p.id
    WHERE
      (curr.current_price < prev.previous_price * (1 - $1 / 100.0))
      OR (curr.current_price > prev.previous_price * (1 + $2 / 100.0))
    ORDER BY change_percent ASC
  `;

  const result = await db.query(query, [dropThreshold, increaseThreshold]);

  return {
    drops: result.rows.filter(r => r.trend === 'drop'),
    increases: result.rows.filter(r => r.trend === 'increase'),
    total: result.rows.length,
  };
}

/**
 * Get statistics about recent scraping activity
 * @param {number} hours - Hours to look back
 * @returns {Promise<Object>} Scraping statistics
 */
export async function getScrapingStats(hours = 24) {
  const query = `
    SELECT
      COUNT(DISTINCT product_id) as unique_products,
      COUNT(*) as total_records,
      COUNT(DISTINCT retailer_id) as unique_retailers,
      MIN(scraped_at) as first_scrape,
      MAX(scraped_at) as last_scrape,
      AVG(price) as avg_price,
      MIN(price) as min_price,
      MAX(price) as max_price
    FROM price_history
    WHERE scraped_at >= NOW() - INTERVAL '${hours} hours'
  `;

  const result = await db.query(query);
  return result.rows[0];
}

export default {
  compareWithHistory,
  getPriceTrends,
  detectPriceAlerts,
  getScrapingStats,
};
