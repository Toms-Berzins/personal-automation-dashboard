# Implementation Decisions - Sequential Analysis

**Date:** 2025-10-25
**Status:** Decision Phase
**Methodology:** Sequential Thinking Approach

---

## Step 1: Research Document Review ✅

### Analysis
The research document provides comprehensive coverage of:
- Docker MCP Toolkit architecture and capabilities
- Multi-container setup recommendations
- Security best practices
- Cost considerations
- Implementation roadmap

### Validation Results
✅ Architecture aligns with project requirements
✅ Security measures are appropriate for web scraping
✅ MCP integration adds significant value for AI-assisted workflows
✅ Cost projections are realistic (~$50-100/month for production)

### Key Takeaway
The research provides a solid foundation. Recommendation: **Proceed with implementation.**

---

## Step 2: Database Technology Choice 🎯

### Evaluation Criteria
1. **Development simplicity** - How easy to set up locally?
2. **Scalability** - Can it handle multiple sections?
3. **Docker compatibility** - Official images available?
4. **Cost** - Self-hosted vs managed
5. **Query capabilities** - Time-series data analysis
6. **MCP integration** - Existing MCP servers?

### Option Analysis

#### PostgreSQL
**Pros:**
- ✅ Official Docker image (postgres:15-alpine)
- ✅ Excellent for time-series data
- ✅ Strong ACID compliance
- ✅ Rich query capabilities (aggregations, window functions)
- ✅ MCP server available (mcp/postgres)
- ✅ Free self-hosted, proven at scale
- ✅ pgAdmin for visual management

**Cons:**
- ⚠️ Requires SQL knowledge (moderate learning curve)
- ⚠️ More setup than Google Sheets

**Fit Score:** 9/10

#### MongoDB
**Pros:**
- ✅ Official Docker image (mongo:latest)
- ✅ Flexible schema (good for evolving data structures)
- ✅ JSON-native storage
- ✅ Easy to learn

**Cons:**
- ⚠️ Less ideal for time-series queries
- ⚠️ No official MCP server (need custom)
- ⚠️ Aggregation pipeline can be complex

**Fit Score:** 7/10

#### Google Sheets
**Pros:**
- ✅ Zero infrastructure setup
- ✅ Visual data viewing
- ✅ Easy sharing/collaboration
- ✅ Built-in charting

**Cons:**
- ❌ Row limits (10M cells per spreadsheet)
- ❌ Performance issues with large datasets
- ❌ API rate limits
- ❌ Not suitable for production automation
- ❌ No Docker integration
- ❌ Complex to query programmatically

**Fit Score:** 5/10

### **DECISION: PostgreSQL** ✅

**Rationale:**
1. Best fit for time-series price tracking data
2. Excellent Docker support and MCP integration
3. Scalable from development to production
4. Free self-hosted option keeps costs low
5. Industry-standard for data analysis workloads
6. Enables advanced features (materialized views, partitioning)

**Implementation:**
- Use `postgres:15-alpine` Docker image
- Include pgAdmin container for development
- Set up database migrations for schema management
- Use connection pooling (pg-pool) for scalability

---

## Step 3: Development Environment Setup Plan 📋

### Prerequisites Check
```bash
# Required software
- Docker Desktop (version 4.0+)
- Node.js (18+)
- Git
- VS Code (recommended)
```

### Directory Structure to Create
```
personal-automation-dashboard/
├── docker-compose.yml          # Main orchestration file
├── docker-compose.dev.yml      # Development overrides
├── docker-compose.prod.yml     # Production overrides
├── .dockerignore               # Exclude files from builds
├── .env                        # Environment variables (gitignored)
├── .env.example                # Template with all variables
├── database/
│   ├── init.sql                # Initial schema
│   └── migrations/             # Database migrations
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   ├── src/
│   │   ├── index.js
│   │   ├── routes/
│   │   ├── models/
│   │   └── services/
│   └── .dockerignore
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   ├── vite.config.js
│   └── src/
└── sections/
    └── granules-tracker/
        ├── README.md
        ├── scrapers/
        │   ├── Dockerfile
        │   ├── package.json
        │   ├── scraper.js
        │   └── config.js
        ├── data/
        │   └── schema.json
        └── frontend/
            └── components/
```

### Implementation Steps

#### 3.1 Create Core Configuration Files
1. **docker-compose.yml** - Minimal production setup
2. **docker-compose.dev.yml** - Add development features (volume mounts, hot reload)
3. **.env.example** - Document all environment variables
4. **.dockerignore** - Exclude node_modules, .git, etc.

#### 3.2 Database Setup
1. Create database initialization script (init.sql)
2. Define granules_prices table schema
3. Add indexes for query performance
4. Include pgAdmin container for development

#### 3.3 Backend API Setup
1. Create Express.js backend with TypeScript
2. Set up PostgreSQL connection with pg library
3. Create REST endpoints for sections
4. Add health check endpoint

#### 3.4 Test Development Environment
1. Start services: `docker-compose up -d`
2. Verify database connection
3. Test API endpoints
4. Check logs for errors

---

## Step 4: Granules Tracker Containerization Plan 🚀

### Component Breakdown

#### 4.1 Database Schema
```sql
CREATE TABLE granules_prices (
  id SERIAL PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  store VARCHAR(100) NOT NULL,
  product_name VARCHAR(255) NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'EUR',
  unit VARCHAR(50) NOT NULL DEFAULT 'per_ton',
  quantity DECIMAL(10, 2),
  brand VARCHAR(100),
  url TEXT,
  in_stock BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_price CHECK (price > 0)
);

CREATE INDEX idx_granules_timestamp ON granules_prices(timestamp DESC);
CREATE INDEX idx_granules_store ON granules_prices(store);
CREATE INDEX idx_granules_in_stock ON granules_prices(in_stock);
```

#### 4.2 Scraper Container
**File:** `sections/granules-tracker/scrapers/Dockerfile`

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Install chromium for Firecrawl (if needed)
RUN apk add --no-cache chromium

# Copy dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy scraper code
COPY . .

# Non-root user for security
RUN addgroup -g 1001 scraper && \
    adduser -D -u 1001 -G scraper scraper
USER scraper

ENV NODE_ENV=production

CMD ["node", "scraper.js"]
```

**File:** `sections/granules-tracker/scrapers/package.json`

```json
{
  "name": "granules-tracker-scraper",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "scrape": "node scraper.js",
    "test": "node scraper.js --dry-run"
  },
  "dependencies": {
    "@mendable/firecrawl-js": "^1.0.0",
    "pg": "^8.11.0",
    "dotenv": "^16.0.0"
  }
}
```

#### 4.3 Scraper Logic
**File:** `sections/granules-tracker/scrapers/scraper.js`

Key features:
- Load Firecrawl configuration
- Iterate through retailer URLs
- Extract structured data using JSON schema
- Validate data before saving
- Handle errors gracefully
- Log progress and failures
- Support dry-run mode

#### 4.4 Integration with docker-compose
Add scraper service with:
- Profile: `scraping` (only run when needed)
- Dependencies: postgres
- Environment variables: FIRECRAWL_API_KEY, DATABASE_URL
- Volume mounts: logs directory

---

## Step 5: Docker MCP Toolkit Installation Plan 🤖

### Installation Methods

#### Method 1: Docker Desktop Integration (Recommended)
1. Install Docker Desktop 4.28+
2. Enable MCP Toolkit in settings
3. Access via Docker Desktop UI
4. Browse MCP Catalog
5. Install servers with one click

#### Method 2: Command Line
```bash
# Start MCP Gateway
docker run -d \
  --name mcp-gateway \
  -p 11434:11434 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  docker/mcp-gateway:latest

# Install Firecrawl MCP server
docker run -d \
  --label mcp.enabled=true \
  --name mcp-firecrawl \
  -e FIRECRAWL_API_KEY=${FIRECRAWL_API_KEY} \
  mcp/firecrawl

# Install PostgreSQL MCP server
docker run -d \
  --label mcp.enabled=true \
  --name mcp-postgres \
  -e DATABASE_URL=${DATABASE_URL} \
  mcp/postgres
```

### Claude Desktop Configuration
**File:** `%APPDATA%\Claude\claude_desktop_config.json` (Windows)

```json
{
  "mcpServers": {
    "docker-gateway": {
      "command": "docker",
      "args": ["mcp", "gateway", "run"],
      "type": "stdio"
    }
  }
}
```

### Testing MCP Integration
1. Open Claude Desktop
2. Verify MCP servers are connected
3. Test queries:
   - "What granule retailers are in the database?"
   - "Show me the latest prices from the last scrape"
   - "What's the price trend for Brand X this month?"

---

## Implementation Timeline

### Week 1: Foundation
- [x] Research completed
- [x] Database decision made (PostgreSQL)
- [ ] Create project structure
- [ ] Set up docker-compose.yml
- [ ] Initialize PostgreSQL database
- [ ] Create .env configuration

### Week 2: Backend & Scraper
- [ ] Build Express.js backend
- [ ] Create granules_prices table
- [ ] Develop scraper for granules-tracker
- [ ] Test scraper with dry-run mode
- [ ] Implement data validation

### Week 3: Frontend & Visualization
- [ ] Set up React + Vite frontend
- [ ] Create dashboard layout
- [ ] Add price trend chart
- [ ] Add store comparison table
- [ ] Connect to backend API

### Week 4: MCP Integration
- [ ] Install Docker MCP Toolkit
- [ ] Configure Claude Desktop
- [ ] Create custom MCP tools
- [ ] Test AI-assisted queries
- [ ] Document MCP workflows

### Week 5: Automation & Polish
- [ ] Add n8n container (optional)
- [ ] Set up scraping schedules
- [ ] Implement alerts
- [ ] Add logging and monitoring
- [ ] Write user documentation

---

## Risk Mitigation

### Technical Risks

**Risk 1:** Firecrawl API rate limits
- **Mitigation:** Implement exponential backoff, use caching, monitor usage

**Risk 2:** Docker Desktop licensing for commercial use
- **Mitigation:** Use Docker Engine (free for all uses) or Podman as alternative

**Risk 3:** Database migrations breaking production
- **Mitigation:** Use migration tools (node-pg-migrate), test on staging first

**Risk 4:** MCP servers not available in catalog
- **Mitigation:** Build custom MCP servers using SDK, contribute to community

### Operational Risks

**Risk 1:** Scraping targets change website structure
- **Mitigation:** Implement scraper tests, add alerts for failures, version configs

**Risk 2:** High hosting costs
- **Mitigation:** Start with self-hosted VPS ($5-10/month), optimize container resources

**Risk 3:** Data loss
- **Mitigation:** Daily PostgreSQL backups, test restore procedures

---

## Success Metrics

### Development Phase
- ✅ All containers start without errors
- ✅ Database connections stable
- ✅ Scraper successfully extracts data from 3+ retailers
- ✅ Frontend displays real-time data
- ✅ MCP queries return accurate results

### Production Phase
- 📊 Scraping success rate > 95%
- 📊 API response time < 200ms
- 📊 Database query time < 100ms
- 📊 Zero data loss incidents
- 📊 Monthly hosting cost < $50

---

## Next Immediate Actions

### 1. Create Project Files (Now)
```bash
# Create directory structure
mkdir -p database/migrations
mkdir -p backend/src/{routes,models,services}
mkdir -p frontend/src/components
mkdir -p sections/granules-tracker/scrapers
mkdir -p sections/granules-tracker/data

# Create configuration files
touch docker-compose.yml
touch docker-compose.dev.yml
touch .env.example
touch .dockerignore
touch database/init.sql
```

### 2. Initialize Database Schema (Now)
- Write init.sql with granules_prices table
- Add indexes for performance
- Include sample data for testing

### 3. Build Scraper (Next)
- Create package.json with Firecrawl dependency
- Implement scraper.js with error handling
- Test with --dry-run flag

### 4. Test Locally (Same Day)
- `docker-compose up -d postgres`
- Run scraper manually
- Verify data in database

### 5. Add MCP Integration (This Week)
- Install Docker MCP Toolkit
- Configure Claude Desktop
- Test natural language queries

---

## Conclusion

**Database Choice:** PostgreSQL (best fit for time-series data + Docker + MCP)

**Architecture:** Multi-container Docker Compose setup with:
- PostgreSQL database
- Express.js backend API
- React frontend
- Dedicated scraper containers per section
- MCP Gateway for AI integration

**Timeline:** 5 weeks from setup to production-ready

**Budget:** ~$50/month for production hosting

**Key Advantage:** MCP integration enables AI-assisted data analysis and automation

---

**Status:** ✅ Ready to proceed with implementation
**Next Step:** Create docker-compose.yml and database schema

---

**Document Version:** 1.0
**Approved By:** Sequential Analysis Process
**Date:** 2025-10-25
