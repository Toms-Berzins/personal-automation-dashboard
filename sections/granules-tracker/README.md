# 🌲 Granules/Wood Pellets Price Tracker

> Find the best time to buy wood pellets by tracking prices across multiple retailers

## 📊 Overview

This section tracks wood pellet (granules) prices from various online retailers to help you:
- Identify the cheapest month to buy
- Compare prices across different stores
- Get alerts when prices drop
- Analyze seasonal price trends

## 🎯 Features

- ✅ **Multi-store tracking** - Monitor prices from 5+ retailers
- ✅ **Historical data** - 12+ months of price history
- ✅ **Seasonal analysis** - Statistical insights on best months
- ✅ **Price alerts** - Email/notification when deals appear
- ✅ **Unit price comparison** - Normalize prices per ton/bag
- ✅ **Interactive charts** - Visualize trends over time

## 🛒 Tracked Retailers

### Currently Tracked:
1. **[Retailer 1]** - `https://example-store-1.com/granules`
2. **[Retailer 2]** - `https://example-store-2.com/wood-pellets`
3. **[Retailer 3]** - `https://example-store-3.com/pellets`

*Want to add more? Edit `config/retailers.json`*

## 📁 Data Structure

```json
{
  "timestamp": "2025-10-25T08:00:00Z",
  "store": "Example Store",
  "product_name": "Premium Wood Pellets",
  "price": 299.99,
  "currency": "EUR",
  "unit": "per_ton",
  "quantity": 1,
  "brand": "Example Brand",
  "url": "https://store.com/product",
  "in_stock": true
}
```

## 🔧 Configuration

### Firecrawl Scraper Config

```javascript
// scrapers/retailer-1.js
export const scrapeConfig = {
  name: "Retailer 1 Scraper",
  url: "https://example-store.com/granules",
  formats: [
    "markdown",
    {
      "type": "json",
      "schema": {
        "products": "array",
        "name": "string",
        "price": "number",
        "currency": "string",
        "in_stock": "boolean"
      }
    }
  ],
  onlyMainContent: true,
  waitFor: 2000
};
```

### Scraping Schedule

- **Daily:** 6:00 AM (quick price check)
- **Weekly:** Sunday 12:00 PM (comprehensive scan)
- **Monthly:** 1st of month (archive & analysis)

## 📈 Charts & Visualizations

### 1. Price Trend Line Chart
Shows price movements over the last 12 months for all retailers.

### 2. Monthly Average Bar Chart
Compares average prices by month to identify the cheapest period.

### 3. Store Comparison Table
Real-time comparison of current prices across all stores.

### 4. Seasonal Heatmap
Visualizes price patterns throughout the year.

## 🚀 Usage

### Manual Scraping

```bash
# Scrape all retailers
npm run scrape:granules

# Scrape specific retailer
npm run scrape:granules -- --retailer="retailer-1"

# Test scraper without saving
npm run scrape:granules -- --dry-run
```

### View Dashboard

```bash
npm run dev
# Open http://localhost:3000/sections/granules
```

## 🤖 Automation (n8n)

The automated workflow does the following:

1. **Trigger:** Runs daily at 6 AM
2. **Scrape:** Calls Firecrawl for each retailer
3. **Transform:** Cleans and normalizes data
4. **Store:** Saves to database/Google Sheets
5. **Analyze:** Calculates if price is lowest in 30 days
6. **Alert:** Sends notification if deal is found

[View n8n Workflow →](../../automation/workflows/granules-tracker.json)

## 📊 Sample Data

See [data/example.json](data/example.json) for sample data structure.

## 🔔 Price Alerts

Get notified when:
- Price drops below €250/ton
- Price is lowest in 60 days
- New retailer is added
- Product goes out of stock

## 🐛 Troubleshooting

### Scraper Not Working?

1. Check Firecrawl API key in `.env`
2. Verify retailer URLs are still valid
3. Check if website structure changed
4. Review Firecrawl logs

### Data Not Updating?

1. Check n8n workflow status
2. Verify database connection
3. Check scraping schedule
4. Review error logs

## 📝 TODO

- [ ] Add 5 more retailers
- [ ] Implement price prediction (ML)
- [ ] Add delivery cost tracking
- [ ] Create mobile app alerts
- [ ] Export historical data
- [ ] Add price drop history

## 🤝 Contributing

Want to add a new retailer? 

1. Create scraper config in `scrapers/`
2. Add retailer to `config/retailers.json`
3. Test scraper: `npm run test:scraper`
4. Submit PR!

---

**Next:** [Add Another Section](../../docs/adding-sections.md)
