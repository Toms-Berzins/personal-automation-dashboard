/**
 * Data Pipeline Service
 *
 * Handles the complete workflow from scraped data to database storage:
 * 1. Clean and validate scraped data
 * 2. Match or create retailer
 * 3. Match or create product
 * 4. Insert price history record
 */

import * as db from '../database/db.js';
import {
  normalizeProductName,
  extractSpecifications,
  validateScrapedData,
  cleanScrapedData,
  calculateSimilarity,
} from '../utils/productNormalizer.js';

/**
 * Process scraped data and store in database
 * @param {Object} scrapedData - Raw scraped data from Firecrawl
 * @param {Object} options - { dryRun: boolean, similarityThreshold: number }
 * @returns {Promise<Object>} Result with inserted records
 */
async function processScrapedData(scrapedData, options = {}) {
  const { dryRun = false, similarityThreshold = 0.85 } = options;

  // Step 1: Clean and validate data
  const cleanedData = cleanScrapedData(scrapedData);
  const validation = validateScrapedData(cleanedData);

  if (!validation.valid) {
    throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
  }

  if (dryRun) {
    return {
      dryRun: true,
      cleanedData,
      validation,
      message: 'Dry run - no data inserted',
    };
  }

  try {
    // Step 2: Get or create retailer
    const retailer = await db.upsertRetailer({
      name: cleanedData.brand,
      website_url: extractDomain(cleanedData.url),
      location: null, // Can be added later or extracted from scraped data
    });

    console.log(`✅ Retailer: ${retailer.name} (ID: ${retailer.id})`);

    // Step 3: Match or create product
    const product = await matchOrCreateProduct(cleanedData, similarityThreshold);

    console.log(`✅ Product: ${product.product_name} (ID: ${product.id})`);

    // Step 4: Insert price history
    const priceRecord = await db.insertPriceHistory({
      product_id: product.id,
      retailer_id: retailer.id,
      price: cleanedData.price,
      currency: cleanedData.currency,
      in_stock: cleanedData.in_stock,
      quantity: extractQuantity(cleanedData),
      unit: extractUnit(cleanedData),
      source_url: cleanedData.url,
      scraped_at: new Date(),
    });

    console.log(`✅ Price recorded: €${priceRecord.price} at ${priceRecord.scraped_at}`);

    return {
      success: true,
      retailer,
      product,
      priceRecord,
    };
  } catch (error) {
    console.error('❌ Error processing scraped data:', error.message);
    throw error;
  }
}

/**
 * Process multiple scraped items in batch
 * @param {Array} scrapedItems - Array of scraped data objects
 * @param {Object} options - Processing options
 * @returns {Promise<Object>} Batch processing results
 */
async function processBatch(scrapedItems, options = {}) {
  const results = {
    total: scrapedItems.length,
    succeeded: 0,
    failed: 0,
    errors: [],
    records: [],
  };

  for (const item of scrapedItems) {
    try {
      const result = await processScrapedData(item, options);
      results.records.push(result);
      results.succeeded++;
    } catch (error) {
      results.failed++;
      results.errors.push({
        item,
        error: error.message,
      });
      console.error(`Failed to process item:`, error.message);
    }
  }

  return results;
}

/**
 * Match existing product or create new one
 * @param {Object} cleanedData - Cleaned scraped data
 * @param {number} similarityThreshold - Minimum similarity score (0-1)
 * @returns {Promise<Object>} Product record
 */
async function matchOrCreateProduct(cleanedData, similarityThreshold = 0.85) {
  const specifications = extractSpecifications(cleanedData);
  const normalizedName = normalizeProductName(cleanedData.product_name, specifications);

  // Try exact match on normalized name
  let product = await db.findProductByNormalizedName(normalizedName);

  if (product) {
    console.log(`  → Matched existing product: ${product.product_name}`);
    return product;
  }

  // Try fuzzy matching (optional - can be expensive)
  if (similarityThreshold > 0) {
    product = await findSimilarProduct(cleanedData.product_name, similarityThreshold);

    if (product) {
      console.log(`  → Matched similar product: ${product.product_name} (similarity > ${similarityThreshold})`);
      return product;
    }
  }

  // No match found - create new product
  console.log(`  → Creating new product: ${cleanedData.product_name}`);

  product = await db.createProduct({
    product_name: cleanedData.product_name,
    brand: cleanedData.brand,
    category: 'wood_pellets',
    specifications: specifications,
    normalized_name: normalizedName,
  });

  return product;
}

/**
 * Find similar product using fuzzy matching
 * @param {string} productName - Product name to match
 * @param {number} threshold - Similarity threshold (0-1)
 * @returns {Promise<Object|null>} Similar product or null
 */
async function findSimilarProduct(productName, threshold) {
  // Get all products (in production, you'd want to limit this or use better search)
  const result = await db.query('SELECT * FROM products LIMIT 100');
  const products = result.rows;

  let bestMatch = null;
  let bestScore = 0;

  for (const product of products) {
    const score = calculateSimilarity(productName, product.product_name);

    if (score > bestScore && score >= threshold) {
      bestScore = score;
      bestMatch = product;
    }
  }

  return bestMatch;
}

/**
 * Extract domain from URL
 * @param {string} url - Full URL
 * @returns {string|null} Domain or null
 */
function extractDomain(url) {
  if (!url) return null;

  try {
    const urlObj = new URL(url);
    return `${urlObj.protocol}//${urlObj.hostname}`;
  } catch (error) {
    return null;
  }
}

/**
 * Extract quantity from cleaned data
 * @param {Object} cleanedData - Cleaned scraped data
 * @returns {number|null} Quantity value
 */
function extractQuantity(cleanedData) {
  const specs = cleanedData.specifications || {};

  // Try to extract from weight
  if (specs.weight) {
    const match = specs.weight.match(/(\d+(?:\.\d+)?)/);
    if (match) {
      return parseFloat(match[1]);
    }
  }

  return null;
}

/**
 * Extract unit from cleaned data
 * @param {Object} cleanedData - Cleaned scraped data
 * @returns {string|null} Unit string
 */
function extractUnit(cleanedData) {
  const specs = cleanedData.specifications || {};

  // Try to extract from weight
  if (specs.weight) {
    const match = specs.weight.match(/(\d+(?:\.\d+)?)\s*(\w+)/);
    if (match && match[2]) {
      return match[2];
    }
  }

  return null;
}

/**
 * Get processing statistics
 * @param {number} days - Number of days to look back
 * @returns {Promise<Object>} Statistics
 */
async function getProcessingStats(days = 7) {
  const result = await db.query(
    `SELECT
       COUNT(*) as total_records,
       COUNT(DISTINCT product_id) as unique_products,
       COUNT(DISTINCT retailer_id) as unique_retailers,
       MIN(scraped_at) as first_scrape,
       MAX(scraped_at) as last_scrape,
       AVG(price) as avg_price
     FROM price_history
     WHERE scraped_at >= NOW() - INTERVAL '${days} days'`
  );

  return result.rows[0];
}

/**
 * Example: Process data from Firecrawl scraper
 * This shows how to integrate with the scraper
 */
async function processFromFirecrawl(firecrawlResults) {
  console.log(`\n📊 Processing ${firecrawlResults.length} items from Firecrawl...\n`);

  const results = await processBatch(firecrawlResults);

  console.log(`\n✅ Batch processing complete:`);
  console.log(`   Total: ${results.total}`);
  console.log(`   Succeeded: ${results.succeeded}`);
  console.log(`   Failed: ${results.failed}`);

  if (results.failed > 0) {
    console.log(`\n❌ Errors:`);
    results.errors.forEach((error, index) => {
      console.log(`   ${index + 1}. ${error.error}`);
    });
  }

  return results;
}

export {
  processScrapedData,
  processBatch,
  matchOrCreateProduct,
  findSimilarProduct,
  getProcessingStats,
  processFromFirecrawl,
};

export default {
  processScrapedData,
  processBatch,
  matchOrCreateProduct,
  findSimilarProduct,
  getProcessingStats,
  processFromFirecrawl,
};
