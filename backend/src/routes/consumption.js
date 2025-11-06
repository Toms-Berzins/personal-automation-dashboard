/**
 * Consumption Routes
 *
 * Endpoints for consumption tracking and analysis
 */

import express from 'express';
import * as consumptionController from '../controllers/consumptionController.js';

const router = express.Router();

// Get monthly consumption statistics
router.get('/monthly', consumptionController.getMonthlyConsumption);

// Get consumption history with filtering
router.get('/history', consumptionController.getConsumptionHistory);

// Get consumption trends and analytics
router.get('/trends', consumptionController.getConsumptionTrends);

// Get consumption vs price comparison
router.get('/comparison', consumptionController.getConsumptionPriceComparison);

// Get quick consumption stats
router.get('/stats', consumptionController.getConsumptionStats);

// Get market insights and analysis
router.get('/insights', consumptionController.getMarketInsights);

// Get 6-month forecast
router.get('/forecast', consumptionController.getForecast);

// Add new consumption record
router.post('/', consumptionController.addConsumption);

export default router;
