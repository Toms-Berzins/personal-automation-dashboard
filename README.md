# 🚀 Personal Automation Dashboard

> Multi-section dashboard for web scraping and automation powered by Firecrawl

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Firecrawl](https://img.shields.io/badge/Powered%20by-Firecrawl-orange)](https://firecrawl.dev)

## 📊 Overview

A modular, extensible dashboard system that combines web scraping, data automation, and visualization. Each section is a standalone module tracking specific data points or insights.

## 🎯 Features

### 🔍 On-Demand Web Scraper
**Status:** ✅ Ready to Use

A powerful CLI tool for on-demand product price scraping and tracking using Firecrawl API.

**Features:**
- Search the web for any product using natural language
- Scrape specific URLs to extract prices and product data
- Save price history to PostgreSQL database
- Track price changes over time
- Generic schema works with any product type

[View Scraper Documentation →](./tools/scraper/README.md)

**Quick Example:**
```bash
# Search for products
npm run search "MacBook Pro M3 price"

# Scrape a specific product page
npm run scrape "https://store.com/product" -- --save

# View price history
npm run history "MacBook Pro"
```

### 📦 [Add Your Own Section]
**Status:** 💡 Ready to Build

The modular architecture makes it easy to add custom tracking sections for your specific needs!

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Dashboard Frontend                        │
│  (React/Vue/Svelte + Chart.js/D3.js)                        │
└──────────────────┬──────────────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────────────┐
│                    API Layer (Optional)                      │
│  (Express/FastAPI - Data aggregation & endpoints)           │
└──────────────────┬──────────────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────────────┐
│                    Data Storage                              │
│  • PostgreSQL / MongoDB                                      │
│  • Google Sheets                                             │
│  • Airtable                                                  │
│  • JSON Files                                                │
└──────────────────┬──────────────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────────────┐
│              Automation Layer (n8n/Zapier)                   │
│  • Scheduled workflows                                       │
│  • Data transformation                                       │
│  • Alert triggers                                            │
└──────────────────┬──────────────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────────────┐
│              Firecrawl (Web Scraping)                        │
│  • Search & Discover                                         │
│  • Scrape & Extract                                          │
│  • Structured Data                                           │
└──────────────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose (for database)
- Node.js 18+ (for scraper)
- Firecrawl API key ([Get one here](https://firecrawl.dev))

### Setup in 3 Steps

**1. Clone and configure:**
```bash
git clone https://github.com/Toms-Berzins/personal-automation-dashboard.git
cd personal-automation-dashboard

# Copy environment template
cp .env.example .env

# Edit .env and add your Firecrawl API key
nano .env  # or use your preferred editor
```

**2. Start the database:**
```bash
# Start PostgreSQL with Docker
docker-compose up -d postgres

# Run database migrations
docker exec -i automation-dashboard-db psql -U postgres -d automation_db < database/migrations/001_add_product_prices.sql
```

**3. Install scraper dependencies:**
```bash
cd tools/scraper
npm install
```

### Your First Scrape

```bash
# Search for a product
npm run search "wireless headphones"

# Scrape a product page and save to database
npm run scrape "https://example.com/product" -- --save

# View price history
npm run history "headphones"
```

See [QUICKSTART.md](./QUICKSTART.md) for detailed setup instructions.

## 📁 Project Structure

```
personal-automation-dashboard/
├── tools/
│   └── scraper/           # 🔍 On-demand web scraper
│       ├── scraper.js     # Main CLI tool
│       ├── package.json   # Dependencies
│       └── README.md      # Usage guide
├── database/              # 💾 Database setup
│   ├── init.sql           # Initial schema
│   └── migrations/        # Schema migrations
│       └── 001_add_product_prices.sql
├── docker-compose.yml     # 🐳 PostgreSQL + services
├── docker-compose.dev.yml # Development overrides
├── frontend/              # 📊 Dashboard UI (planned)
│   └── src/
├── backend/               # 🔌 API layer (optional)
│   └── routes/
├── docs/                  # 📚 Documentation
│   ├── QUICKSTART.md
│   ├── PROGRESS_SUMMARY.md
│   └── IMPLEMENTATION_DECISIONS.md
├── .env.example           # Environment template
└── README.md
```

## 🔧 Adding a New Section

1. **Create section folder:**
   ```bash
   mkdir -p sections/my-new-section
   ```

2. **Add configuration:**
   ```json
   {
     "name": "My New Section",
     "description": "Track something awesome",
     "scrapers": [...],
     "schedule": "daily",
     "dataSchema": {...}
   }
   ```

3. **Create Firecrawl scraper:**
   ```javascript
   // sections/my-new-section/scrapers/main.js
   export const scrapeConfig = {
     url: "https://example.com",
     formats: ["markdown", {"type": "json", "schema": {...}}]
   };
   ```

4. **Add to dashboard:**
   - Create component in `frontend/src/sections/`
   - Import in main dashboard
   - Add to navigation

## 🛠️ Tech Stack

- **Scraping:** Firecrawl
- **Automation:** n8n / Zapier / Make
- **Frontend:** React + Vite + Chart.js
- **Backend:** Node.js + Express (optional)
- **Database:** PostgreSQL / Google Sheets
- **Deployment:** Vercel / Netlify / Docker

## 📊 Dashboard Features

- ✅ Modular section-based architecture
- ✅ Real-time data updates
- ✅ Historical trend analysis
- ✅ Price/data alerts
- ✅ Multi-store/source comparison
- ✅ Export data (CSV/JSON)
- ✅ Mobile responsive design
- 🚧 Dark/Light theme
- 🚧 Custom date range filtering
- 🚧 Email notifications

## 🎨 Screenshots

*Coming soon...*

## 🤝 Contributing

Contributions are welcome! Feel free to:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-section`)
3. Commit your changes (`git commit -m 'Add amazing section'`)
4. Push to the branch (`git push origin feature/amazing-section`)
5. Open a Pull Request

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details

## 🙏 Acknowledgments

- [Firecrawl](https://firecrawl.dev) - Powerful web scraping API
- [n8n](https://n8n.io) - Workflow automation
- [Chart.js](https://www.chartjs.org/) - Beautiful charts

## 📧 Contact

Questions? Open an issue or reach out!

---

⭐ **Star this repo** if you find it useful!
