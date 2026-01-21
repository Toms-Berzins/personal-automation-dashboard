/**
 * Weather Overview Component
 * Displays current weather conditions and key statistics
 */

import React from 'react';
import type { CurrentWeather, DailyForecast, WeatherStats } from '../../types/weather';
import {
  getWeatherIcon,
  formatTemperature,
  formatWind,
  getComfortLevel,
  getTemperatureColor,
} from '../../services/weatherApi';

interface WeatherOverviewProps {
  current: CurrentWeather;
  stats: WeatherStats;
  dailyForecast: DailyForecast | null;
  onRefresh: () => void;
  lastUpdated: string | null;
}

const WeatherOverview: React.FC<WeatherOverviewProps> = ({
  current,
  stats,
  dailyForecast,
  onRefresh,
  lastUpdated,
}) => {
  const tempColor = getTemperatureColor(stats.currentTemp);
  const comfortLevel = getComfortLevel(stats.currentTemp, stats.humidity);
  const weatherIcon = getWeatherIcon(current.weather_code);

  /**
   * Format last updated time
   */
  const formatLastUpdated = (timestamp: string | null): string => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="weather-overview">
      {/* Header */}
      <div className="weather-header">
        <div className="weather-header-left">
          <h2>Current Weather</h2>
          <p className="weather-location">
            📍 {current.location.city}, {current.location.country}
          </p>
        </div>
        <div className="weather-header-right">
          <span className="last-updated">
            Updated: {formatLastUpdated(lastUpdated)}
          </span>
          <button className="btn btn-ghost btn-sm" onClick={onRefresh} title="Refresh weather">
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Current Conditions Card */}
      <div className="weather-current-card">
        <div className="current-main">
          <div className="current-icon">{weatherIcon}</div>
          <div className="current-temp">
            <div className="temp-value" style={{ color: tempColor }}>
              {formatTemperature(stats.currentTemp)}
            </div>
            <div className="temp-description">{current.weather_description}</div>
          </div>
        </div>

        <div className="current-details">
          <div className="detail-item">
            <span className="detail-label">Feels like</span>
            <span className="detail-value">
              {formatTemperature(stats.feelsLike)}
            </span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Comfort</span>
            <span className="detail-value">{comfortLevel}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Today's High/Low</span>
            <span className="detail-value">
              {formatTemperature(stats.todayHigh)} / {formatTemperature(stats.todayLow)}
            </span>
          </div>
        </div>

        {/* Heating Status */}
        {stats.isHeatingWeather && (
          <div className="heating-alert">
            <span className="alert-icon">🔥</span>
            <span className="alert-text">
              Heating weather: {stats.heatingDegreeDays.toFixed(1)} degree days
            </span>
          </div>
        )}
      </div>

      {/* Weather Stats Grid */}
      <div className="weather-stats-grid">
        {/* Humidity Card */}
        <div className="stat-card">
          <div className="stat-icon">💧</div>
          <div className="stat-content">
            <div className="stat-label">Humidity</div>
            <div className="stat-value">{stats.humidity}%</div>
            <div className="stat-subtitle">
              {stats.humidity > 70 ? 'High' : stats.humidity > 40 ? 'Normal' : 'Low'}
            </div>
          </div>
        </div>

        {/* Wind Card */}
        <div className="stat-card">
          <div className="stat-icon">💨</div>
          <div className="stat-content">
            <div className="stat-label">Wind</div>
            <div className="stat-value">
              {formatWind(current.wind.speed, current.wind.direction, '')}
            </div>
            <div className="stat-subtitle">{current.wind.speed_unit}</div>
          </div>
        </div>

        {/* Precipitation Card */}
        <div className="stat-card">
          <div className="stat-icon">
            {current.precipitation.snow > 0 ? '❄️' : '🌧️'}
          </div>
          <div className="stat-content">
            <div className="stat-label">Precipitation</div>
            <div className="stat-value">
              {current.precipitation.total.toFixed(1)} {current.precipitation.unit}
            </div>
            <div className="stat-subtitle">
              {current.precipitation.rain > 0 && `Rain: ${current.precipitation.rain}mm`}
              {current.precipitation.snow > 0 && `Snow: ${current.precipitation.snow}mm`}
              {current.precipitation.total === 0 && 'None'}
            </div>
          </div>
        </div>

        {/* Pressure Card */}
        <div className="stat-card">
          <div className="stat-icon">🌡️</div>
          <div className="stat-content">
            <div className="stat-label">Pressure</div>
            <div className="stat-value">
              {current.pressure.value} {current.pressure.unit}
            </div>
            <div className="stat-subtitle">
              {current.pressure.value > 1013 ? 'High' : current.pressure.value > 1000 ? 'Normal' : 'Low'}
            </div>
          </div>
        </div>

        {/* Cloud Cover Card */}
        <div className="stat-card">
          <div className="stat-icon">☁️</div>
          <div className="stat-content">
            <div className="stat-label">Cloud Cover</div>
            <div className="stat-value">{current.cloud_cover.value}%</div>
            <div className="stat-subtitle">
              {current.cloud_cover.value > 75 ? 'Overcast' : current.cloud_cover.value > 25 ? 'Partly Cloudy' : 'Clear'}
            </div>
          </div>
        </div>

        {/* Heating Degree Days Card */}
        <div className="stat-card">
          <div className="stat-icon">🏠</div>
          <div className="stat-content">
            <div className="stat-label">Heating Degree Days</div>
            <div className="stat-value">{stats.heatingDegreeDays.toFixed(1)}</div>
            <div className="stat-subtitle">
              {stats.heatingDegreeDays > 10 ? 'High heating' : stats.heatingDegreeDays > 5 ? 'Moderate' : 'Low'}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Forecast */}
      {dailyForecast && dailyForecast.daily.time.length > 1 && (
        <div className="quick-forecast">
          <h3>Next 3 Days</h3>
          <div className="forecast-days">
            {dailyForecast.daily.time.slice(1, 4).map((date, index) => {
              const actualIndex = index + 1;
              const weatherCode = dailyForecast.daily.weather_code[actualIndex];
              const tempMax = dailyForecast.daily.temperature_max[actualIndex];
              const tempMin = dailyForecast.daily.temperature_min[actualIndex];
              const icon = getWeatherIcon(weatherCode);

              const dayName = new Date(date).toLocaleDateString('en-US', { weekday: 'short' });

              return (
                <div key={date} className="forecast-day-card">
                  <div className="forecast-day-name">{dayName}</div>
                  <div className="forecast-day-icon">{icon}</div>
                  <div className="forecast-day-temp">
                    <span className="temp-max">{Math.round(tempMax)}°</span>
                    <span className="temp-divider">/</span>
                    <span className="temp-min">{Math.round(tempMin)}°</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default WeatherOverview;
