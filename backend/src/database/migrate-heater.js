/**
 * Run heater tables migration
 */

// IMPORTANT: Load environment variables FIRST
import '../config/env.js';

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';
import { pool } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runHeaterMigration() {
  console.log('🔄 Starting heater tables migration...');

  try {
    // Read the migration file
    const migrationPath = join(__dirname, 'migrations', '006_create_heater_tables.sql');
    const migration = readFileSync(migrationPath, 'utf-8');

    console.log('📄 Executing 006_create_heater_tables.sql...');

    // Execute the migration
    await pool.query(migration);

    console.log('✅ Heater migration completed successfully!');
    console.log('📊 Created tables:');
    console.log('   - heater_status');
    console.log('   - heater_statistics');
    console.log('   - heater_events');
    console.log('👁️  Created views:');
    console.log('   - latest_heater_status');
    console.log('   - latest_heater_statistics');
    console.log('   - heater_dashboard_data');

    // Verify tables were created
    const result = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN ('heater_status', 'heater_statistics', 'heater_events')
      ORDER BY table_name
    `);

    console.log('\n✅ Verified tables:');
    result.rows.forEach(row => console.log(`   - ${row.table_name}`));

    console.log('\n🎉 Heater integration ready!');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Details:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runHeaterMigration();
