/**
 * Weather API Service
 * Client for Open-Meteo weather API endpoints
 */

import axios, { AxiosError } from 'axios';
import type {
  CurrentWeather,
  HourlyForecast,
  DailyForecast,
  HistoricalWeather,
  WeeklySummary,
  WeatherApiResponse,
  WeatherStats,
  WeatherCondition,
  DayForecast,
  HourForecast,
} from '../types/weather';

// ============================================
// API Configuration
// ============================================

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
const WEATHER_ENDPOINT = `${API_BASE_URL}/weather`;

// Configure axios instance
const weatherClient = axios.create({
  baseURL: WEATHER_ENDPOINT,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor for error handling
weatherClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    console.error('Weather API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// ============================================
// Current Weather API
// ============================================

/**
 * Get current weather conditions
 */
export async function getCurrentWeather(): Promise<CurrentWeather> {
  try {
    const response = await weatherClient.get<WeatherApiResponse<CurrentWeather>>('/current');

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to fetch current weather');
    }

    return response.data.data;
  } catch (error) {
    console.error('Error fetching current weather:', error);
    throw error;
  }
}

// ============================================
// Forecast API
// ============================================

/**
 * Get hourly weather forecast
 * @param days - Number of forecast days (1-16, default: 7)
 */
export async function getHourlyForecast(days: number = 7): Promise<HourlyForecast> {
  try {
    const response = await weatherClient.get<WeatherApiResponse<HourlyForecast>>('/forecast/hourly', {
      params: { days: Math.min(Math.max(days, 1), 16) },
    });

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to fetch hourly forecast');
    }

    return response.data.data;
  } catch (error) {
    console.error('Error fetching hourly forecast:', error);
    throw error;
  }
}

/**
 * Get daily weather forecast
 * @param days - Number of forecast days (1-16, default: 7)
 */
export async function getDailyForecast(days: number = 7): Promise<DailyForecast> {
  try {
    const response = await weatherClient.get<WeatherApiResponse<DailyForecast>>('/forecast/daily', {
      params: { days: Math.min(Math.max(days, 1), 16) },
    });

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to fetch daily forecast');
    }

    return response.data.data;
  } catch (error) {
    console.error('Error fetching daily forecast:', error);
    throw error;
  }
}

// ============================================
// Historical Weather API
// ============================================

/**
 * Get historical weather data
 * @param startDate - Start date (YYYY-MM-DD)
 * @param endDate - End date (YYYY-MM-DD)
 */
export async function getHistoricalWeather(
  startDate: string,
  endDate: string
): Promise<HistoricalWeather> {
  try {
    const response = await weatherClient.get<WeatherApiResponse<HistoricalWeather>>('/historical', {
      params: { start_date: startDate, end_date: endDate },
    });

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to fetch historical weather');
    }

    return response.data.data;
  } catch (error) {
    console.error('Error fetching historical weather:', error);
    throw error;
  }
}

/**
 * Get weekly weather summary
 * @param weekStartDate - Start date of the week (YYYY-MM-DD)
 */
export async function getWeeklySummary(weekStartDate: string): Promise<WeeklySummary> {
  try {
    const response = await weatherClient.get<WeatherApiResponse<WeeklySummary>>(
      `/week/${weekStartDate}`
    );

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to fetch weekly summary');
    }

    return response.data.data;
  } catch (error) {
    console.error('Error fetching weekly summary:', error);
    throw error;
  }
}

// ============================================
// Utility Functions
// ============================================

/**
 * Get weather condition category from WMO code
 */
export function getWeatherCondition(code: number): WeatherCondition {
  if (code === 0 || code === 1) return 'clear';
  if (code === 2) return 'partly-cloudy';
  if (code === 3) return 'cloudy';
  if (code === 45 || code === 48) return 'foggy';
  if (code >= 51 && code <= 57) return 'drizzle';
  if (code >= 61 && code <= 67) return 'rain';
  if (code >= 71 && code <= 86) return 'snow';
  if (code >= 95 && code <= 99) return 'thunderstorm';
  return 'unknown';
}

/**
 * Get weather icon emoji from WMO code
 */
export function getWeatherIcon(code: number): string {
  const condition = getWeatherCondition(code);

  const iconMap: Record<WeatherCondition, string> = {
    'clear': '☀️',
    'partly-cloudy': '⛅',
    'cloudy': '☁️',
    'foggy': '🌫️',
    'drizzle': '🌦️',
    'rain': '🌧️',
    'snow': '❄️',
    'thunderstorm': '⛈️',
    'unknown': '❓',
  };

  return iconMap[condition];
}

/**
 * Get wind direction label from degrees
 */
export function getWindDirection(degrees: number): string {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(degrees / 45) % 8;
  return directions[index];
}

/**
 * Check if weather conditions are heating-favorable
 * @param temperature - Temperature in Celsius
 */
export function isHeatingWeather(temperature: number): boolean {
  return temperature < 15;
}

/**
 * Calculate heating degree days
 * Base temperature is 18°C (typical for Latvia)
 */
export function getHeatingDegreeDays(temperature: number): number {
  const baseTemp = 18;
  return Math.max(0, baseTemp - temperature);
}

/**
 * Calculate weather statistics from current weather
 */
export function calculateWeatherStats(
  current: CurrentWeather,
  dailyForecast?: DailyForecast
): WeatherStats {
  const currentTemp = current.temperature.actual;
  const feelsLike = current.temperature.feels_like;

  let todayHigh = currentTemp;
  let todayLow = currentTemp;

  if (dailyForecast && dailyForecast.daily.time.length > 0) {
    todayHigh = dailyForecast.daily.temperature_max[0];
    todayLow = dailyForecast.daily.temperature_min[0];
  }

  return {
    currentTemp,
    feelsLike,
    todayHigh,
    todayLow,
    humidity: current.humidity.value,
    windSpeed: current.wind.speed,
    precipitation: current.precipitation.total,
    isHeatingWeather: isHeatingWeather(currentTemp),
    heatingDegreeDays: getHeatingDegreeDays(currentTemp),
  };
}

/**
 * Transform daily forecast data for UI components
 */
export function transformDailyForecast(forecast: DailyForecast): DayForecast[] {
  const { daily } = forecast;

  return daily.time.map((date, index) => ({
    date,
    dayName: formatDayName(date),
    tempMax: daily.temperature_max[index],
    tempMin: daily.temperature_min[index],
    weatherCode: daily.weather_code[index],
    weatherDescription: getWeatherDescription(daily.weather_code[index]),
    precipitationProbability: daily.precipitation_probability_max[index],
    precipitationSum: daily.precipitation_sum[index],
    windSpeed: daily.wind_speed_max[index],
  }));
}

/**
 * Transform hourly forecast data for UI components
 * @param forecast - Hourly forecast data
 * @param maxHours - Maximum number of hours to return (default: 24)
 */
export function transformHourlyForecast(
  forecast: HourlyForecast,
  maxHours: number = 24
): HourForecast[] {
  const { hourly } = forecast;
  const limit = Math.min(maxHours, hourly.time.length);

  return hourly.time.slice(0, limit).map((time, index) => ({
    time,
    hour: formatHour(time),
    temperature: hourly.temperature[index],
    feelsLike: hourly.feels_like[index],
    weatherCode: hourly.weather_code[index],
    weatherDescription: getWeatherDescription(hourly.weather_code[index]),
    precipitationProbability: hourly.precipitation_probability[index],
    precipitation: hourly.precipitation[index],
    windSpeed: hourly.wind_speed[index],
  }));
}

/**
 * Get weather description from WMO code
 */
export function getWeatherDescription(code: number): string {
  const descriptions: Record<number, string> = {
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
 * Format date to day name (e.g., "Monday", "Today", "Tomorrow")
 */
export function formatDayName(dateString: string): string {
  const date = new Date(dateString);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (date.toDateString() === today.toDateString()) {
    return 'Today';
  } else if (date.toDateString() === tomorrow.toDateString()) {
    return 'Tomorrow';
  }

  return date.toLocaleDateString('en-US', { weekday: 'long' });
}

/**
 * Format ISO time to hour (e.g., "14:00" -> "2 PM")
 */
export function formatHour(timeString: string): string {
  const date = new Date(timeString);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    hour12: true,
  });
}

/**
 * Format temperature with unit
 */
export function formatTemperature(temp: number, unit: string = '°C'): string {
  return `${Math.round(temp)}${unit}`;
}

/**
 * Format wind speed with direction
 */
export function formatWind(speed: number, direction: number, unit: string = 'km/h'): string {
  const dir = getWindDirection(direction);
  return `${Math.round(speed)} ${unit} ${dir}`;
}

/**
 * Get temperature color based on value
 */
export function getTemperatureColor(temp: number): string {
  if (temp >= 30) return '#ff4444'; // Very hot
  if (temp >= 20) return '#ff8800'; // Hot
  if (temp >= 10) return '#ffcc00'; // Warm
  if (temp >= 0) return '#4488ff'; // Cool
  if (temp >= -10) return '#2266dd'; // Cold
  return '#0044aa'; // Very cold
}

/**
 * Get comfort level based on temperature and humidity
 */
export function getComfortLevel(temp: number, humidity: number): string {
  if (temp < -10) return 'Very Cold';
  if (temp < 0) return 'Cold';
  if (temp < 10) return 'Cool';
  if (temp < 20) return 'Comfortable';
  if (temp < 25) return 'Warm';
  if (humidity > 80 && temp > 25) return 'Humid';
  if (temp < 30) return 'Hot';
  return 'Very Hot';
}

// Export default API object
export default {
  getCurrentWeather,
  getHourlyForecast,
  getDailyForecast,
  getHistoricalWeather,
  getWeeklySummary,
};
