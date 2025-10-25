#!/usr/bin/env node

import 'dotenv/config';
import { FirecrawlApp } from '@mendable/firecrawl-js';
import pg from 'pg';
import { Command } from 'commander';
import chalk from 'chalk';

const { Pool } = pg;

// Initialize Firecrawl
const firecrawl = new FirecrawlApp({
  apiKey: process.env.FIRECRAWL_API_KEY,
  apiUrl: process.env.FIRECRAWL_API_URL || 'https://api.firecrawl.dev'
});

// Initialize PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Generic price extraction schema
const priceExtractionSchema = {
  type: "object",
  properties: {
    product_name: {
      type: "string",
      description: "Name of the product"
    },
    price: {
      type: "number",
      description: "Current price of the product"
    },
    currency: {
      type: "string",
      description: "Currency code (EUR, USD, etc.)"
    },
    brand: {
      type: "string",
      description: "Brand or manufacturer name"
    },
    in_stock: {
      type: "boolean",
      description: "Whether the product is in stock"
    },
    description: {
      type: "string",
      description: "Product description"
    },
    specifications: {
      type: "object",
      description: "Product specifications (size, weight, etc.)"
    }
  },
  required: ["product_name", "price"]
};

/**
 * Search the web for a product
 */
async function searchProduct(query, limit = 5) {
  console.log(chalk.blue(`\n🔍 Searching for: "${query}"\n`));

  try {
    const searchResults = await firecrawl.search(query, {
      limit,
      scrapeOptions: {
        formats: ['markdown']
      }
    });

    if (!searchResults.success || !searchResults.data || searchResults.data.length === 0) {
      console.log(chalk.yellow('No results found.'));
      return [];
    }

    console.log(chalk.green(`✓ Found ${searchResults.data.length} results:\n`));

    searchResults.data.forEach((result, index) => {
      console.log(chalk.cyan(`${index + 1}. ${result.title || result.url}`));
      console.log(chalk.gray(`   URL: ${result.url}`));
      if (result.description) {
        console.log(chalk.gray(`   ${result.description.substring(0, 100)}...`));
      }
      console.log();
    });

    return searchResults.data;
  } catch (error) {
    console.error(chalk.red('Search error:'), error.message);
    return [];
  }
}

/**
 * Scrape a specific URL for product data
 */
async function scrapeUrl(url, saveToDb = false) {
  console.log(chalk.blue(`\n📥 Scraping: ${url}\n`));

  try {
    const scrapeResult = await firecrawl.scrape(url, {
      formats: [
        'markdown',
        {
          type: 'json',
          schema: priceExtractionSchema
        }
      ],
      onlyMainContent: true,
      waitFor: 2000
    });

    if (!scrapeResult.success) {
      console.log(chalk.red('✗ Scraping failed'));
      return null;
    }

    const extractedData = scrapeResult.data?.json || scrapeResult.data?.extract || {};

    console.log(chalk.green('✓ Successfully scraped!\n'));
    console.log(chalk.cyan('Extracted Data:'));
    console.log(JSON.stringify(extractedData, null, 2));

    if (saveToDb && extractedData.product_name && extractedData.price) {
      await saveToDatabase(url, extractedData);
    }

    return extractedData;
  } catch (error) {
    console.error(chalk.red('Scraping error:'), error.message);
    return null;
  }
}

/**
 * Save scraped data to database
 */
async function saveToDatabase(url, data) {
  const client = await pool.connect();

  try {
    const query = `
      INSERT INTO product_prices (
        url,
        product_name,
        price,
        currency,
        brand,
        in_stock,
        description,
        specifications
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, timestamp
    `;

    const values = [
      url,
      data.product_name,
      data.price,
      data.currency || 'EUR',
      data.brand || null,
      data.in_stock !== undefined ? data.in_stock : true,
      data.description || null,
      data.specifications ? JSON.stringify(data.specifications) : null
    ];

    const result = await client.query(query, values);

    console.log(chalk.green(`\n✓ Saved to database (ID: ${result.rows[0].id})`));
    console.log(chalk.gray(`  Timestamp: ${result.rows[0].timestamp}`));
  } catch (error) {
    console.error(chalk.red('Database error:'), error.message);
  } finally {
    client.release();
  }
}

/**
 * Get price history for a product
 */
async function getPriceHistory(productName, limit = 10) {
  console.log(chalk.blue(`\n📊 Price history for: "${productName}"\n`));

  const client = await pool.connect();

  try {
    const query = `
      SELECT
        timestamp,
        product_name,
        price,
        currency,
        brand,
        url,
        in_stock
      FROM product_prices
      WHERE product_name ILIKE $1
      ORDER BY timestamp DESC
      LIMIT $2
    `;

    const result = await client.query(query, [`%${productName}%`, limit]);

    if (result.rows.length === 0) {
      console.log(chalk.yellow('No price history found.'));
      return [];
    }

    console.log(chalk.green(`✓ Found ${result.rows.length} price records:\n`));

    result.rows.forEach((row, index) => {
      const date = new Date(row.timestamp).toLocaleString();
      const stockStatus = row.in_stock ? chalk.green('✓ In Stock') : chalk.red('✗ Out of Stock');

      console.log(chalk.cyan(`${index + 1}. ${row.product_name}`));
      console.log(chalk.gray(`   Date: ${date}`));
      console.log(chalk.yellow(`   Price: ${row.price} ${row.currency}`));
      console.log(`   ${stockStatus}`);
      if (row.brand) console.log(chalk.gray(`   Brand: ${row.brand}`));
      console.log(chalk.gray(`   URL: ${row.url}`));
      console.log();
    });

    return result.rows;
  } catch (error) {
    console.error(chalk.red('Database error:'), error.message);
    return [];
  } finally {
    client.release();
  }
}

/**
 * CLI Program
 */
const program = new Command();

program
  .name('scraper')
  .description('On-demand web scraping tool for price tracking using Firecrawl')
  .version('1.0.0');

program
  .command('search')
  .description('Search the web for a product')
  .argument('<query>', 'Search query (e.g., "wood pellets 15kg")')
  .option('-l, --limit <number>', 'Number of results', '5')
  .action(async (query, options) => {
    await searchProduct(query, parseInt(options.limit));
    await pool.end();
  });

program
  .command('scrape')
  .description('Scrape a specific URL for product data')
  .argument('<url>', 'URL to scrape')
  .option('--save', 'Save results to database', false)
  .action(async (url, options) => {
    await scrapeUrl(url, options.save);
    await pool.end();
  });

program
  .command('history')
  .description('Get price history for a product')
  .argument('<product>', 'Product name to search')
  .option('-l, --limit <number>', 'Number of records', '10')
  .action(async (product, options) => {
    await getPriceHistory(product, parseInt(options.limit));
    await pool.end();
  });

// Parse command line arguments
program.parse();
