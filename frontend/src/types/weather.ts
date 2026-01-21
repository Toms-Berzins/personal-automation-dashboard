/**
 * Weather Type Definitions
 * Types for Open-Meteo weather API integration
 */

// ============================================
// API Response Types
// ============================================

export interface WeatherLocation {
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  elevation?: number;
  timezone?: string;
}

export interface Temperature {
  actual: number;
  feels_like: number;
  unit: string;
}

export interface Humidity {
  value: number;
  unit: string;
}

export interface Precipitation {
  total: number;
  rain: number;
  snow: number;
  unit: string;
}

export interface Wind {
  speed: number;
  direction: number;
  speed_unit: string;
  direction_unit: string;
}

export interface Pressure {
  value: number;
  unit: string;
}

export interface CloudCover {
  value: number;
  unit: string;
}

export interface CurrentWeather {
  location: WeatherLocation;
  timestamp: string;
  temperature: Temperature;
  humidity: Humidity;
  precipitation: Precipitation;
  wind: Wind;
  pressure: Pressure;
  cloud_cover: CloudCover;
  weather_code: number;
  weather_description: string;
}

export interface HourlyForecastData {
  time: string[];
  temperature: number[];
  feels_like: number[];
  humidity: number[];
  precipitation_probability: number[];
  precipitation: number[];
  rain: number[];
  snowfall: number[];
  weather_code: number[];
  wind_speed: number[];
}

export interface HourlyForecast {
  location: WeatherLocation;
  timezone: string;
  hourly: HourlyForecastData;
  units: Record<string, string>;
}

export interface DailyForecastData {
  time: string[];
  weather_code: number[];
  temperature_max: number[];
  temperature_min: number[];
  feels_like_max: number[];
  feels_like_min: number[];
  sunrise: string[];
  sunset: string[];
  precipitation_sum: number[];
  rain_sum: number[];
  snowfall_sum: number[];
  precipitation_hours: number[];
  precipitation_probability_max: number[];
  wind_speed_max: number[];
}

export interface DailyForecast {
  location: WeatherLocation;
  timezone: string;
  daily: DailyForecastData;
  units: Record<string, string>;
}

export interface HistoricalWeather {
  location: WeatherLocation;
  timezone: string;
  daily: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    temperature_2m_mean: number[];
    precipitation_sum: number[];
    snowfall_sum: number[];
  };
  units: Record<string, string>;
}

export interface WeeklySummary {
  week_start: string;
  week_end: string;
  average_temperature: number | null;
  min_temperature: number | null;
  max_temperature: number | null;
  total_precipitation: number | null;
  total_snowfall: number | null;
  temperature_unit: string;
  precipitation_unit: string;
}

// ============================================
// UI Component Types
// ============================================

export interface WeatherCardData {
  title: string;
  value: string | number;
  unit: string;
  subtitle?: string;
  icon?: string;
  trend?: 'up' | 'down' | 'stable';
}

export interface DayForecast {
  date: string;
  dayName: string;
  tempMax: number;
  tempMin: number;
  weatherCode: number;
  weatherDescription: string;
  precipitationProbability: number;
  precipitationSum: number;
  windSpeed: number;
}

export interface HourForecast {
  time: string;
  hour: string;
  temperature: number;
  feelsLike: number;
  weatherCode: number;
  weatherDescription: string;
  precipitationProbability: number;
  precipitation: number;
  windSpeed: number;
}

// ============================================
// Chart Data Types
// ============================================

export interface TemperatureChartData {
  time: string;
  temperature: number;
  feels_like: number;
  date?: string;
}

export interface PrecipitationChartData {
  time: string;
  rain: number;
  snow: number;
  total: number;
  probability: number;
}

export interface WeeklyWeatherChartData {
  day: string;
  tempMax: number;
  tempMin: number;
  precipitation: number;
}

// ============================================
// API Response Wrappers
// ============================================

export interface WeatherApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// ============================================
// Weather Utility Types
// ============================================

export type WeatherCondition =
  | 'clear'
  | 'partly-cloudy'
  | 'cloudy'
  | 'foggy'
  | 'drizzle'
  | 'rain'
  | 'snow'
  | 'thunderstorm'
  | 'unknown';

export interface WeatherCodeMapping {
  code: number;
  description: string;
  condition: WeatherCondition;
  icon: string;
}

export interface WeatherStats {
  currentTemp: number;
  feelsLike: number;
  todayHigh: number;
  todayLow: number;
  humidity: number;
  windSpeed: number;
  precipitation: number;
  isHeatingWeather: boolean;
  heatingDegreeDays: number;
}

// ============================================
// Dashboard Data Types
// ============================================

export interface WeatherDashboardData {
  current: CurrentWeather;
  dailyForecast: DailyForecast;
  stats: WeatherStats;
  loading: boolean;
  error: string | null;
  lastUpdated: string | null;
}

export type WeatherView = 'overview' | 'forecast' | 'historical';
