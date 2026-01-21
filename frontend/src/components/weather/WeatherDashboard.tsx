/**
 * Weather Dashboard Component
 * Main container for weather information and forecasts
 */

import React, { useState, useEffect } from 'react';
import {
  getCurrentWeather,
  getDailyForecast,
  calculateWeatherStats,
} from '../../services/weatherApi';
import type {
  CurrentWeather,
  DailyForecast,
  WeatherStats,
  WeatherView,
} from '../../types/weather';
import WeatherOverview from './WeatherOverview';
import WeatherForecast from './WeatherForecast';
import './weather.css';

const WeatherDashboard: React.FC = () => {
  // State management
  const [currentView, setCurrentView] = useState<WeatherView>('overview');
  const [currentWeather, setCurrentWeather] = useState<CurrentWeather | null>(null);
  const [dailyForecast, setDailyForecast] = useState<DailyForecast | null>(null);
  const [stats, setStats] = useState<WeatherStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  // Fetch weather data on mount
  useEffect(() => {
    fetchWeatherData();

    // Refresh every 30 minutes
    const interval = setInterval(fetchWeatherData, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  /**
   * Fetch all weather data
   */
  const fetchWeatherData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch current weather and forecast in parallel
      const [current, forecast] = await Promise.all([
        getCurrentWeather(),
        getDailyForecast(7),
      ]);

      setCurrentWeather(current);
      setDailyForecast(forecast);

      // Calculate statistics
      const weatherStats = calculateWeatherStats(current, forecast);
      setStats(weatherStats);

      setLastUpdated(new Date().toISOString());
    } catch (err) {
      console.error('Error fetching weather data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch weather data');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle manual refresh
   */
  const handleRefresh = () => {
    fetchWeatherData();
  };

  /**
   * Render loading state
   */
  if (loading && !currentWeather) {
    return (
      <div className="weather-dashboard">
        <div className="weather-loading">
          <div className="loading-spinner"></div>
          <p>Loading weather data...</p>
        </div>
      </div>
    );
  }

  /**
   * Render error state
   */
  if (error && !currentWeather) {
    return (
      <div className="weather-dashboard">
        <div className="weather-error">
          <div className="error-icon">⚠️</div>
          <h3>Unable to Load Weather Data</h3>
          <p>{error}</p>
          <button className="btn btn-primary" onClick={handleRefresh}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  /**
   * Render main dashboard
   */
  return (
    <div className="weather-dashboard">
      {/* Tab Navigation */}
      <div className="weather-tabs">
        <button
          className={`weather-tab ${currentView === 'overview' ? 'active' : ''}`}
          onClick={() => setCurrentView('overview')}
        >
          <span className="tab-icon">☀️</span>
          <span className="tab-label">Overview</span>
        </button>

        <button
          className={`weather-tab ${currentView === 'forecast' ? 'active' : ''}`}
          onClick={() => setCurrentView('forecast')}
        >
          <span className="tab-icon">📅</span>
          <span className="tab-label">7-Day Forecast</span>
        </button>

        <button
          className={`weather-tab ${currentView === 'historical' ? 'active' : ''}`}
          onClick={() => setCurrentView('historical')}
        >
          <span className="tab-icon">📊</span>
          <span className="tab-label">Historical</span>
        </button>
      </div>

      {/* Content Area */}
      <div className="weather-content">
        {currentView === 'overview' && currentWeather && stats && (
          <WeatherOverview
            current={currentWeather}
            stats={stats}
            dailyForecast={dailyForecast}
            onRefresh={handleRefresh}
            lastUpdated={lastUpdated}
          />
        )}

        {currentView === 'forecast' && dailyForecast && (
          <WeatherForecast
            forecast={dailyForecast}
            currentWeather={currentWeather}
          />
        )}

        {currentView === 'historical' && (
          <div className="weather-placeholder">
            <div className="placeholder-icon">📊</div>
            <h3>Historical Weather Data</h3>
            <p>Coming soon! View past weather patterns and trends.</p>
          </div>
        )}
      </div>

      {/* Loading overlay for refresh */}
      {loading && currentWeather && (
        <div className="weather-loading-overlay">
          <div className="loading-spinner small"></div>
        </div>
      )}
    </div>
  );
};

export default WeatherDashboard;
