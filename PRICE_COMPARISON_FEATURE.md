# Price Comparison Feature

## Overview

The Price Comparison feature helps you distinguish between **new products** and **price changes** for existing products when scraping. This allows you to:

- **Track new products** entering the market
- **Monitor price increases** for existing items
- **Detect price drops** for better purchase decisions
- **Ignore unchanged prices** to reduce noise

## How It Works

When you scrape products, the system compares them with historical data in the database and categorizes each product as:

1. **New Product** - Never seen before in the database
2. **Price Increase** - Price went up compared to last scrape
3. **Price Decrease** - Price went down (🎉 potential savings!)
4. **Unchanged** - Same price as last time

## API Endpoints

### 1. Search, Scrape & Compare

**Endpoint:** `POST /api/search-scrape-compare`

**Description:** Searches the web, scrapes products, and compares with historical prices BEFORE saving.

**Request Body:**
```json
{
  "query": "granulas",
  "limit": 5,
  "saveToDb": true,
  "maxSites": 3,
  "maxPages": 1,
  "priceChangeThreshold": 1
}
```

**Parameters:**
- `query` (required): Search query (e.g., "wood pellets", "granulas")
- `limit` (optional, default: 5): Number of search results
- `saveToDb` (optional, default: false): Whether to save products to database
- `maxSites` (optional, default: 3): Maximum websites to scrape (1-10)
- `maxPages` (optional, default: 1): Pages per website (1-30)
- `priceChangeThreshold` (optional, default: 1): Minimum percentage change to consider significant (e.g., 1 = 1%)

**Response Example:**
```json
{
  "success": true,
  "query": "granulas",
  "searchEngine": "brave",
  "totalScraped": 15,
  "saved": true,
  "savedCount": 15,
  "comparison": {
    "summary": {
      "total": 15,
      "new": 8,
      "updated": 5,
      "unchanged": 2
    },
    "newProducts": [
      {
        "product_name": "Premium Wood Pellets 15kg",
        "price": 4.99,
        "currency": "EUR",
        "brand": "EcoFuel",
        "in_stock": true,
        "url": "https://example.com/product-1",
        "status": "new"
      }
    ],
    "priceIncreases": [
      {
        "product_name": "Standard Pellets Big Bag",
        "price": 250.00,
        "currency": "EUR",
        "oldPrice": 234.00,
        "newPrice": 250.00,
        "changePercent": 6.84,
        "changeAmount": 16.00,
        "status": "price_increase"
      }
    ],
    "priceDecreases": [
      {
        "product_name": "Economy Pellets 1 Ton",
        "price": 210.00,
        "currency": "EUR",
        "oldPrice": 225.00,
        "newPrice": 210.00,
        "changePercent": -6.67,
        "changeAmount": -15.00,
        "status": "price_decrease"
      }
    ],
    "unchanged": [
      {
        "product_name": "Premium Pellets",
        "price": 5.20,
        "currency": "EUR",
        "status": "unchanged",
        "lastChecked": "2025-10-31T05:00:00.000Z"
      }
    ]
  }
}
```

### 2. Get Price Alerts

**Endpoint:** `GET /api/price-alerts?dropThreshold=5&increaseThreshold=10`

**Description:** Detects significant price changes in the last 24 hours.

**Query Parameters:**
- `dropThreshold` (optional, default: 5): Minimum % price drop to alert (e.g., 5 = alert on 5%+ drops)
- `increaseThreshold` (optional, default: 10): Minimum % price increase to alert

**Response Example:**
```json
{
  "success": true,
  "alerts": {
    "drops": [
      {
        "product_name": "Premium Granulas",
        "brand": "EcoFuel",
        "previous_price": 240.00,
        "current_price": 220.00,
        "change_percent": -8.33,
        "change_amount": -20.00,
        "trend": "drop",
        "previous_date": "2025-10-30T12:00:00.000Z",
        "current_date": "2025-10-31T06:00:00.000Z"
      }
    ],
    "increases": [
      {
        "product_name": "Standard Pellets",
        "brand": "Woodco",
        "previous_price": 200.00,
        "current_price": 225.00,
        "change_percent": 12.50,
        "change_amount": 25.00,
        "trend": "increase"
      }
    ],
    "total": 2
  },
  "summary": {
    "totalAlerts": 2,
    "priceDrops": 1,
    "priceIncreases": 1
  }
}
```

## Usage Examples

### Example 1: Check for New Products and Price Changes

```bash
curl -X POST http://localhost:5000/api/search-scrape-compare \
  -H "Content-Type: application/json" \
  -d '{
    "query": "wood pellets",
    "saveToDb": false,
    "maxSites": 3,
    "priceChangeThreshold": 2
  }'
```

This will:
1. Search for "wood pellets"
2. Scrape up to 3 websites
3. Compare with historical data
4. Show you what's new vs what changed
5. **NOT** save to database (preview mode)

### Example 2: Save New Data and Get Comparison

```bash
curl -X POST http://localhost:5000/api/search-scrape-compare \
  -H "Content-Type: application/json" \
  -d '{
    "query": "granulas",
    "saveToDb": true,
    "maxSites": 5,
    "maxPages": 2,
    "priceChangeThreshold": 1
  }'
```

This will:
1. Search and scrape up to 5 websites (2 pages each)
2. Compare with history
3. Save all products to database
4. Return detailed comparison results

### Example 3: Get Daily Price Alerts

```bash
curl http://localhost:5000/api/price-alerts?dropThreshold=5&increaseThreshold=15
```

This shows products with:
- Price drops of 5% or more (good deals!)
- Price increases of 15% or more (warnings)

## Decision Flow

When scraping products, the system follows this logic:

```
For each scraped product:
  ↓
  Does it exist in database?
    ├─ NO  → Status: NEW PRODUCT ⭐
    └─ YES → Compare prices
              ↓
              Price changed > threshold?
                ├─ Price went UP   → Status: PRICE INCREASE 📈
                ├─ Price went DOWN → Status: PRICE DECREASE 📉
                └─ No change       → Status: UNCHANGED ✓
```

## Integration with Frontend

The frontend can use this data to display:

- **Badge indicators**: "NEW", "↑ +5%", "↓ -10%"
- **Color coding**: Green for drops, red for increases, blue for new
- **Smart filtering**: Show only price drops or new products
- **Alerts**: Notify users of significant changes

## Benefits

1. **Avoid Duplicate Alerts**: Only notify on actual price changes
2. **Track Market Trends**: See when new products appear
3. **Smart Purchasing**: Get alerts when prices drop
4. **Historical Context**: Understand if a price is good or bad
5. **Data Efficiency**: Don't re-process unchanged prices

## Technical Details

### Price Comparison Service

Located in `backend/src/services/priceComparisonService.js`

**Key Functions:**
- `compareWithHistory(products, options)` - Main comparison logic
- `detectPriceAlerts(dropThreshold, increaseThreshold)` - Find significant changes
- `getPriceTrends(productNames, days)` - Historical trend analysis

### Database Queries

The comparison service queries the `price_history` table to:
1. Find the most recent price for each product
2. Calculate price differences
3. Detect trends over time

### Performance

- Comparisons run in parallel for multiple products
- Uses indexed queries on `product_name` and `scraped_at`
- Caches results during a single scrape operation

## Future Enhancements

Potential features to add:
- [ ] Email notifications for price drops
- [ ] Price prediction using historical trends
- [ ] Product availability alerts
- [ ] Seasonal price analysis
- [ ] Multi-currency support
- [ ] Price comparison across retailers

## Troubleshooting

**Q: All products show as "new" even though I've scraped before**
A: Check that product names match exactly. The system uses case-insensitive matching and normalized names.

**Q: Price changes aren't being detected**
A: Verify the `priceChangeThreshold` is low enough. Default is 1% - price changes below this are considered "unchanged".

**Q: No price history found**
A: Make sure you've run at least one scrape with `saveToDb: true` to populate historical data.

## Related Documentation

- [API_ENDPOINTS.md](./API_ENDPOINTS.md) - Full API documentation
- [DATABASE_STRATEGY.md](./DATABASE_STRATEGY.md) - Database schema details
- [README.md](./README.md) - Project overview
