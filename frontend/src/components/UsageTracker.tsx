import React, { useState, useEffect } from 'react';
import { consumptionApi } from '../services/api';
import type { ConsumptionStats, ConsumptionTrends, ConsumptionPriceComparison } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import './UsageTracker.css';

function UsageTracker() {
  const [stats, setStats] = useState<ConsumptionStats | null>(null);
  const [trends, setTrends] = useState<ConsumptionTrends | null>(null);
  const [comparison, setComparison] = useState<ConsumptionPriceComparison | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<number>(12);

  // Helper function to format weight (kg to tons if >= 1000kg)
  const formatWeight = (kg: number): string => {
    if (kg >= 1000) {
      return `${(kg / 1000).toFixed(2)} t`;
    }
    return `${kg.toFixed(0)} kg`;
  };

  // Helper function to format currency (EUR to K if >= 1000)
  const formatCurrency = (amount: number | string): string => {
    const value = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (value >= 1000) {
      return `€${(value / 1000).toFixed(2)}K`;
    }
    return `€${value.toFixed(2)}`;
  };

  useEffect(() => {
    fetchData();
  }, [selectedPeriod]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [statsData, trendsData, comparisonData] = await Promise.all([
        consumptionApi.getStats(),
        consumptionApi.getTrends(),
        consumptionApi.getComparison(selectedPeriod)
      ]);

      setStats(statsData);
      setTrends(trendsData);
      setComparison(comparisonData);
    } catch (err: any) {
      console.error('Failed to fetch consumption data:', err);
      setError(err.message || 'Failed to load consumption data');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !stats) {
    return (
      <div className="usage-tracker">
        <div className="loading-state">
          <div className="spinner-large"></div>
          <p>Loading usage data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="usage-tracker">
        <div className="error-state">
          <span className="error-icon">⚠️</span>
          <h3>Error Loading Data</h3>
          <p>{error}</p>
          <button onClick={fetchData} className="retry-button">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="usage-tracker">
      <div className="usage-header">
        <h2 className="usage-title">📈 Granules Usage Tracker</h2>
        <p className="usage-subtitle">Monitor your consumption patterns and optimize buying decisions</p>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">📊</div>
            <div className="stat-content">
              <div className="stat-label">Total Consumption</div>
              <div className="stat-value">{formatWeight(parseFloat(stats.total_kg))}</div>
              <div className="stat-meta">{stats.total_months} months tracked</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">📈</div>
            <div className="stat-content">
              <div className="stat-label">Monthly Average</div>
              <div className="stat-value">{parseFloat(stats.avg_monthly_kg).toFixed(0)} kg</div>
              <div className="stat-meta">Per month</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">🔥</div>
            <div className="stat-content">
              <div className="stat-label">Peak Month</div>
              <div className="stat-value">{parseFloat(stats.peak_month_kg).toFixed(0)} kg</div>
              <div className="stat-meta">Highest usage</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">📅</div>
            <div className="stat-content">
              <div className="stat-label">Last Month</div>
              <div className="stat-value">{parseFloat(stats.last_month_kg).toFixed(0)} kg</div>
              <div className="stat-meta">{new Date(stats.last_update).toLocaleDateString()}</div>
            </div>
          </div>
        </div>
      )}

      {/* Period Selector */}
      <div className="period-selector">
        <label>View Period:</label>
        <select
          value={selectedPeriod}
          onChange={(e) => setSelectedPeriod(parseInt(e.target.value))}
          disabled={loading}
        >
          <option value={6}>Last 6 Months</option>
          <option value={12}>Last 12 Months</option>
          <option value={24}>Last 24 Months</option>
          <option value={36}>Last 36 Months</option>
        </select>
      </div>

      {/* Consumption Chart (Monthly) */}
      {comparison && comparison.comparison.length > 0 && (
        <div className="chart-section">
          <h3 className="section-title">📊 Monthly Consumption</h3>
          <div className="consumption-chart-recharts">
            <ResponsiveContainer width="100%" height={400}>
              <BarChart
                data={comparison.comparison
                  .slice(0, selectedPeriod)
                  .reverse()
                  .map(item => ({
                    month: new Date(item.month).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
                    consumption: parseFloat(item.kg_consumed.toFixed(0)),
                    cost: item.estimated_cost ? parseFloat(item.estimated_cost) : null,
                    dataQuality: item.avg_price_type || 'unknown'
                  }))}
                margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2f3a" opacity={0.3} />
                <XAxis
                  dataKey="month"
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                  stroke="#475569"
                />
                <YAxis
                  label={{ value: 'Consumption (kg)', angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 12 }}
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                  stroke="#475569"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    padding: '12px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)'
                  }}
                  labelStyle={{ color: '#e2e8f0', fontWeight: 600, marginBottom: '8px' }}
                  itemStyle={{ color: '#94a3b8', padding: '4px 0' }}
                  formatter={(value: any, name: string) => {
                    if (name === 'consumption') return [`${value} kg`, 'Consumption'];
                    if (name === 'cost') return [`€${value ? value.toFixed(2) : 'N/A'}`, 'Est. Cost'];
                    return [value, name];
                  }}
                  cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }}
                />
                <Bar
                  dataKey="consumption"
                  radius={[8, 8, 0, 0]}
                  maxBarSize={60}
                >
                  {comparison.comparison.slice(0, selectedPeriod).reverse().map((item, index) => {
                    // Color based on data quality
                    let color = '#3b82f6'; // default blue
                    if (item.avg_price_type === 'monthly') {
                      color = '#10b981'; // green for actual data
                    } else if (item.avg_price_type === 'historical') {
                      color = '#f59e0b'; // amber for historical
                    } else if (item.avg_price_type === 'overall_avg') {
                      color = '#ef4444'; // red for fallback
                    }
                    return <Cell key={`cell-${index}`} fill={color} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="chart-legend">
              <div className="legend-item">
                <span className="legend-color" style={{ backgroundColor: '#10b981' }}></span>
                <span>Actual Monthly Data</span>
              </div>
              <div className="legend-item">
                <span className="legend-color" style={{ backgroundColor: '#f59e0b' }}></span>
                <span>Historical Average</span>
              </div>
              <div className="legend-item">
                <span className="legend-color" style={{ backgroundColor: '#ef4444' }}></span>
                <span>Overall Average</span>
              </div>
              <div className="legend-item">
                <span className="legend-color" style={{ backgroundColor: '#3b82f6' }}></span>
                <span>No Price Data</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cost Analysis */}
      {comparison && (
        <div className="cost-analysis-section">
          <h3 className="section-title">💰 Cost Analysis</h3>

          {/* Main Cost Summary */}
          <div className="cost-summary">
            <div className="cost-item">
              <span className="cost-label">Total Consumption:</span>
              <span className="cost-value">{formatWeight(comparison.summary.total_kg)}</span>
            </div>
            <div className="cost-item">
              <span className="cost-label">Estimated Total Cost:</span>
              <span className="cost-value highlight">{formatCurrency(comparison.summary.total_cost)}</span>
            </div>
            {comparison.summary.avg_price_per_ton && (
              <div className="cost-item">
                <span className="cost-label">Average Price per Ton:</span>
                <span className="cost-value">€{comparison.summary.avg_price_per_ton}/ton</span>
              </div>
            )}
            {comparison.summary.avg_cost_per_kg && (
              <div className="cost-item">
                <span className="cost-label">Average Cost per kg:</span>
                <span className="cost-value">€{comparison.summary.avg_cost_per_kg}/kg</span>
              </div>
            )}
            <div className="cost-item">
              <span className="cost-label">Period:</span>
              <span className="cost-value">{comparison.summary.period}</span>
            </div>
          </div>

          {/* Price Data Quality Indicator */}
          {comparison.summary.price_confidence && (
            <div className="data-quality-indicator">
              <div className="quality-label">Price Data Confidence:</div>
              <div className="quality-bar-container">
                <div
                  className="quality-bar"
                  style={{
                    width: `${comparison.summary.price_confidence}%`,
                    backgroundColor:
                      parseInt(comparison.summary.price_confidence) >= 80 ? '#10b981' :
                      parseInt(comparison.summary.price_confidence) >= 60 ? '#f59e0b' : '#ef4444'
                  }}
                >
                  <span className="quality-value">{comparison.summary.price_confidence}%</span>
                </div>
              </div>
              <div className="quality-details">
                <span>✓ Actual prices: {comparison.summary.months_with_monthly_price || 0} months</span>
                <span>⚡ Historical avg: {comparison.summary.months_with_historical_price || 0} months</span>
                <span>⚠ Overall avg: {comparison.summary.months_with_overall_price || 0} months</span>
              </div>
            </div>
          )}

          {/* Cost Trend Analysis */}
          {comparison.summary.cost_trend && (
            <div className="cost-trend-box">
              <h4 className="trend-title">📊 Cost Trend Analysis</h4>
              <div className="trend-content">
                <div className="trend-comparison">
                  <div className="trend-item">
                    <span className="trend-label">Recent Average (3 months):</span>
                    <span className="trend-value">{formatCurrency(comparison.summary.cost_trend.recent_avg)}</span>
                  </div>
                  <div className="trend-arrow">
                    {comparison.summary.cost_trend.direction === 'increasing' && '📈'}
                    {comparison.summary.cost_trend.direction === 'decreasing' && '📉'}
                    {comparison.summary.cost_trend.direction === 'stable' && '➡️'}
                  </div>
                  <div className="trend-item">
                    <span className="trend-label">Earlier Average (3 months):</span>
                    <span className="trend-value">{formatCurrency(comparison.summary.cost_trend.older_avg)}</span>
                  </div>
                </div>
                <div className={`trend-change ${comparison.summary.cost_trend.direction}`}>
                  {comparison.summary.cost_trend.direction === 'increasing' && '↑'}
                  {comparison.summary.cost_trend.direction === 'decreasing' && '↓'}
                  {Math.abs(parseFloat(comparison.summary.cost_trend.percent_change))}%
                  {comparison.summary.cost_trend.direction === 'increasing' ? ' increase' :
                   comparison.summary.cost_trend.direction === 'decreasing' ? ' decrease' : ' stable'}
                </div>
              </div>
            </div>
          )}

          {/* Price Range & Savings */}
          {(comparison.summary.best_month || comparison.summary.potential_savings) && (
            <div className="savings-analysis">
              <h4 className="savings-title">💡 Potential Savings</h4>

              {comparison.summary.best_month && comparison.summary.worst_month && (
                <div className="price-range">
                  <div className="price-range-item best">
                    <div className="range-icon">✅</div>
                    <div className="range-content">
                      <div className="range-label">Best Price</div>
                      <div className="range-value">€{comparison.summary.best_month.price}/ton</div>
                      <div className="range-month">{new Date(comparison.summary.best_month.month + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</div>
                    </div>
                  </div>
                  <div className="price-range-item worst">
                    <div className="range-icon">❌</div>
                    <div className="range-content">
                      <div className="range-label">Highest Price</div>
                      <div className="range-value">€{comparison.summary.worst_month.price}/ton</div>
                      <div className="range-month">{new Date(comparison.summary.worst_month.month + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</div>
                    </div>
                  </div>
                </div>
              )}

              {comparison.summary.potential_savings && (
                <div className="savings-card">
                  <div className="savings-icon">💰</div>
                  <div className="savings-content">
                    <div className="savings-amount">{formatCurrency(comparison.summary.potential_savings.amount)}</div>
                    <div className="savings-label">
                      Could have saved ({comparison.summary.potential_savings.percent}%) if all purchases were at best price
                    </div>
                    <div className="savings-tip">
                      💡 Tip: Best time to buy historically was {new Date(comparison.summary.potential_savings.best_month + '-01').toLocaleDateString('en-US', { month: 'long' })} at €{comparison.summary.potential_savings.best_price}/ton
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Price Calculation Method */}
          {comparison.summary.price_calculation_method && (
            <div className="price-method-note">
              <span className="method-icon">ℹ️</span>
              <span className="method-text">{comparison.summary.price_calculation_method}</span>
            </div>
          )}

          {/* Monthly Cost Breakdown */}
          <div className="monthly-costs">
            <h4>Monthly Breakdown</h4>
            <div className="costs-table">
              <div className="costs-header">
                <span>Month</span>
                <span>Consumption</span>
                <span>Avg Price</span>
                <span>Est. Cost</span>
                <span>Data Quality</span>
              </div>
              {comparison.comparison.slice(0, 12).map((item, index) => {
                // Handle both date string and YYYY-MM format
                const monthDate = item.month.includes('-') && item.month.length === 7
                  ? new Date(item.month + '-01')
                  : new Date(item.month);

                // Determine price badge
                let priceBadge = null;
                let priceTitle = '';
                if (item.avg_price_type === 'monthly') {
                  priceBadge = <span className="price-badge actual" title="Actual monthly price data">✓</span>;
                  priceTitle = 'Actual monthly price';
                } else if (item.avg_price_type === 'historical') {
                  priceBadge = <span className="price-badge historical" title="Historical monthly average">⚡</span>;
                  priceTitle = 'Historical average for this calendar month';
                } else if (item.avg_price_type === 'overall_avg') {
                  priceBadge = <span className="price-badge fallback" title="Overall average fallback">⚠</span>;
                  priceTitle = 'Overall average (fallback)';
                }

                // Price variance indicator
                const hasVariance = item.price_variance && item.price_variance > 0;
                const variancePercent = hasVariance && item.avg_price
                  ? ((item.price_variance / item.avg_price) * 100).toFixed(0)
                  : null;

                return (
                  <div key={index} className="costs-row">
                    <span className="month-cell">
                      {monthDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                    </span>
                    <span>{formatWeight(item.kg_consumed)}</span>
                    <span className="price-cell">
                      {item.avg_price ? (
                        <>
                          €{item.avg_price.toFixed(2)}/kg
                          {hasVariance && (
                            <span className="price-variance" title={`Price range: €${item.min_price?.toFixed(2)} - €${item.max_price?.toFixed(2)} per kg`}>
                              ±{variancePercent}%
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="no-data">N/A</span>
                      )}
                    </span>
                    <span className="cost-cell">{item.estimated_cost ? formatCurrency(item.estimated_cost) : <span className="no-data">N/A</span>}</span>
                    <span className="quality-cell" title={priceTitle}>
                      {priceBadge}
                      {item.price_confidence && (
                        <span className="confidence-score">{item.price_confidence}%</span>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="table-legend">
              <span><span className="price-badge actual">✓</span> Actual monthly data</span>
              <span><span className="price-badge historical">⚡</span> Historical average</span>
              <span><span className="price-badge fallback">⚠</span> Overall average</span>
            </div>
          </div>
        </div>
      )}

      {/* Yearly Trends */}
      {trends && trends.yearly.length > 0 && (
        <div className="yearly-section">
          <h3 className="section-title">Yearly Trends</h3>
          <div className="yearly-grid">
            {trends.yearly.map((year, index) => (
              <div key={index} className="yearly-card">
                <div className="year-header">{year.year}</div>
                <div className="year-stats">
                  <div className="year-stat">
                    <span className="year-label">Total:</span>
                    <span className="year-value">{formatWeight(parseFloat(year.total_kg))}</span>
                  </div>
                  <div className="year-stat">
                    <span className="year-label">Monthly Avg:</span>
                    <span className="year-value">{parseFloat(year.avg_monthly_kg).toFixed(0)} kg</span>
                  </div>
                  <div className="year-stat">
                    <span className="year-label">Peak:</span>
                    <span className="year-value">{parseFloat(year.peak_month_kg).toFixed(0)} kg</span>
                  </div>
                  <div className="year-stat">
                    <span className="year-label">Lowest:</span>
                    <span className="year-value">{parseFloat(year.lowest_month_kg).toFixed(0)} kg</span>
                  </div>
                </div>
                <div className="year-months">{year.months_count} months</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Seasonal Patterns */}
      {trends && trends.seasonal.length > 0 && (
        <div className="seasonal-section">
          <h3 className="section-title">🌡️ Seasonal Patterns</h3>
          <p className="seasonal-desc">
            Heating season (Oct-Apr) vs Non-heating season (May-Sep)
          </p>
          <div className="seasonal-grid">
            {trends.seasonal.map((season, index) => (
              <div key={index} className={`seasonal-card ${season.season}`}>
                <div className="seasonal-header">
                  <span className="seasonal-year">{season.year}</span>
                  <span className="seasonal-badge">
                    {season.season === 'heating_season' ? '🔥 Heating' : '☀️ Summer'}
                  </span>
                </div>
                <div className="seasonal-stats">
                  <div className="seasonal-stat">
                    <span>Total:</span>
                    <span className="stat-bold">{formatWeight(parseFloat(season.total_kg))}</span>
                  </div>
                  <div className="seasonal-stat">
                    <span>Average:</span>
                    <span className="stat-bold">{parseFloat(season.avg_kg).toFixed(0)} kg</span>
                  </div>
                  <div className="seasonal-stat">
                    <span>Months:</span>
                    <span className="stat-bold">{season.months_count}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Insights */}
      <div className="insights-section">
        <h3 className="section-title">💡 Usage Insights</h3>
        <div className="insights-grid">
          {stats && trends && (
            <>
              <div className="insight-card">
                <div className="insight-icon">📊</div>
                <div className="insight-content">
                  <h4>Consumption Pattern</h4>
                  <p>
                    Your average monthly consumption is {parseFloat(stats.avg_monthly_kg).toFixed(0)} kg.
                    Peak usage typically occurs during winter months.
                  </p>
                </div>
              </div>

              {trends.seasonal.length >= 2 && (
                <div className="insight-card">
                  <div className="insight-icon">🔥</div>
                  <div className="insight-content">
                    <h4>Seasonal Variance</h4>
                    <p>
                      Heating season consumption is significantly higher than summer months.
                      Plan purchases ahead of the heating season for better prices.
                    </p>
                  </div>
                </div>
              )}

              <div className="insight-card">
                <div className="insight-icon">💰</div>
                <div className="insight-content">
                  <h4>Cost Optimization</h4>
                  <p>
                    Based on your usage patterns, buying in bulk before winter (Sept-Oct)
                    typically offers the best value.
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default UsageTracker;
