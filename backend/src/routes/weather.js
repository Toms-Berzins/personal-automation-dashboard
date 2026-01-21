/**
 * Weather API Routes
 * Routes for accessing weather data from Open-Meteo
 */

import express from 'express';
import * as weatherController from '../controllers/weatherController.js';

const router = express.Router();

// Current weather
router.get('/current', weatherController.getCurrentWeather);

// Hourly forecast
router.get('/forecast/hourly', weatherController.getHourlyForecast);

// Daily forecast
router.get('/forecast/daily', weatherController.getDailyForecast);

// Historical weather
router.get('/historical', weatherController.getHistoricalWeather);

// Weekly weather summary
router.get('/week/:date', weatherController.getWeeklyWeatherSummary);

export default router;
