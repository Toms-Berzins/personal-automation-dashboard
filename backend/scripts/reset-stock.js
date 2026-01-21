/**
 * Reset Pellet Stock to Zero (Keep Consumption History)
 *
 * This script safely resets your pellet stock to 0 bags while preserving
 * all your consumption history records.
 *
 * Usage:
 *   node scripts/reset-stock.js --preview   (Shows what will be deleted)
 *   node scripts/reset-stock.js --confirm   (Actually deletes the data)
 */

import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from root .env
dotenv.config({ path: resolve(__dirname, '../../.env') });

const { Pool } = pg;

// Debug: Check if env vars are loaded
console.log('🔍 Database Config:');
console.log(`  DB_HOST: ${process.env.DB_HOST}`);
console.log(`  DB_PORT: ${process.env.DB_PORT}`);
console.log(`  DB_NAME: ${process.env.DB_NAME}`);
console.log(`  DB_USER: ${process.env.DB_USER}`);
console.log(`  DB_PASSWORD: ${process.env.DB_PASSWORD ? '***' : 'NOT SET'}`);

// Use same connection pattern as db.js
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER || 'postgres',
  password: String(process.env.DB_PASSWORD || ''),
  database: process.env.DB_NAME || 'granules_tracker',
});

async function previewReset() {
  console.log('\n📊 PREVIEW MODE - No data will be deleted\n');
  console.log('═'.repeat(60));

  try {
    // Show current stock
    console.log('\n🔍 CURRENT STOCK (Before Reset):');
    console.log('─'.repeat(60));
    const stockResult = await pool.query('SELECT * FROM v_current_stock');
    if (stockResult.rows.length > 0) {
      const stock = stockResult.rows[0];
      console.log(`  Total Purchased: ${stock.total_purchased_bags} bags (${parseFloat(stock.total_purchased_kg).toFixed(2)} kg)`);
      console.log(`  Total Consumed:  ${stock.total_consumed_bags} bags (${parseFloat(stock.total_consumed_kg).toFixed(2)} kg)`);
      console.log(`  Remaining:       ${stock.remaining_bags} bags (${parseFloat(stock.remaining_kg).toFixed(2)} kg)`);
      console.log(`  Stock Level:     ${parseFloat(stock.stock_percentage).toFixed(1)}%`);
    }

    // Show consumption records that will be KEPT
    console.log('\n✅ CONSUMPTION RECORDS TO BE KEPT:');
    console.log('─'.repeat(60));
    const consumptionCount = await pool.query('SELECT COUNT(*) FROM pellet_consumption');
    console.log(`  Total records: ${consumptionCount.rows[0].count} weeks of data will be PRESERVED`);

    const recentConsumption = await pool.query(`
      SELECT week_year, week_start_date, bags_used, weight_kg
      FROM pellet_consumption
      ORDER BY week_start_date DESC
      LIMIT 5
    `);
    if (recentConsumption.rows.length > 0) {
      console.log('  Most recent consumption:');
      recentConsumption.rows.forEach(row => {
        console.log(`    ${row.week_year}: ${row.bags_used} bags (${parseFloat(row.weight_kg).toFixed(1)} kg)`);
      });
    }

    // Show stock purchases that will be DELETED
    console.log('\n❌ STOCK PURCHASES TO BE DELETED:');
    console.log('─'.repeat(60));
    const stockPurchases = await pool.query(`
      SELECT
        id,
        purchase_date,
        num_pallets,
        total_bags,
        total_weight_kg,
        supplier,
        notes
      FROM pellet_stock
      ORDER BY purchase_date
    `);

    if (stockPurchases.rows.length === 0) {
      console.log('  ⚠️  No stock purchases found - already at 0 bags!');
    } else {
      console.log(`  Total purchases to delete: ${stockPurchases.rows.length}`);
      console.log('');
      stockPurchases.rows.forEach((row, index) => {
        console.log(`  ${index + 1}. Date: ${row.purchase_date.toISOString().split('T')[0]}`);
        console.log(`     Pallets: ${row.num_pallets} | Bags: ${row.total_bags} | Weight: ${parseFloat(row.total_weight_kg).toFixed(2)} kg`);
        if (row.supplier) console.log(`     Supplier: ${row.supplier}`);
        if (row.notes) console.log(`     Notes: ${row.notes}`);
        console.log('');
      });
    }

    console.log('═'.repeat(60));
    console.log('\n⚠️  To actually reset the stock, run:');
    console.log('   node scripts/reset-stock.js --confirm\n');

  } catch (error) {
    console.error('❌ Error previewing data:', error.message);
    throw error;
  }
}

async function confirmReset() {
  console.log('\n⚠️  CONFIRM RESET - This will DELETE all stock purchases!\n');
  console.log('═'.repeat(60));

  try {
    // Count records to delete
    const stockCount = await pool.query('SELECT COUNT(*) FROM pellet_stock');
    const count = parseInt(stockCount.rows[0].count);

    if (count === 0) {
      console.log('ℹ️  No stock purchases to delete. Stock is already at 0 bags.');
      return;
    }

    console.log(`\n🔥 Deleting ${count} stock purchase record(s)...\n`);

    // Perform the deletion
    const deleteResult = await pool.query('DELETE FROM pellet_stock');

    console.log(`✅ Successfully deleted ${deleteResult.rowCount} stock purchase(s)\n`);

    // Verify new stock level
    const newStock = await pool.query('SELECT * FROM v_current_stock');
    if (newStock.rows.length > 0) {
      const stock = newStock.rows[0];
      console.log('📊 NEW STOCK LEVELS:');
      console.log('─'.repeat(60));
      console.log(`  Remaining Stock: ${stock.remaining_bags} bags (${parseFloat(stock.remaining_kg).toFixed(2)} kg)`);
      console.log(`  Stock Level:     ${parseFloat(stock.stock_percentage).toFixed(1)}%`);
    }

    // Verify consumption is preserved
    const consumptionCheck = await pool.query('SELECT COUNT(*) FROM pellet_consumption');
    console.log(`\n✅ Consumption History Preserved: ${consumptionCheck.rows[0].count} records\n`);

    console.log('═'.repeat(60));
    console.log('✅ Stock reset complete! You can now add new stock purchases.\n');

  } catch (error) {
    console.error('❌ Error resetting stock:', error.message);
    throw error;
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const mode = args[0];

  try {
    if (mode === '--confirm') {
      await confirmReset();
    } else {
      await previewReset();
    }
  } catch (error) {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
