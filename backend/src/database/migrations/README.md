# Database Migrations

This directory contains SQL migration files for the Granules Price Tracking database.

## Migration Files

### 001_create_initial_schema.sql
Creates the foundational database schema:
- `retailers` table: Stores vendor information
- `products` table: Master catalog of products
- `price_history` table: Time-series price data (partitioned by month)
- Indexes for optimal query performance
- Helper functions and triggers
- Analytical views for common queries

## Running Migrations

### Option 1: Using psql (PostgreSQL CLI)

```bash
# Connect to your PostgreSQL database
psql -U your_username -d granules_tracker

# Run the migration
\i backend/src/database/migrations/001_create_initial_schema.sql
```

### Option 2: Using Node.js script

```bash
cd backend
node src/database/runMigrations.js
```

### Option 3: Using Docker (if using docker-compose)

```bash
# If PostgreSQL is running in Docker
docker-compose exec postgres psql -U postgres -d granules_tracker -f /migrations/001_create_initial_schema.sql
```

## Creating New Partitions

As time progresses, you'll need to create new monthly partitions. Here's how:

### Manual Partition Creation

```sql
-- Example: Create partition for January 2026
CREATE TABLE price_history_2026_01 PARTITION OF price_history
  FOR VALUES FROM ('2026-01-01 00:00:00+00') TO ('2026-02-01 00:00:00+00');
```

### Automated Partition Creation (Recommended)

Create a scheduled job (cron or n8n) that runs monthly:

```sql
-- Function to automatically create next month's partition
CREATE OR REPLACE FUNCTION create_next_month_partition()
RETURNS void AS $$
DECLARE
  next_month DATE := DATE_TRUNC('month', CURRENT_DATE + INTERVAL '1 month');
  partition_name TEXT;
  start_date TEXT;
  end_date TEXT;
BEGIN
  partition_name := 'price_history_' || TO_CHAR(next_month, 'YYYY_MM');
  start_date := TO_CHAR(next_month, 'YYYY-MM-DD 00:00:00+00');
  end_date := TO_CHAR(next_month + INTERVAL '1 month', 'YYYY-MM-DD 00:00:00+00');

  EXECUTE format(
    'CREATE TABLE IF NOT EXISTS %I PARTITION OF price_history FOR VALUES FROM (%L) TO (%L)',
    partition_name, start_date, end_date
  );

  RAISE NOTICE 'Created partition: %', partition_name;
END;
$$ LANGUAGE plpgsql;

-- Run this monthly (e.g., on the 25th of each month)
SELECT create_next_month_partition();
```

## Verification

After running migrations, verify the setup:

```sql
-- Check if tables exist
SELECT tablename FROM pg_tables WHERE schemaname = 'public';

-- Check partitions
SELECT
  parent.relname AS parent_table,
  child.relname AS partition_name
FROM pg_inherits
JOIN pg_class parent ON pg_inherits.inhparent = parent.oid
JOIN pg_class child ON pg_inherits.inhrelid = child.oid
WHERE parent.relname = 'price_history'
ORDER BY child.relname;

-- Check indexes
SELECT indexname, tablename FROM pg_indexes WHERE schemaname = 'public';

-- Check views
SELECT viewname FROM pg_views WHERE schemaname = 'public';
```

## Rollback

If you need to undo the migration:

```sql
-- WARNING: This will delete all data!
DROP TABLE IF EXISTS price_history CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS retailers CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column CASCADE;
DROP FUNCTION IF EXISTS create_next_month_partition;
```

## Environment Variables

Ensure your `.env` file has the correct database configuration:

```env
DATABASE_URL=postgresql://username:password@localhost:5432/granules_tracker
DB_HOST=localhost
DB_PORT=5432
DB_NAME=granules_tracker
DB_USER=postgres
DB_PASSWORD=your_password
```

## Troubleshooting

### Error: "relation already exists"
- Migration was already run. Safe to ignore if using `IF NOT EXISTS` clauses.

### Error: "permission denied"
- Ensure your database user has CREATE TABLE privileges.
- Run as superuser or grant privileges: `GRANT CREATE ON DATABASE granules_tracker TO your_user;`

### Error: "partition already exists"
- Partition was already created. Safe to ignore with `IF NOT EXISTS`.

### Performance Issues
- Ensure indexes are created: `\di` in psql
- Check partition pruning is working: `EXPLAIN SELECT ... WHERE scraped_at > '2025-01-01';`
- Analyze tables: `ANALYZE price_history;`

## Maintenance

### Regular Tasks

1. **Monthly**: Create next month's partition
2. **Quarterly**: Analyze tables for query optimization
   ```sql
   ANALYZE retailers;
   ANALYZE products;
   ANALYZE price_history;
   ```

3. **Yearly**: Archive old partitions (optional)
   ```sql
   -- Detach partition older than 2 years
   ALTER TABLE price_history DETACH PARTITION price_history_2023_01;
   -- Export to archive
   \copy (SELECT * FROM price_history_2023_01) TO '/backup/2023_01.csv' CSV HEADER;
   -- Drop if no longer needed
   DROP TABLE price_history_2023_01;
   ```

## Next Steps

After running migrations:
1. Set up database connection in backend ([db.js](../db.js))
2. Implement data insertion logic ([scraperController.js](../../controllers/scraperController.js))
3. Create analytical query functions
4. Set up automated partition creation
