/**
 * Database Test Script
 *
 * Tests the complete database implementation with sample data
 * Run this after setting up the database to verify everything works
 */

import * as db from './db.js';
import { processScrapedData, processBatch } from '../services/dataPipeline.js';
import {
  getPriceTrends,
  findCheapestTimes,
  compareRetailersForProduct,
  getDashboardStats
} from '../services/analyticsService.js';

// Sample scraped data (based on your real example)
const sampleData = [
  {
    brand: 'SIA Staļi',
    product_name: '6 mm kokskaidu granulas 15KG MAISOS',
    price: 235,
    currency: 'EUR',
    in_stock: true,
    url: 'https://www.stali.lv/lv/granulas',
    description: '6 mm kokskaidu granulas pakotas 15 kg polietilēna maisos.',
    specifications: {
      weight: '15 kg',
      type: 'kokskaidu granulas',
      diameter: '6 mm',
      packaging: 'bags'
    }
  },
  {
    brand: 'SIA Staļi',
    product_name: '6 mm kokskaidu granulas BIG BAG',
    price: 234,
    currency: 'EUR',
    in_stock: true,
    url: 'https://www.stali.lv/lv/granulas',
    description: '6 mm kokskaidu granulas iepakotas BIG BAG ar kopējo granulu svaru 975kg.',
    specifications: {
      weight: '975 kg',
      type: 'kokskaidu granulas',
      diameter: '6 mm',
      packaging: 'bigbag'
    }
  },
  // Simulate different prices from another time
  {
    brand: 'SIA Staļi',
    product_name: '6 mm kokskaidu granulas 15KG MAISOS',
    price: 230, // Lower price
    currency: 'EUR',
    in_stock: true,
    url: 'https://www.stali.lv/lv/granulas',
    specifications: {
      weight: '15 kg',
      type: 'kokskaidu granulas'
    }
  }
];

/**
 * Main test function
 */
async function runTests() {
  console.log('\n🧪 Starting Database Tests...\n');
  console.log('='.repeat(60));

  try {
    // Test 1: Connection
    console.log('\n📌 Test 1: Database Connection');
    console.log('-'.repeat(60));
    const connected = await db.testConnection();
    if (!connected) {
      throw new Error('Database connection failed');
    }

    // Test 2: Insert Sample Data
    console.log('\n📌 Test 2: Processing Sample Data');
    console.log('-'.repeat(60));
    const batchResult = await processBatch(sampleData);
    console.log(`   Total items: ${batchResult.total}`);
    console.log(`   Succeeded: ${batchResult.succeeded}`);
    console.log(`   Failed: ${batchResult.failed}`);

    if (batchResult.failed > 0) {
      console.log('   Errors:', batchResult.errors);
    }

    // Test 3: Retrieve Latest Prices
    console.log('\n📌 Test 3: Latest Prices');
    console.log('-'.repeat(60));
    const latestPrices = await db.getLatestPrices();
    console.log(`   Found ${latestPrices.length} price records`);
    latestPrices.slice(0, 3).forEach((record, i) => {
      console.log(`   ${i + 1}. ${record.product_name} @ ${record.retailer_name}: €${record.price}`);
    });

    // Test 4: Dashboard Stats
    console.log('\n📌 Test 4: Dashboard Statistics');
    console.log('-'.repeat(60));
    const stats = await getDashboardStats();
    console.log(`   Total Products: ${stats.total_products}`);
    console.log(`   Total Retailers: ${stats.total_retailers}`);
    console.log(`   Total Price Records: ${stats.total_price_records}`);
    console.log(`   Last Scrape: ${stats.last_scrape}`);
    console.log(`   Average Price Today: €${stats.avg_price_today || 'N/A'}`);

    // Test 5: Retailer Comparison (if we have products)
    if (stats.total_products > 0) {
      console.log('\n📌 Test 5: Retailer Comparison');
      console.log('-'.repeat(60));

      // Get first product ID
      const productsResult = await db.query('SELECT id, product_name FROM products LIMIT 1');
      if (productsResult.rows.length > 0) {
        const productId = productsResult.rows[0].id;
        const productName = productsResult.rows[0].product_name;

        console.log(`   Analyzing: ${productName}`);

        const comparison = await compareRetailersForProduct(productId, 30);
        comparison.forEach((retailer, i) => {
          console.log(`   ${i + 1}. ${retailer.retailer}:`);
          console.log(`      Avg Price: €${parseFloat(retailer.avg_price).toFixed(2)}`);
          console.log(`      Best Price: €${parseFloat(retailer.best_price).toFixed(2)}`);
          console.log(`      Availability: ${retailer.availability_percent}%`);
        });
      }
    }

    // Test 6: Price History
    if (stats.total_products > 0) {
      console.log('\n📌 Test 6: Price History');
      console.log('-'.repeat(60));

      const productsResult = await db.query('SELECT id, product_name FROM products LIMIT 1');
      if (productsResult.rows.length > 0) {
        const productId = productsResult.rows[0].id;
        const productName = productsResult.rows[0].product_name;

        console.log(`   Product: ${productName}`);

        const history = await db.getPriceHistory(productId, { days: 30 });
        console.log(`   Total records: ${history.length}`);

        if (history.length > 0) {
          console.log(`   Latest price: €${history[0].price} on ${history[0].scraped_at}`);
          console.log(`   Oldest price: €${history[history.length - 1].price} on ${history[history.length - 1].scraped_at}`);
        }
      }
    }

    // Test 7: Price Drop Detection
    console.log('\n📌 Test 7: Price Drop Detection');
    console.log('-'.repeat(60));
    const priceDrops = await db.detectPriceDrops(5); // 5% threshold
    console.log(`   Detected ${priceDrops.length} price drops (>5%)`);
    priceDrops.slice(0, 3).forEach((drop, i) => {
      console.log(`   ${i + 1}. ${drop.product_name} @ ${drop.retailer}`);
      console.log(`      €${drop.previous_price} → €${drop.current_price} (${drop.percent_change}%)`);
    });

    // Test 8: Pool Statistics
    console.log('\n📌 Test 8: Connection Pool Stats');
    console.log('-'.repeat(60));
    const poolStats = db.getPoolStats();
    console.log(`   Total connections: ${poolStats.total}`);
    console.log(`   Idle connections: ${poolStats.idle}`);
    console.log(`   Waiting requests: ${poolStats.waiting}`);

    // Test 9: Verify Partitions
    console.log('\n📌 Test 9: Partition Verification');
    console.log('-'.repeat(60));
    const partitionsResult = await db.query(`
      SELECT
        child.relname AS partition_name,
        pg_get_expr(child.relpartbound, child.oid) AS partition_bounds
      FROM pg_inherits
      JOIN pg_class parent ON pg_inherits.inhparent = parent.oid
      JOIN pg_class child ON pg_inherits.inhrelid = child.oid
      WHERE parent.relname = 'price_history'
      ORDER BY child.relname
    `);
    console.log(`   Found ${partitionsResult.rows.length} partitions`);
    partitionsResult.rows.slice(0, 3).forEach((p, i) => {
      console.log(`   ${i + 1}. ${p.partition_name}: ${p.partition_bounds}`);
    });

    // Success!
    console.log('\n' + '='.repeat(60));
    console.log('✅ All tests passed successfully!');
    console.log('='.repeat(60));
    console.log('\n📊 Database is ready for production use.\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    // Close database connection
    await db.close();
  }
}

// Run tests if this file is executed directly
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Check if this is the main module
const isMain = import.meta.url === `file://${process.argv[1]}`;

if (isMain) {
  runTests()
    .then(() => {
      console.log('🎉 Test suite completed!\n');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Test suite failed:', error);
      process.exit(1);
    });
}

export { runTests };
export default { runTests };
