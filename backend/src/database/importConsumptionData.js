/**
 * Import Consumption Data from CSV
 *
 * Reads consumption data from D:\Downloads\granulas\menesa_kopsavilkums.csv
 * and imports it into the consumption_history table.
 *
 * CSV Format:
 * Datums,Kg sabērts (mēnesī)
 * 2022-09-01,210.0
 * 2022-10-01,255.0
 * ...
 */

// IMPORTANT: Load env config FIRST
import '../config/env.js';

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pkg from 'pg';
const { Pool } = pkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Database connection
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'automation_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
});

/**
 * Parse CSV line (simple parser for our specific CSV format)
 */
function parseCSVLine(line) {
  const [date, kg] = line.split(',');
  return {
    date: date.trim(),
    kg: parseFloat(kg.trim())
  };
}

/**
 * Import consumption data from CSV file
 */
async function importConsumptionData() {
  const client = await pool.connect();

  try {
    console.log('🚀 Starting consumption data import...');

    // Read CSV file
    const csvPath = 'D:\\Downloads\\granulas\\menesa_kopsavilkums.csv';
    console.log(`📄 Reading CSV file: ${csvPath}`);

    const csvContent = readFileSync(csvPath, 'utf-8');
    const lines = csvContent.split('\n').filter(line => line.trim());

    console.log(`📊 Found ${lines.length} lines in CSV`);

    // Skip header row
    const dataLines = lines.slice(1);
    console.log(`📈 Processing ${dataLines.length} data records...`);

    // Start transaction
    await client.query('BEGIN');

    let imported = 0;
    let skipped = 0;
    let errors = 0;

    for (const line of dataLines) {
      try {
        const { date, kg } = parseCSVLine(line);

        if (isNaN(kg)) {
          console.log(`⚠️  Skipping invalid record: ${line}`);
          skipped++;
          continue;
        }

        // Insert or update consumption record
        const result = await client.query(
          `INSERT INTO consumption_history (consumption_date, kg_consumed)
           VALUES ($1, $2)
           ON CONFLICT (consumption_date)
           DO UPDATE SET
             kg_consumed = EXCLUDED.kg_consumed,
             updated_at = CURRENT_TIMESTAMP
           RETURNING id, consumption_date, kg_consumed`,
          [date, kg]
        );

        imported++;
        console.log(`✅ Imported: ${date} - ${kg} kg`);

      } catch (error) {
        console.error(`❌ Error processing line: ${line}`, error.message);
        errors++;
      }
    }

    // Commit transaction
    await client.query('COMMIT');

    console.log('\n' + '='.repeat(60));
    console.log('📊 Import Summary:');
    console.log(`   ✅ Successfully imported: ${imported} records`);
    console.log(`   ⚠️  Skipped: ${skipped} records`);
    console.log(`   ❌ Errors: ${errors} records`);
    console.log('='.repeat(60));

    // Show statistics
    const statsResult = await client.query(`
      SELECT
        COUNT(*) as total_records,
        MIN(consumption_date) as earliest_date,
        MAX(consumption_date) as latest_date,
        SUM(kg_consumed) as total_kg,
        AVG(kg_consumed) as avg_kg,
        MAX(kg_consumed) as peak_kg
      FROM consumption_history
    `);

    const stats = statsResult.rows[0];
    console.log('\n📈 Database Statistics:');
    console.log(`   Total records: ${stats.total_records}`);
    console.log(`   Date range: ${stats.earliest_date} to ${stats.latest_date}`);
    console.log(`   Total consumption: ${parseFloat(stats.total_kg).toFixed(2)} kg`);
    console.log(`   Average per month: ${parseFloat(stats.avg_kg).toFixed(2)} kg`);
    console.log(`   Peak month: ${parseFloat(stats.peak_kg).toFixed(2)} kg`);

    console.log('\n✅ Consumption data import completed successfully!');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Import failed:', error.message);
    console.error(error.stack);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run import
importConsumptionData()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
