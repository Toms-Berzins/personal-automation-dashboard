import React, { useState } from 'react';
import { scraperApi } from '../services/api';
import type { ScraperMode, SearchResult, ScrapeResult, SearchAndScrapeResult, PriceComparisonResult } from '../types';
import PriceComparisonResults from './PriceComparisonResults';
import './ScraperDashboard.css';

function ScraperDashboard() {
  const [mode, setMode] = useState<ScraperMode>('search');
  const [input, setInput] = useState('');
  const [saveToDb, setSaveToDb] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto mode settings
  const [maxSites, setMaxSites] = useState(3);
  const [maxPages, setMaxPages] = useState(1);

  // Compare mode settings
  const [priceChangeThreshold, setPriceChangeThreshold] = useState(1);

  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [scrapeResult, setScrapeResult] = useState<ScrapeResult | null>(null);
  const [autoScrapeResult, setAutoScrapeResult] = useState<SearchAndScrapeResult | null>(null);
  const [comparisonResult, setComparisonResult] = useState<PriceComparisonResult | null>(null);

  const handleGo = async () => {
    if (!input.trim()) {
      setError('Please enter a search query or URL');
      return;
    }

    setLoading(true);
    setError(null);
    setSearchResults([]);
    setScrapeResult(null);
    setAutoScrapeResult(null);
    setComparisonResult(null);

    try {
      if (mode === 'search') {
        const results = await scraperApi.search({
          query: input,
          limit: 5
        });
        setSearchResults(results);
      } else if (mode === 'scrape') {
        const result = await scraperApi.scrape({
          url: input,
          saveToDb
        });
        setScrapeResult(result);
      } else if (mode === 'auto') {
        // Auto search + scrape mode
        const result = await scraperApi.searchAndScrape({
          query: input,
          limit: 5,
          saveToDb,
          maxSites,
          maxPages
        });
        setAutoScrapeResult(result);
      } else if (mode === 'compare') {
        // Compare mode - search, scrape and compare with history
        const result = await scraperApi.searchScrapeCompare({
          query: input,
          limit: 5,
          saveToDb,
          maxSites,
          maxPages,
          priceChangeThreshold
        });
        setComparisonResult(result);
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
          className={`mode-btn ${mode === 'auto' ? 'active' : ''}`}
          onClick={() => setMode('auto')}
        >
          🤖 Auto Search+Scrape
        </button>
        <button
          className={`mode-btn ${mode === 'compare' ? 'active' : ''}`}
          onClick={() => setMode('compare')}
        >
          📊 Compare Prices
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
                ? 'Search for products... (e.g., "skaidu granulas")'
                : mode === 'auto'
                ? 'Enter search query for auto scraping... (e.g., "skaidu granulas")'
                : mode === 'compare'
                ? 'Search and compare with historical prices... (e.g., "skaidu granulas")'
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
                {mode === 'auto' || mode === 'compare' ? 'Scraping...' : 'Loading...'}
              </>
            ) : (
              <>
                <span className="go-icon">🚀</span>
                GO
              </>
            )}
          </button>
        </div>

        {/* Auto Mode Settings */}
        {mode === 'auto' && (
          <div className="auto-settings">
            <div className="setting-row">
              <label className="setting-label">
                <span className="setting-title">Max Sites:</span>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={maxSites}
                  onChange={(e) => setMaxSites(Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))}
                  disabled={loading}
                  className="number-input"
                />
                <span className="setting-hint">Scrape up to {maxSites} sites</span>
              </label>
            </div>

            <div className="setting-row">
              <label className="setting-label">
                <span className="setting-title">Pages per site:</span>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={maxPages}
                  onChange={(e) => setMaxPages(Math.max(1, Math.min(30, parseInt(e.target.value) || 1)))}
                  disabled={loading}
                  className="number-input"
                />
                <span className="setting-hint">Scrape up to {maxPages} page(s) from each site</span>
              </label>
            </div>
          </div>
        )}

        {/* Compare Mode Settings */}
        {mode === 'compare' && (
          <div className="auto-settings">
            <div className="setting-row">
              <label className="setting-label">
                <span className="setting-title">Max Sites:</span>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={maxSites}
                  onChange={(e) => setMaxSites(Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))}
                  disabled={loading}
                  className="number-input"
                />
                <span className="setting-hint">Scrape up to {maxSites} sites</span>
              </label>
            </div>

            <div className="setting-row">
              <label className="setting-label">
                <span className="setting-title">Pages per site:</span>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={maxPages}
                  onChange={(e) => setMaxPages(Math.max(1, Math.min(30, parseInt(e.target.value) || 1)))}
                  disabled={loading}
                  className="number-input"
                />
                <span className="setting-hint">Scrape up to {maxPages} page(s) from each site</span>
              </label>
            </div>

            <div className="setting-row">
              <label className="setting-label">
                <span className="setting-title">Price change threshold:</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={priceChangeThreshold}
                  onChange={(e) => setPriceChangeThreshold(Math.max(0, Math.min(100, parseFloat(e.target.value) || 1)))}
                  disabled={loading}
                  className="number-input"
                />
                <span className="setting-hint">Ignore price changes below {priceChangeThreshold}%</span>
              </label>
            </div>
          </div>
        )}

        {(mode === 'scrape' || mode === 'auto' || mode === 'compare') && (
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={saveToDb}
              onChange={(e) => setSaveToDb(e.target.checked)}
              disabled={loading}
            />
            <span>💾 Save to database for price tracking</span>
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

      {/* Search Results (Search Mode) */}
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

      {/* Auto Search+Scrape Results */}
      {mode === 'auto' && autoScrapeResult && (
        <div className="results-section">
          <div className="result-header">
            <h2 className="results-title">
              {autoScrapeResult.success ? '✅ Auto Scraping Complete' : '❌ Scraping Failed'}
            </h2>
            {autoScrapeResult.success && (
              <div className="result-stats">
                <span className="stat-badge">
                  🔍 {autoScrapeResult.searchEngine} found {autoScrapeResult.searchResultsCount} results
                </span>
                <span className="stat-badge">
                  📊 Scraped {autoScrapeResult.scrapedSitesCount}/{autoScrapeResult.scrapableSitesCount} sites
                </span>
                <span className="stat-badge">
                  🏷️ Found {autoScrapeResult.totalProducts} products
                </span>
              </div>
            )}
          </div>

          {autoScrapeResult.message && (
            <div className="info-box">
              {autoScrapeResult.message}
            </div>
          )}

          {autoScrapeResult.scrapedData.map((siteData, siteIndex) => (
            <div key={siteIndex} className="site-scrape-result">
              <div className="site-header">
                <h3 className="site-title">{siteData.title || 'Untitled Site'}</h3>
                <div className="site-meta">
                  <span className="meta-item">📄 {siteData.count} products</span>
                  {siteData.pagesScraped && (
                    <span className="meta-item">📑 {siteData.pagesScraped} pages</span>
                  )}
                  {siteData.saved && (
                    <span className="saved-badge">💾 Saved {siteData.savedCount}</span>
                  )}
                </div>
              </div>
              <p className="site-url">{siteData.url}</p>

              <div className="products-grid">
                {siteData.products.slice(0, 10).map((product, prodIndex) => (
                  <div key={prodIndex} className="product-card-small">
                    <div className="product-name">{product.product_name}</div>
                    <div className="product-price">
                      {product.price} {product.currency || 'EUR'}
                    </div>
                    {product.brand && (
                      <div className="product-brand">{product.brand}</div>
                    )}
                    <div className={`stock-badge-small ${product.in_stock ? 'in-stock' : 'out-of-stock'}`}>
                      {product.in_stock ? '✓ In Stock' : '✗ Out of Stock'}
                    </div>
                  </div>
                ))}
              </div>

              {siteData.count > 10 && (
                <div className="show-more">
                  + {siteData.count - 10} more products
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Scrape Result (Scrape Mode) */}
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

      {/* Price Comparison Results */}
      {mode === 'compare' && comparisonResult && (
        <PriceComparisonResults result={comparisonResult} />
      )}

      {/* Empty State */}
      {!loading && !error && searchResults.length === 0 && !scrapeResult && !autoScrapeResult && !comparisonResult && (
        <div className="empty-state">
          <div className="empty-icon">
            {mode === 'search' ? '🔍' : mode === 'auto' ? '🤖' : mode === 'compare' ? '📊' : '📥'}
          </div>
          <h3>
            {mode === 'search'
              ? 'Search for products across the web'
              : mode === 'auto'
              ? 'Auto Search & Scrape - All-in-One'
              : mode === 'compare'
              ? 'Compare Prices with History'
              : 'Scrape product data from any URL'}
          </h3>
          <p>
            {mode === 'search'
              ? 'Enter a search query and click GO to find products'
              : mode === 'auto'
              ? 'Enter a search query (e.g., "skaidu granulas") to automatically find, scrape, and save product data from multiple sites'
              : mode === 'compare'
              ? 'Enter a search query to find products and compare current prices with historical data. Identify new products, price increases, and price drops!'
              : 'Enter a product URL and click GO to extract price and details'}
          </p>
        </div>
      )}
    </div>
  );
}

export default ScraperDashboard;
