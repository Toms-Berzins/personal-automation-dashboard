import React, { useState, useEffect } from 'react';
import { scraperApi } from '../services/api';
import type { PriceHistoryItem } from '../types';
import './PriceHistory.css';

function PriceHistory() {
  const [searchQuery, setSearchQuery] = useState('');
  const [history, setHistory] = useState<PriceHistoryItem[]>([]);
  const [latestPrices, setLatestPrices] = useState<PriceHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showLatest, setShowLatest] = useState(true);

  useEffect(() => {
    loadLatestPrices();
  }, []);

  const loadLatestPrices = async () => {
    setLoading(true);
    setError(null);
    try {
      const prices = await scraperApi.getLatestPrices();
      setLatestPrices(prices);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to load prices');
    } finally {
      setLoading(false);
    }
  };

  const searchHistory = async () => {
    if (!searchQuery.trim()) {
      setError('Please enter a product name');
      return;
    }

    setLoading(true);
    setError(null);
    setShowLatest(false);

    try {
      const results = await scraperApi.getHistory(searchQuery, 20);
      setHistory(results);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to load history');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading) {
      searchHistory();
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const displayData = showLatest ? latestPrices : history;

  return (
    <div className="price-history">
      <div className="history-header">
        <h2>Price History</h2>
        <button onClick={loadLatestPrices} className="refresh-btn">
          🔄 Refresh
        </button>
      </div>

      <div className="search-section">
        <input
          type="text"
          className="search-input"
          placeholder="Search product history... (e.g., 'MacBook Pro')"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={loading}
        />
        <button
          className="search-btn"
          onClick={searchHistory}
          disabled={loading || !searchQuery.trim()}
        >
          {loading ? 'Searching...' : '🔍 Search'}
        </button>
        {!showLatest && (
          <button
            className="back-btn"
            onClick={() => {
              setShowLatest(true);
              setSearchQuery('');
              setHistory([]);
            }}
          >
            ← Show Latest
          </button>
        )}
      </div>

      {error && (
        <div className="error-box">
          <span className="error-icon">⚠️</span>
          {error}
        </div>
      )}

      <div className="history-content">
        {loading ? (
          <div className="loading-state">
            <div className="spinner-large"></div>
            <p>Loading...</p>
          </div>
        ) : displayData.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📊</div>
            <h3>No price history found</h3>
            <p>
              {showLatest
                ? 'Start scraping products to build your price history'
                : 'No records found for this product'}
            </p>
          </div>
        ) : (
          <div className="history-table-container">
            <table className="history-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Product</th>
                  <th>Brand</th>
                  <th>Price</th>
                  <th>Stock</th>
                  <th>URL</th>
                </tr>
              </thead>
              <tbody>
                {displayData.map((item) => (
                  <tr key={item.id}>
                    <td className="date-cell">{formatDate(item.timestamp)}</td>
                    <td className="product-cell">{item.product_name}</td>
                    <td className="brand-cell">{item.brand || '—'}</td>
                    <td className="price-cell">
                      <span className="price-value">
                        {item.price} {item.currency}
                      </span>
                    </td>
                    <td className="stock-cell">
                      <span className={`stock-badge ${item.in_stock ? 'in-stock' : 'out-of-stock'}`}>
                        {item.in_stock ? '✓' : '✗'}
                      </span>
                    </td>
                    <td className="url-cell">
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="url-link"
                      >
                        View →
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default PriceHistory;
