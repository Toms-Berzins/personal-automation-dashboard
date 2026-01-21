/**
 * Heater Routes
 * API endpoints for Centrometal PelTec Lambda heater data
 */

import express from 'express';
import * as heaterController from '../controllers/heaterController.js';

const router = express.Router();

// ============================================
// Heater Status Endpoints
// ============================================

/**
 * GET /api/heater/status/latest
 * Get latest heater status
 */
router.get('/status/latest', heaterController.getLatestStatus);

/**
 * POST /api/heater/status
 * Save new heater status snapshot
 */
router.post('/status', heaterController.saveStatus);

/**
 * GET /api/heater/status/history
 * Get heater status history
 * Query params: limit, offset
 */
router.get('/status/history', heaterController.getStatusHistory);

// ============================================
// Heater Statistics Endpoints
// ============================================

/**
 * GET /api/heater/statistics/latest
 * Get latest heater statistics
 */
router.get('/statistics/latest', heaterController.getLatestStatistics);

/**
 * POST /api/heater/statistics
 * Save heater statistics snapshot
 */
router.post('/statistics', heaterController.saveStatistics);

// ============================================
// Dashboard & Overview
// ============================================

/**
 * GET /api/heater/dashboard
 * Get complete dashboard data (status + statistics combined)
 */
router.get('/dashboard', heaterController.getDashboardData);

// ============================================
// Events Endpoints
// ============================================

/**
 * GET /api/heater/events
 * Get recent heater events
 * Query params: limit, type
 */
router.get('/events', heaterController.getEvents);

/**
 * POST /api/heater/events
 * Log a heater event
 */
router.post('/events', heaterController.logEvent);

// ============================================
// Analytics Endpoints
// ============================================

/**
 * GET /api/heater/analytics/fuel-consumption
 * Get fuel consumption for date range
 * Query params: start_date, end_date
 */
router.get('/analytics/fuel-consumption', heaterController.getFuelConsumption);

/**
 * GET /api/heater/analytics/efficiency
 * Get heater efficiency metrics for date range
 * Query params: start_date, end_date
 */
router.get('/analytics/efficiency', heaterController.getEfficiencyMetrics);

// ============================================
// Correlation Endpoints
// ============================================

/**
 * GET /api/heater/correlation/:weekStartDate
 * Get correlation between heater and pellet consumption
 */
router.get('/correlation/:weekStartDate', heaterController.getCorrelation);

export default router;
