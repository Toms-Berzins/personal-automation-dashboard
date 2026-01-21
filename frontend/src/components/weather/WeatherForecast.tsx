/**
 * Weather Forecast Component
 * Displays 7-day forecast with charts and detailed information
 */

import React, { useMemo } from 'react';
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
} from 'recharts';
import type { CurrentWeather, DailyForecast } from '../../types/weather';
import {
  getWeatherIcon,
  formatTemperature,
  transformDailyForecast,
  formatDayName,
} from '../../services/weatherApi';

interface WeatherForecastProps {
  forecast: DailyForecast;
  currentWeather: CurrentWeather | null;
}

const WeatherForecast: React.FC<WeatherForecastProps> = ({ forecast, currentWeather }) => {
  // Transform data for components
  const forecastDays = useMemo(() => transformDailyForecast(forecast), [forecast]);

  // Prepare chart data
  const temperatureChartData = useMemo(() => {
    return forecast.daily.time.map((date, index) => ({
      date: formatDayName(date),
      high: forecast.daily.temperature_max[index],
      low: forecast.daily.temperature_min[index],
    }));
  }, [forecast]);

  const precipitationChartData = useMemo(() => {
    return forecast.daily.time.map((date, index) => ({
      date: formatDayName(date),
      precipitation: forecast.daily.precipitation_sum[index],
      probability: forecast.daily.precipitation_probability_max[index],
    }));
  }, [forecast]);

  return (
    <div className="weather-forecast">
      {/* Header */}
      <div className="forecast-header">
        <h2>7-Day Forecast</h2>
        <p className="forecast-subtitle">
          Extended weather forecast for {forecast.location.city}, {forecast.location.country}
        </p>
      </div>

      {/* Temperature Chart */}
      <div className="forecast-chart-card">
        <h3>Temperature Trend</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={temperatureChartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis
              dataKey="date"
              stroke="rgba(255,255,255,0.6)"
              style={{ fontSize: '12px' }}
            />
            <YAxis
              stroke="rgba(255,255,255,0.6)"
              style={{ fontSize: '12px' }}
              label={{ value: '°C', angle: -90, position: 'insideLeft', fill: 'rgba(255,255,255,0.6)' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(20, 30, 50, 0.95)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
              }}
              labelStyle={{ color: '#fff' }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="high"
              stroke="#ff8800"
              strokeWidth={2}
              dot={{ fill: '#ff8800', r: 4 }}
              name="High"
            />
            <Line
              type="monotone"
              dataKey="low"
              stroke="#4488ff"
              strokeWidth={2}
              dot={{ fill: '#4488ff', r: 4 }}
              name="Low"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Precipitation Chart */}
      <div className="forecast-chart-card">
        <h3>Precipitation Forecast</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={precipitationChartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis
              dataKey="date"
              stroke="rgba(255,255,255,0.6)"
              style={{ fontSize: '12px' }}
            />
            <YAxis
              yAxisId="left"
              stroke="rgba(255,255,255,0.6)"
              style={{ fontSize: '12px' }}
              label={{ value: 'mm', angle: -90, position: 'insideLeft', fill: 'rgba(255,255,255,0.6)' }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              stroke="rgba(255,255,255,0.6)"
              style={{ fontSize: '12px' }}
              label={{ value: '%', angle: 90, position: 'insideRight', fill: 'rgba(255,255,255,0.6)' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(20, 30, 50, 0.95)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
              }}
              labelStyle={{ color: '#fff' }}
            />
            <Legend />
            <Bar
              yAxisId="left"
              dataKey="precipitation"
              fill="#4488ff"
              name="Precipitation (mm)"
            />
            <Bar
              yAxisId="right"
              dataKey="probability"
              fill="#88ccff"
              name="Probability (%)"
              opacity={0.5}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Detailed Forecast Table */}
      <div className="forecast-table-card">
        <h3>Detailed Forecast</h3>
        <div className="forecast-table-container">
          <table className="forecast-table">
            <thead>
              <tr>
                <th>Day</th>
                <th>Conditions</th>
                <th>High / Low</th>
                <th>Precipitation</th>
                <th>Wind</th>
              </tr>
            </thead>
            <tbody>
              {forecastDays.map((day) => {
                const icon = getWeatherIcon(day.weatherCode);
                const precipProb = day.precipitationProbability;
                const precipAmount = day.precipitationSum;

                return (
                  <tr key={day.date}>
                    <td>
                      <div className="forecast-day">
                        <strong>{day.dayName}</strong>
                        <span className="forecast-date">
                          {new Date(day.date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="forecast-conditions">
                        <span className="forecast-icon">{icon}</span>
                        <span className="forecast-description">{day.weatherDescription}</span>
                      </div>
                    </td>
                    <td>
                      <div className="forecast-temp">
                        <span className="temp-high">{formatTemperature(day.tempMax)}</span>
                        <span className="temp-separator">/</span>
                        <span className="temp-low">{formatTemperature(day.tempMin)}</span>
                      </div>
                    </td>
                    <td>
                      <div className="forecast-precip">
                        {precipAmount > 0 ? (
                          <>
                            <span className="precip-amount">{precipAmount.toFixed(1)} mm</span>
                            {precipProb > 0 && (
                              <span className="precip-prob">({precipProb}%)</span>
                            )}
                          </>
                        ) : (
                          <span className="precip-none">-</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className="forecast-wind">
                        {Math.round(day.windSpeed)} km/h
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sunrise/Sunset Info */}
      <div className="forecast-sun-info">
        <h3>Daylight Hours</h3>
        <div className="sun-info-grid">
          {forecast.daily.time.map((date, index) => {
            const sunrise = new Date(forecast.daily.sunrise[index]);
            const sunset = new Date(forecast.daily.sunset[index]);
            const dayName = formatDayName(date);

            return (
              <div key={date} className="sun-info-card">
                <div className="sun-day">{dayName}</div>
                <div className="sun-times">
                  <div className="sun-time">
                    <span className="sun-icon">🌅</span>
                    <span className="sun-label">Sunrise</span>
                    <span className="sun-value">
                      {sunrise.toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <div className="sun-time">
                    <span className="sun-icon">🌇</span>
                    <span className="sun-label">Sunset</span>
                    <span className="sun-value">
                      {sunset.toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default WeatherForecast;
