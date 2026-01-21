/**
 * Weather Service using Open-Meteo API
 *
 * Free, open-source weather API with no API key required
 * Documentation: https://open-meteo.com/en/docs
 *
 * Features:
 * - Current weather conditions
 * - 7-16 day forecasts
 * - Historical weather data
 * - High-resolution data from multiple national weather providers
 */

import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const OPEN_METEO_BASE_URL = 'https://api.open-meteo.com/v1';

// Get location from environment variables
const getLocation = () => ({
  latitude: parseFloat(process.env.LOCATION_LATITUDE) || 56.6509, // Jelgava, Latvia
  longitude: parseFloat(process.env.LOCATION_LONGITUDE) || 23.7134,
  city: process.env.LOCATION_CITY || 'Jelgava',
  country: process.env.LOCATION_COUNTRY || 'Latvia',
  timezone: process.env.LOCATION_TIMEZONE || 'Europe/Riga',
});

/**
 * Get current weather conditions
 * @returns {Promise<Object>} Current weather data
 */
export async function getCurrentWeather() {
  const location = getLocation();

  try {
    const response = await axios.get(`${OPEN_METEO_BASE_URL}/forecast`, {
      params: {
        latitude: location.latitude,
        longitude: location.longitude,
        current: [
          'temperature_2m',
          'relative_humidity_2m',
          'apparent_temperature',
          'precipitation',
          'rain',
          'snowfall',
          'weather_code',
          'cloud_cover',
          'pressure_msl',
          'wind_speed_10m',
          'wind_direction_10m',
        ].join(','),
        timezone: location.timezone,
        temperature_unit: 'celsius',
        wind_speed_unit: 'kmh',
        precipitation_unit: 'mm',
      },
    });

    const { current, current_units } = response.data;

    return {
      location: {
        city: location.city,
        country: location.country,
        latitude: response.data.latitude,
        longitude: response.data.longitude,
        elevation: response.data.elevation,
        timezone: response.data.timezone,
      },
      timestamp: current.time,
      temperature: {
        actual: current.temperature_2m,
        feels_like: current.apparent_temperature,
        unit: current_units.temperature_2m,
      },
      humidity: {
        value: current.relative_humidity_2m,
        unit: current_units.relative_humidity_2m,
      },
      precipitation: {
        total: current.precipitation,
        rain: current.rain,
        snow: current.snowfall,
        unit: current_units.precipitation,
      },
      wind: {
        speed: current.wind_speed_10m,
        direction: current.wind_direction_10m,
        speed_unit: current_units.wind_speed_10m,
        direction_unit: current_units.wind_direction_10m,
      },
      pressure: {
        value: current.pressure_msl,
        unit: current_units.pressure_msl,
      },
      cloud_cover: {
        value: current.cloud_cover,
        unit: current_units.cloud_cover,
      },
      weather_code: current.weather_code,
      weather_description: getWeatherDescription(current.weather_code),
    };
  } catch (error) {
    console.error('Error fetching current weather:', error.message);
    throw new Error(`Failed to fetch weather data: ${error.message}`);
  }
}

/**
 * Get hourly weather forecast
 * @param {number} days - Number of forecast days (1-16, default: 7)
 * @returns {Promise<Object>} Hourly forecast data
 */
export async function getHourlyForecast(days = 7) {
  const location = getLocation();

  try {
    const response = await axios.get(`${OPEN_METEO_BASE_URL}/forecast`, {
      params: {
        latitude: location.latitude,
        longitude: location.longitude,
        hourly: [
          'temperature_2m',
          'relative_humidity_2m',
          'apparent_temperature',
          'precipitation_probability',
          'precipitation',
          'rain',
          'snowfall',
          'weather_code',
          'wind_speed_10m',
        ].join(','),
        timezone: location.timezone,
        forecast_days: Math.min(days, 16),
        temperature_unit: 'celsius',
        wind_speed_unit: 'kmh',
        precipitation_unit: 'mm',
      },
    });

    return {
      location: {
        city: location.city,
        country: location.country,
        latitude: response.data.latitude,
        longitude: response.data.longitude,
      },
      timezone: response.data.timezone,
      hourly: {
        time: response.data.hourly.time,
        temperature: response.data.hourly.temperature_2m,
        feels_like: response.data.hourly.apparent_temperature,
        humidity: response.data.hourly.relative_humidity_2m,
        precipitation_probability: response.data.hourly.precipitation_probability,
        precipitation: response.data.hourly.precipitation,
        rain: response.data.hourly.rain,
        snowfall: response.data.hourly.snowfall,
        weather_code: response.data.hourly.weather_code,
        wind_speed: response.data.hourly.wind_speed_10m,
      },
      units: response.data.hourly_units,
    };
  } catch (error) {
    console.error('Error fetching hourly forecast:', error.message);
    throw new Error(`Failed to fetch forecast data: ${error.message}`);
  }
}

/**
 * Get daily weather forecast
 * @param {number} days - Number of forecast days (1-16, default: 7)
 * @returns {Promise<Object>} Daily forecast data
 */
export async function getDailyForecast(days = 7) {
  const location = getLocation();

  try {
    const response = await axios.get(`${OPEN_METEO_BASE_URL}/forecast`, {
      params: {
        latitude: location.latitude,
        longitude: location.longitude,
        daily: [
          'weather_code',
          'temperature_2m_max',
          'temperature_2m_min',
          'apparent_temperature_max',
          'apparent_temperature_min',
          'sunrise',
          'sunset',
          'precipitation_sum',
          'rain_sum',
          'snowfall_sum',
          'precipitation_hours',
          'precipitation_probability_max',
          'wind_speed_10m_max',
        ].join(','),
        timezone: location.timezone,
        forecast_days: Math.min(days, 16),
        temperature_unit: 'celsius',
        wind_speed_unit: 'kmh',
        precipitation_unit: 'mm',
      },
    });

    return {
      location: {
        city: location.city,
        country: location.country,
        latitude: response.data.latitude,
        longitude: response.data.longitude,
      },
      timezone: response.data.timezone,
      daily: {
        time: response.data.daily.time,
        weather_code: response.data.daily.weather_code,
        temperature_max: response.data.daily.temperature_2m_max,
        temperature_min: response.data.daily.temperature_2m_min,
        feels_like_max: response.data.daily.apparent_temperature_max,
        feels_like_min: response.data.daily.apparent_temperature_min,
        sunrise: response.data.daily.sunrise,
        sunset: response.data.daily.sunset,
        precipitation_sum: response.data.daily.precipitation_sum,
        rain_sum: response.data.daily.rain_sum,
        snowfall_sum: response.data.daily.snowfall_sum,
        precipitation_hours: response.data.daily.precipitation_hours,
        precipitation_probability_max: response.data.daily.precipitation_probability_max,
        wind_speed_max: response.data.daily.wind_speed_10m_max,
      },
      units: response.data.daily_units,
    };
  } catch (error) {
    console.error('Error fetching daily forecast:', error.message);
    throw new Error(`Failed to fetch forecast data: ${error.message}`);
  }
}

/**
 * Get historical weather data for pellet consumption analysis
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @returns {Promise<Object>} Historical weather data
 */
export async function getHistoricalWeather(startDate, endDate) {
  const location = getLocation();

  try {
    // Calculate days difference from today
    const today = new Date();
    const start = new Date(startDate);
    const daysDiff = Math.floor((today - start) / (1000 * 60 * 60 * 24));

    let response;

    // Use forecast API for recent data (last 92 days), archive API for older data
    if (daysDiff <= 92) {
      // Recent historical data - use forecast API with past_days
      const end = new Date(endDate);
      const endDaysDiff = Math.floor((today - end) / (1000 * 60 * 60 * 24));
      const pastDays = Math.max(daysDiff + 1, 7); // At least 7 days

      response = await axios.get(`${OPEN_METEO_BASE_URL}/forecast`, {
        params: {
          latitude: location.latitude,
          longitude: location.longitude,
          daily: [
            'weather_code',
            'temperature_2m_max',
            'temperature_2m_min',
            'temperature_2m_mean',
            'precipitation_sum',
            'snowfall_sum',
          ].join(','),
          timezone: location.timezone,
          past_days: Math.min(pastDays, 92),
          temperature_unit: 'celsius',
          precipitation_unit: 'mm',
        },
      });

      // Filter the data to match the requested date range
      const dailyData = response.data.daily;
      const filteredIndices = [];

      dailyData.time.forEach((time, index) => {
        if (time >= startDate && time <= endDate) {
          filteredIndices.push(index);
        }
      });

      // Create filtered daily data
      const filteredDaily = {};
      Object.keys(dailyData).forEach(key => {
        if (Array.isArray(dailyData[key])) {
          filteredDaily[key] = filteredIndices.map(i => dailyData[key][i]);
        } else {
          filteredDaily[key] = dailyData[key];
        }
      });

      response.data.daily = filteredDaily;
    } else {
      // Older historical data - use archive API
      response = await axios.get('https://archive-api.open-meteo.com/v1/archive', {
        params: {
          latitude: location.latitude,
          longitude: location.longitude,
          start_date: startDate,
          end_date: endDate,
          daily: [
            'weather_code',
            'temperature_2m_max',
            'temperature_2m_min',
            'temperature_2m_mean',
            'precipitation_sum',
            'snowfall_sum',
          ].join(','),
          timezone: location.timezone,
          temperature_unit: 'celsius',
          precipitation_unit: 'mm',
        },
      });
    }

    return {
      location: {
        city: location.city,
        country: location.country,
      },
      timezone: response.data.timezone,
      daily: response.data.daily,
      units: response.data.daily_units,
    };
  } catch (error) {
    console.error('Error fetching historical weather:', error.message);
    throw new Error(`Failed to fetch historical data: ${error.message}`);
  }
}

/**
 * Get weather data for a specific week (for pellet consumption correlation)
 * @param {string} weekStartDate - Start date of the week (YYYY-MM-DD)
 * @returns {Promise<Object>} Weekly weather summary
 */
export async function getWeeklyWeatherSummary(weekStartDate) {
  const startDate = new Date(weekStartDate);
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 6); // 7 days total

  const historical = await getHistoricalWeather(
    startDate.toISOString().split('T')[0],
    endDate.toISOString().split('T')[0]
  );

  const daily = historical.daily;

  // Calculate weekly averages
  const avgTemp = daily.temperature_2m_mean
    ? daily.temperature_2m_mean.reduce((a, b) => a + b, 0) / daily.temperature_2m_mean.length
    : null;

  const totalPrecipitation = daily.precipitation_sum
    ? daily.precipitation_sum.reduce((a, b) => a + b, 0)
    : null;

  const totalSnowfall = daily.snowfall_sum
    ? daily.snowfall_sum.reduce((a, b) => a + b, 0)
    : null;

  const minTemp = daily.temperature_2m_min ? Math.min(...daily.temperature_2m_min) : null;
  const maxTemp = daily.temperature_2m_max ? Math.max(...daily.temperature_2m_max) : null;

  return {
    week_start: weekStartDate,
    week_end: endDate.toISOString().split('T')[0],
    average_temperature: avgTemp ? parseFloat(avgTemp.toFixed(1)) : null,
    min_temperature: minTemp,
    max_temperature: maxTemp,
    total_precipitation: totalPrecipitation,
    total_snowfall: totalSnowfall,
    temperature_unit: historical.units.temperature_2m_mean || '°C',
    precipitation_unit: historical.units.precipitation_sum || 'mm',
  };
}

/**
 * Convert WMO weather code to human-readable description
 * @param {number} code - WMO weather code
 * @returns {string} Weather description
 */
function getWeatherDescription(code) {
  const descriptions = {
    0: 'Clear sky',
    1: 'Mainly clear',
    2: 'Partly cloudy',
    3: 'Overcast',
    45: 'Foggy',
    48: 'Depositing rime fog',
    51: 'Light drizzle',
    53: 'Moderate drizzle',
    55: 'Dense drizzle',
    56: 'Light freezing drizzle',
    57: 'Dense freezing drizzle',
    61: 'Slight rain',
    63: 'Moderate rain',
    65: 'Heavy rain',
    66: 'Light freezing rain',
    67: 'Heavy freezing rain',
    71: 'Slight snow',
    73: 'Moderate snow',
    75: 'Heavy snow',
    77: 'Snow grains',
    80: 'Slight rain showers',
    81: 'Moderate rain showers',
    82: 'Violent rain showers',
    85: 'Slight snow showers',
    86: 'Heavy snow showers',
    95: 'Thunderstorm',
    96: 'Thunderstorm with slight hail',
    99: 'Thunderstorm with heavy hail',
  };

  return descriptions[code] || 'Unknown';
}

/**
 * Check if weather conditions are heating-favorable (cold weather)
 * @param {Object} weather - Weather data
 * @returns {boolean} True if heating conditions
 */
export function isHeatingWeather(weather) {
  // Consider heating weather if temperature is below 15°C
  return weather.temperature?.actual < 15;
}

/**
 * Get heating degree days for a temperature
 * Base temperature is 18°C (typical for Latvia)
 * @param {number} temperature - Average daily temperature
 * @returns {number} Heating degree days
 */
export function getHeatingDegreeDays(temperature) {
  const baseTemp = 18; // Base temperature for heating in °C
  return Math.max(0, baseTemp - temperature);
}

export default {
  getCurrentWeather,
  getHourlyForecast,
  getDailyForecast,
  getHistoricalWeather,
  getWeeklyWeatherSummary,
  isHeatingWeather,
  getHeatingDegreeDays,
};
