import React, { useState, useRef, useMemo } from 'react';
import { scraperApi } from '../services/api';
import type { ScraperMode, SearchResult, ScrapeResult, SearchAndScrapeResult, PriceComparisonResult, ScrapeProgress, ProductData } from '../types';
import PriceComparisonResults from './PriceComparisonResults';
import './ScraperDashboard.css';

// Sort and filter types
type SortOption = 'price-asc' | 'price-desc' | 'name-asc' | 'name-desc' | 'stock-first';
type StockFilter = 'all' | 'in-stock' | 'out-of-stock';

// Error tracking for sites
interface SiteError {
  url: string;
  title?: string;
  error: string;
}

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

  // Sort and filter state
  const [sortBy, setSortBy] = useState<SortOption>('price-asc');
  const [stockFilter, setStockFilter] = useState<StockFilter>('all');
  const [brandFilter, setBrandFilter] = useState<string>('all');

  // Error tracking for failed sites
  const [siteErrors, setSiteErrors] = useState<SiteError[]>([]);

  // Progress state for streaming updates
  const [progress, setProgress] = useState<ScrapeProgress | null>(null);
  const abortRef = useRef<(() => void) | null>(null);

  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [scrapeResult, setScrapeResult] = useState<ScrapeResult | null>(null);
  const [autoScrapeResult, setAutoScrapeResult] = useState<SearchAndScrapeResult | null>(null);
  const [comparisonResult, setComparisonResult] = useState<PriceComparisonResult | null>(null);

  // Get all unique brands from results
  const availableBrands = useMemo(() => {
    if (!autoScrapeResult) return [];
    const brands = new Set<string>();
    autoScrapeResult.scrapedData.forEach(site => {
      site.products.forEach(product => {
        if (product.brand) brands.add(product.brand);
      });
    });
    return Array.from(brands).sort();
  }, [autoScrapeResult]);

  // Sort products function
  const sortProducts = (products: ProductData[]): ProductData[] => {
    return [...products].sort((a, b) => {
      switch (sortBy) {
        case 'price-asc':
          return a.price - b.price;
        case 'price-desc':
          return b.price - a.price;
        case 'name-asc':
          return a.product_name.localeCompare(b.product_name);
        case 'name-desc':
          return b.product_name.localeCompare(a.product_name);
        case 'stock-first':
          if (a.in_stock === b.in_stock) return a.price - b.price;
          return a.in_stock ? -1 : 1;
        default:
          return 0;
      }
    });
  };

  // Filter products function
  const filterProducts = (products: ProductData[]): ProductData[] => {
    return products.filter(product => {
      // Stock filter
      if (stockFilter === 'in-stock' && !product.in_stock) return false;
      if (stockFilter === 'out-of-stock' && product.in_stock) return false;

      // Brand filter
      if (brandFilter !== 'all' && product.brand !== brandFilter) return false;

      return true;
    });
  };

  // Get filtered and sorted products for a site
  const getProcessedProducts = (products: ProductData[]): ProductData[] => {
    return sortProducts(filterProducts(products));
  };

  // Export functions
  const exportToCSV = () => {
    if (!autoScrapeResult) return;

    const headers = ['Site', 'Product Name', 'Price', 'Currency', 'Brand', 'In Stock'];
    const rows: string[][] = [];

    autoScrapeResult.scrapedData.forEach(site => {
      const processed = getProcessedProducts(site.products);
      processed.forEach(product => {
        rows.push([
          site.title || site.url,
          product.product_name,
          product.price.toString(),
          product.currency || 'EUR',
          product.brand || '',
          product.in_stock ? 'Yes' : 'No'
        ]);
      });
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    downloadFile(csvContent, 'scrape-results.csv', 'text/csv');
  };

  const exportToJSON = () => {
    if (!autoScrapeResult) return;

    const exportData = {
      query: autoScrapeResult.query,
      timestamp: new Date().toISOString(),
      totalProducts: autoScrapeResult.totalProducts,
      sites: autoScrapeResult.scrapedData.map(site => ({
        url: site.url,
        title: site.title,
        products: getProcessedProducts(site.products)
      }))
    };

    const jsonContent = JSON.stringify(exportData, null, 2);
    downloadFile(jsonContent, 'scrape-results.json', 'application/json');
  };

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleGo = async () => {
    if (!input.trim()) {
      setError('Please enter a search query or URL');
      return;
    }

    // Cancel any existing stream
    if (abortRef.current) {
      abortRef.current();
      abortRef.current = null;
    }

    setLoading(true);
    setError(null);
    setProgress(null);
    setSearchResults([]);
    setScrapeResult(null);
    setAutoScrapeResult(null);
    setComparisonResult(null);
    setSiteErrors([]);
    // Reset filters when starting new search
    setBrandFilter('all');
    setStockFilter('all');
    setSortBy('price-asc');

    try {
      if (mode === 'search') {
        const results = await scraperApi.search({
          query: input,
          limit: 5
        });
        setSearchResults(results);
        setLoading(false);
      } else if (mode === 'scrape') {
        const result = await scraperApi.scrape({
          url: input,
          saveToDb
        });
        setScrapeResult(result);
        setLoading(false);
      } else if (mode === 'auto') {
        // Auto search + scrape mode with streaming progress
        abortRef.current = scraperApi.searchAndScrapeStream(
          {
            query: input,
            limit: 5,
            saveToDb,
            maxSites,
            maxPages
          },
          // Progress callback
          (progressData) => {
            setProgress(progressData);
            // Track site errors
            if (progressData.stage === 'site_error' && progressData.currentSiteUrl) {
              setSiteErrors(prev => [...prev, {
                url: progressData.currentSiteUrl!,
                title: progressData.currentSite,
                error: progressData.message
              }]);
            }
          },
          // Complete callback
          (result) => {
            setAutoScrapeResult(result);
            setProgress(null);
            setLoading(false);
            abortRef.current = null;
          },
          // Error callback
          (errorMessage) => {
            setError(errorMessage);
            setProgress(null);
            setLoading(false);
            abortRef.current = null;
          }
        );
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
        setLoading(false);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'An error occurred');
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
          <span className="mode-indicator"></span>
          Search
        </button>
        <button
          className={`mode-btn ${mode === 'auto' ? 'active' : ''}`}
          onClick={() => setMode('auto')}
        >
          <span className="mode-indicator"></span>
          Auto Search+Scrape
        </button>
        <button
          className={`mode-btn ${mode === 'compare' ? 'active' : ''}`}
          onClick={() => setMode('compare')}
        >
          <span className="mode-indicator"></span>
          Compare Prices
        </button>
        <button
          className={`mode-btn ${mode === 'scrape' ? 'active' : ''}`}
          onClick={() => setMode('scrape')}
        >
          <span className="mode-indicator"></span>
          Scrape URL
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
                <svg className="go-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
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
            <span>Save to database for price tracking</span>
          </label>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="error-box">
          <span className="error-indicator"></span>
          {error}
        </div>
      )}

      {/* Progress Panel (during auto scraping) */}
      {loading && progress && mode === 'auto' && (
        <div className="progress-panel">
          <div className="progress-header">
            <span className="progress-spinner"></span>
            <span className="progress-message">{progress.message}</span>
          </div>

          <div className="progress-stats">
            <div className="progress-stat">
              <span className="stat-label">Sites</span>
              <span className="stat-value">{progress.sitesCompleted}/{progress.sitesTotal}</span>
              <div className="stat-bar">
                <div
                  className="stat-bar-fill"
                  style={{ width: `${progress.sitesTotal > 0 ? (progress.sitesCompleted / progress.sitesTotal) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div className="progress-stat">
              <span className="stat-label">Products Found</span>
              <span className="stat-value stat-value--highlight">{progress.productsFound}</span>
            </div>

            <div className="progress-stat">
              <span className="stat-label">Products Saved</span>
              <span className="stat-value stat-value--success">{progress.productsSaved}</span>
            </div>
          </div>

          {progress.currentSite && (
            <div className="progress-current">
              <span className="current-label">Currently scraping:</span>
              <span className="current-site">{progress.currentSite}</span>
            </div>
          )}

          {progress.searchEngine && (
            <div className="progress-info">
              Search via {progress.searchEngine} · {progress.searchResultsCount} results found
            </div>
          )}
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
            <h2 className={`results-title ${autoScrapeResult.success ? 'success' : 'error'}`}>
              {autoScrapeResult.success ? 'Auto Scraping Complete' : 'Scraping Failed'}
            </h2>
            {autoScrapeResult.success && (
              <div className="result-stats">
                <span className="stat-badge stat-badge--search">
                  {autoScrapeResult.searchEngine} found {autoScrapeResult.searchResultsCount} results
                </span>
                <span className="stat-badge stat-badge--scrape">
                  Scraped {autoScrapeResult.scrapedSitesCount}/{autoScrapeResult.scrapableSitesCount} sites
                </span>
                <span className="stat-badge stat-badge--products">
                  Found {autoScrapeResult.totalProducts} products
                </span>
              </div>
            )}
          </div>

          {autoScrapeResult.message && (
            <div className="info-box">
              {autoScrapeResult.message}
            </div>
          )}

          {/* Error Messages for Failed Sites */}
          {siteErrors.length > 0 && (
            <div className="site-errors-panel">
              <div className="site-errors-header">
                <span className="error-icon">⚠</span>
                <span>{siteErrors.length} site{siteErrors.length > 1 ? 's' : ''} failed to scrape</span>
              </div>
              <div className="site-errors-list">
                {siteErrors.map((err, idx) => (
                  <div key={idx} className="site-error-item">
                    <span className="site-error-url">{err.title || err.url}</span>
                    <span className="site-error-message">{err.error}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sort, Filter, and Export Controls */}
          {autoScrapeResult.totalProducts > 0 && (
            <div className="results-controls">
              <div className="controls-left">
                {/* Sort Dropdown */}
                <div className="control-group">
                  <label className="control-label">Sort by:</label>
                  <select
                    className="control-select"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                  >
                    <option value="price-asc">Price: Low → High</option>
                    <option value="price-desc">Price: High → Low</option>
                    <option value="name-asc">Name: A → Z</option>
                    <option value="name-desc">Name: Z → A</option>
                    <option value="stock-first">In Stock First</option>
                  </select>
                </div>

                {/* Stock Filter */}
                <div className="control-group">
                  <label className="control-label">Stock:</label>
                  <select
                    className="control-select"
                    value={stockFilter}
                    onChange={(e) => setStockFilter(e.target.value as StockFilter)}
                  >
                    <option value="all">All</option>
                    <option value="in-stock">In Stock</option>
                    <option value="out-of-stock">Out of Stock</option>
                  </select>
                </div>

                {/* Brand Filter */}
                {availableBrands.length > 0 && (
                  <div className="control-group">
                    <label className="control-label">Brand:</label>
                    <select
                      className="control-select"
                      value={brandFilter}
                      onChange={(e) => setBrandFilter(e.target.value)}
                    >
                      <option value="all">All Brands</option>
                      {availableBrands.map(brand => (
                        <option key={brand} value={brand}>{brand}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Export Buttons */}
              <div className="controls-right">
                <button className="export-btn" onClick={exportToCSV} title="Export as CSV">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  CSV
                </button>
                <button className="export-btn" onClick={exportToJSON} title="Export as JSON">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  JSON
                </button>
              </div>
            </div>
          )}

          {autoScrapeResult.scrapedData.map((siteData, siteIndex) => {
            const processedProducts = getProcessedProducts(siteData.products);
            const displayCount = Math.min(10, processedProducts.length);

            if (processedProducts.length === 0) return null;

            return (
              <div key={siteIndex} className="site-scrape-result">
                <div className="site-header">
                  <h3 className="site-title">{siteData.title || 'Untitled Site'}</h3>
                  <div className="site-meta">
                    <span className="meta-item">
                      {processedProducts.length} product{processedProducts.length !== 1 ? 's' : ''}
                      {processedProducts.length !== siteData.count && ` (${siteData.count} total)`}
                    </span>
                    {siteData.pagesScraped && (
                      <span className="meta-item">{siteData.pagesScraped} pages</span>
                    )}
                    {siteData.saved && (
                      <span className="saved-badge">Saved {siteData.savedCount}</span>
                    )}
                  </div>
                </div>
                <p className="site-url">{siteData.url}</p>

                <div className="products-grid">
                  {processedProducts.slice(0, displayCount).map((product, prodIndex) => (
                    <div key={prodIndex} className="product-card-small">
                      <div className="product-name">{product.product_name}</div>
                      <div className="product-price">
                        {product.price} {product.currency || 'EUR'}
                      </div>
                      {product.brand && (
                        <div className="product-brand">{product.brand}</div>
                      )}
                      <div className={`stock-badge-small ${product.in_stock ? 'in-stock' : 'out-of-stock'}`}>
                        {product.in_stock ? 'In Stock' : 'Out of Stock'}
                      </div>
                    </div>
                  ))}
                </div>

                {processedProducts.length > displayCount && (
                  <div className="show-more">
                    + {processedProducts.length - displayCount} more products
                  </div>
                )}
              </div>
            );
          })}

          {/* Show message if all products filtered out */}
          {autoScrapeResult.scrapedData.every(site => getProcessedProducts(site.products).length === 0) && (
            <div className="no-results-message">
              <span className="no-results-icon">🔍</span>
              <p>No products match your current filters.</p>
              <button className="reset-filters-btn" onClick={() => {
                setStockFilter('all');
                setBrandFilter('all');
              }}>
                Reset Filters
              </button>
            </div>
          )}
        </div>
      )}

      {/* Scrape Result (Scrape Mode) */}
      {mode === 'scrape' && scrapeResult && (
        <div className="results-section">
          <div className="result-header">
            <h2 className={`results-title ${scrapeResult.success ? 'success' : 'error'}`}>
              {scrapeResult.success ? 'Scraping Successful' : 'Scraping Failed'}
            </h2>
            {scrapeResult.saved && scrapeResult.savedCount !== undefined && (
              <span className="saved-badge">
                Saved {scrapeResult.savedCount} product{scrapeResult.savedCount !== 1 ? 's' : ''} to Database
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
                        {product.in_stock ? 'In Stock' : 'Out of Stock'}
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
              <span className="error-indicator"></span>
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
          <div className={`empty-indicator empty-indicator--${mode}`}></div>
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
