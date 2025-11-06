import express from 'express';
import * as pelletController from '../controllers/pelletController.js';

const router = express.Router();

/**
 * Pellet Stock and Consumption Tracking Routes
 * Base path: /api/pellets
 */

// ==========================================
// STOCK PURCHASE ROUTES
// ==========================================

/**
 * @route   POST /api/pellets/stock
 * @desc    Add new stock purchase
 * @access  Public (add authentication middleware as needed)
 * @body    { purchase_date, num_pallets, bags_per_pallet?, weight_per_bag?, notes?, supplier?, price_per_pallet?, total_cost? }
 */
router.post('/stock', pelletController.addStockPurchase);

/**
 * @route   GET /api/pellets/stock
 * @desc    Get all stock purchases
 * @access  Public
 */
router.get('/stock', pelletController.getAllStockPurchases);

/**
 * @route   GET /api/pellets/stock/:id
 * @desc    Get single stock purchase by ID
 * @access  Public
 */
router.get('/stock/:id', pelletController.getStockPurchaseById);

/**
 * @route   PUT /api/pellets/stock/:id
 * @desc    Update stock purchase
 * @access  Public
 * @body    { purchase_date?, num_pallets?, bags_per_pallet?, weight_per_bag?, notes?, supplier?, price_per_pallet?, total_cost? }
 */
router.put('/stock/:id', pelletController.updateStockPurchase);

/**
 * @route   DELETE /api/pellets/stock/:id
 * @desc    Delete stock purchase
 * @access  Public
 */
router.delete('/stock/:id', pelletController.deleteStockPurchase);

// ==========================================
// CONSUMPTION TRACKING ROUTES
// ==========================================

/**
 * @route   POST /api/pellets/consumption
 * @desc    Log weekly consumption (upsert based on week_year)
 * @access  Public
 * @body    { week_year, week_start_date, week_end_date, bags_used, manual_weight_kg?, notes?, temperature_avg?, heating_hours? }
 */
router.post('/consumption', pelletController.logConsumption);

/**
 * @route   GET /api/pellets/consumption
 * @desc    Get all consumption records (with optional limit)
 * @access  Public
 * @query   ?limit=50 (default: 50)
 */
router.get('/consumption', pelletController.getAllConsumption);

/**
 * @route   GET /api/pellets/consumption/recent
 * @desc    Get recent consumption (last 12 weeks)
 * @access  Public
 */
router.get('/consumption/recent', pelletController.getRecentConsumption);

/**
 * @route   GET /api/pellets/consumption/monthly/:year/:month
 * @desc    Get consumption for a specific month
 * @access  Public
 * @params  :year (e.g., 2025), :month (1-12)
 */
router.get('/consumption/monthly/:year/:month', pelletController.getMonthlyConsumption);

/**
 * @route   DELETE /api/pellets/consumption/:id
 * @desc    Delete consumption record
 * @access  Public
 */
router.delete('/consumption/:id', pelletController.deleteConsumption);

// ==========================================
// ANALYTICS & DASHBOARD ROUTES
// ==========================================

/**
 * @route   GET /api/pellets/current
 * @desc    Get current stock levels
 * @access  Public
 * @returns Current remaining bags, kg, tons, and stock percentage
 */
router.get('/current', pelletController.getCurrentStock);

/**
 * @route   GET /api/pellets/stats
 * @desc    Get consumption statistics and projections
 * @access  Public
 * @returns Consumption stats (avg, min, max) and stock projections
 */
router.get('/stats', pelletController.getStatistics);

/**
 * @route   GET /api/pellets/dashboard
 * @desc    Get complete dashboard data (all-in-one endpoint)
 * @access  Public
 * @returns Current stock, stats, projections, recent consumption, and recent purchases
 */
router.get('/dashboard', pelletController.getDashboardData);

/**
 * @route   GET /api/pellets/stock-at/:date
 * @desc    Get stock level at a specific date
 * @access  Public
 * @params  :date (YYYY-MM-DD format)
 */
router.get('/stock-at/:date', pelletController.getStockAtDate);

// ==========================================
// HEALTH CHECK
// ==========================================

/**
 * @route   GET /api/pellets/health
 * @desc    Health check endpoint
 * @access  Public
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Pellet tracking API is running',
    timestamp: new Date().toISOString()
  });
});

export default router;
