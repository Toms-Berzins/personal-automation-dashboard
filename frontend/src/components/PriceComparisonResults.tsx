import React, { useState } from 'react';
import type { PriceComparisonResult, ComparisonProduct } from '../types';
import './PriceComparisonResults.css';

interface PriceComparisonResultsProps {
  result: PriceComparisonResult;
}

type FilterType = 'all' | 'new' | 'increases' | 'decreases' | 'unchanged';

function PriceComparisonResults({ result }: PriceComparisonResultsProps) {
  const [filter, setFilter] = useState<FilterType>('all');

  const getFilteredProducts = (): ComparisonProduct[] => {
    switch (filter) {
      case 'new':
        return result.comparison.newProducts;
      case 'increases':
        return result.comparison.priceIncreases;
      case 'decreases':
        return result.comparison.priceDecreases;
      case 'unchanged':
        return result.comparison.unchanged;
      default:
        return [
          ...result.comparison.newProducts,
          ...result.comparison.priceIncreases,
          ...result.comparison.priceDecreases,
          ...result.comparison.unchanged
        ];
    }
  };

  const filteredProducts = getFilteredProducts();

  const getStatusBadge = (product: ComparisonProduct) => {
    switch (product.status) {
      case 'new':
        return <span className="status-badge new">⭐ NEW</span>;
      case 'price_increase':
        return (
          <span className="status-badge price-up">
            📈 +{product.changePercent?.toFixed(1)}%
          </span>
        );
      case 'price_decrease':
        return (
          <span className="status-badge price-down">
            📉 {product.changePercent?.toFixed(1)}%
          </span>
        );
      case 'unchanged':
        return <span className="status-badge unchanged">✓ Same</span>;
    }
  };

  const getPriceDisplay = (product: ComparisonProduct) => {
    if (product.status === 'new' || product.status === 'unchanged') {
      return (
        <div className="price-current">
          {product.price} {product.currency || 'EUR'}
        </div>
      );
    }

    return (
      <div className="price-comparison">
        <div className="price-old">
          Was: {product.oldPrice} {product.currency || 'EUR'}
        </div>
        <div className={`price-new ${product.status === 'price_decrease' ? 'decreased' : 'increased'}`}>
          Now: {product.newPrice || product.price} {product.currency || 'EUR'}
        </div>
        {product.changeAmount !== undefined && (
          <div className={`price-change ${product.changeAmount < 0 ? 'savings' : 'increase'}`}>
            {product.changeAmount > 0 ? '+' : ''}{product.changeAmount.toFixed(2)} {product.currency || 'EUR'}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="price-comparison-results">
      {/* Header */}
      <div className="comparison-header">
        <h2 className="comparison-title">
          📊 Price Comparison Results
        </h2>
        <div className="comparison-meta">
          <span className="meta-badge">🔍 {result.searchEngine}</span>
          <span className="meta-badge">📦 {result.totalScraped} products</span>
          {result.saved && (
            <span className="meta-badge success">💾 Saved {result.savedCount}</span>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="summary-grid">
        <div className={`summary-card new ${filter === 'new' ? 'active' : ''}`}
             onClick={() => setFilter('new')}>
          <div className="summary-icon">⭐</div>
          <div className="summary-label">New Products</div>
          <div className="summary-value">{result.comparison.summary.new}</div>
        </div>

        <div className={`summary-card price-down ${filter === 'decreases' ? 'active' : ''}`}
             onClick={() => setFilter('decreases')}>
          <div className="summary-icon">📉</div>
          <div className="summary-label">Price Drops</div>
          <div className="summary-value">{result.comparison.priceDecreases.length}</div>
          <div className="summary-hint">Best deals!</div>
        </div>

        <div className={`summary-card price-up ${filter === 'increases' ? 'active' : ''}`}
             onClick={() => setFilter('increases')}>
          <div className="summary-icon">📈</div>
          <div className="summary-label">Price Increases</div>
          <div className="summary-value">{result.comparison.priceIncreases.length}</div>
        </div>

        <div className={`summary-card unchanged ${filter === 'unchanged' ? 'active' : ''}`}
             onClick={() => setFilter('unchanged')}>
          <div className="summary-icon">✓</div>
          <div className="summary-label">Unchanged</div>
          <div className="summary-value">{result.comparison.summary.unchanged}</div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="filter-tabs">
        <button
          className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All ({result.comparison.summary.total})
        </button>
        <button
          className={`filter-tab ${filter === 'new' ? 'active' : ''}`}
          onClick={() => setFilter('new')}
        >
          ⭐ New ({result.comparison.summary.new})
        </button>
        <button
          className={`filter-tab ${filter === 'decreases' ? 'active' : ''}`}
          onClick={() => setFilter('decreases')}
        >
          📉 Drops ({result.comparison.priceDecreases.length})
        </button>
        <button
          className={`filter-tab ${filter === 'increases' ? 'active' : ''}`}
          onClick={() => setFilter('increases')}
        >
          📈 Increases ({result.comparison.priceIncreases.length})
        </button>
        <button
          className={`filter-tab ${filter === 'unchanged' ? 'active' : ''}`}
          onClick={() => setFilter('unchanged')}
        >
          ✓ Unchanged ({result.comparison.summary.unchanged})
        </button>
      </div>

      {/* Products List */}
      <div className="products-list">
        {filteredProducts.length === 0 ? (
          <div className="empty-filter">
            <div className="empty-icon">🔍</div>
            <p>No products in this category</p>
          </div>
        ) : (
          filteredProducts.map((product, index) => (
            <div key={index} className={`comparison-product-card ${product.status}`}>
              <div className="product-header">
                <div className="product-info">
                  <h3 className="product-name">{product.product_name}</h3>
                  {product.brand && product.brand !== 'Unknown' && (
                    <div className="product-brand">{product.brand}</div>
                  )}
                </div>
                {getStatusBadge(product)}
              </div>

              <div className="product-body">
                {getPriceDisplay(product)}

                <div className="product-meta">
                  <div className={`stock-indicator ${product.in_stock ? 'in-stock' : 'out-of-stock'}`}>
                    {product.in_stock ? '✓ In Stock' : '✗ Out of Stock'}
                  </div>

                  {product.lastChecked && product.status === 'unchanged' && (
                    <div className="last-checked">
                      Last checked: {new Date(product.lastChecked).toLocaleDateString()}
                    </div>
                  )}
                </div>

                {product.description && (
                  <div className="product-description">
                    {product.description.length > 150
                      ? `${product.description.substring(0, 150)}...`
                      : product.description
                    }
                  </div>
                )}

                {product.url && (
                  <a
                    href={product.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="product-link"
                  >
                    View Product →
                  </a>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Insights Box */}
      {result.comparison.priceDecreases.length > 0 && filter === 'all' && (
        <div className="insights-box">
          <div className="insights-icon">💡</div>
          <div className="insights-content">
            <h4>Price Drop Alert!</h4>
            <p>
              {result.comparison.priceDecreases.length} product{result.comparison.priceDecreases.length > 1 ? 's have' : ' has'} dropped in price.
              {result.comparison.priceDecreases.length > 0 && (
                <> The best deal is <strong>{result.comparison.priceDecreases[0].product_name}</strong> with a {Math.abs(result.comparison.priceDecreases[0].changePercent || 0).toFixed(1)}% discount!</>
              )}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default PriceComparisonResults;
