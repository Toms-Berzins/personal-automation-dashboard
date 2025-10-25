# Quick Start Guide - Personal Automation Dashboard

Get your automation dashboard running in under 10 minutes with Docker!

---

## Prerequisites

Before starting, ensure you have:

- ✅ **Docker Desktop** (4.0+) - [Download here](https://www.docker.com/products/docker-desktop/)
- ✅ **Git** - For cloning the repository
- ✅ **Firecrawl API Key** - [Get free key](https://firecrawl.dev/)
- ✅ **Text Editor** - VS Code recommended

---

## Step 1: Clone & Setup (2 minutes)

```bash
# Clone the repository
cd c:\Users\berzi\Web
cd personal-automation-dashboard

# Copy environment template
cp .env.example .env

# Edit .env file and add your Firecrawl API key
# Minimum required: FIRECRAWL_API_KEY
notepad .env
```

**Important:** At minimum, set your `FIRECRAWL_API_KEY` in the `.env` file.

---

## Step 2: Start the Database (1 minute)

```bash
# Start PostgreSQL database only
docker-compose up -d postgres

# Wait for database to be ready (watch for "database system is ready to accept connections")
docker-compose logs -f postgres
```

Press `Ctrl+C` to stop following logs once you see the database is ready.

### Verify Database

```bash
# Check database is healthy
docker-compose ps

# Expected output:
# NAME                          STATUS              PORTS
# automation-dashboard-db       Up (healthy)        0.0.0.0:5432->5432/tcp
```

---

## Step 3: View Your Data (Optional)

### Option A: Using pgAdmin (Recommended for beginners)

```bash
# Start pgAdmin web interface
docker-compose --profile development up -d pgadmin

# Open in browser: http://localhost:5050
# Login:
#   Email: admin@automation-dashboard.local
#   Password: admin

# Add server connection:
#   Host: postgres
#   Port: 5432
#   Username: postgres
#   Password: changeme
#   Database: automation_db
```

### Option B: Using psql command line

```bash
# Connect to database
docker exec -it automation-dashboard-db psql -U postgres -d automation_db

# View sample data
SELECT * FROM granules_prices;

# View latest prices
SELECT * FROM latest_granules_prices;

# Exit psql
\q
```

---

## Step 4: Test the Database Setup

### Check Sample Data

The database automatically includes sample data for testing:

```sql
-- Latest prices view
SELECT store, product_name, price, currency, in_stock
FROM latest_granules_prices;

-- Should show 3 products from Store A, Store B, Store C
```

### Check Views

```sql
-- Monthly averages
SELECT * FROM monthly_average_prices;

-- Price trend for a specific product
SELECT * FROM get_price_trend('Store A', 'Premium Wood Pellets', 7);

-- Detect price drops
SELECT * FROM detect_price_drops(1.0);
```

---

## Step 5: Prepare for Scraper (Next Steps)

Before we can run the scraper, we need to create it! This is covered in the next section.

For now, you have:
- ✅ PostgreSQL database running
- ✅ Database schema initialized
- ✅ Sample data loaded
- ✅ Views and functions ready

---

## Common Commands

### Start/Stop Services

```bash
# Start database only
docker-compose up -d postgres

# Start database + pgAdmin
docker-compose --profile development up -d

# Stop all services
docker-compose down

# Stop and remove all data (⚠️ WARNING: Deletes all data!)
docker-compose down -v
```

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f postgres

# Last 100 lines
docker-compose logs --tail=100
```

### Database Management

```bash
# Backup database
docker exec automation-dashboard-db pg_dump -U postgres automation_db > backup.sql

# Restore database
cat backup.sql | docker exec -i automation-dashboard-db psql -U postgres -d automation_db

# Reset database (⚠️ WARNING: Deletes all data!)
docker-compose down postgres
docker volume rm personal-automation-dashboard_postgres_data
docker-compose up -d postgres
```

---

## Next Steps

Now that your database is running:

1. **Build the Backend API** - See [backend/README.md](backend/README.md)
2. **Create the Scraper** - See [sections/granules-tracker/README.md](sections/granules-tracker/README.md)
3. **Build the Frontend** - See [frontend/README.md](frontend/README.md)
4. **Set up MCP Integration** - See [DOCKER_INTEGRATION_RESEARCH.md](DOCKER_INTEGRATION_RESEARCH.md#mcp-integration-examples)

---

## Troubleshooting

### Database won't start

```bash
# Check logs
docker-compose logs postgres

# Common issue: Port 5432 already in use
# Solution: Change POSTGRES_PORT in .env to 5433 or stop other PostgreSQL
```

### Can't connect to database

```bash
# Verify container is running
docker-compose ps

# Verify health check
docker inspect automation-dashboard-db | grep -A 5 Health

# Test connection
docker exec -it automation-dashboard-db psql -U postgres -c "SELECT version();"
```

### Reset everything

```bash
# Nuclear option: Remove all containers and volumes
docker-compose down -v
rm -rf database/postgres_data
docker-compose up -d postgres
```

---

## Environment Variables Reference

### Required Variables
- `FIRECRAWL_API_KEY` - Your Firecrawl API key

### Database Variables (with defaults)
- `POSTGRES_DB=automation_db` - Database name
- `POSTGRES_USER=postgres` - Database user
- `POSTGRES_PASSWORD=changeme` - Database password (⚠️ Change in production!)
- `POSTGRES_PORT=5432` - Database port

### Optional Variables
- `PGADMIN_EMAIL` - pgAdmin login email
- `PGADMIN_PASSWORD` - pgAdmin login password
- `REDIS_PORT` - Redis cache port
- `BACKEND_PORT` - Backend API port
- `FRONTEND_PORT` - Frontend UI port

---

## Production Considerations

Before deploying to production:

1. **Change default passwords!**
   ```bash
   POSTGRES_PASSWORD=use_a_strong_random_password_here
   PGADMIN_PASSWORD=another_strong_password
   ```

2. **Use Docker secrets instead of environment variables**
3. **Enable SSL/TLS for database connections**
4. **Set up automated backups**
5. **Configure firewall rules**
6. **Use docker-compose.prod.yml for production settings**

---

## Getting Help

- **Documentation:** [DOCKER_INTEGRATION_RESEARCH.md](DOCKER_INTEGRATION_RESEARCH.md)
- **Implementation Guide:** [IMPLEMENTATION_DECISIONS.md](IMPLEMENTATION_DECISIONS.md)
- **Issues:** [GitHub Issues](https://github.com/your-repo/issues)

---

**Status:** ✅ Database setup complete!
**Next:** Build the scraper to populate real data
**Estimated time to working dashboard:** 2-3 hours
