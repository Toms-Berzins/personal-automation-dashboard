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
 */
export async function searchWithExa(query, numResults = 5) {
  const apiKey = process.env.EXA_API_KEY;

  if (!apiKey) {
    console.log('⚠️ EXA_API_KEY not configured, falling back to DuckDuckGo');
    return await searchWithDuckDuckGo(query, numResults);
  }

  try {
    const response = await axios.post('https://api.exa.ai/search', {
      query,
      numResults,
      useAutoprompt: true,
      type: 'auto'
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
