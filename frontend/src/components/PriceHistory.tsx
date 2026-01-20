import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { scraperApi } from '../services/api';
import type { PriceHistoryItem } from '../types';
import './PriceHistory.css';

type TimeRange = '7d' | '30d' | '90d' | 'all';
type ChartType = 'line' | 'bar';
type SortField = 'date' | 'product' | 'brand' | 'price' | 'stock';
type SortDirection = 'asc' | 'desc';

interface PriceDataPoint {
  date: string;
  price: number;
  brand?: string;
  inStock: boolean;
}

interface PriceStats {
  current: number;
  average: number;
  lowest: number;
  highest: number;
  change: number;
  changePercent: number;
}

function PriceHistory() {
  const [searchQuery, setSearchQuery] = useState('');
  const [history, setHistory] = useState<PriceHistoryItem[]>([]);
  const [latestPrices, setLatestPrices] = useState<PriceHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showLatest, setShowLatest] = useState(true);

  // Visualization controls
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const [chartType, setChartType] = useState<ChartType>('line');
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);

  // Table sorting
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

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
      const results = await scraperApi.getHistory(searchQuery, 100); // Increased for better chart data
      setHistory(results);
      if (results.length > 0) {
        setSelectedProduct(results[0].product_name);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to load history');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
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

  const formatShortDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  // Filter data by time range
  const filterByTimeRange = (data: PriceHistoryItem[]): PriceHistoryItem[] => {
    if (timeRange === 'all') return data;

    const now = new Date();
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    const cutoffDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    return data.filter(item => new Date(item.timestamp) >= cutoffDate);
  };

  // Prepare chart data
  const prepareChartData = (): PriceDataPoint[] => {
    const displayData = showLatest ? latestPrices : history;
    const filteredData = filterByTimeRange(displayData);

    return filteredData.map(item => ({
      date: item.timestamp,
      price: parseFloat(item.price.toString()),
      brand: item.brand || 'Unknown',
      inStock: item.in_stock
    })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  // Calculate price statistics
  const calculateStats = (): PriceStats | null => {
    const chartData = prepareChartData();
    if (chartData.length === 0) return null;

    const prices = chartData.map(d => d.price);
    const current = prices[prices.length - 1];
    const previous = prices.length > 1 ? prices[prices.length - 2] : current;
    const average = prices.reduce((sum, p) => sum + p, 0) / prices.length;
    const lowest = Math.min(...prices);
    const highest = Math.max(...prices);
    const change = current - previous;
    const changePercent = previous > 0 ? ((change / previous) * 100) : 0;

    return {
      current,
      average,
      lowest,
      highest,
      change,
      changePercent
    };
  };

  // Get unique products for filtering
  const getUniqueProducts = (data: PriceHistoryItem[]): string[] => {
    const products = new Set(data.map(item => item.product_name));
    return Array.from(products).sort();
  };

  // Handle table sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Toggle direction if clicking the same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Default to descending for new field
      setSortField(field);
      setSortDirection(field === 'date' || field === 'price' ? 'desc' : 'asc');
    }
    setCurrentPage(1); // Reset to first page when sorting
  };

  // Sort data
  const sortData = (data: PriceHistoryItem[]): PriceHistoryItem[] => {
    return [...data].sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'date':
          comparison = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
          break;
        case 'product':
          comparison = a.product_name.localeCompare(b.product_name);
          break;
        case 'brand':
          comparison = (a.brand || '').localeCompare(b.brand || '');
          break;
        case 'price':
          comparison = a.price - b.price;
          break;
        case 'stock':
          comparison = (a.in_stock === b.in_stock) ? 0 : a.in_stock ? -1 : 1;
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  };

  // Export to CSV
  const exportToCSV = () => {
    if (filteredDisplayData.length === 0) return;

    const headers = ['Date', 'Product', 'Brand', 'Price', 'Currency', 'Stock Status', 'URL'];
    const rows = filteredDisplayData.map(item => [
      formatDate(item.timestamp),
      item.product_name,
      item.brand || '—',
      item.price.toString(),
      item.currency,
      item.in_stock ? 'In Stock' : 'Out of Stock',
      item.url
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    downloadFile(csvContent, 'price-history.csv', 'text/csv');
  };

  // Export to Excel (CSV with .xlsx extension for compatibility)
  const exportToExcel = () => {
    if (filteredDisplayData.length === 0) return;

    const headers = ['Date', 'Product', 'Brand', 'Price', 'Currency', 'Stock Status', 'URL'];
    const rows = filteredDisplayData.map(item => [
      formatDate(item.timestamp),
      item.product_name,
      item.brand || '—',
      item.price.toString(),
      item.currency,
      item.in_stock ? 'In Stock' : 'Out of Stock',
      item.url
    ]);

    // Excel-compatible CSV format (tab-separated for better Excel compatibility)
    const csvContent = [
      headers.join('\t'),
      ...rows.map(row => row.map(cell => String(cell)).join('\t'))
    ].join('\n');

    downloadFile(csvContent, 'price-history.xls', 'application/vnd.ms-excel');
  };

  // Download file helper
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

  const displayData = showLatest ? latestPrices : history;
  const uniqueProducts = getUniqueProducts(displayData);

  // Filter data by selected product if applicable
  const filteredData = selectedProduct
    ? displayData.filter(item => item.product_name === selectedProduct)
    : displayData;

  // Sort the filtered data
  const filteredDisplayData = sortData(filteredData);

  // Pagination calculations
  const totalPages = Math.ceil(filteredDisplayData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = filteredDisplayData.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedProduct, showLatest, searchQuery]);

  const chartData = prepareChartData();
  const stats = calculateStats();

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="chart-tooltip">
          <p className="tooltip-date">{formatDate(data.date)}</p>
          <p className="tooltip-price">€{data.price.toFixed(2)}</p>
          {data.brand && <p className="tooltip-brand">{data.brand}</p>}
          <p className={`tooltip-stock ${data.inStock ? 'in-stock' : 'out-of-stock'}`}>
            {data.inStock ? 'In Stock' : 'Out of Stock'}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="price-history">
      {/* Header with Search */}
      <div className="history-header">
        <div className="search-section">
          <input
            type="text"
            className="search-input"
            placeholder="Search product history... (e.g., 'granulas')"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
          />
          <button
            className="search-btn"
            onClick={searchHistory}
            disabled={loading || !searchQuery.trim()}
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
          {!showLatest && (
            <button
              className="back-btn"
              onClick={() => {
                setShowLatest(true);
                setSearchQuery('');
                setHistory([]);
                setSelectedProduct(null);
              }}
            >
              ← Show Latest
            </button>
          )}
        </div>
        <button
          onClick={loadLatestPrices}
          className="btn-refresh"
          disabled={loading}
          title="Refresh prices"
          aria-label="Refresh prices"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M23 4v6h-6M1 20v-6h6"/>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
          </svg>
        </button>
      </div>

      {error && (
        <div className="error-box">
          <span className="error-indicator"></span>
          {error}
        </div>
      )}

      {/* Price Statistics Cards */}
      {stats && !showLatest && (
        <div className="stats-grid">
          <div className="stat-card current-price">
            <div className="stat-label">Current Price</div>
            <div className="stat-value">€{stats.current.toFixed(2)}</div>
            <div className={`stat-change ${stats.change >= 0 ? 'positive' : 'negative'}`}>
              {stats.change >= 0 ? '↑' : '↓'} €{Math.abs(stats.change).toFixed(2)}
              ({stats.changePercent >= 0 ? '+' : ''}{stats.changePercent.toFixed(1)}%)
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-label">Average Price</div>
            <div className="stat-value">€{stats.average.toFixed(2)}</div>
            <div className="stat-info">Last {timeRange === '7d' ? '7 days' : timeRange === '30d' ? '30 days' : timeRange === '90d' ? '90 days' : 'all time'}</div>
          </div>

          <div className="stat-card lowest-price">
            <div className="stat-label">Lowest Price</div>
            <div className="stat-value">€{stats.lowest.toFixed(2)}</div>
            <div className="stat-info">All-time low</div>
          </div>

          <div className="stat-card highest-price">
            <div className="stat-label">Highest Price</div>
            <div className="stat-value">€{stats.highest.toFixed(2)}</div>
            <div className="stat-info">All-time high</div>
          </div>
        </div>
      )}

      {/* Chart Controls */}
      {!showLatest && chartData.length > 0 && (
        <div className="chart-controls">
          {/* Product Filter */}
          {uniqueProducts.length > 1 && (
            <div className="control-group">
              <label className="control-label">Product Filter:</label>
              <select
                className="product-select"
                value={selectedProduct || ''}
                onChange={(e) => setSelectedProduct(e.target.value || null)}
              >
                <option value="">All Products ({uniqueProducts.length})</option>
                {uniqueProducts.map(product => (
                  <option key={product} value={product}>
                    {product}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="control-group">
            <label className="control-label">Time Range:</label>
            <div className="button-group">
              <button
                className={`control-btn ${timeRange === '7d' ? 'active' : ''}`}
                onClick={() => setTimeRange('7d')}
              >
                7 Days
              </button>
              <button
                className={`control-btn ${timeRange === '30d' ? 'active' : ''}`}
                onClick={() => setTimeRange('30d')}
              >
                30 Days
              </button>
              <button
                className={`control-btn ${timeRange === '90d' ? 'active' : ''}`}
                onClick={() => setTimeRange('90d')}
              >
                90 Days
              </button>
              <button
                className={`control-btn ${timeRange === 'all' ? 'active' : ''}`}
                onClick={() => setTimeRange('all')}
              >
                All Time
              </button>
            </div>
          </div>

          <div className="control-group">
            <label className="control-label">Chart Type:</label>
            <div className="button-group">
              <button
                className={`control-btn ${chartType === 'line' ? 'active' : ''}`}
                onClick={() => setChartType('line')}
              >
                Line
              </button>
              <button
                className={`control-btn ${chartType === 'bar' ? 'active' : ''}`}
                onClick={() => setChartType('bar')}
              >
                Bar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Price Chart */}
      {!showLatest && chartData.length > 0 && (
        <div className="chart-container">
          <h3 className="chart-title">Price Trend - {selectedProduct || 'All Products'}</h3>
          <ResponsiveContainer width="100%" height={400}>
            {chartType === 'line' ? (
              <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatShortDate}
                  stroke="var(--text-secondary)"
                />
                <YAxis
                  stroke="var(--text-secondary)"
                  label={{ value: 'Price (€)', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                {stats && (
                  <ReferenceLine
                    y={stats.average}
                    stroke="var(--warning)"
                    strokeDasharray="5 5"
                    label={{ value: 'Avg', position: 'right' }}
                  />
                )}
                <Line
                  type="monotone"
                  dataKey="price"
                  stroke="var(--primary)"
                  strokeWidth={3}
                  dot={{ fill: 'var(--primary)', r: 4 }}
                  activeDot={{ r: 6 }}
                  name="Price"
                />
              </LineChart>
            ) : (
              <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatShortDate}
                  stroke="var(--text-secondary)"
                />
                <YAxis
                  stroke="var(--text-secondary)"
                  label={{ value: 'Price (€)', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                {stats && (
                  <ReferenceLine
                    y={stats.average}
                    stroke="var(--warning)"
                    strokeDasharray="5 5"
                    label={{ value: 'Average', position: 'right' }}
                  />
                )}
                <Bar
                  dataKey="price"
                  fill="var(--primary)"
                  name="Price"
                />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      )}

      {/* Data Table */}
      <div className="history-content">
        {loading ? (
          <div className="loading-state">
            <div className="spinner-large"></div>
            <p>Loading...</p>
          </div>
        ) : displayData.length === 0 ? (
          <div className="empty-state">
            <div className="empty-indicator"></div>
            <h3>No price history found</h3>
            <p>
              {showLatest
                ? 'Start scraping products to build your price history'
                : 'No records found for this product'}
            </p>
          </div>
        ) : (
          <div className="history-table-container">
            <div className="table-header">
              <h3>Price Records ({displayData.length})</h3>
              <div className="export-buttons">
                <button
                  className="export-btn"
                  onClick={exportToCSV}
                  disabled={filteredDisplayData.length === 0}
                  title="Export to CSV"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  CSV
                </button>
                <button
                  className="export-btn"
                  onClick={exportToExcel}
                  disabled={filteredDisplayData.length === 0}
                  title="Export to Excel"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  Excel
                </button>
              </div>
            </div>
            <table className="history-table">
              <thead>
                <tr>
                  <th className="sortable" onClick={() => handleSort('date')}>
                    Date
                    {sortField === 'date' && (
                      <span className="sort-indicator">
                        {sortDirection === 'asc' ? ' ↑' : ' ↓'}
                      </span>
                    )}
                  </th>
                  <th className="sortable" onClick={() => handleSort('product')}>
                    Product
                    {sortField === 'product' && (
                      <span className="sort-indicator">
                        {sortDirection === 'asc' ? ' ↑' : ' ↓'}
                      </span>
                    )}
                  </th>
                  <th className="sortable" onClick={() => handleSort('brand')}>
                    Brand
                    {sortField === 'brand' && (
                      <span className="sort-indicator">
                        {sortDirection === 'asc' ? ' ↑' : ' ↓'}
                      </span>
                    )}
                  </th>
                  <th className="sortable" onClick={() => handleSort('price')}>
                    Price
                    {sortField === 'price' && (
                      <span className="sort-indicator">
                        {sortDirection === 'asc' ? ' ↑' : ' ↓'}
                      </span>
                    )}
                  </th>
                  <th className="sortable" onClick={() => handleSort('stock')}>
                    Stock
                    {sortField === 'stock' && (
                      <span className="sort-indicator">
                        {sortDirection === 'asc' ? ' ↑' : ' ↓'}
                      </span>
                    )}
                  </th>
                  <th>URL</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((item) => (
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
                        <span className="stock-dot"></span>
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

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="pagination">
                <button
                  className="pagination-btn"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  ← Previous
                </button>

                <div className="pagination-info">
                  <span className="page-numbers">
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(page => {
                        // Show first page, last page, current page, and pages around current
                        if (page === 1 || page === totalPages) return true;
                        if (Math.abs(page - currentPage) <= 1) return true;
                        return false;
                      })
                      .map((page, index, array) => {
                        // Add ellipsis between non-consecutive pages
                        const prevPage = array[index - 1];
                        const showEllipsis = prevPage && page - prevPage > 1;

                        return (
                          <React.Fragment key={page}>
                            {showEllipsis && <span className="ellipsis">...</span>}
                            <button
                              className={`page-btn ${currentPage === page ? 'active' : ''}`}
                              onClick={() => setCurrentPage(page)}
                            >
                              {page}
                            </button>
                          </React.Fragment>
                        );
                      })}
                  </span>
                  <span className="pagination-text">
                    Showing {startIndex + 1}-{Math.min(endIndex, filteredDisplayData.length)} of {filteredDisplayData.length} records
                  </span>
                </div>

                <button
                  className="pagination-btn"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next →
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default PriceHistory;
