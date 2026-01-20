// IMPORTANT: Load environment variables FIRST
import '../config/env.js';
import FirecrawlApp from '@mendable/firecrawl-js';
import pg from 'pg';
import { searchWithBrave, searchWithExa, searchWithDuckDuckGo, smartSearch, searchWithExaContents } from '../services/searchService.js';
import { processScrapedData, processBatch } from '../services/dataPipeline.js';
import { compareWithHistory, detectPriceAlerts } from '../services/priceComparisonService.js';
import * as dbModule from '../database/db.js';

const { Pool } = pg;
const db = dbModule.default || dbModule;

// Initialize Firecrawl (v4.x SDK)
const firecrawl = new FirecrawlApp({
  apiKey: process.env.FIRECRAWL_API_KEY,
  apiUrl: process.env.FIRECRAWL_API_URL || 'https://api.firecrawl.dev'
});

// Default cache settings (2 hours in ms for faster re-scrapes)
const DEFAULT_MAX_AGE = 2 * 60 * 60 * 1000; // 2 hours
const DEFAULT_MIN_AGE = 0; // No minimum age by default

// Initialize PostgreSQL connection
// Explicitly parse connection parameters to ensure password is a string
const getDatabaseConfig = () => {
  const dbUrl = process.env.DATABASE_URL;

  if (dbUrl) {
    try {
      // Parse the URL manually to ensure all values are strings
      const url = new URL(dbUrl);
      return {
        host: url.hostname,
        port: parseInt(url.port) || 5432,
        database: url.pathname.slice(1), // Remove leading slash
        user: decodeURIComponent(url.username),
        password: decodeURIComponent(url.password), // Ensure it's a string
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
      };
    } catch (error) {
      console.error('❌ Error parsing DATABASE_URL:', error.message);
    }
  }

  // Fallback to individual env vars
  return {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT) || 5432,
    database: process.env.POSTGRES_DB || 'automation_db',
    user: process.env.POSTGRES_USER || 'postgres',
    password: String(process.env.POSTGRES_PASSWORD || ''),
    ssl: false
  };
};

const dbConfig = getDatabaseConfig();
const pool = new Pool(dbConfig);

// Log successful connection (without credentials)
pool.on('connect', () => {
  console.log('✅ PostgreSQL connected:', `${dbConfig.user}@${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);
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
    const {
      url,
      saveToDb = false,
      maxAge = DEFAULT_MAX_AGE,  // Cache duration in ms (default 2 hours)
      minAge = DEFAULT_MIN_AGE,  // Minimum cache age before re-scrape
      forceRefresh = false       // Set true to bypass cache
    } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    console.log(`📥 Scraping: ${url}${forceRefresh ? ' (force refresh)' : ''}`);

    // Scrape with v4.x SDK - use JSON format with schema for structured extraction
    const scrapeOptions = {
      formats: [
        'markdown',
        { type: 'json', schema: multipleProductsSchema }
      ],
      onlyMainContent: true,
      waitFor: 2000,
      maxAge: forceRefresh ? 0 : maxAge  // Set to 0 to force fresh scrape
    };

    // Add minAge if specified (requires cache to be at least this old before re-scraping)
    if (minAge > 0) {
      scrapeOptions.minAge = minAge;
    }

    const scrapeResult = await firecrawl.scrape(url, scrapeOptions);

    // v4.x SDK may return data directly without success wrapper, or with success=true
    // Check if we got valid data (markdown or json present means success)
    const hasValidData = scrapeResult && (scrapeResult.markdown || scrapeResult.json || scrapeResult.success);

    if (!hasValidData) {
      console.error('Scrape failed - no valid data returned:', scrapeResult);
      return res.json({
        success: false,
        url,
        timestamp: new Date().toISOString(),
        saved: false,
        error: scrapeResult?.error || 'Failed to scrape URL'
      });
    }

    // v4.x SDK returns JSON data in scrapeResult.json (or .extract for backwards compat)
    const extractedData = scrapeResult.json || scrapeResult.extract || scrapeResult.data?.extract || {};
    const rawProducts = extractedData.products || [];

    // Filter out products with invalid prices (price: 0 or undefined usually means landing page)
    const products = rawProducts.filter(p => p.price && p.price > 0);

    console.log(`✓ Extracted ${products.length} valid product(s) (${rawProducts.length - products.length} filtered):`, products);

    let saved = false;
    let savedCount = 0;

    // Save to database if requested (using simple product_prices table)
    if (saveToDb && products.length > 0) {
      try {
        for (const product of products) {
          try {
            await saveToDatabase(url, product);
            savedCount++;
          } catch (productError) {
            console.error(`Failed to save product "${product.product_name}":`, productError.message);
          }
        }
        saved = savedCount > 0;
        console.log(`💾 Saved ${savedCount}/${products.length} product(s) to database`);
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
 * Now returns ALL recent price records (not just latest per product)
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
      FROM product_prices
      ORDER BY timestamp DESC
      LIMIT 100
    `;

    const result = await pool.query(query);

    console.log(`✓ Found ${result.rows.length} price records`);

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
    const {
      query,
      limit = 5,
      saveToDb = false,
      maxSites = 3,  // Max sites to scrape
      maxPages = 1,  // Pages per site (1-30)
      maxAge = DEFAULT_MAX_AGE,  // Cache duration in ms
      forceRefresh = false,      // Bypass cache
      useSmartSearch = true      // Use Exa-first smart search (better for prices)
    } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    // Validate maxPages
    const pagesPerSite = Math.min(Math.max(1, maxPages), 30);
    const sitesToScrape = Math.min(Math.max(1, maxSites), 10);

    console.log(`🔍🔧 Smart Search & Scrape: "${query}" (max ${sitesToScrape} sites, ${pagesPerSite} pages each)`);

    // Step 1: Search - use smartSearch for better price extraction (Exa-first)
    let searchResult;
    if (useSmartSearch) {
      searchResult = await smartSearch(query, limit, { extractContent: true, preferExa: true });
    } else if (process.env.BRAVE_API_KEY) {
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

    // Step 3: Scrape top results
    const urlsToScrape = scrapableUrls.slice(0, sitesToScrape);
    const scrapedData = [];

    for (const result of urlsToScrape) {
      const siteProducts = [];
      let siteSavedCount = 0;

      try {
        // Try to scrape multiple pages from this site
        for (let page = 1; page <= pagesPerSite; page++) {
          try {
            // Generate paginated URL
            const pageUrl = generatePaginatedUrl(result.url, page);
            console.log(`📥 Scraping page ${page}/${pagesPerSite}: ${pageUrl}`);

            const scrapeResult = await firecrawl.scrape(pageUrl, {
              formats: [
                'markdown',
                { type: 'json', schema: multipleProductsSchema }
              ],
              onlyMainContent: true,
              waitFor: 2000,
              maxAge: forceRefresh ? 0 : maxAge
            });

            // v4.x SDK may return data directly without success wrapper
            const hasValidData = scrapeResult && (scrapeResult.markdown || scrapeResult.json || scrapeResult.success);

            if (hasValidData) {
              const extractedData = scrapeResult.json || scrapeResult.extract || scrapeResult.data?.extract || {};
              const rawProducts = extractedData.products || [];

              // Filter out products with invalid prices (price: 0 or undefined usually means landing page)
              const products = rawProducts.filter(p => p.price && p.price > 0);

              console.log(`✓ Extracted ${products.length} valid product(s) from page ${page} (${rawProducts.length - products.length} filtered)`);

              if (products.length > 0) {
                siteProducts.push(...products);

                // Save to database if requested (using simple product_prices table)
                if (saveToDb) {
                  for (const product of products) {
                    try {
                      await saveToDatabase(pageUrl, product);
                      siteSavedCount++;
                    } catch (productError) {
                      console.error(`Failed to save product "${product.product_name}":`, productError.message);
                    }
                  }
                }
              } else {
                // No products found, might be end of pagination
                console.log(`⚠️ No products on page ${page}, stopping pagination`);
                break;
              }
            } else {
              console.log(`⚠️ Failed to scrape page ${page}:`, scrapeResult?.error || 'unknown error');
              if (page === 1) break; // If first page fails, skip this site
            }

            // Small delay between pages to avoid rate limiting
            if (page < pagesPerSite) {
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          } catch (pageError) {
            console.error(`✗ Error on page ${page}:`, pageError.message);
            if (page === 1) break; // If first page fails, skip this site
          }
        }

        // Add site data if we found any products
        if (siteProducts.length > 0) {
          scrapedData.push({
            url: result.url,
            title: result.title,
            products: siteProducts,
            count: siteProducts.length,
            saved: saveToDb,
            savedCount: siteSavedCount,
            pagesScraped: Math.min(pagesPerSite, Math.ceil(siteProducts.length / 10))
          });
          console.log(`💾 Saved ${siteSavedCount} total products from ${result.url}`);
        }
      } catch (siteError) {
        console.error(`✗ Failed to scrape ${result.url}:`, siteError.message);
        // Continue to next site
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
 * Smart Search & Scrape with SSE streaming progress
 * Streams real-time progress updates to the client
 */
export async function searchAndScrapeStream(req, res) {
  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
  res.flushHeaders();

  const sendProgress = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const {
      query,
      limit = 5,
      saveToDb = false,
      maxSites = 3,
      maxPages = 1,
      maxAge = DEFAULT_MAX_AGE,
      forceRefresh = false,
      useSmartSearch = true
    } = req.body;

    if (!query) {
      sendProgress({ type: 'error', message: 'Query is required' });
      res.end();
      return;
    }

    const pagesPerSite = Math.min(Math.max(1, maxPages), 30);
    const sitesToScrape = Math.min(Math.max(1, maxSites), 10);
    const cacheAge = forceRefresh ? 0 : maxAge;

    // Step 1: Search - use smartSearch for better price extraction
    sendProgress({
      type: 'progress',
      stage: 'searching',
      message: useSmartSearch ? 'Smart searching for products (Exa-first)...' : 'Searching for products...',
      sitesCompleted: 0,
      sitesTotal: sitesToScrape,
      productsFound: 0,
      productsSaved: 0
    });

    let searchResult;
    if (useSmartSearch) {
      searchResult = await smartSearch(query, limit, { extractContent: true, preferExa: true });
    } else if (process.env.BRAVE_API_KEY) {
      searchResult = await searchWithBrave(query, limit);
    } else if (process.env.EXA_API_KEY) {
      searchResult = await searchWithExa(query, limit);
    } else {
      searchResult = await searchWithDuckDuckGo(query, limit);
    }

    sendProgress({
      type: 'progress',
      stage: 'search_complete',
      message: `Found ${searchResult.results.length} results via ${searchResult.engine}`,
      searchEngine: searchResult.engine,
      searchResultsCount: searchResult.results.length,
      sitesCompleted: 0,
      sitesTotal: sitesToScrape,
      productsFound: 0,
      productsSaved: 0
    });

    // Blocklist
    const blockedDomains = [
      'salidzini.lv', 'google.com', 'amazon.com', 'ebay.com', 'aliexpress.com'
    ];

    const scrapableUrls = searchResult.results.filter(result => {
      const url = new URL(result.url);
      return !blockedDomains.some(domain => url.hostname.includes(domain));
    });

    if (scrapableUrls.length === 0) {
      sendProgress({
        type: 'complete',
        success: false,
        message: 'No scrapable URLs found (all blocked)',
        data: { success: false, scrapedData: [], totalProducts: 0 }
      });
      res.end();
      return;
    }

    // Step 2: Scrape sites
    const urlsToScrape = scrapableUrls.slice(0, sitesToScrape);
    const scrapedData = [];
    let totalProductsFound = 0;
    let totalProductsSaved = 0;

    for (let siteIndex = 0; siteIndex < urlsToScrape.length; siteIndex++) {
      const result = urlsToScrape[siteIndex];
      const siteProducts = [];
      let siteSavedCount = 0;

      sendProgress({
        type: 'progress',
        stage: 'scraping_site',
        message: `Scraping site ${siteIndex + 1}/${urlsToScrape.length}: ${new URL(result.url).hostname}`,
        currentSite: result.title || new URL(result.url).hostname,
        currentSiteUrl: result.url,
        sitesCompleted: siteIndex,
        sitesTotal: urlsToScrape.length,
        productsFound: totalProductsFound,
        productsSaved: totalProductsSaved
      });

      try {
        for (let page = 1; page <= pagesPerSite; page++) {
          try {
            const pageUrl = generatePaginatedUrl(result.url, page);

            if (pagesPerSite > 1) {
              sendProgress({
                type: 'progress',
                stage: 'scraping_page',
                message: `Scraping page ${page}/${pagesPerSite} of ${new URL(result.url).hostname}`,
                currentSite: result.title || new URL(result.url).hostname,
                currentPage: page,
                totalPages: pagesPerSite,
                sitesCompleted: siteIndex,
                sitesTotal: urlsToScrape.length,
                productsFound: totalProductsFound,
                productsSaved: totalProductsSaved
              });
            }

            const scrapeResult = await firecrawl.scrape(pageUrl, {
              formats: [
                'markdown',
                { type: 'json', schema: multipleProductsSchema }
              ],
              onlyMainContent: true,
              waitFor: 2000,
              maxAge: cacheAge
            });

            // v4.x SDK may return data directly without success wrapper
            const hasValidData = scrapeResult && (scrapeResult.markdown || scrapeResult.json || scrapeResult.success);

            if (hasValidData) {
              const extractedData = scrapeResult.json || scrapeResult.extract || scrapeResult.data?.extract || {};
              const rawProducts = extractedData.products || [];

              // Filter out products with invalid prices (price: 0 or undefined usually means landing page)
              const products = rawProducts.filter(p => p.price && p.price > 0);

              if (products.length > 0) {
                siteProducts.push(...products);
                totalProductsFound += products.length;

                // Save to database if requested
                if (saveToDb) {
                  for (const product of products) {
                    try {
                      await saveToDatabase(pageUrl, product);
                      siteSavedCount++;
                      totalProductsSaved++;
                    } catch (productError) {
                      console.error(`Failed to save product:`, productError.message);
                    }
                  }
                }

                sendProgress({
                  type: 'progress',
                  stage: 'products_found',
                  message: `Found ${products.length} products on page ${page}`,
                  currentSite: result.title || new URL(result.url).hostname,
                  pageProducts: products.length,
                  sitesCompleted: siteIndex,
                  sitesTotal: urlsToScrape.length,
                  productsFound: totalProductsFound,
                  productsSaved: totalProductsSaved
                });
              } else {
                break; // No more products
              }
            } else {
              console.log(`⚠️ Failed to scrape page ${page}:`, scrapeResult?.error || 'unknown error');
              if (page === 1) break;
            }

            if (page < pagesPerSite) {
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          } catch (pageError) {
            console.error(`Error on page ${page}:`, pageError.message);
            if (page === 1) break;
          }
        }

        if (siteProducts.length > 0) {
          scrapedData.push({
            url: result.url,
            title: result.title,
            products: siteProducts,
            count: siteProducts.length,
            saved: saveToDb,
            savedCount: siteSavedCount,
            pagesScraped: Math.min(pagesPerSite, Math.ceil(siteProducts.length / 10))
          });
        }
      } catch (siteError) {
        console.error(`Failed to scrape ${result.url}:`, siteError.message);
        sendProgress({
          type: 'progress',
          stage: 'site_error',
          message: `Failed to scrape ${new URL(result.url).hostname}: ${siteError.message}`,
          sitesCompleted: siteIndex + 1,
          sitesTotal: urlsToScrape.length,
          productsFound: totalProductsFound,
          productsSaved: totalProductsSaved
        });
      }
    }

    // Complete
    sendProgress({
      type: 'complete',
      success: true,
      message: `Completed! Found ${totalProductsFound} products from ${scrapedData.length} sites`,
      data: {
        success: true,  // Include in data so frontend receives it
        query,
        searchEngine: searchResult.engine,
        searchResultsCount: searchResult.results.length,
        scrapableSitesCount: scrapableUrls.length,
        scrapedSitesCount: scrapedData.length,
        totalProducts: totalProductsFound,
        totalSaved: totalProductsSaved,
        scrapedData
      }
    });

    res.end();

  } catch (error) {
    console.error('Stream error:', error);
    sendProgress({ type: 'error', message: error.message || 'Scraping failed' });
    res.end();
  }
}

/**
 * Helper: Generate paginated URL
 * Tries to intelligently add pagination parameters
 */
function generatePaginatedUrl(baseUrl, page) {
  if (page === 1) return baseUrl;

  try {
    const url = new URL(baseUrl);

    // Common pagination patterns
    const patterns = [
      { param: 'page', value: page },
      { param: 'p', value: page },
      { param: 'pg', value: page },
      { param: 'offset', value: (page - 1) * 20 }
    ];

    // Try to detect existing pagination pattern
    for (const pattern of patterns) {
      if (url.searchParams.has(pattern.param)) {
        url.searchParams.set(pattern.param, pattern.value.toString());
        return url.toString();
      }
    }

    // Default: add page parameter
    url.searchParams.set('page', page.toString());
    return url.toString();
  } catch (error) {
    // If URL parsing fails, return original
    return baseUrl;
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

/**
 * Smart Search & Scrape WITH Price Comparison
 * Same as searchAndScrape but includes comparison with historical data
 */
export async function searchScrapeCompare(req, res) {
  try {
    const {
      query,
      limit = 5,
      saveToDb = false,
      maxSites = 3,
      maxPages = 1,
      priceChangeThreshold = 1, // 1% threshold for "significant" price changes
      maxAge = DEFAULT_MAX_AGE,
      forceRefresh = false,
      useSmartSearch = true
    } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const pagesPerSite = Math.min(Math.max(1, maxPages), 30);
    const sitesToScrape = Math.min(Math.max(1, maxSites), 10);

    console.log(`🔍📊 Smart Search, Scrape & Compare: "${query}"`);

    // Step 1: Search - use smartSearch for better price extraction
    let searchResult;
    if (useSmartSearch) {
      searchResult = await smartSearch(query, limit, { extractContent: true, preferExa: true });
    } else if (process.env.BRAVE_API_KEY) {
      searchResult = await searchWithBrave(query, limit);
    } else if (process.env.EXA_API_KEY) {
      searchResult = await searchWithExa(query, limit);
    } else {
      searchResult = await searchWithDuckDuckGo(query, limit);
    }

    // Step 2: Filter scrapable URLs
    const blockedDomains = [
      'salidzini.lv', 'google.com', 'amazon.com', 'ebay.com', 'aliexpress.com'
    ];

    const scrapableUrls = searchResult.results.filter(result => {
      const url = new URL(result.url);
      return !blockedDomains.some(domain => url.hostname.includes(domain));
    });

    if (scrapableUrls.length === 0) {
      return res.json({
        success: false,
        query,
        message: 'No scrapable URLs found.',
        comparison: null
      });
    }

    // Step 3: Scrape products
    const allProducts = [];
    const urlsToScrape = scrapableUrls.slice(0, sitesToScrape);

    for (const result of urlsToScrape) {
      try {
        for (let page = 1; page <= pagesPerSite; page++) {
          const pageUrl = generatePaginatedUrl(result.url, page);

          const scrapeResult = await firecrawl.scrape(pageUrl, {
            formats: [
              'markdown',
              { type: 'json', schema: multipleProductsSchema }
            ],
            onlyMainContent: true,
            waitFor: 2000,
            maxAge: forceRefresh ? 0 : maxAge
          });

          // v4.x SDK may return data directly without success wrapper
          const hasValidData = scrapeResult && (scrapeResult.markdown || scrapeResult.json || scrapeResult.success);

          if (hasValidData) {
            const extractedData = scrapeResult.json || scrapeResult.extract || scrapeResult.data?.extract || {};
            const rawProducts = extractedData.products || [];

            // Filter out products with invalid prices (price: 0 or undefined usually means landing page)
            const products = rawProducts.filter(p => p.price && p.price > 0);

            if (products.length > 0) {
              allProducts.push(...products.map(p => ({ ...p, url: pageUrl })));
            } else {
              break; // No more products on this site
            }
          } else {
            console.log(`⚠️ Failed to scrape page ${page}:`, scrapeResult?.error || 'unknown error');
            if (page === 1) break;
          }

          if (page < pagesPerSite) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      } catch (error) {
        console.error(`Error scraping ${result.url}:`, error.message);
      }
    }

    console.log(`✓ Scraped ${allProducts.length} total valid products`);

    // Step 4: Compare with historical data BEFORE saving
    const comparison = await compareWithHistory(allProducts, { priceChangeThreshold });

    console.log(`📊 Comparison complete:`);
    console.log(`   New products: ${comparison.summary.new}`);
    console.log(`   Price increases: ${comparison.priceIncreases.length}`);
    console.log(`   Price decreases: ${comparison.priceDecreases.length}`);
    console.log(`   Unchanged: ${comparison.summary.unchanged}`);

    // Step 5: Save to database if requested (using simple product_prices table)
    let savedCount = 0;
    if (saveToDb && allProducts.length > 0) {
      try {
        for (const product of allProducts) {
          try {
            await saveToDatabase(product.url, product);
            savedCount++;
          } catch (productError) {
            console.error(`Failed to save product "${product.product_name}":`, productError.message);
          }
        }
        console.log(`💾 Saved ${savedCount}/${allProducts.length} products to database`);
      } catch (dbError) {
        console.error('Database save error:', dbError);
      }
    }

    // Step 6: Return results with comparison
    res.json({
      success: true,
      query,
      searchEngine: searchResult.engine,
      totalScraped: allProducts.length,
      saved: saveToDb,
      savedCount,
      comparison: {
        summary: comparison.summary,
        newProducts: comparison.newProducts,
        priceIncreases: comparison.priceIncreases,
        priceDecreases: comparison.priceDecreases,
        unchanged: comparison.unchanged.slice(0, 10) // Limit unchanged for brevity
      }
    });

  } catch (error) {
    console.error('Search, Scrape & Compare error:', error);
    res.status(500).json({
      error: error.message || 'Failed to search, scrape, and compare'
    });
  }
}

/**
 * Get price change alerts
 */
export async function getPriceAlerts(req, res) {
  try {
    const { dropThreshold = 5, increaseThreshold = 10 } = req.query;

    console.log(`🔔 Detecting price alerts (drop >${dropThreshold}%, increase >${increaseThreshold}%)`);

    const alerts = await detectPriceAlerts(
      parseFloat(dropThreshold),
      parseFloat(increaseThreshold)
    );

    res.json({
      success: true,
      alerts,
      summary: {
        totalAlerts: alerts.total,
        priceDrops: alerts.drops.length,
        priceIncreases: alerts.increases.length
      }
    });

  } catch (error) {
    console.error('Price alerts error:', error);
    res.status(500).json({
      error: error.message || 'Failed to get price alerts'
    });
  }
}
