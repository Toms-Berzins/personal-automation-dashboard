# On-Demand Web Scraper with Firecrawl

A powerful CLI tool for on-demand web scraping and price tracking using the Firecrawl API.

## Features

- 🔍 **Search the web** for products using natural language queries
- 📥 **Scrape specific URLs** to extract product data and prices
- 💾 **Save to PostgreSQL** for historical tracking
- 📊 **Price history** analysis and comparison
- 🎯 **Generic schema** works with any product type
- ⚡ **Fast and reliable** using Firecrawl's AI-powered extraction

## Installation

```bash
cd tools/scraper
npm install
```

## Configuration

Make sure you have a `.env` file in the project root with:

```bash
FIRECRAWL_API_KEY=your_api_key_here
DATABASE_URL=postgresql://postgres:password@localhost:5432/automation_db
```

## Usage

### 1. Search for Products

Search the web for products using natural language queries:

```bash
npm run search "wood pellets 15kg price"
npm run search "MacBook Pro M3" -- --limit 10
```

**Example output:**
```
🔍 Searching for: "wood pellets 15kg price"

✓ Found 5 results:

1. Premium Wood Pellets 15kg - Best Price
   URL: https://example.com/wood-pellets
   High quality wood pellets for heating...

2. Economy Wood Pellets 15kg Bags
   URL: https://store.com/pellets-15kg
   Affordable heating solution...
```

### 2. Scrape a Specific URL

Extract product data from a specific URL:

```bash
# Just scrape and display
npm run scrape "https://example.com/product-page"

# Scrape and save to database
npm run scrape "https://example.com/product-page" -- --save
```

**Example output:**
```
📥 Scraping: https://example.com/product-page

✓ Successfully scraped!

Extracted Data:
{
  "product_name": "Premium Wood Pellets 15kg",
  "price": 8.99,
  "currency": "EUR",
  "brand": "EcoHeat",
  "in_stock": true,
  "description": "High-quality wood pellets for efficient heating",
  "specifications": {
    "weight": "15kg",
    "material": "100% natural wood",
    "moisture": "< 8%"
  }
}

✓ Saved to database (ID: 42)
  Timestamp: 2025-10-25T10:30:00.000Z
```

### 3. View Price History

Check historical prices for a tracked product:

```bash
npm run history "wood pellets"
npm run history "MacBook Pro" -- --limit 20
```

**Example output:**
```
📊 Price history for: "wood pellets"

✓ Found 10 price records:

1. Premium Wood Pellets 15kg
   Date: 25/10/2025, 10:30:00
   Price: 8.99 EUR
   ✓ In Stock
   Brand: EcoHeat
   URL: https://example.com/product-page

2. Premium Wood Pellets 15kg
   Date: 24/10/2025, 15:20:00
   Price: 9.49 EUR
   ✓ In Stock
   Brand: EcoHeat
   URL: https://example.com/product-page
```

## CLI Commands Reference

### search

Search the web for products.

```bash
node scraper.js search <query> [options]
```

**Arguments:**
- `<query>` - Search query (e.g., "iPhone 15 Pro price")

**Options:**
- `-l, --limit <number>` - Number of results (default: 5)

**Examples:**
```bash
node scraper.js search "gaming laptop RTX 4090"
node scraper.js search "coffee machine" --limit 10
```

### scrape

Scrape a specific URL for product data.

```bash
node scraper.js scrape <url> [options]
```

**Arguments:**
- `<url>` - URL to scrape

**Options:**
- `--save` - Save results to database (default: false)

**Examples:**
```bash
node scraper.js scrape "https://store.com/product/123"
node scraper.js scrape "https://amazon.com/dp/B08..." --save
```

### history

Get price history for a product.

```bash
node scraper.js history <product> [options]
```

**Arguments:**
- `<product>` - Product name to search

**Options:**
- `-l, --limit <number>` - Number of records (default: 10)

**Examples:**
```bash
node scraper.js history "iPhone 15"
node scraper.js history "PlayStation 5" --limit 30
```

## Database Setup

The scraper uses a PostgreSQL database to store price history. Run the migration to create the necessary tables:

```bash
# Make sure PostgreSQL is running
docker-compose up -d postgres

# Connect to database and run migration
docker exec -i automation-dashboard-db psql -U postgres -d automation_db < database/migrations/001_add_product_prices.sql
```

### Database Schema

**product_prices table:**
- `id` - Auto-incrementing primary key
- `timestamp` - When the price was recorded
- `url` - Source URL
- `product_name` - Name of the product
- `brand` - Brand/manufacturer
- `price` - Product price
- `currency` - Currency code (EUR, USD, etc.)
- `in_stock` - Availability status
- `description` - Product description
- `specifications` - JSON field for product specs

**Available views:**
- `latest_product_prices` - Most recent price for each product
- `product_price_changes` - Price changes over time

**Available functions:**
- `get_product_price_history(product_name, limit)` - Get price history
- `get_product_price_stats(product_name)` - Get price statistics

## Use Cases

### 1. Price Monitoring

Track product prices over time and get alerts when prices drop:

```bash
# Scrape and save current price
npm run scrape "https://store.com/product" -- --save

# Check price history
npm run history "Product Name"

# Query price changes in database
docker exec -it automation-dashboard-db psql -U postgres -d automation_db
SELECT * FROM product_price_changes WHERE change_percentage < -5;
```

### 2. Product Research

Compare products from different retailers:

```bash
# Search for products
npm run search "wireless headphones under 100"

# Scrape each result
npm run scrape "https://store1.com/headphones" -- --save
npm run scrape "https://store2.com/headphones" -- --save
npm run scrape "https://store3.com/headphones" -- --save

# Compare prices in database
SELECT product_name, price, currency, url
FROM latest_product_prices
WHERE product_name ILIKE '%headphones%'
ORDER BY price;
```

### 3. Historical Analysis

Analyze price trends and patterns:

```bash
# Get comprehensive statistics
SELECT * FROM get_product_price_stats('Product Name');

# Find best time to buy
SELECT
    EXTRACT(DOW FROM timestamp) as day_of_week,
    AVG(price) as avg_price
FROM product_prices
WHERE product_name ILIKE '%Product Name%'
GROUP BY day_of_week
ORDER BY avg_price;
```

## Extracted Data Fields

The scraper automatically extracts the following fields:

- **product_name** *(required)* - Product name/title
- **price** *(required)* - Current price
- **currency** - Currency code (EUR, USD, GBP, etc.)
- **brand** - Manufacturer or brand name
- **in_stock** - Availability status (true/false)
- **description** - Product description
- **specifications** - Product specifications (JSON object)

## Advanced Usage

### Custom Extraction Schema

You can modify the extraction schema in [scraper.js](scraper.js:23-45) to extract additional fields specific to your needs.

### Batch Scraping

Create a file with URLs and scrape them all:

```bash
# urls.txt
https://store.com/product1
https://store.com/product2
https://store.com/product3

# Bash script
while read url; do
  node scraper.js scrape "$url" --save
  sleep 2  # Rate limiting
done < urls.txt
```

### Scheduled Scraping

Use cron or n8n to schedule regular price checks:

```bash
# Cron example: Check prices daily at 6 AM
0 6 * * * cd /path/to/tools/scraper && node scraper.js scrape "https://store.com/product" --save
```

## Troubleshooting

### "Firecrawl API error"

- Check your API key in `.env`
- Verify you have sufficient API credits
- Check Firecrawl service status

### "Database connection failed"

- Ensure PostgreSQL is running: `docker-compose ps`
- Verify `DATABASE_URL` in `.env`
- Run migrations: `docker exec -i automation-dashboard-db psql -U postgres -d automation_db < database/migrations/001_add_product_prices.sql`

### "No results found"

- Try different search queries
- Some websites may block scraping
- Check if the URL is accessible

## API Rate Limits

Firecrawl has usage limits based on your plan:
- Free tier: ~500 credits/month
- Pay-as-you-go: $1 per 1000 credits
- Each scrape uses ~1-3 credits

Be mindful of rate limits when batch scraping.

## Contributing

Feel free to extend the scraper with:
- Additional extraction schemas
- Custom data validators
- Alert notifications
- Price drop detection
- Multi-currency support

## License

MIT
