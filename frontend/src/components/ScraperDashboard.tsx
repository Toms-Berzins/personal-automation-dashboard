import React, { useState } from 'react';
import { scraperApi } from '../services/api';
import type { ScraperMode, SearchResult, ScrapeResult } from '../types';
import './ScraperDashboard.css';

function ScraperDashboard() {
  const [mode, setMode] = useState<ScraperMode>('search');
  const [input, setInput] = useState('');
  const [saveToDb, setSaveToDb] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [scrapeResult, setScrapeResult] = useState<ScrapeResult | null>(null);

  const handleGo = async () => {
    if (!input.trim()) {
      setError('Please enter a search query or URL');
      return;
    }

    setLoading(true);
    setError(null);
    setSearchResults([]);
    setScrapeResult(null);

    try {
      if (mode === 'search') {
        const results = await scraperApi.search({
          query: input,
          limit: 5
        });
        setSearchResults(results);
      } else {
        const result = await scraperApi.scrape({
          url: input,
          saveToDb
        });
        setScrapeResult(result);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleScrapeUrl = async (url: string) => {
    setMode('scrape');
    setInput(url);
    setLoading(true);
    setError(null);
    setScrapeResult(null);

    try {
      const result = await scraperApi.scrape({
        url,
        saveToDb
      });
      setScrapeResult(result);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading) {
      handleGo();
    }
  };

  return (
    <div className="scraper-dashboard">
      {/* Mode Toggle */}
      <div className="mode-selector">
        <button
          className={`mode-btn ${mode === 'search' ? 'active' : ''}`}
          onClick={() => setMode('search')}
        >
          🔍 Search
        </button>
        <button
          className={`mode-btn ${mode === 'scrape' ? 'active' : ''}`}
          onClick={() => setMode('scrape')}
        >
          📥 Scrape URL
        </button>
      </div>

      {/* Input Section */}
      <div className="input-section">
        <div className="input-group">
          <input
            type="text"
            className="input-field"
            placeholder={
              mode === 'search'
                ? 'Search for products... (e.g., "wireless headphones")'
                : 'Enter product URL... (e.g., "https://store.com/product")'
            }
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={loading}
          />

          <button
            className="go-button"
            onClick={handleGo}
            disabled={loading || !input.trim()}
          >
            {loading ? (
              <>
                <span className="spinner"></span>
                Loading...
              </>
            ) : (
              <>
                <span className="go-icon">🚀</span>
                GO
              </>
            )}
          </button>
        </div>

        {mode === 'scrape' && (
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={saveToDb}
              onChange={(e) => setSaveToDb(e.target.checked)}
              disabled={loading}
            />
            <span>Save to database for price tracking</span>
          </label>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="error-box">
          <span className="error-icon">⚠️</span>
          {error}
        </div>
      )}

      {/* Search Results */}
      {mode === 'search' && searchResults.length > 0 && (
        <div className="results-section">
          <h2 className="results-title">Search Results</h2>
          <div className="search-results">
            {searchResults.map((result, index) => (
              <div key={index} className="search-result-card">
                <div className="result-header">
                  <h3 className="result-title">{result.title || 'Untitled'}</h3>
                  <button
                    className="scrape-btn"
                    onClick={() => handleScrapeUrl(result.url)}
                  >
                    Scrape This
                  </button>
                </div>
                <p className="result-url">{result.url}</p>
                {result.description && (
                  <p className="result-description">{result.description}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Scrape Result */}
      {mode === 'scrape' && scrapeResult && (
        <div className="results-section">
          <div className="result-header">
            <h2 className="results-title">
              {scrapeResult.success ? '✅ Scraping Successful' : '❌ Scraping Failed'}
            </h2>
            {scrapeResult.saved && scrapeResult.savedCount !== undefined && (
              <span className="saved-badge">
                💾 Saved {scrapeResult.savedCount} product{scrapeResult.savedCount !== 1 ? 's' : ''} to Database
              </span>
            )}
          </div>

          {scrapeResult.success && scrapeResult.data && scrapeResult.data.products && (
            <div className="scrape-result">
              <p className="product-count">
                Found {scrapeResult.data.count} product{scrapeResult.data.count !== 1 ? 's' : ''}
              </p>

              {scrapeResult.data.products.map((product, index) => (
                <div key={index} className="product-card">
                  <div className="product-header">
                    <h3 className="product-name">{product.product_name}</h3>
                    <div className="product-price">
                      {product.price} {product.currency || 'EUR'}
                    </div>
                  </div>

                  <div className="product-details">
                    {product.brand && (
                      <div className="detail-row">
                        <span className="label">Brand:</span>
                        <span className="value">{product.brand}</span>
                      </div>
                    )}

                    <div className="detail-row">
                      <span className="label">Stock Status:</span>
                      <span className={`stock-badge ${product.in_stock ? 'in-stock' : 'out-of-stock'}`}>
                        {product.in_stock ? '✓ In Stock' : '✗ Out of Stock'}
                      </span>
                    </div>

                    {product.description && (
                      <div className="detail-row">
                        <span className="label">Description:</span>
                        <p className="description">{product.description}</p>
                      </div>
                    )}

                    {product.specifications && (
                      <div className="detail-row">
                        <span className="label">Specifications:</span>
                        <pre className="specs">
                          {JSON.stringify(product.specifications, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              <div className="product-footer">
                <a href={scrapeResult.url} target="_blank" rel="noopener noreferrer" className="view-source">
                  View Source →
                </a>
                <span className="timestamp">
                  Scraped: {new Date(scrapeResult.timestamp).toLocaleString()}
                </span>
              </div>
            </div>
          )}

          {scrapeResult.error && (
            <div className="error-box">
              <span className="error-icon">⚠️</span>
              {scrapeResult.error}
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && searchResults.length === 0 && !scrapeResult && (
        <div className="empty-state">
          <div className="empty-icon">
            {mode === 'search' ? '🔍' : '📥'}
          </div>
          <h3>
            {mode === 'search'
              ? 'Search for products across the web'
              : 'Scrape product data from any URL'}
          </h3>
          <p>
            {mode === 'search'
              ? 'Enter a search query and click GO to find products'
              : 'Enter a product URL and click GO to extract price and details'}
          </p>
        </div>
      )}
    </div>
  );
}

export default ScraperDashboard;
