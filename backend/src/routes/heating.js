import express from 'express';
import * as heatingController from '../controllers/heatingController.js';

const router = express.Router();

/**
 * Heating Equipment Monitoring Routes
 * Base path: /api/heating
 */

// ==========================================
// EQUIPMENT MANAGEMENT ROUTES
// ==========================================

/**
 * @route   POST /api/heating/equipment
 * @desc    Add new heating equipment
 * @access  Public (add authentication middleware as needed)
 * @body    { name, type, brand?, model?, location?, installation_date?, serial_number?, metadata? }
 */
router.post('/equipment', heatingController.addEquipment);

/**
 * @route   GET /api/heating/equipment
 * @desc    Get all heating equipment
 * @access  Public
 */
router.get('/equipment', heatingController.getAllEquipment);

/**
 * @route   GET /api/heating/equipment/:id
 * @desc    Get single equipment by ID
 * @access  Public
 */
router.get('/equipment/:id', heatingController.getEquipmentById);

/**
 * @route   PUT /api/heating/equipment/:id
 * @desc    Update equipment
 * @access  Public
 * @body    { name?, type?, brand?, model?, location?, installation_date?, serial_number?, is_connected?, metadata? }
 */
router.put('/equipment/:id', heatingController.updateEquipment);

/**
 * @route   DELETE /api/heating/equipment/:id
 * @desc    Delete equipment
 * @access  Public
 */
router.delete('/equipment/:id', heatingController.deleteEquipment);

// ==========================================
// STATUS TRACKING ROUTES
// ==========================================

/**
 * @route   POST /api/heating/status
 * @desc    Log equipment status data
 * @access  Public
 * @body    { equipment_id, burner_work_min?, burner_starts_count?, feeder_work_min?, flame_duration_min?, fan_work_min?, boiler_temp?, flue_gas_temp?, room_temp?, target_temp?, power_level?, fuel_consumption_kg?, is_running?, work_phase?, metrics? }
 */
router.post('/status', heatingController.logStatus);

/**
 * @route   GET /api/heating/status/:equipment_id
 * @desc    Get latest status for equipment
 * @access  Public
 */
router.get('/status/:equipment_id', heatingController.getLatestStatus);

/**
 * @route   GET /api/heating/status/:equipment_id/history
 * @desc    Get status history for equipment
 * @access  Public
 * @query   ?limit=100 (default), ?hours=24 (default)
 */
router.get('/status/:equipment_id/history', heatingController.getStatusHistory);

// ==========================================
// PARAMETERS TRACKING ROUTES
// ==========================================

/**
 * @route   POST /api/heating/parameters
 * @desc    Log equipment parameter
 * @access  Public
 * @body    { equipment_id, parameter_name, work_phase?, description?, value?, unit?, time_on_regulator?, start_time?, end_time?, data? }
 */
router.post('/parameters', heatingController.logParameter);

/**
 * @route   GET /api/heating/parameters/:equipment_id
 * @desc    Get parameters for equipment
 * @access  Public
 * @query   ?limit=50 (default)
 */
router.get('/parameters/:equipment_id', heatingController.getParameters);

// ==========================================
// ALERTS MANAGEMENT ROUTES
// ==========================================

/**
 * @route   POST /api/heating/alerts
 * @desc    Log equipment alert
 * @access  Public
 * @body    { equipment_id, type, severity, code?, message, description?, metadata? }
 */
router.post('/alerts', heatingController.logAlert);

/**
 * @route   GET /api/heating/alerts/:equipment_id
 * @desc    Get alerts for equipment
 * @access  Public
 * @query   ?type=error|warning|info, ?resolved=true|false|all (default: all), ?limit=100 (default)
 */
router.get('/alerts/:equipment_id', heatingController.getAlerts);

/**
 * @route   PATCH /api/heating/alerts/:id/acknowledge
 * @desc    Acknowledge an alert
 * @access  Public
 * @body    { acknowledged_by? }
 */
router.patch('/alerts/:id/acknowledge', heatingController.acknowledgeAlert);

/**
 * @route   PATCH /api/heating/alerts/:id/resolve
 * @desc    Resolve an alert
 * @access  Public
 * @body    { resolution_notes? }
 */
router.patch('/alerts/:id/resolve', heatingController.resolveAlert);

// ==========================================
// ANALYTICS & DASHBOARD ROUTES
// ==========================================

/**
 * @route   GET /api/heating/uptime/:equipment_id
 * @desc    Get uptime statistics for equipment
 * @access  Public
 * @query   ?days=7 (default)
 */
router.get('/uptime/:equipment_id', heatingController.getUptime);

/**
 * @route   GET /api/heating/issues/:equipment_id
 * @desc    Detect potential issues with equipment
 * @access  Public
 */
router.get('/issues/:equipment_id', heatingController.detectIssues);

/**
 * @route   GET /api/heating/dashboard/:equipment_id
 * @desc    Get complete dashboard data for specific equipment
 * @access  Public
 * @returns Equipment details, latest status, recent alerts, uptime, and detected issues
 */
router.get('/dashboard/:equipment_id', heatingController.getDashboardData);

/**
 * @route   GET /api/heating/dashboard
 * @desc    Get overview dashboard data for all equipment
 * @access  Public
 * @returns All equipment, latest statuses, and alert summary
 */
router.get('/dashboard', heatingController.getAllDashboardData);

// ==========================================
// HEALTH CHECK
// ==========================================

/**
 * @route   GET /api/heating/health
 * @desc    Health check endpoint
 * @access  Public
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Heating monitoring API is running',
    timestamp: new Date().toISOString()
  });
});

export default router;
