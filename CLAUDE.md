# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Personal Automation Dashboard is a modular dashboard system for web scraping and automation powered by Firecrawl. The project uses a section-based architecture where each section is an independent module tracking specific data points (e.g., granules price tracker).

## Development Commands

### Running the Application
```bash
npm run dev      # Start frontend development server
npm run build    # Build frontend for production
npm start        # Run production build
```

### Scraping Commands
```bash
npm run scrape:granules                    # Scrape all granules retailers
npm run scrape:granules -- --retailer="retailer-1"  # Scrape specific retailer
npm run scrape:granules -- --dry-run       # Test scraper without saving data
```

### Testing
No test suite currently configured (shows error). Tests need to be set up when implementing features.

## Architecture Overview

### Multi-Layer Architecture
The system follows a layered architecture from top to bottom:

1. **Frontend Layer** - Dashboard UI (React/Vue/Svelte + Chart.js/D3.js)
2. **API Layer** - Optional Express/FastAPI for data aggregation
3. **Data Storage** - PostgreSQL/MongoDB/Google Sheets/JSON files
4. **Automation Layer** - n8n/Zapier workflows for scheduled tasks
5. **Scraping Layer** - Firecrawl for web scraping and data extraction

### Section-Based Modularity
Each tracking section lives in `sections/[section-name]/` and contains:
- `README.md` - Section documentation
- `scrapers/` - Firecrawl scraper configurations
- `data/` - Sample/output data
- `schema.json` - Data structure definition

Current sections:
- `granules-tracker/` - Wood pellet price tracking (in development)

## Key Configuration Files

### Environment Variables (`.env.example`)
Required environment variables:
- `FIRECRAWL_API_KEY` - Firecrawl API key for web scraping
- `FIRECRAWL_API_URL` - Firecrawl API endpoint (default: https://api.firecrawl.dev)
- Database config (PostgreSQL, MongoDB, or Google Sheets)
- `N8N_WEBHOOK_URL` - n8n webhook URL for automation
- `PORT` - Dashboard port (default: 3000)
- Alert configuration (SMTP for email notifications)
- Cron schedules for scraping (e.g., `SCRAPE_SCHEDULE_GRANULES=0 6 * * *`)

### Package.json Structure
- Main entry point: `index.js` (not yet implemented)
- Frontend commands run from `frontend/` subdirectory
- No dependencies installed yet - frontend and backend need separate setup

## Creating New Sections

When adding a new tracking section:

1. Create directory: `sections/[section-name]/`
2. Add section README with:
   - Features and overview
   - Data structure/schema
   - Tracked sources
   - Configuration details
3. Create `scrapers/` directory with Firecrawl configurations:
   ```javascript
   export const scrapeConfig = {
     name: "Section Scraper",
     url: "https://target-site.com",
     formats: ["markdown", {"type": "json", "schema": {...}}],
     onlyMainContent: true,
     waitFor: 2000
   };
   ```
4. Define data schema in `schema.json`
5. Add scraping script to package.json: `npm run scrape:[section-name]`
6. Create frontend component in `frontend/src/sections/`
7. Set up automation workflow in `automation/workflows/`

## Data Flow for Sections

Typical workflow for automated data collection:
1. **Trigger** - Cron schedule (configured in n8n or environment)
2. **Scrape** - Firecrawl extracts data from target websites
3. **Transform** - Clean and normalize scraped data
4. **Store** - Save to database/Google Sheets
5. **Analyze** - Process data for insights (e.g., price trends)
6. **Alert** - Notify user if conditions met (e.g., price drops)

## Granules Tracker Details

### Data Schema
```json
{
  "timestamp": "ISO 8601 datetime",
  "store": "string",
  "product_name": "string",
  "price": "number",
  "currency": "string (e.g., EUR)",
  "unit": "string (e.g., per_ton)",
  "quantity": "number",
  "brand": "string",
  "url": "string",
  "in_stock": "boolean"
}
```

### Scraping Schedule
- Daily: 6:00 AM (quick price check)
- Weekly: Sunday 12:00 PM (comprehensive scan)
- Monthly: 1st of month (archive & analysis)

### Visualization Components
- Price trend line chart (12 months)
- Monthly average bar chart
- Store comparison table
- Seasonal price heatmap

## Project Status

- Project is in early setup phase
- No frontend/backend code implemented yet
- Structure and documentation defined
- Only one section (granules-tracker) planned, not yet implemented
- No actual scraper scripts exist yet

## Tech Stack

- **Frontend:** React + Vite + Chart.js (planned, not set up)
- **Backend:** Node.js + Express (optional, not implemented)
- **Scraping:** Firecrawl API
- **Automation:** n8n / Zapier / Make
- **Database:** PostgreSQL / MongoDB / Google Sheets (choose one)
- **Deployment:** Vercel / Netlify / Docker (not configured)
