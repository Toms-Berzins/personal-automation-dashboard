/**
 * Heater Controller
 * Handles HTTP requests for heater data
 */

import * as heaterService from '../services/heaterService.js';

/**
 * GET /api/heater/status/latest
 * Get latest heater status
 */
export async function getLatestStatus(req, res) {
  try {
    const status = await heaterService.getLatestStatus();

    if (!status) {
      return res.status(404).json({
        success: false,
        error: 'No heater status data available',
      });
    }

    res.json({
      success: true,
      data: status,
    });
  } catch (error) {
    console.error('Error in getLatestStatus:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch heater status',
    });
  }
}

/**
 * POST /api/heater/status
 * Save new heater status snapshot
 */
export async function saveStatus(req, res) {
  try {
    const status = await heaterService.saveHeaterStatus(req.body);

    res.json({
      success: true,
      data: status,
      message: 'Heater status saved successfully',
    });
  } catch (error) {
    console.error('Error in saveStatus:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to save heater status',
    });
  }
}

/**
 * GET /api/heater/status/history
 * Get heater status history
 * Query params: limit, offset
 */
export async function getStatusHistory(req, res) {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;

    const history = await heaterService.getStatusHistory(limit, offset);

    res.json({
      success: true,
      data: history,
      count: history.length,
    });
  } catch (error) {
    console.error('Error in getStatusHistory:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch status history',
    });
  }
}

/**
 * GET /api/heater/statistics/latest
 * Get latest heater statistics
 */
export async function getLatestStatistics(req, res) {
  try {
    const stats = await heaterService.getLatestStatistics();

    if (!stats) {
      return res.status(404).json({
        success: false,
        error: 'No heater statistics available',
      });
    }

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Error in getLatestStatistics:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch heater statistics',
    });
  }
}

/**
 * POST /api/heater/statistics
 * Save heater statistics snapshot
 */
export async function saveStatistics(req, res) {
  try {
    const stats = await heaterService.saveHeaterStatistics(req.body);

    res.json({
      success: true,
      data: stats,
      message: 'Heater statistics saved successfully',
    });
  } catch (error) {
    console.error('Error in saveStatistics:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to save heater statistics',
    });
  }
}

/**
 * GET /api/heater/dashboard
 * Get complete dashboard data
 */
export async function getDashboardData(req, res) {
  try {
    const data = await heaterService.getDashboardData();

    if (!data) {
      return res.status(404).json({
        success: false,
        error: 'No heater dashboard data available',
      });
    }

    // Transform string values to numbers for frontend compatibility
    const transformedData = {
      ...data,
      main_temperature: data.main_temperature ? parseFloat(data.main_temperature) : null,
      supply_temperature: data.supply_temperature ? parseFloat(data.supply_temperature) : null,
      return_temperature: data.return_temperature ? parseFloat(data.return_temperature) : null,
      buffer_tank_temperature: data.buffer_tank_temperature ? parseFloat(data.buffer_tank_temperature) : null,
      radiator_temperature: data.radiator_temperature ? parseFloat(data.radiator_temperature) : null,
      external_temperature: data.external_temperature ? parseFloat(data.external_temperature) : null,
      oxygen_level: data.oxygen_level ? parseFloat(data.oxygen_level) : null,
      burner_work_minutes: data.burner_work_minutes ? parseFloat(data.burner_work_minutes) : null,
      burner_start_count: data.burner_start_count ? parseInt(data.burner_start_count) : null,
      fuel_consumed_kg: data.fuel_consumed_kg ? parseFloat(data.fuel_consumed_kg) : null,
      fan_working_minutes: data.fan_working_minutes ? parseFloat(data.fan_working_minutes) : null,
    };

    res.json({
      success: true,
      data: transformedData,
    });
  } catch (error) {
    console.error('Error in getDashboardData:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch dashboard data',
    });
  }
}

/**
 * GET /api/heater/events
 * Get recent events
 * Query params: limit, type
 */
export async function getEvents(req, res) {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const eventType = req.query.type;

    const events = eventType
      ? await heaterService.getEventsByType(eventType, limit)
      : await heaterService.getRecentEvents(limit);

    res.json({
      success: true,
      data: events,
      count: events.length,
    });
  } catch (error) {
    console.error('Error in getEvents:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch heater events',
    });
  }
}

/**
 * POST /api/heater/events
 * Log a heater event
 */
export async function logEvent(req, res) {
  try {
    const { eventType, message, severity, eventData } = req.body;

    if (!eventType || !message) {
      return res.status(400).json({
        success: false,
        error: 'eventType and message are required',
      });
    }

    const event = await heaterService.logHeaterEvent(eventType, message, severity, eventData);

    res.json({
      success: true,
      data: event,
      message: 'Event logged successfully',
    });
  } catch (error) {
    console.error('Error in logEvent:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to log event',
    });
  }
}

/**
 * GET /api/heater/analytics/fuel-consumption
 * Get fuel consumption for date range
 * Query params: start_date, end_date
 */
export async function getFuelConsumption(req, res) {
  try {
    const { start_date, end_date } = req.query;

    if (!start_date || !end_date) {
      return res.status(400).json({
        success: false,
        error: 'start_date and end_date are required',
      });
    }

    const data = await heaterService.getFuelConsumptionByDateRange(start_date, end_date);

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Error in getFuelConsumption:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch fuel consumption',
    });
  }
}

/**
 * GET /api/heater/analytics/efficiency
 * Get heater efficiency metrics for date range
 * Query params: start_date, end_date
 */
export async function getEfficiencyMetrics(req, res) {
  try {
    const { start_date, end_date } = req.query;

    if (!start_date || !end_date) {
      return res.status(400).json({
        success: false,
        error: 'start_date and end_date are required',
      });
    }

    const metrics = await heaterService.getEfficiencyMetrics(start_date, end_date);

    if (!metrics) {
      return res.status(404).json({
        success: false,
        error: 'No data available for the specified date range',
      });
    }

    res.json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    console.error('Error in getEfficiencyMetrics:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch efficiency metrics',
    });
  }
}

/**
 * GET /api/heater/correlation/:weekStartDate
 * Get correlation between heater and pellet consumption
 */
export async function getCorrelation(req, res) {
  try {
    const { weekStartDate } = req.params;

    const data = await heaterService.correlateWithPelletConsumption(weekStartDate);

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Error in getCorrelation:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch correlation data',
    });
  }
}

export default {
  getLatestStatus,
  saveStatus,
  getStatusHistory,
  getLatestStatistics,
  saveStatistics,
  getDashboardData,
  getEvents,
  logEvent,
  getFuelConsumption,
  getEfficiencyMetrics,
  getCorrelation,
};
