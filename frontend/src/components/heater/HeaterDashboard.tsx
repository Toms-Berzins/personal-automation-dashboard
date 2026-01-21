/**
 * HeaterDashboard Component
 * Main dashboard for Centrometal PelTec Lambda heater monitoring
 */

import React, { useState, useEffect } from 'react';
import HeaterStatus from './HeaterStatus';
import HeaterStatistics from './HeaterStatistics';
import HeaterEvents from './HeaterEvents';
import { getDashboardData, getEvents } from '../../services/heaterApi';
import type { HeaterDashboardData, HeaterEvent } from '../../types/heater';
import './heater.css';

interface HeaterDashboardProps {
  autoRefresh?: boolean;
  refreshInterval?: number; // in milliseconds
}

const HeaterDashboard: React.FC<HeaterDashboardProps> = ({
  autoRefresh = true,
  refreshInterval = 30000, // 30 seconds
}) => {
  const [dashboardData, setDashboardData] = useState<HeaterDashboardData | null>(null);
  const [events, setEvents] = useState<HeaterEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    try {
      setError(null);
      const data = await getDashboardData();
      setDashboardData(data);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load heater data');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch recent events
  const fetchEvents = async () => {
    try {
      const eventsData = await getEvents(10);
      setEvents(eventsData);
    } catch (err) {
      console.error('Error fetching events:', err);
    }
  };

  // Initial load
  useEffect(() => {
    fetchDashboardData();
    fetchEvents();
  }, []);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchDashboardData();
      fetchEvents();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval]);

  // Manual refresh handler
  const handleRefresh = () => {
    setIsLoading(true);
    fetchDashboardData();
    fetchEvents();
  };

  if (isLoading && !dashboardData) {
    return (
      <div className="heater-dashboard">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading heater data...</p>
        </div>
      </div>
    );
  }

  if (error && !dashboardData) {
    return (
      <div className="heater-dashboard">
        <div className="error-state">
          <div className="error-icon">⚠️</div>
          <h3>Failed to Load Heater Data</h3>
          <p>{error}</p>
          <button onClick={handleRefresh} className="btn btn-primary">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="heater-dashboard">
        <div className="empty-state">
          <div className="empty-icon">🔥</div>
          <h3>No Heater Data Available</h3>
          <p>No heater data has been recorded yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="heater-dashboard">
      {/* Dashboard Header */}
      <div className="dashboard-header">
        <div className="header-content">
          <h1 className="dashboard-title">
            <span className="icon">🔥</span>
            Heater Dashboard
          </h1>
          <p className="dashboard-subtitle">Centrometal PelTec Lambda</p>
        </div>

        <div className="header-actions">
          {lastUpdated && (
            <span className="last-updated">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={handleRefresh}
            className="btn btn-ghost btn-sm"
            disabled={isLoading}
            title="Refresh data"
          >
            {isLoading ? (
              <>
                <span className="spinner-small"></span>
                Refreshing...
              </>
            ) : (
              <>
                🔄 Refresh
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-error">
          <span className="alert-indicator"></span>
          <span>{error}</span>
          <button onClick={() => setError(null)} className="alert-close">
            ×
          </button>
        </div>
      )}

      {/* Main Dashboard Grid */}
      <div className="dashboard-grid">
        {/* Current Status Section */}
        <div className="dashboard-section status-section">
          <HeaterStatus data={dashboardData} />
        </div>

        {/* Statistics Section */}
        <div className="dashboard-section statistics-section">
          <HeaterStatistics data={dashboardData} />
        </div>

        {/* Recent Events Section */}
        <div className="dashboard-section events-section">
          <HeaterEvents events={events} />
        </div>
      </div>

      {/* Auto-refresh indicator */}
      {autoRefresh && (
        <div className="auto-refresh-indicator">
          <span className="indicator-dot"></span>
          Auto-refreshing every {refreshInterval / 1000}s
        </div>
      )}
    </div>
  );
};

export default HeaterDashboard;
