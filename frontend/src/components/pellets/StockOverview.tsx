import React from 'react';
import type { CurrentStock, StockProjection } from '../../types/pellets';
import {
  formatNumber,
  getStockStatusColor,
  getStockStatusLabel,
  getStockStatusEmoji,
} from '../../services/pelletApi';

interface StockOverviewProps {
  currentStock: CurrentStock;
  projection: StockProjection;
  onQuickEntry?: () => void;
  onAddStock?: () => void;
}

const StockOverview: React.FC<StockOverviewProps> = ({
  currentStock,
  projection,
  onQuickEntry,
  onAddStock,
}) => {
  const stockPercentage = currentStock.stock_percentage || 0;
  const statusColor = getStockStatusColor(stockPercentage);
  const statusLabel = getStockStatusLabel(stockPercentage);
  const statusEmoji = getStockStatusEmoji(stockPercentage);

  return (
    <div className="stock-overview">
      {/* Header */}
      <div className="overview-header">
        <div className="header-left">
          <h2 className="overview-title">
            <span className="title-icon">🔥</span>
            Current Stock Status
          </h2>
          <p className="overview-subtitle">Pellet inventory and consumption tracking</p>
        </div>
        <div className="header-actions">
          {onQuickEntry && (
            <button className="btn btn-secondary" onClick={onQuickEntry}>
              <span>📝</span> Quick Entry
            </button>
          )}
          {onAddStock && (
            <button className="btn btn-primary" onClick={onAddStock}>
              <span>➕</span> Add Stock
            </button>
          )}
        </div>
      </div>

      {/* Main Stock Card */}
      <div className="stock-card main-card">
        <div className="card-header">
          <h3>Remaining Stock</h3>
          <span className="status-badge" style={{ backgroundColor: statusColor }}>
            {statusEmoji} {statusLabel}
          </span>
        </div>

        <div className="card-body">
          {/* Primary Stock Display */}
          <div className="stock-primary">
            <div className="stock-value">
              <span className="value-number">{formatNumber(currentStock.remaining_bags)}</span>
              <span className="value-unit">bags</span>
            </div>
            <div className="stock-weight">
              <span className="weight-kg">{formatNumber(currentStock.remaining_kg, 1)} kg</span>
              <span className="weight-separator">•</span>
              <span className="weight-tons">{formatNumber(currentStock.remaining_tons, 3)} tons</span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="progress-container">
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{
                  width: `${Math.min(100, stockPercentage)}%`,
                  backgroundColor: statusColor,
                }}
              >
                <span className="progress-text">{Math.round(stockPercentage)}%</span>
              </div>
            </div>
            <div className="progress-labels">
              <span>Empty</span>
              <span>Full</span>
            </div>
          </div>

          {/* Stock Stats Grid */}
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-label">Initial Stock</span>
              <span className="stat-value">
                {formatNumber(currentStock.total_purchased_bags)} bags
              </span>
              <span className="stat-subvalue">
                ({formatNumber(currentStock.total_purchased_tons, 3)} tons)
              </span>
            </div>

            <div className="stat-item">
              <span className="stat-label">Consumed</span>
              <span className="stat-value">
                {formatNumber(currentStock.total_consumed_bags)} bags
              </span>
              <span className="stat-subvalue">
                ({formatNumber(currentStock.total_consumed_kg / 1000, 3)} tons)
              </span>
            </div>

            <div className="stat-item highlight">
              <span className="stat-label">Remaining</span>
              <span className="stat-value">{formatNumber(currentStock.remaining_bags)} bags</span>
              <span className="stat-subvalue">
                ({formatNumber(currentStock.remaining_tons, 3)} tons)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Projection Cards */}
      <div className="projection-cards">
        {/* Consumption Rate Card */}
        <div className="stock-card">
          <div className="card-header">
            <h4>Consumption Rate</h4>
          </div>
          <div className="card-body">
            <div className="metric-large">
              <span className="metric-value">
                {projection.avg_bags_per_week
                  ? formatNumber(projection.avg_bags_per_week, 1)
                  : 'N/A'}
              </span>
              <span className="metric-unit">bags/week</span>
            </div>
            <p className="metric-description">Average weekly consumption</p>
          </div>
        </div>

        {/* Time Remaining Card */}
        <div className="stock-card">
          <div className="card-header">
            <h4>Estimated Duration</h4>
          </div>
          <div className="card-body">
            {projection.estimated_weeks_remaining !== null ? (
              <>
                <div className="metric-large">
                  <span className="metric-value">
                    {formatNumber(projection.estimated_weeks_remaining, 1)}
                  </span>
                  <span className="metric-unit">weeks</span>
                </div>
                {projection.estimated_depletion_date && (
                  <p className="metric-description">
                    Until ~{new Date(projection.estimated_depletion_date).toLocaleDateString()}
                  </p>
                )}
              </>
            ) : (
              <p className="metric-empty">No consumption data yet</p>
            )}
          </div>
        </div>

        {/* Next Purchase Suggestion */}
        <div className="stock-card">
          <div className="card-header">
            <h4>Next Purchase</h4>
          </div>
          <div className="card-body">
            {projection.estimated_weeks_remaining !== null ? (
              <>
                {projection.estimated_weeks_remaining > 4 ? (
                  <div className="suggestion good">
                    <span className="suggestion-icon">✅</span>
                    <p className="suggestion-text">Stock is sufficient</p>
                    <p className="suggestion-detail">Review in 2-3 weeks</p>
                  </div>
                ) : projection.estimated_weeks_remaining > 2 ? (
                  <div className="suggestion warning">
                    <span className="suggestion-icon">⚠️</span>
                    <p className="suggestion-text">Consider ordering soon</p>
                    <p className="suggestion-detail">~{Math.ceil(projection.estimated_weeks_remaining)} weeks remaining</p>
                  </div>
                ) : (
                  <div className="suggestion urgent">
                    <span className="suggestion-icon">🔴</span>
                    <p className="suggestion-text">Order immediately!</p>
                    <p className="suggestion-detail">Stock critically low</p>
                  </div>
                )}
              </>
            ) : (
              <p className="metric-empty">Add consumption data for recommendations</p>
            )}
          </div>
        </div>
      </div>

      {/* Alerts Section */}
      {stockPercentage < 30 && stockPercentage > 0 && (
        <div className={`stock-alert ${stockPercentage < 15 ? 'alert-critical' : 'alert-warning'}`}>
          <span className="alert-icon">{stockPercentage < 15 ? '🚨' : '⚠️'}</span>
          <div className="alert-content">
            <h4 className="alert-title">
              {stockPercentage < 15 ? 'Critical Stock Level' : 'Low Stock Warning'}
            </h4>
            <p className="alert-message">
              {stockPercentage < 15
                ? 'Your pellet stock is critically low. Order new stock immediately to avoid running out.'
                : 'Your pellet stock is running low. Consider placing an order soon.'}
            </p>
          </div>
          {onAddStock && (
            <button className="btn btn-alert" onClick={onAddStock}>
              Add Stock Now
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default StockOverview;
