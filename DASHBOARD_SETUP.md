# Dashboard Setup Guide 🚀

Complete setup guide for the Automation Dashboard web UI with TypeScript + React.

---

## 📦 What's Been Built

A modern, full-stack dashboard for web scraping with:

### Frontend (TypeScript + React + Vite)
- 🔍 **Search Mode** - Find products across the web
- 📥 **Scrape Mode** - Extract data from specific URLs
- 📊 **Price History** - View historical price data
- 🎨 **Modern UI** - Dark theme, responsive design
- ⚡ **Real-time** - Instant feedback on scraping

### Backend (Node.js + Express)
- 🔌 **REST API** - Clean API endpoints
- 🔥 **Firecrawl Integration** - AI-powered web scraping
- 💾 **PostgreSQL** - Price history storage
- 📡 **CORS Enabled** - Frontend/backend communication

---

## 🚀 Quick Setup (3 Steps)

### 1. Install Dependencies

```bash
# Install frontend dependencies
cd frontend
npm install

# Install backend dependencies
cd ../backend
npm install
```

### 2. Set Up Database

```bash
# Make sure PostgreSQL is running
docker-compose up -d postgres

# Run migration to create tables
docker exec -i automation-dashboard-db psql -U postgres -d automation_db < database/migrations/001_add_product_prices.sql
```

### 3. Start Everything

```bash
# Terminal 1: Start backend API
cd backend
npm run dev

# Terminal 2: Start frontend
cd frontend
npm run dev
```

**Done!** Open http://localhost:3000 in your browser.

---

## 📝 Detailed Setup

### Prerequisites

- ✅ Docker Desktop (running PostgreSQL)
- ✅ Node.js 18+ installed
- ✅ Firecrawl API key (get from https://firecrawl.dev)

### Environment Configuration

Make sure your `.env` file has:

```bash
# Firecrawl
FIRECRAWL_API_KEY=your_api_key_here
FIRECRAWL_API_URL=https://api.firecrawl.dev

# PostgreSQL
DATABASE_URL=postgresql://postgres:changeme_in_production@localhost:5432/automation_db

# Backend
BACKEND_PORT=8000
NODE_ENV=development

# Frontend
FRONTEND_PORT=3000
```

### Frontend Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── ScraperDashboard.tsx    # Main scraper interface
│   │   ├── ScraperDashboard.css
│   │   ├── PriceHistory.tsx        # Price history table
│   │   └── PriceHistory.css
│   ├── services/
│   │   └── api.ts                  # API client
│   ├── styles/
│   │   ├── global.css              # Global styles
│   │   └── App.css                 # App layout
│   ├── types/
│   │   └── index.ts                # TypeScript types
│   ├── App.tsx                     # Main component
│   └── main.tsx                    # Entry point
├── index.html
├── vite.config.ts
├── tsconfig.json
└── package.json
```

### Backend Structure

```
backend/
├── src/
│   ├── controllers/
│   │   └── scraperController.js   # Business logic
│   ├── routes/
│   │   └── scraper.js             # API routes
│   └── server.js                  # Express server
└── package.json
```

---

## 🎯 Using the Dashboard

### Search Mode

1. Click **🔍 Search** tab
2. Enter search query (e.g., "MacBook Pro M3")
3. Click **GO** button
4. Browse results
5. Click "Scrape This" on any result

### Scrape Mode

1. Click **📥 Scrape URL** tab
2. Paste product URL
3. Check "Save to database" if you want price tracking
4. Click **GO** button
5. View extracted data

### Price History

1. Click **📊 Price History** tab
2. See all tracked products
3. Use search to filter by product name
4. Click "View →" to see original product page

---

## 🔌 API Endpoints

### POST /api/search
Search for products across the web.

**Request:**
```json
{
  "query": "wireless headphones",
  "limit": 5
}
```

**Response:**
```json
{
  "results": [
    {
      "title": "Sony WH-1000XM5",
      "url": "https://...",
      "description": "Premium noise cancelling..."
    }
  ]
}
```

### POST /api/scrape
Scrape a specific URL for product data.

**Request:**
```json
{
  "url": "https://store.com/product",
  "saveToDb": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "product_name": "Sony WH-1000XM5",
    "price": 399.99,
    "currency": "EUR",
    "brand": "Sony",
    "in_stock": true,
    "description": "...",
    "specifications": {}
  },
  "url": "https://...",
  "timestamp": "2025-10-25T10:30:00.000Z",
  "saved": true
}
```

### GET /api/history?product=...&limit=10
Get price history for a product.

**Response:**
```json
{
  "history": [
    {
      "id": 1,
      "timestamp": "2025-10-25T10:30:00.000Z",
      "product_name": "Sony WH-1000XM5",
      "price": 399.99,
      "currency": "EUR",
      "brand": "Sony",
      "url": "https://...",
      "in_stock": true
    }
  ]
}
```

### GET /api/prices/latest
Get latest prices for all tracked products.

**Response:**
```json
{
  "prices": [...]
}
```

---

## 🎨 Features

### ✅ Implemented

- ✅ Search products across the web
- ✅ Scrape specific URLs
- ✅ Extract product data (name, price, brand, specs)
- ✅ Save to PostgreSQL database
- ✅ View price history
- ✅ Responsive design
- ✅ Loading states
- ✅ Error handling
- ✅ TypeScript type safety
- ✅ Dark theme UI

### 🚧 Coming Soon

- [ ] Real-time scraping progress with WebSockets
- [ ] Price change alerts
- [ ] Export data to CSV
- [ ] Charts and visualizations
- [ ] Batch scraping multiple URLs
- [ ] Scheduled scraping with cron
- [ ] User authentication
- [ ] API rate limiting

---

## 🐛 Troubleshooting

### "Network Error" in frontend

**Problem:** Frontend can't connect to backend

**Solution:**
```bash
# Make sure backend is running on port 8000
cd backend
npm run dev

# Check backend is accessible
curl http://localhost:8000/health
```

### "Database connection failed"

**Problem:** Backend can't connect to PostgreSQL

**Solution:**
```bash
# Check PostgreSQL is running
docker-compose ps

# Restart if needed
docker-compose restart postgres

# Verify DATABASE_URL in .env
echo $DATABASE_URL
```

### "Module not found" errors

**Problem:** Dependencies not installed

**Solution:**
```bash
# Frontend
cd frontend
rm -rf node_modules package-lock.json
npm install

# Backend
cd backend
rm -rf node_modules package-lock.json
npm install
```

### TypeScript errors in frontend

**Problem:** Type checking fails

**Solution:**
```bash
cd frontend
npm run type-check
```

### CORS errors

**Problem:** Cross-origin request blocked

**Solution:**
- Backend has CORS enabled by default
- Make sure backend is running on port 8000
- Frontend proxy is configured in `vite.config.ts`

---

## 🔧 Development Tips

### Hot Reload

Both frontend and backend support hot reload:

```bash
# Frontend (Vite)
cd frontend
npm run dev

# Backend (Node --watch)
cd backend
npm run dev
```

### Type Checking

Run TypeScript type checking:

```bash
cd frontend
npm run type-check
```

### Build for Production

```bash
# Frontend
cd frontend
npm run build

# Backend (no build needed)
cd backend
npm start
```

### Environment Variables

Development vs Production:

```bash
# Development (default)
NODE_ENV=development

# Production
NODE_ENV=production
```

---

## 📊 Tech Stack

### Frontend
- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool & dev server
- **Axios** - HTTP client
- **CSS3** - Custom styling (no framework)

### Backend
- **Node.js** - Runtime
- **Express** - Web framework
- **Firecrawl** - Web scraping
- **PostgreSQL** - Database
- **pg** - PostgreSQL client

### DevOps
- **Docker** - PostgreSQL container
- **Docker Compose** - Multi-container orchestration

---

## 🚀 Next Steps

### Immediate
1. ✅ Test search functionality
2. ✅ Test scraping a real product URL
3. ✅ Verify data saves to database
4. ✅ Check price history displays correctly

### Short-term
- [ ] Add loading spinners during scraping
- [ ] Improve error messages
- [ ] Add price charts (Chart.js)
- [ ] Export history to CSV
- [ ] Add pagination to history table

### Long-term
- [ ] WebSocket for real-time updates
- [ ] Email notifications for price drops
- [ ] Multi-currency support
- [ ] User accounts & authentication
- [ ] Deploy to production (Vercel + Railway)

---

## 📸 Screenshots

### Search Mode
```
┌─────────────────────────────────────┐
│  🔍 Search     📥 Scrape URL        │
├─────────────────────────────────────┤
│  ┌────────────────────┬───────────┐ │
│  │ Search query...    │  🚀 GO    │ │
│  └────────────────────┴───────────┘ │
│                                     │
│  Search Results:                    │
│  ┌─────────────────────────────────┐│
│  │ 1. Sony WH-1000XM5      [Scrape]││
│  │    https://...                  ││
│  └─────────────────────────────────┘│
└─────────────────────────────────────┘
```

### Scrape Mode
```
┌─────────────────────────────────────┐
│  🔍 Search     📥 Scrape URL        │
├─────────────────────────────────────┤
│  ┌────────────────────┬───────────┐ │
│  │ https://store.com  │  🚀 GO    │ │
│  └────────────────────┴───────────┘ │
│  ☑ Save to database                │
│                                     │
│  ✅ Scraping Successful   💾 Saved  │
│  ┌─────────────────────────────────┐│
│  │ Sony WH-1000XM5    399.99 EUR  ││
│  │ Brand: Sony                     ││
│  │ Stock: ✓ In Stock              ││
│  └─────────────────────────────────┘│
└─────────────────────────────────────┘
```

---

## 🎉 Success!

You now have a fully functional web scraping dashboard with:

✅ Modern TypeScript + React frontend
✅ RESTful Node.js backend
✅ Firecrawl integration for AI-powered scraping
✅ PostgreSQL for data persistence
✅ Beautiful, responsive UI

**Start scraping:** http://localhost:3000

---

*Last updated: 2025-10-25*
