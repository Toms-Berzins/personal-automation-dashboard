/**
 * HeaterDashboard Component
 * Main dashboard for Centrometal PelTec Lambda heater monitoring
 */

import React, { useState, useEffect } from 'react';
import { Fuel, Clock, Flame, Fan, RefreshCw, Settings, AlertTriangle, AlertCircle, AlertOctagon } from 'lucide-react';
import HeaterStatus from './HeaterStatus';
import HeaterEvents from './HeaterEvents';
import KPICard from './KPICard';
import EfficiencyGauge from './EfficiencyGauge';
import PredictiveInsights from './PredictiveInsights';
import { getDashboardData, getEvents } from '../../services/heaterApi';
import type { HeaterDashboardData, HeaterEvent } from '../../types/heater';
import './heater.css';
import './heater-modern.css';

interface HeaterDashboardProps {
  autoRefresh?: boolean;
  refreshInterval?: number; // in milliseconds
}

const REFRESH_INTERVALS = [
  { label: '10 seconds', value: 10000 },
  { label: '30 seconds', value: 30000 },
  { label: '1 minute', value: 60000 },
  { label: '5 minutes', value: 300000 },
  { label: 'Off', value: 0 },
];

const HeaterDashboard: React.FC<HeaterDashboardProps> = ({
  autoRefresh: initialAutoRefresh = true,
  refreshInterval: initialRefreshInterval = 30000,
}) => {
  const [dashboardData, setDashboardData] = useState<HeaterDashboardData | null>(null);
  const [events, setEvents] = useState<HeaterEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshInterval, setRefreshInterval] = useState(initialRefreshInterval);
  const [autoRefresh, setAutoRefresh] = useState(initialAutoRefresh);
  const [showRefreshSettings, setShowRefreshSettings] = useState(false);
  const [alerts, setAlerts] = useState<Array<{ id: string; type: 'warning' | 'error' | 'critical'; message: string }>>([]);

  // Check for alerts based on dashboard data
  const checkAlerts = (data: HeaterDashboardData) => {
    const newAlerts: Array<{ id: string; type: 'warning' | 'error' | 'critical'; message: string }> = [];

    // Check fuel level
    if (data.fuel_level_status === 'empty') {
      newAlerts.push({
        id: 'fuel-empty',
        type: 'critical',
        message: 'Critical: Fuel level is empty! Refill immediately to avoid shutdown.',
      });
    } else if (data.fuel_level_status === 'reserve') {
      newAlerts.push({
        id: 'fuel-reserve',
        type: 'warning',
        message: 'Warning: Fuel level is in reserve. Consider refilling soon.',
      });
    }

    // Check main temperature
    if (data.main_temperature !== undefined && data.main_temperature !== null) {
      if (data.main_temperature > 85) {
        newAlerts.push({
          id: 'temp-critical-high',
          type: 'critical',
          message: `Critical: Main temperature is very high (${data.main_temperature.toFixed(1)}°C). System may be overheating!`,
        });
      } else if (data.main_temperature > 75) {
        newAlerts.push({
          id: 'temp-warning-high',
          type: 'warning',
          message: `Warning: Main temperature is above optimal range (${data.main_temperature.toFixed(1)}°C).`,
        });
      } else if (data.main_temperature < 45 && data.state !== 'OFF') {
        newAlerts.push({
          id: 'temp-warning-low',
          type: 'warning',
          message: `Warning: Main temperature is below optimal range (${data.main_temperature.toFixed(1)}°C).`,
        });
      }
    }

    // Check for error state
    if (data.state === 'ERROR') {
      newAlerts.push({
        id: 'system-error',
        type: 'error',
        message: 'Error: Heater is in error state. Check system logs and manual.',
      });
    }

    setAlerts(newAlerts);
  };

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    try {
      setError(null);
      const data = await getDashboardData();
      setDashboardData(data);
      checkAlerts(data);
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
    if (!autoRefresh || refreshInterval === 0) return;

    const interval = setInterval(() => {
      fetchDashboardData();
      fetchEvents();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval]);

  // Handle refresh interval change
  const handleRefreshIntervalChange = (value: number) => {
    setRefreshInterval(value);
    setAutoRefresh(value !== 0);
    setShowRefreshSettings(false);
  };

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
          <div className="error-icon">
            <AlertTriangle size={64} strokeWidth={1.5} />
          </div>
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
          <div className="empty-icon">
            <Flame size={64} strokeWidth={1.5} />
          </div>
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
            <Flame className="dashboard-title-icon" size={36} strokeWidth={2} />
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

          {/* Refresh Interval Settings */}
          <div className="refresh-settings">
            <button
              onClick={() => setShowRefreshSettings(!showRefreshSettings)}
              className="btn btn-ghost btn-sm"
              title="Refresh settings"
            >
              <Settings size={16} strokeWidth={2} className="icon-animated" />
              {refreshInterval === 0 ? 'Auto-refresh Off' : `${refreshInterval / 1000}s`}
            </button>
            {showRefreshSettings && (
              <div className="refresh-dropdown">
                <div className="refresh-dropdown-header">Auto-refresh interval</div>
                {REFRESH_INTERVALS.map((interval) => (
                  <button
                    key={interval.value}
                    onClick={() => handleRefreshIntervalChange(interval.value)}
                    className={`refresh-option ${refreshInterval === interval.value ? 'active' : ''}`}
                  >
                    {interval.label}
                    {refreshInterval === interval.value && <span className="check-icon">✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={handleRefresh}
            className="btn btn-ghost btn-sm"
            disabled={isLoading}
            title="Refresh data"
          >
            {isLoading ? (
              <>
                <RefreshCw size={16} strokeWidth={2} className="icon-spin" />
                Refreshing...
              </>
            ) : (
              <>
                <RefreshCw size={16} strokeWidth={2} className="icon-animated" />
                Refresh
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

      {/* Alert Notifications */}
      {alerts.length > 0 && (
        <div className="alerts-container">
          {alerts.map((alert) => (
            <div key={alert.id} className={`alert alert-${alert.type}`}>
              {alert.type === 'critical' && <AlertOctagon size={20} strokeWidth={2} className="alert-icon" />}
              {alert.type === 'error' && <AlertCircle size={20} strokeWidth={2} className="alert-icon" />}
              {alert.type === 'warning' && <AlertTriangle size={20} strokeWidth={2} className="alert-icon" />}
              <span className="alert-message">{alert.message}</span>
              <button
                onClick={() => setAlerts(alerts.filter((a) => a.id !== alert.id))}
                className="alert-close"
                title="Dismiss alert"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="kpi-grid">
        <KPICard
          icon={Fuel}
          label="Total Fuel Consumed"
          value={dashboardData.fuel_consumed_kg ? dashboardData.fuel_consumed_kg.toLocaleString() : '—'}
          unit="kg"
          color="#8b5cf6"
        />
        <KPICard
          icon={Clock}
          label="Operating Hours"
          value={dashboardData.burner_work_minutes ? Math.floor(dashboardData.burner_work_minutes / 60).toLocaleString() : '—'}
          unit="hrs"
          color="#d946ef"
        />
        <KPICard
          icon={Flame}
          label="Burner Starts"
          value={dashboardData.burner_start_count ? dashboardData.burner_start_count.toLocaleString() : '—'}
          color="#ec4899"
        />
        <KPICard
          icon={Fan}
          label="Fan Runtime"
          value={dashboardData.fan_working_minutes ? Math.floor(dashboardData.fan_working_minutes / 60).toLocaleString() : '—'}
          unit="hrs"
          color="#a855f7"
        />
      </div>

      {/* Main Dashboard Grid */}
      <div className="dashboard-grid">
        {/* Current Status Section */}
        <div className="dashboard-section status-section">
          <HeaterStatus data={dashboardData} />
        </div>

        {/* Efficiency Gauge */}
        <div className="dashboard-section gauge-section">
          <EfficiencyGauge
            efficiency={
              dashboardData.fuel_consumed_kg && dashboardData.burner_work_minutes
                ? Math.round(Math.min(100, Math.max(0, (4 - (dashboardData.fuel_consumed_kg / (dashboardData.burner_work_minutes / 60))) / 2 * 100)))
                : 0
            }
          />
        </div>

        {/* Predictive Insights */}
        <div className="dashboard-section insights-section">
          <PredictiveInsights data={dashboardData} />
        </div>

        {/* Recent Events Section */}
        <div className="dashboard-section events-section">
          <HeaterEvents events={events} />
        </div>
      </div>

      {/* Auto-refresh indicator */}
      {autoRefresh && refreshInterval > 0 && (
        <div className="auto-refresh-indicator">
          <span className="indicator-dot"></span>
          Auto-refreshing every {refreshInterval >= 60000
            ? `${refreshInterval / 60000} minute${refreshInterval > 60000 ? 's' : ''}`
            : `${refreshInterval / 1000} second${refreshInterval > 1000 ? 's' : ''}`
          }
        </div>
      )}
    </div>
  );
};

export default HeaterDashboard;
