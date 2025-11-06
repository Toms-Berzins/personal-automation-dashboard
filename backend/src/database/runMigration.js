/**
 * Database Migration Runner
 * Run with: node src/database/runMigration.js
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

async function runMigration(migrationFile = '001_create_initial_schema.sql') {
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'automation_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
  });

  try {
    console.log('🔄 Running database migration...');
    console.log(`📦 Database: ${process.env.DB_NAME}`);
    console.log(`🔗 Host: ${process.env.DB_HOST}:${process.env.DB_PORT}`);
    console.log(`📄 Migration file: ${migrationFile}`);
    console.log();

    // Read the migration SQL file
    const migrationPath = join(__dirname, 'migrations', migrationFile);
    const sql = readFileSync(migrationPath, 'utf8');

    // Execute the migration
    await pool.query(sql);

    console.log('✅ Migration completed successfully!');
    console.log();

    // Verify tables were created
    const result = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    console.log('📋 Created tables:');
    result.rows.forEach(row => {
      console.log(`   - ${row.table_name}`);
    });

    // Verify views were created
    const viewsResult = await pool.query(`
      SELECT table_name
      FROM information_schema.views
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    console.log('\n📊 Created views:');
    viewsResult.rows.forEach(row => {
      console.log(`   - ${row.table_name}`);
    });

    await pool.end();
    process.exit(0);

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    await pool.end();
    process.exit(1);
  }
}

// Get migration file from command line args or use default
const migrationFile = process.argv[2] || '001_create_initial_schema.sql';
runMigration(migrationFile);
