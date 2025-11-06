import React, { useState, useEffect } from 'react';
import { aiApi } from '../services/api';
import type { AIInsightsResponse } from '../types';
import './AIInsightsPanel.css';

function AIInsightsPanel() {
  const [insights, setInsights] = useState<AIInsightsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(30);
  const [noCachedData, setNoCachedData] = useState(false);

  // Load cached insights on mount and when days change
  const loadCachedInsights = async () => {
    setLoading(true);
    setError(null);
    setNoCachedData(false);

    try {
      const data = await aiApi.getInsights(undefined, days);
      if (data) {
        setInsights(data);
        setNoCachedData(false);
      } else {
        setInsights(null);
        setNoCachedData(true);
      }
    } catch (err: any) {
      console.error('Failed to load cached insights:', err);
      setError(err.response?.data?.error || 'Failed to load cached insights');
    } finally {
      setLoading(false);
    }
  };

  // Generate new insights (called by refresh button)
  const generateNewInsights = async () => {
    setGenerating(true);
    setError(null);

    try {
      const data = await aiApi.generateInsights(undefined, days);
      setInsights(data);
      setNoCachedData(false);
    } catch (err: any) {
      console.error('Failed to generate insights:', err);
      setError(err.response?.data?.error || 'Failed to generate AI insights');
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => {
    loadCachedInsights();
  }, [days]);

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'trend':
        return '📈';
      case 'anomaly':
        return '⚠️';
      case 'opportunity':
        return '💡';
      case 'warning':
        return '🚨';
      default:
        return '📊';
    }
  };

  const getInsightColor = (type: string) => {
    switch (type) {
      case 'trend':
        return '#3b82f6';
      case 'anomaly':
        return '#f59e0b';
      case 'opportunity':
        return '#10b981';
      case 'warning':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  if (loading) {
    return (
      <div className="ai-insights-panel">
        <div className="panel-header">
          <h2>🤖 AI Insights</h2>
        </div>
        <div className="insights-loading">
          <div className="loading-spinner"></div>
          <p>Loading cached insights...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="ai-insights-panel">
        <div className="panel-header">
          <h2>🤖 AI Insights</h2>
        </div>
        <div className="insights-error">
          <span className="error-icon">⚠️</span>
          <p>{error}</p>
          <button onClick={loadCachedInsights} className="retry-btn">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="ai-insights-panel">
      <div className="panel-header">
        <div className="header-content">
          <h2>🤖 AI Insights</h2>
          <p className="header-subtitle">Powered by GPT-5 Nano</p>
        </div>
        <div className="header-controls">
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="days-select"
            disabled={generating}
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          <button
            onClick={generateNewInsights}
            className="btn-refresh btn-on-colored"
            title="Generate new insights"
            disabled={generating}
            aria-label="Generate new insights"
          >
            {generating ? '⏳' : '🔄'}
          </button>
        </div>
      </div>

      {/* Loading state during generation */}
      {generating && (
        <div className="insights-loading">
          <div className="loading-spinner"></div>
          <p>Generating new AI insights...</p>
        </div>
      )}

      {/* No cached data state */}
      {!generating && noCachedData && !insights && (
        <div className="insights-empty">
          <span className="empty-icon">💡</span>
          <p>No cached insights available</p>
          <p className="empty-hint">Click the refresh button to generate new AI insights</p>
        </div>
      )}

      {/* Insights content */}
      {!generating && insights && (
        <>
          {/* Summary */}
          {insights.summary && (
            <div className="insights-summary">
              <h3>Summary</h3>
              <p>{insights.summary}</p>
              <div className="summary-meta">
                <span>📊 {insights.sample_count} data points</span>
                <span>📅 {insights.data_period}</span>
              </div>
            </div>
          )}

          {/* Insights List */}
          {insights.insights && insights.insights.length > 0 && (
            <div className="insights-list">
              {insights.insights.map((insight, index) => (
                <div
                  key={index}
                  className="insight-card"
                  style={{ borderLeftColor: getInsightColor(insight.type) }}
                >
                  <div className="insight-header">
                    <span className="insight-icon">{getInsightIcon(insight.type)}</span>
                    <div className="insight-title-group">
                      <h4>{insight.title}</h4>
                      <span className="insight-type" style={{ color: getInsightColor(insight.type) }}>
                        {insight.type.charAt(0).toUpperCase() + insight.type.slice(1)}
                      </span>
                    </div>
                  </div>
                  <p className="insight-description">{insight.description}</p>
                  <div className="insight-footer">
                    <div className="confidence-bar">
                      <span className="confidence-label">Confidence:</span>
                      <div className="confidence-meter">
                        <div
                          className="confidence-fill"
                          style={{ width: `${insight.confidence}%` }}
                        ></div>
                      </div>
                      <span className="confidence-value">{insight.confidence}%</span>
                    </div>
                    {insight.actionable && (
                      <span className="actionable-badge">✓ Actionable</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {(!insights.insights || insights.insights.length === 0) && (
            <div className="insights-empty">
              <span className="empty-icon">📊</span>
              <p>No insights available for this period</p>
              <p className="empty-hint">Try selecting a longer time period or add more data</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default AIInsightsPanel;
