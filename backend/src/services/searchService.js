import axios from 'axios';

/**
 * Search using Brave Search API
 * Get your API key from: https://api.search.brave.com/register
 */
export async function searchWithBrave(query, count = 5) {
  const apiKey = process.env.BRAVE_API_KEY;

  if (!apiKey) {
    console.log('⚠️ BRAVE_API_KEY not configured, falling back to DuckDuckGo');
    return await searchWithDuckDuckGo(query, count);
  }

  try {
    const response = await axios.get('https://api.search.brave.com/res/v1/web/search', {
      params: {
        q: query,
        count
      },
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip',
        'X-Subscription-Token': apiKey
      }
    });

    const results = response.data.web?.results?.map(item => ({
      title: item.title,
      url: item.url,
      description: item.description
    })) || [];

    return {
      engine: 'brave',
      query,
      results
    };
  } catch (error) {
    console.error('Brave search error:', error.message);
    console.log('⚠️ Falling back to DuckDuckGo');
    return await searchWithDuckDuckGo(query, count);
  }
}

/**
 * Search using Exa AI
 * Get your API key from: https://dashboard.exa.ai/
 *
 * @param {string} query - Search query
 * @param {number} numResults - Number of results (default 5)
 * @param {Object} options - Additional options
 * @param {string} options.type - 'auto' (default), 'fast', or 'deep'
 * @param {string} options.livecrawl - 'fallback' (default) or 'preferred'
 */
export async function searchWithExa(query, numResults = 5, options = {}) {
  const apiKey = process.env.EXA_API_KEY;

  if (!apiKey) {
    console.log('⚠️ EXA_API_KEY not configured, falling back to DuckDuckGo');
    return await searchWithDuckDuckGo(query, numResults);
  }

  const {
    type = 'auto',           // 'auto', 'fast', 'deep'
    livecrawl = 'fallback'   // 'fallback', 'preferred'
  } = options;

  try {
    const response = await axios.post('https://api.exa.ai/search', {
      query,
      numResults,
      useAutoprompt: true,
      type,
      livecrawl
    }, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey
      }
    });

    const results = response.data.results?.map(item => ({
      title: item.title,
      url: item.url,
      description: item.text || item.snippet || ''
    })) || [];

    return {
      engine: 'exa',
      query,
      results
    };
  } catch (error) {
    console.error('Exa search error:', error.message);
    console.log('⚠️ Falling back to DuckDuckGo');
    return await searchWithDuckDuckGo(query, numResults);
  }
}

/**
 * Enhance query to focus on product listing pages (e-commerce)
 * Smarter approach: adds context without changing the core query meaning
 */
function enhanceQueryForProducts(query) {
  // Keywords that indicate product listing pages
  const shopKeywords = ['shop', 'buy', 'price', 'store', 'veikals', 'cena', 'eur', '€'];

  // Check if query already contains shopping terms
  const queryLower = query.toLowerCase();
  const hasShopTerm = shopKeywords.some(kw => queryLower.includes(kw));

  if (hasShopTerm) {
    return query; // Already has shop terms
  }

  // Detect if query contains pellet/granules related terms (multi-language)
  const pelletTerms = ['granul', 'pellet', 'kokskaidu', 'briketes', 'kurināš', 'apkure'];
  const isPelletQuery = pelletTerms.some(term => queryLower.includes(term));

  if (isPelletQuery) {
    // For pellet queries, add heating/fuel context + EUR for European results
    return `${query} EUR price per ton heating fuel`;
  }

  // For other queries, just add price indicator (minimal change)
  return `${query} EUR price`;
}

/**
 * Score a URL based on how likely it is to be a product listing page
 * Higher score = more likely to have actual products with prices
 */
function scoreUrlForProducts(url) {
  let score = 0;
  const urlLower = url.toLowerCase();
  const path = new URL(url).pathname.toLowerCase();

  // Strong positive signals (product listing pages)
  const productListingPatterns = [
    /\/(shop|store|veikals|products?|produkti|catalog|katalogs|buy|pirkt)\b/i,
    /\/(briketes|granulas|pellets?|briquettes?)\b/i,
    /\/results/i,
    /[?&](category|cat|products)/i,
    /\/e-shop/i,
    /\/en\/(shop|products?|briquettes?|pellets?)/i,
    /\/lv\/(veikals|produkti|briketes|granulas)/i
  ];

  for (const pattern of productListingPatterns) {
    if (pattern.test(url)) {
      score += 20;
    }
  }

  // Moderate positive signals
  if (urlLower.includes('price') || urlLower.includes('cena')) score += 10;
  if (urlLower.includes('buy') || urlLower.includes('pirkt')) score += 10;
  if (/\d+/.test(path)) score += 5; // Has numbers (often product IDs or pagination)

  // Negative signals (likely landing/info pages)
  const landingPagePatterns = [
    /^\/(en|lv|ru|lt|ee)\/?$/i,  // Root language pages like /en or /lv/
    /\/(about|par-mums|contact|kontakti|news|jaunumi)\b/i,
    /\/(blog|article|raksts)\b/i,
    /\/(faq|help|terms|privacy)\b/i
  ];

  for (const pattern of landingPagePatterns) {
    if (pattern.test(path)) {
      score -= 15;
    }
  }

  // Very short paths are often landing pages
  if (path.length <= 4) score -= 10;

  return score;
}

/**
 * Sort and filter search results to prioritize product listing pages
 */
function prioritizeProductListings(results) {
  // Score each result
  const scoredResults = results.map(result => ({
    ...result,
    productScore: scoreUrlForProducts(result.url)
  }));

  // Sort by score (highest first)
  scoredResults.sort((a, b) => b.productScore - a.productScore);

  // Log scores for debugging
  console.log('🎯 URL scores:');
  scoredResults.forEach(r => {
    console.log(`   ${r.productScore >= 0 ? '+' : ''}${r.productScore}: ${r.url}`);
  });

  // Return sorted results (remove score from output)
  return scoredResults.map(({ productScore, ...result }) => result);
}

/**
 * Search using Exa AI WITH content extraction
 * Returns actual page content - ideal for price scraping
 *
 * @param {string} query - Search query
 * @param {number} numResults - Number of results (default 5)
 * @param {Object} options - Additional options
 * @param {string} options.type - 'auto' (default), 'fast', or 'deep'
 * @param {string} options.livecrawl - 'fallback' or 'preferred' (default for content)
 * @param {number} options.maxCharacters - Max characters per result (default 3000)
 * @param {boolean} options.productFocus - Enhance query for product pages (default true)
 */
export async function searchWithExaContents(query, numResults = 5, options = {}) {
  const apiKey = process.env.EXA_API_KEY;

  if (!apiKey) {
    console.log('⚠️ EXA_API_KEY not configured');
    return {
      engine: 'exa',
      query,
      results: [],
      error: 'EXA_API_KEY not configured'
    };
  }

  const {
    type = 'auto',
    livecrawl = 'preferred',  // Prefer live crawl for fresh content
    maxCharacters = 3000,
    productFocus = true       // Focus on product listing pages
  } = options;

  // Enhance query to find product pages instead of info pages
  const searchQuery = productFocus ? enhanceQueryForProducts(query) : query;

  try {
    console.log(`🔍 Exa content search: "${searchQuery}" (${type}, livecrawl: ${livecrawl}, productFocus: ${productFocus})`);

    const response = await axios.post('https://api.exa.ai/search', {
      query: searchQuery,
      numResults,
      useAutoprompt: true,
      type,
      livecrawl,
      contents: {
        text: {
          maxCharacters
        }
      }
    }, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey
      }
    });

    const results = response.data.results?.map(item => ({
      title: item.title,
      url: item.url,
      description: item.text || item.snippet || '',
      content: item.text || '',           // Full extracted content
      publishedDate: item.publishedDate,
      author: item.author
    })) || [];

    console.log(`✓ Exa found ${results.length} results with content`);

    // Prioritize URLs that look like product listing pages
    const prioritizedResults = prioritizeProductListings(results);

    return {
      engine: 'exa-contents',
      query,
      results: prioritizedResults,
      hasContent: true
    };
  } catch (error) {
    console.error('Exa content search error:', error.message);
    return {
      engine: 'exa-contents',
      query,
      results: [],
      error: error.message
    };
  }
}

/**
 * Smart search that picks the best engine for price/product searches
 * Prefers Exa with content extraction for e-commerce queries
 *
 * @param {string} query - Search query
 * @param {number} limit - Number of results
 * @param {Object} options - Search options
 * @param {boolean} options.extractContent - Whether to extract page content (default true)
 * @param {boolean} options.preferExa - Force Exa even if Brave is available (default true for price queries)
 */
export async function smartSearch(query, limit = 5, options = {}) {
  const {
    extractContent = true,
    preferExa = true
  } = options;

  const hasExa = !!process.env.EXA_API_KEY;
  const hasBrave = !!process.env.BRAVE_API_KEY;

  // For price/product searches, prefer Exa with content extraction
  if (hasExa && preferExa && extractContent) {
    console.log('🎯 Using Exa with content extraction (best for prices)');
    const result = await searchWithExaContents(query, limit, {
      type: 'auto',
      livecrawl: 'preferred'
    });

    if (result.results.length > 0) {
      return result;
    }
    console.log('⚠️ Exa returned no results, trying Brave');
  }

  // Fall back to Brave
  if (hasBrave) {
    return await searchWithBrave(query, limit);
  }

  // Fall back to basic Exa
  if (hasExa) {
    return await searchWithExa(query, limit);
  }

  // Last resort: DuckDuckGo
  return await searchWithDuckDuckGo(query, limit);
}

/**
 * Simple DuckDuckGo search (no API key needed)
 */
export async function searchWithDuckDuckGo(query, limit = 5) {
  try {
    // Using DuckDuckGo's instant answer API
    const response = await axios.get('https://api.duckduckgo.com/', {
      params: {
        q: query,
        format: 'json',
        no_html: 1
      }
    });

    const results = [];

    // Parse related topics
    if (response.data.RelatedTopics) {
      for (const topic of response.data.RelatedTopics.slice(0, limit)) {
        if (topic.FirstURL && topic.Text) {
          results.push({
            title: topic.Text.split(' - ')[0] || topic.Text.substring(0, 100),
            url: topic.FirstURL,
            description: topic.Text
          });
        }
      }
    }

    return {
      engine: 'duckduckgo',
      query,
      results
    };
  } catch (error) {
    console.error('DuckDuckGo search error:', error);
    return {
      engine: 'duckduckgo',
      query,
      results: [],
      error: error.message
    };
  }
}

/**
 * Google Custom Search (requires API key)
 */
export async function searchWithGoogle(query, limit = 5) {
  const apiKey = process.env.GOOGLE_API_KEY;
  const cx = process.env.GOOGLE_SEARCH_ENGINE_ID;

  if (!apiKey || !cx) {
    return {
      engine: 'google',
      query,
      results: [],
      error: 'Google API key or Search Engine ID not configured'
    };
  }

  try {
    const response = await axios.get('https://www.googleapis.com/customsearch/v1', {
      params: {
        key: apiKey,
        cx,
        q: query,
        num: limit
      }
    });

    const results = response.data.items?.map(item => ({
      title: item.title,
      url: item.link,
      description: item.snippet
    })) || [];

    return {
      engine: 'google',
      query,
      results
    };
  } catch (error) {
    console.error('Google search error:', error);
    return {
      engine: 'google',
      query,
      results: [],
      error: error.message
    };
  }
}
