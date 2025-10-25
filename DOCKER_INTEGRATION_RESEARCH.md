# Docker Integration Research for Personal Automation Dashboard

**Date:** 2025-10-25
**Project:** Personal Automation Dashboard
**Research Focus:** Docker & MCP (Model Context Protocol) Integration

---

## Executive Summary

This research document explores Docker integration strategies for the Personal Automation Dashboard project, with a special focus on the Model Context Protocol (MCP) - a revolutionary protocol that enables AI agents to interact directly with containerized services. The combination of Docker + MCP + Firecrawl creates a powerful automation platform.

### Key Findings

1. **Docker MCP Toolkit** - Production-ready solution for running MCP servers
2. **Multi-container architecture** - Perfect fit for the project's layered design
3. **Security & isolation** - Critical for web scraping and automation workloads
4. **Scalability** - Container orchestration for multiple tracking sections

---

## What is MCP (Model Context Protocol)?

The Model Context Protocol is an **open, standardized protocol** (released early 2025) that allows applications to provide structured, live context to Large Language Models (LLMs) like Claude.

### MCP Architecture

```
┌─────────────────┐
│  MCP Client     │ (Claude Desktop, Cursor, VS Code)
│  (AI Agent)     │
└────────┬────────┘
         │
         │ Discovers & connects to servers
         │
    ┌────▼────────────────────────┐
    │   Docker MCP Gateway        │
    │   (Acts as MCP Server)      │
    └────┬────────────────────────┘
         │
         ├─► MCP Server 1 (Firecrawl)
         ├─► MCP Server 2 (GitHub)
         ├─► MCP Server 3 (Database)
         └─► MCP Server N (Custom Tools)
```

### Key Benefits

✅ **No copy-pasting** - AI can directly pull API results
✅ **Live data** - Always current, fresh responses
✅ **Accessible to non-technical users** - Plain language queries
✅ **Massive productivity gains** - Automate complex workflows
✅ **Safe & private** - Explicit authorization required

---

## Docker MCP Toolkit

The **Docker MCP Toolkit** is Docker's official gateway for managing containerized MCP servers.

### Key Features

- **Cross-LLM compatibility**: Works with Claude Desktop, Cursor, Continue.dev, Gordon
- **Integrated tool discovery**: Browse and launch MCP servers from Docker Desktop
- **Zero manual setup**: No dependency management required
- **Acts as both**: MCP server aggregator + gateway for clients

### Security Features

#### Passive Security
- **Image signing & attestation**: All `mcp/*` images are signed by Docker
- **SBOM included**: Software Bill of Materials for transparency

#### Active Security
- **CPU limits**: 1 CPU per MCP tool container
- **Memory limits**: 2 GB per container
- **Filesystem isolation**: No host access by default (explicit mounts required)
- **Request interception**: Blocks sensitive information like secrets

---

## How Docker MCP Works for This Project

### Single vs Multi-Container Patterns

**Single Container Pattern:**
```
┌──────────────────────────────┐
│   MCP Server Container       │
│                              │
│   ┌──────────────────────┐  │
│   │  MCP Server Process  │  │
│   │  + Built-in Tools    │  │
│   └──────────────────────┘  │
│                              │
└──────────────────────────────┘
```

**Multi-Container Pattern (Recommended for this project):**
```
┌──────────────────────────────┐
│   MCP Server Container       │
│                              │
│   ┌──────────────────────┐  │
│   │  MCP Server Process  │  │
│   └──────────┬───────────┘  │
│              │               │
└──────────────┼───────────────┘
               │
     ┌─────────┴──────────┐
     │                    │
┌────▼────┐         ┌─────▼────┐
│ Tool    │         │ Tool     │
│ Container│        │ Container│
└─────────┘         └──────────┘
```

---

## Recommended Architecture for Personal Automation Dashboard

### Multi-Layer Containerization Strategy

```yaml
version: '3.8'

services:
  # ============================================
  # 1. Frontend Layer - Dashboard UI
  # ============================================
  frontend:
    build: ./frontend
    container_name: automation-dashboard-ui
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - VITE_API_URL=http://backend:8000
    depends_on:
      - backend
    volumes:
      - ./frontend:/app
      - /app/node_modules
    networks:
      - app_network

  # ============================================
  # 2. Backend API Layer - Express/FastAPI
  # ============================================
  backend:
    build: ./backend
    container_name: automation-dashboard-api
    ports:
      - "8000:8000"
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://postgres:password@postgres:5432/automation_db
      - FIRECRAWL_API_KEY=${FIRECRAWL_API_KEY}
      - FIRECRAWL_API_URL=https://api.firecrawl.dev
    depends_on:
      - postgres
      - redis
    volumes:
      - ./backend:/app
      - /app/node_modules
    networks:
      - app_network

  # ============================================
  # 3. Data Storage Layer - PostgreSQL
  # ============================================
  postgres:
    image: postgres:15-alpine
    container_name: automation-dashboard-db
    environment:
      POSTGRES_DB: automation_db
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database/init.sql:/docker-entrypoint-initdb.d/init.sql
    networks:
      - app_network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  # ============================================
  # 4. Cache Layer - Redis
  # ============================================
  redis:
    image: redis:7-alpine
    container_name: automation-dashboard-cache
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    networks:
      - app_network

  # ============================================
  # 5. Scraping Layer - Firecrawl Workers
  # ============================================
  scraper-granules:
    build:
      context: ./sections/granules-tracker/scrapers
      dockerfile: Dockerfile
    container_name: scraper-granules
    environment:
      - FIRECRAWL_API_KEY=${FIRECRAWL_API_KEY}
      - DATABASE_URL=postgresql://postgres:password@postgres:5432/automation_db
      - SECTION_NAME=granules-tracker
    depends_on:
      - postgres
    volumes:
      - ./sections/granules-tracker:/app
      - scraper_logs:/app/logs
    networks:
      - app_network
    # Only run on-demand or via cron
    profiles:
      - scraping

  # ============================================
  # 6. MCP Gateway (Optional but Recommended)
  # ============================================
  mcp-gateway:
    image: docker/mcp-gateway:latest
    container_name: automation-mcp-gateway
    ports:
      - "11434:11434"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - mcp_data:/data
    networks:
      - app_network
    environment:
      - MCP_SERVERS=firecrawl,github,database

  # ============================================
  # 7. n8n Automation (Optional)
  # ============================================
  n8n:
    image: n8nio/n8n:latest
    container_name: automation-n8n
    ports:
      - "5678:5678"
    environment:
      - N8N_BASIC_AUTH_ACTIVE=true
      - N8N_BASIC_AUTH_USER=admin
      - N8N_BASIC_AUTH_PASSWORD=${N8N_PASSWORD}
      - WEBHOOK_URL=http://localhost:5678/
    volumes:
      - n8n_data:/home/node/.n8n
      - ./automation/workflows:/workflows
    networks:
      - app_network
    profiles:
      - automation

networks:
  app_network:
    driver: bridge

volumes:
  postgres_data:
  redis_data:
  scraper_logs:
  mcp_data:
  n8n_data:
```

---

## Section-Specific Docker Strategy

### Granules Tracker Example

**Directory Structure:**
```
sections/granules-tracker/
├── scrapers/
│   ├── Dockerfile
│   ├── package.json
│   ├── scraper.js
│   └── firecrawl-config.js
├── data/
│   └── schema.json
└── README.md
```

**Dockerfile for Scraper:**
```dockerfile
FROM node:18-alpine

# Install dependencies for headless scraping if needed
RUN apk add --no-cache chromium

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy scraper code
COPY . .

# Set environment
ENV NODE_ENV=production
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Run scraper
CMD ["node", "scraper.js"]
```

**Scraper Script (scraper.js):**
```javascript
const Firecrawl = require('@mendable/firecrawl-js');
const { Client } = require('pg');

const firecrawl = new Firecrawl({
  apiKey: process.env.FIRECRAWL_API_KEY,
  apiUrl: process.env.FIRECRAWL_API_URL
});

async function scrapeGranules() {
  const retailers = [
    'https://retailer1.com/granules',
    'https://retailer2.com/pellets',
    'https://retailer3.com/wood-pellets'
  ];

  for (const url of retailers) {
    try {
      const result = await firecrawl.scrapeUrl(url, {
        formats: ['markdown', {
          type: 'json',
          schema: {
            type: 'object',
            properties: {
              store: { type: 'string' },
              product_name: { type: 'string' },
              price: { type: 'number' },
              currency: { type: 'string' },
              in_stock: { type: 'boolean' }
            }
          }
        }],
        onlyMainContent: true,
        waitFor: 2000
      });

      await saveToDatabase(result);
      console.log(`✓ Scraped ${url}`);
    } catch (error) {
      console.error(`✗ Failed to scrape ${url}:`, error);
    }
  }
}

async function saveToDatabase(data) {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  await client.connect();

  // Insert data into granules_prices table
  await client.query(`
    INSERT INTO granules_prices (timestamp, store, product_name, price, currency, in_stock)
    VALUES (NOW(), $1, $2, $3, $4, $5)
  `, [data.store, data.product_name, data.price, data.currency, data.in_stock]);

  await client.end();
}

// Run scraper
scrapeGranules().catch(console.error);
```

---

## MCP Integration Examples

### Example 1: Firecrawl MCP Server

**Configuration in Claude Desktop:**
```json
{
  "mcpServers": {
    "firecrawl": {
      "command": "docker",
      "args": [
        "run", "--rm", "-i",
        "-e", "FIRECRAWL_API_KEY=${FIRECRAWL_API_KEY}",
        "mcp/firecrawl"
      ]
    }
  }
}
```

**Usage:**
```
User: "Claude, scrape the latest granule prices from retailer1.com"

Claude: [Uses Firecrawl MCP server to scrape]
"Here are the current granule prices:
- Brand A: €300/ton (in stock)
- Brand B: €285/ton (out of stock)
- Brand C: €310/ton (in stock)"
```

### Example 2: Database MCP Server

**Configuration:**
```json
{
  "mcpServers": {
    "database": {
      "command": "docker",
      "args": [
        "run", "--rm", "-i",
        "-e", "DATABASE_URL=postgresql://user:pass@host:5432/db",
        "mcp/postgres"
      ]
    }
  }
}
```

**Usage:**
```
User: "Claude, what's the average granule price this month?"

Claude: [Queries database via MCP]
"The average granule price this month is €295/ton,
down 3% from last month (€304/ton)."
```

---

## Implementation Roadmap

### Phase 1: Basic Containerization (Week 1-2)
- [ ] Create Dockerfiles for frontend and backend
- [ ] Set up docker-compose.yml for development
- [ ] Configure PostgreSQL container
- [ ] Test local development environment

### Phase 2: Scraping Infrastructure (Week 3-4)
- [ ] Build scraper containers for granules-tracker
- [ ] Integrate Firecrawl API
- [ ] Set up data persistence
- [ ] Create scraping schedules

### Phase 3: MCP Integration (Week 5-6)
- [ ] Install Docker MCP Toolkit
- [ ] Configure MCP Gateway
- [ ] Create custom MCP servers for project-specific tools
- [ ] Test with Claude Desktop

### Phase 4: Automation & Orchestration (Week 7-8)
- [ ] Add n8n container (optional)
- [ ] Create automated workflows
- [ ] Set up monitoring and logging
- [ ] Configure alerts

### Phase 5: Production Deployment (Week 9-10)
- [ ] Optimize Docker images
- [ ] Set up CI/CD pipeline
- [ ] Deploy to cloud (AWS/Azure/GCP)
- [ ] Configure production secrets management

---

## Best Practices & Recommendations

### 1. Security
- ✅ Use Docker secrets for sensitive data (not environment variables in compose files)
- ✅ Run containers as non-root users
- ✅ Scan images for vulnerabilities (`docker scan`)
- ✅ Use signed images from trusted registries
- ✅ Limit container resources (CPU, memory)

### 2. Performance
- ✅ Use multi-stage builds to reduce image size
- ✅ Leverage build cache effectively
- ✅ Use Alpine Linux base images where possible
- ✅ Implement health checks for all services
- ✅ Use Redis for caching scraped data

### 3. Development Workflow
- ✅ Use volume mounts for hot reloading in development
- ✅ Separate dev/prod docker-compose files
- ✅ Use `.dockerignore` to exclude unnecessary files
- ✅ Tag images with version numbers
- ✅ Document all environment variables in `.env.example`

### 4. MCP-Specific
- ✅ Start with Docker MCP Toolkit (don't build from scratch)
- ✅ Use Docker MCP Catalog for pre-built servers
- ✅ Test MCP servers individually before combining
- ✅ Configure proper OAuth for GitHub/other services
- ✅ Monitor MCP server logs for errors

---

## Cost Considerations

### Firecrawl API
- Check API rate limits and pricing tiers
- Implement caching to reduce API calls
- Use `maxAge` parameter for cached results (500% faster)

### Container Hosting
- **Development**: Local Docker Desktop (free)
- **Production Options**:
  - AWS ECS/Fargate: ~$30-100/month for small workloads
  - DigitalOcean App Platform: ~$12-50/month
  - Railway/Render: ~$10-40/month
  - Self-hosted VPS: ~$5-20/month

### Database
- PostgreSQL container: No additional cost if self-hosted
- Managed PostgreSQL (AWS RDS, DigitalOcean): ~$15-50/month

---

## Alternative Approaches

### 1. Docker + Firecrawl Self-Hosted
Instead of using Firecrawl API, you can self-host:
```yaml
services:
  firecrawl-api:
    image: mendable/firecrawl:latest
    container_name: firecrawl-self-hosted
    ports:
      - "3002:3002"
    environment:
      - REDIS_URL=redis://redis:6379
    depends_on:
      - redis
```

### 2. Kubernetes Instead of Docker Compose
For larger scale:
- Use Kubernetes manifests
- Implement autoscaling
- Better for multiple sections (5+)

### 3. Serverless Functions + Docker
- Deploy scrapers as AWS Lambda containers
- Triggered by CloudWatch Events (cron)
- Only pay when scraping runs

---

## Quick Start Commands

### Initial Setup
```bash
# Clone repository
cd personal-automation-dashboard

# Copy environment template
cp .env.example .env

# Edit .env with your API keys
nano .env

# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

### Run Scraper Manually
```bash
# Run granules scraper once
docker-compose run --rm scraper-granules

# Run with dry-run mode
docker-compose run --rm scraper-granules npm run scrape -- --dry-run
```

### MCP Gateway Setup
```bash
# Start MCP gateway
docker run -d \
  -p 11434:11434 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  docker/mcp-server

# Add Firecrawl MCP server
docker run -d \
  --label mcp.enabled=true \
  -e FIRECRAWL_API_KEY=your_key \
  mcp/firecrawl
```

---

## Resources & Links

### Official Documentation
- [Docker MCP Toolkit](https://docs.docker.com/ai/mcp-catalog-and-toolkit/toolkit/)
- [Model Context Protocol Spec](https://modelcontextprotocol.io/)
- [Firecrawl Documentation](https://docs.firecrawl.dev/)
- [Docker Compose Reference](https://docs.docker.com/compose/)

### Tutorials & Guides
- [Docker MCP: A Docker Guide (DEV.to)](https://dev.to/rflpazini/mcp-a-docker-guide-3mp4)
- [How to Build MCP Servers with Docker](https://www.docker.com/blog/build-to-prod-mcp-servers-with-docker/)
- [Firecrawl + n8n Integration](https://www.firecrawl.dev/blog/firecrawl-n8n-web-automation)

### GitHub Examples
- [Docker + Node.js + PostgreSQL Template](https://github.com/alexeagleson/docker-node-postgres-template)
- [Firecrawl Docker Image](https://github.com/wangyang-hw/firecrawl-docker-image)
- [Docker MCP Tutorial](https://github.com/theNetworkChuck/docker-mcp-tutorial)

---

## Next Steps

1. **Review this document** with the team
2. **Set up development environment** using docker-compose
3. **Build first scraper container** for granules-tracker
4. **Test MCP integration** with Claude Desktop
5. **Iterate and expand** to additional sections

---

## Conclusion

Docker integration with MCP provides the Personal Automation Dashboard with:

- **Standardized deployment** across all environments
- **Easy scaling** for multiple tracking sections
- **AI-powered interaction** via Claude and other MCP clients
- **Security & isolation** for web scraping workloads
- **Future-proof architecture** aligned with industry standards

The combination of **Docker + MCP + Firecrawl** creates a powerful, maintainable automation platform that can grow with the project's needs.

---

**Document Version:** 1.0
**Last Updated:** 2025-10-25
**Author:** Research compiled from Docker, Anthropic, and Firecrawl documentation
