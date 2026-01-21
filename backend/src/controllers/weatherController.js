/**
 * Weather Controller
 * Handles weather data requests using Open-Meteo API
 */

import * as weatherService from '../services/weatherService.js';

/**
 * GET /api/weather/current
 * Get current weather conditions for Jelgava, Latvia
 */
export async function getCurrentWeather(req, res) {
  try {
    const weather = await weatherService.getCurrentWeather();
    res.json({
      success: true,
      data: weather,
    });
  } catch (error) {
    console.error('Error in getCurrentWeather controller:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch current weather',
    });
  }
}

/**
 * GET /api/weather/forecast/hourly
 * Get hourly weather forecast
 * Query params: days (1-16, default 7)
 */
export async function getHourlyForecast(req, res) {
  try {
    const days = parseInt(req.query.days) || 7;

    if (days < 1 || days > 16) {
      return res.status(400).json({
        success: false,
        error: 'Days must be between 1 and 16',
      });
    }

    const forecast = await weatherService.getHourlyForecast(days);
    res.json({
      success: true,
      data: forecast,
    });
  } catch (error) {
    console.error('Error in getHourlyForecast controller:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch hourly forecast',
    });
  }
}

/**
 * GET /api/weather/forecast/daily
 * Get daily weather forecast
 * Query params: days (1-16, default 7)
 */
export async function getDailyForecast(req, res) {
  try {
    const days = parseInt(req.query.days) || 7;

    if (days < 1 || days > 16) {
      return res.status(400).json({
        success: false,
        error: 'Days must be between 1 and 16',
      });
    }

    const forecast = await weatherService.getDailyForecast(days);
    res.json({
      success: true,
      data: forecast,
    });
  } catch (error) {
    console.error('Error in getDailyForecast controller:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch daily forecast',
    });
  }
}

/**
 * GET /api/weather/historical
 * Get historical weather data
 * Query params: start_date, end_date (YYYY-MM-DD)
 */
export async function getHistoricalWeather(req, res) {
  try {
    const { start_date, end_date } = req.query;

    if (!start_date || !end_date) {
      return res.status(400).json({
        success: false,
        error: 'start_date and end_date are required (format: YYYY-MM-DD)',
      });
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(start_date) || !dateRegex.test(end_date)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid date format. Use YYYY-MM-DD',
      });
    }

    const historical = await weatherService.getHistoricalWeather(start_date, end_date);
    res.json({
      success: true,
      data: historical,
    });
  } catch (error) {
    console.error('Error in getHistoricalWeather controller:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch historical weather',
    });
  }
}

/**
 * GET /api/weather/week/:date
 * Get weather summary for a specific week
 * Params: date (YYYY-MM-DD) - week start date
 */
export async function getWeeklyWeatherSummary(req, res) {
  try {
    const { date } = req.params;

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid date format. Use YYYY-MM-DD',
      });
    }

    const summary = await weatherService.getWeeklyWeatherSummary(date);
    res.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    console.error('Error in getWeeklyWeatherSummary controller:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch weekly weather summary',
    });
  }
}

export default {
  getCurrentWeather,
  getHourlyForecast,
  getDailyForecast,
  getHistoricalWeather,
  getWeeklyWeatherSummary,
};
