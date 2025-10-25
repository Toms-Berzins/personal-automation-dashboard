import FirecrawlApp from '@mendable/firecrawl-js';
import pg from 'pg';
import { searchWithBrave, searchWithExa, searchWithDuckDuckGo } from '../services/searchService.js';

const { Pool } = pg;

// Initialize Firecrawl
const firecrawl = new FirecrawlApp({
  apiKey: process.env.FIRECRAWL_API_KEY,
  apiUrl: process.env.FIRECRAWL_API_URL || 'https://api.firecrawl.dev'
});

// Initialize PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Schema for extracting multiple products from listing pages
const multipleProductsSchema = {
  type: "object",
  properties: {
    products: {
      type: "array",
      description: "Array of ALL individual products listed on this page. Each product card, listing item, or product block should be extracted as a separate product. Look for product names like 'GABBY', 'RUBBY', 'GABBY PLUS', etc.",
      items: {
        type: "object",
        properties: {
          product_name: {
            type: "string",
            description: "Exact name or title of this specific product (e.g., 'GABBY PLUS', 'RUBBY', 'MacBook Pro')"
          },
          price: {
            type: "number",
            description: "Numeric price value for THIS product (extract the number from price text like '234,00 €' or '$1,299.99')"
          },
          currency: {
            type: "string",
            description: "Currency symbol or code (EUR, USD, $, €, etc.)"
          },
          brand: {
            type: "string",
            description: "Brand or manufacturer name if shown"
          },
          in_stock: {
            type: "boolean",
            description: "Whether this product is currently in stock (true if available, false if out of stock)"
          },
          description: {
            type: "string",
            description: "Brief product description if available"
          },
          specifications: {
            type: "object",
            description: "Product specifications like weight, size, etc."
          }
        },
        required: ["product_name", "price"]
      }
    }
  },
  required: ["products"]
};

/**
 * Search for products using the best available search engine
 * Priority: Brave > Exa > DuckDuckGo
 */
export async function searchProducts(req, res) {
  try {
    const { query, limit = 5 } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    let searchResult;

    // Try Brave first (if API key available)
    if (process.env.BRAVE_API_KEY) {
      console.log(`🔍 Searching with Brave: "${query}"`);
      searchResult = await searchWithBrave(query, limit);
    }
    // Try Exa if Brave not available (if API key available)
    else if (process.env.EXA_API_KEY) {
      console.log(`🔍 Searching with Exa: "${query}"`);
      searchResult = await searchWithExa(query, limit);
    }
    // Fall back to DuckDuckGo (free, no API key)
    else {
      console.log(`🔍 Searching with DuckDuckGo: "${query}"`);
      searchResult = await searchWithDuckDuckGo(query, limit);
    }

    if (searchResult.error) {
      console.error('Search error:', searchResult.error);
    }

    console.log(`✓ Found ${searchResult.results.length} results using ${searchResult.engine}`);

    res.json({
      results: searchResult.results,
      engine: searchResult.engine,
      query
    });

  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      error: error.message || 'Failed to search products'
    });
  }
}

/**
 * Scrape a specific URL
 */
export async function scrapeUrl(req, res) {
  try {
    const { url, saveToDb = false } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    console.log(`📥 Scraping: ${url}`);

    // Try scraping with multiple products schema first
    const scrapeResult = await firecrawl.scrapeUrl(url, {
      formats: ['markdown', 'extract'],
      extract: {
        schema: multipleProductsSchema
      },
      onlyMainContent: true,
      waitFor: 2000
    });

    if (!scrapeResult.success) {
      return res.json({
        success: false,
        url,
        timestamp: new Date().toISOString(),
        saved: false,
        error: 'Failed to scrape URL'
      });
    }

    const extractedData = scrapeResult.extract || scrapeResult.data?.extract || {};
    const products = extractedData.products || [];

    console.log(`✓ Extracted ${products.length} product(s):`, products);

    let saved = false;
    let savedCount = 0;

    // Save to database if requested
    if (saveToDb && products.length > 0) {
      try {
        for (const product of products) {
          if (product.product_name && product.price) {
            await saveToDatabase(url, product);
            savedCount++;
          }
        }
        saved = true;
        console.log(`💾 Saved ${savedCount} product(s) to database`);
      } catch (dbError) {
        console.error('Database save error:', dbError);
      }
    }

    res.json({
      success: true,
      data: {
        products,
        count: products.length
      },
      url,
      timestamp: new Date().toISOString(),
      saved,
      savedCount
    });
  } catch (error) {
    console.error('Scrape error:', error);
    res.status(500).json({
      success: false,
      url: req.body.url,
      timestamp: new Date().toISOString(),
      saved: false,
      error: error.message || 'Failed to scrape URL'
    });
  }
}

/**
 * Get price history for a product
 */
export async function getPriceHistory(req, res) {
  try {
    const { product, limit = 10 } = req.query;

    if (!product) {
      return res.status(400).json({ error: 'Product name is required' });
    }

    console.log(`📊 Getting price history for: "${product}"`);

    const query = `
      SELECT
        id,
        timestamp,
        product_name,
        price,
        currency,
        brand,
        url,
        in_stock
      FROM product_prices
      WHERE product_name ILIKE $1
      ORDER BY timestamp DESC
      LIMIT $2
    `;

    const result = await pool.query(query, [`%${product}%`, limit]);

    console.log(`✓ Found ${result.rows.length} records`);

    res.json({ history: result.rows });
  } catch (error) {
    console.error('History error:', error);
    res.status(500).json({
      error: error.message || 'Failed to get price history'
    });
  }
}

/**
 * Get latest prices for all products
 */
export async function getLatestPrices(req, res) {
  try {
    console.log(`📊 Getting latest prices`);

    const query = `
      SELECT
        id,
        timestamp,
        product_name,
        price,
        currency,
        brand,
        url,
        in_stock
      FROM latest_product_prices
      ORDER BY timestamp DESC
      LIMIT 50
    `;

    const result = await pool.query(query);

    console.log(`✓ Found ${result.rows.length} products`);

    res.json({ prices: result.rows });
  } catch (error) {
    console.error('Latest prices error:', error);
    res.status(500).json({
      error: error.message || 'Failed to get latest prices'
    });
  }
}

/**
 * Smart Search & Scrape - One-click solution
 * Searches for products and automatically scrapes scrapable results
 */
export async function searchAndScrape(req, res) {
  try {
    const { query, limit = 5, saveToDb = false } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    console.log(`🔍🔧 Smart Search & Scrape: "${query}"`);

    // Step 1: Search
    let searchResult;
    if (process.env.BRAVE_API_KEY) {
      searchResult = await searchWithBrave(query, limit);
    } else if (process.env.EXA_API_KEY) {
      searchResult = await searchWithExa(query, limit);
    } else {
      searchResult = await searchWithDuckDuckGo(query, limit);
    }

    console.log(`✓ Found ${searchResult.results.length} search results`);

    // Blocklist of sites that won't work (CAPTCHA, aggregators, etc.)
    const blockedDomains = [
      'salidzini.lv',
      'google.com',
      'amazon.com', // Often has CAPTCHA for scrapers
      'ebay.com',
      'aliexpress.com'
    ];

    // Step 2: Filter out blocked sites
    const scrapableUrls = searchResult.results.filter(result => {
      const url = new URL(result.url);
      return !blockedDomains.some(domain => url.hostname.includes(domain));
    });

    console.log(`✓ Filtered to ${scrapableUrls.length} scrapable URLs`);

    if (scrapableUrls.length === 0) {
      return res.json({
        success: false,
        query,
        searchEngine: searchResult.engine,
        message: 'No scrapable URLs found. All results were from blocked sites (CAPTCHA protected or aggregators).',
        searchResults: searchResult.results,
        scrapedData: []
      });
    }

    // Step 3: Scrape top results (limit to 3 to avoid rate limits)
    const urlsToScrape = scrapableUrls.slice(0, 3);
    const scrapedData = [];

    for (const result of urlsToScrape) {
      try {
        console.log(`📥 Scraping: ${result.url}`);

        const scrapeResult = await firecrawl.scrapeUrl(result.url, {
          formats: ['markdown', 'extract'],
          extract: {
            schema: multipleProductsSchema
          },
          onlyMainContent: true,
          waitFor: 2000
        });

        if (scrapeResult.success) {
          const extractedData = scrapeResult.extract || scrapeResult.data?.extract || {};
          const products = extractedData.products || [];

          console.log(`✓ Extracted ${products.length} product(s) from ${result.url}`);

          if (products.length > 0) {
            // Save to database if requested
            let saved = false;
            let savedCount = 0;

            if (saveToDb) {
              for (const product of products) {
                if (product.product_name && product.price) {
                  await saveToDatabase(result.url, product);
                  savedCount++;
                }
              }
              saved = true;
              console.log(`💾 Saved ${savedCount} product(s) from ${result.url}`);
            }

            scrapedData.push({
              url: result.url,
              title: result.title,
              products,
              count: products.length,
              saved,
              savedCount
            });
          }
        }
      } catch (scrapeError) {
        console.error(`✗ Failed to scrape ${result.url}:`, scrapeError.message);
        // Continue to next URL
      }
    }

    // Summary
    const totalProducts = scrapedData.reduce((sum, site) => sum + site.count, 0);
    console.log(`✓ Scraped ${scrapedData.length} sites, found ${totalProducts} products total`);

    res.json({
      success: true,
      query,
      searchEngine: searchResult.engine,
      searchResultsCount: searchResult.results.length,
      scrapableSitesCount: scrapableUrls.length,
      scrapedSitesCount: scrapedData.length,
      totalProducts,
      scrapedData
    });

  } catch (error) {
    console.error('Search & Scrape error:', error);
    res.status(500).json({
      error: error.message || 'Failed to search and scrape'
    });
  }
}

/**
 * Helper: Save scraped data to database
 */
async function saveToDatabase(url, data) {
  const query = `
    INSERT INTO product_prices (
      url,
      product_name,
      price,
      currency,
      brand,
      in_stock,
      description,
      specifications
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING id, timestamp
  `;

  const values = [
    url,
    data.product_name,
    data.price,
    data.currency || 'EUR',
    data.brand || null,
    data.in_stock !== undefined ? data.in_stock : true,
    data.description || null,
    data.specifications ? JSON.stringify(data.specifications) : null
  ];

  return await pool.query(query, values);
}
