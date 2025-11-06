import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';
import pool from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runMigration() {
  console.log('🔄 Starting database migration...');

  try {
    // Read the SQL schema file
    const schemaPath = join(__dirname, 'schema', 'pellets.sql');
    const schema = readFileSync(schemaPath, 'utf-8');

    console.log('📄 Executing pellets.sql schema...');

    // Execute the schema
    await pool.query(schema);

    console.log('✅ Migration completed successfully!');
    console.log('📊 Created tables: pellet_stock, pellet_consumption');
    console.log('👁️  Created views: v_current_stock, v_consumption_stats, v_stock_projection, v_recent_consumption');
    console.log('⚡ Created functions: get_monthly_consumption, get_stock_at_date');

    // Verify tables were created
    const result = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN ('pellet_stock', 'pellet_consumption')
      ORDER BY table_name
    `);

    console.log('\n✅ Verified tables:');
    result.rows.forEach(row => console.log(`   - ${row.table_name}`));

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Details:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
