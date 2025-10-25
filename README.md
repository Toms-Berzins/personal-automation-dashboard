# 🚀 Personal Automation Dashboard

> Multi-section dashboard for web scraping and automation powered by Firecrawl

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Firecrawl](https://img.shields.io/badge/Powered%20by-Firecrawl-orange)](https://firecrawl.dev)

## 📊 Overview

A modular, extensible dashboard system that combines web scraping, data automation, and visualization. Each section is a standalone module tracking specific data points or insights.

## 🎯 Current Sections

### 1. 🌲 Granules Price Tracker
**Status:** 🚧 In Development

Track wood pellet/granules prices across multiple retailers to find the best month to buy.

**Features:**
- Daily price scraping from major retailers
- Historical price trends (12+ months)
- Seasonal analysis (best months to buy)
- Price alerts when deals are found
- Multi-store comparison

[View Documentation →](./sections/granules-tracker/README.md)

### 2. 📦 [Your Next Section]
**Status:** 💡 Planned

*Add your next automation idea here!*

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
- Node.js 18+ (for frontend)
- Firecrawl API key ([Get one here](https://firecrawl.dev))
- n8n instance (optional, for automation)
- Database (PostgreSQL/MongoDB) or Google Sheets

### Installation

```bash
# Clone the repository
git clone https://github.com/Toms-Berzins/personal-automation-dashboard.git
cd personal-automation-dashboard

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Add your API keys to .env
# FIRECRAWL_API_KEY=your_key_here

# Start development server
npm run dev
```

## 📁 Project Structure

```
personal-automation-dashboard/
├── frontend/              # Dashboard UI
│   ├── src/
│   │   ├── components/    # Reusable components
│   │   ├── sections/      # Section-specific components
│   │   ├── utils/         # Helper functions
│   │   └── App.jsx        # Main app
│   └── package.json
├── backend/               # API layer (optional)
│   ├── routes/
│   ├── controllers/
│   └── server.js
├── automation/            # n8n workflows
│   ├── workflows/
│   └── README.md
├── sections/              # Individual tracking sections
│   ├── granules-tracker/
│   │   ├── README.md
│   │   ├── scrapers/      # Firecrawl configurations
│   │   ├── data/          # Sample data
│   │   └── schema.json    # Data structure
│   └── [future-sections]/
├── docs/                  # Documentation
├── .env.example
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
