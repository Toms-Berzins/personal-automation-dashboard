import pool from '../database/db.js';

/**
 * Heating Equipment Monitoring Controller
 * Handles all API endpoints for managing heating equipment data
 */

// ==========================================
// EQUIPMENT MANAGEMENT ENDPOINTS
// ==========================================

/**
 * Add new heating equipment
 * POST /api/heating/equipment
 */
export const addEquipment = async (req, res) => {
  try {
    const {
      name,
      type,
      brand,
      model,
      location,
      installation_date,
      serial_number,
      metadata
    } = req.body;

    // Validation
    if (!name || !type) {
      return res.status(400).json({
        success: false,
        error: 'Name and type are required'
      });
    }

    const query = `
      INSERT INTO heating_equipment (
        name, type, brand, model, location, installation_date, serial_number, metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const values = [
      name,
      type,
      brand || null,
      model || null,
      location || null,
      installation_date || null,
      serial_number || null,
      metadata ? JSON.stringify(metadata) : null
    ];

    const result = await pool.query(query, values);

    res.status(201).json({
      success: true,
      message: 'Equipment added successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error adding equipment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add equipment',
      details: error.message
    });
  }
};

/**
 * Get all heating equipment
 * GET /api/heating/equipment
 */
export const getAllEquipment = async (req, res) => {
  try {
    const query = `
      SELECT * FROM heating_equipment
      ORDER BY created_at DESC
    `;

    const result = await pool.query(query);

    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching equipment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch equipment',
      details: error.message
    });
  }
};

/**
 * Get single equipment by ID
 * GET /api/heating/equipment/:id
 */
export const getEquipmentById = async (req, res) => {
  try {
    const { id } = req.params;

    const query = 'SELECT * FROM heating_equipment WHERE id = $1';
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Equipment not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching equipment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch equipment',
      details: error.message
    });
  }
};

/**
 * Update equipment
 * PUT /api/heating/equipment/:id
 */
export const updateEquipment = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      type,
      brand,
      model,
      location,
      installation_date,
      serial_number,
      is_connected,
      metadata
    } = req.body;

    const query = `
      UPDATE heating_equipment
      SET name = COALESCE($1, name),
          type = COALESCE($2, type),
          brand = COALESCE($3, brand),
          model = COALESCE($4, model),
          location = COALESCE($5, location),
          installation_date = COALESCE($6, installation_date),
          serial_number = COALESCE($7, serial_number),
          is_connected = COALESCE($8, is_connected),
          metadata = COALESCE($9, metadata)
      WHERE id = $10
      RETURNING *
    `;

    const values = [
      name,
      type,
      brand,
      model,
      location,
      installation_date,
      serial_number,
      is_connected,
      metadata ? JSON.stringify(metadata) : null,
      id
    ];

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Equipment not found'
      });
    }

    res.json({
      success: true,
      message: 'Equipment updated successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating equipment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update equipment',
      details: error.message
    });
  }
};

/**
 * Delete equipment
 * DELETE /api/heating/equipment/:id
 */
export const deleteEquipment = async (req, res) => {
  try {
    const { id } = req.params;

    const query = 'DELETE FROM heating_equipment WHERE id = $1 RETURNING *';
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Equipment not found'
      });
    }

    res.json({
      success: true,
      message: 'Equipment deleted successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error deleting equipment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete equipment',
      details: error.message
    });
  }
};

// ==========================================
// STATUS TRACKING ENDPOINTS
// ==========================================

/**
 * Log equipment status
 * POST /api/heating/status
 */
export const logStatus = async (req, res) => {
  try {
    const {
      equipment_id,
      burner_work_min,
      burner_starts_count,
      feeder_work_min,
      flame_duration_min,
      fan_work_min,
      boiler_temp,
      flue_gas_temp,
      room_temp,
      target_temp,
      power_level,
      fuel_consumption_kg,
      is_running,
      work_phase,
      metrics
    } = req.body;

    // Validation
    if (!equipment_id) {
      return res.status(400).json({
        success: false,
        error: 'Equipment ID is required'
      });
    }

    const query = `
      INSERT INTO equipment_status (
        equipment_id, burner_work_min, burner_starts_count, feeder_work_min,
        flame_duration_min, fan_work_min, boiler_temp, flue_gas_temp, room_temp,
        target_temp, power_level, fuel_consumption_kg, is_running, work_phase, metrics
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *
    `;

    const values = [
      equipment_id,
      burner_work_min || null,
      burner_starts_count || null,
      feeder_work_min || null,
      flame_duration_min || null,
      fan_work_min || null,
      boiler_temp || null,
      flue_gas_temp || null,
      room_temp || null,
      target_temp || null,
      power_level || null,
      fuel_consumption_kg || null,
      is_running !== undefined ? is_running : false,
      work_phase || null,
      metrics ? JSON.stringify(metrics) : null
    ];

    const result = await pool.query(query, values);

    // Update last connection time
    await pool.query(
      'UPDATE heating_equipment SET is_connected = true, last_connection = NOW() WHERE id = $1',
      [equipment_id]
    );

    res.status(201).json({
      success: true,
      message: 'Status logged successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error logging status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to log status',
      details: error.message
    });
  }
};

/**
 * Get latest status for equipment
 * GET /api/heating/status/:equipment_id
 */
export const getLatestStatus = async (req, res) => {
  try {
    const { equipment_id } = req.params;

    const query = `
      SELECT * FROM latest_equipment_status
      WHERE equipment_id = $1
    `;

    const result = await pool.query(query, [equipment_id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No status data found for this equipment'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch status',
      details: error.message
    });
  }
};

/**
 * Get status history
 * GET /api/heating/status/:equipment_id/history
 */
export const getStatusHistory = async (req, res) => {
  try {
    const { equipment_id } = req.params;
    const { limit = 100, hours = 24 } = req.query;

    const query = `
      SELECT * FROM equipment_status
      WHERE equipment_id = $1
        AND timestamp >= NOW() - ($2 || ' hours')::INTERVAL
      ORDER BY timestamp DESC
      LIMIT $3
    `;

    const result = await pool.query(query, [equipment_id, hours, limit]);

    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching status history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch status history',
      details: error.message
    });
  }
};

// ==========================================
// PARAMETERS TRACKING ENDPOINTS
// ==========================================

/**
 * Log equipment parameter
 * POST /api/heating/parameters
 */
export const logParameter = async (req, res) => {
  try {
    const {
      equipment_id,
      parameter_name,
      work_phase,
      description,
      value,
      unit,
      time_on_regulator,
      start_time,
      end_time,
      data
    } = req.body;

    // Validation
    if (!equipment_id || !parameter_name) {
      return res.status(400).json({
        success: false,
        error: 'Equipment ID and parameter name are required'
      });
    }

    const query = `
      INSERT INTO equipment_parameters (
        equipment_id, parameter_name, work_phase, description, value,
        unit, time_on_regulator, start_time, end_time, data
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const values = [
      equipment_id,
      parameter_name,
      work_phase || null,
      description || null,
      value || null,
      unit || null,
      time_on_regulator || null,
      start_time || null,
      end_time || null,
      data ? JSON.stringify(data) : null
    ];

    const result = await pool.query(query, values);

    res.status(201).json({
      success: true,
      message: 'Parameter logged successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error logging parameter:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to log parameter',
      details: error.message
    });
  }
};

/**
 * Get parameters for equipment
 * GET /api/heating/parameters/:equipment_id
 */
export const getParameters = async (req, res) => {
  try {
    const { equipment_id } = req.params;
    const { limit = 50 } = req.query;

    const query = `
      SELECT * FROM equipment_parameters
      WHERE equipment_id = $1
      ORDER BY timestamp DESC
      LIMIT $2
    `;

    const result = await pool.query(query, [equipment_id, limit]);

    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching parameters:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch parameters',
      details: error.message
    });
  }
};

// ==========================================
// ALERTS MANAGEMENT ENDPOINTS
// ==========================================

/**
 * Log equipment alert
 * POST /api/heating/alerts
 */
export const logAlert = async (req, res) => {
  try {
    const {
      equipment_id,
      type,
      severity,
      code,
      message,
      description,
      metadata
    } = req.body;

    // Validation
    if (!equipment_id || !type || !severity || !message) {
      return res.status(400).json({
        success: false,
        error: 'Equipment ID, type, severity, and message are required'
      });
    }

    const query = `
      INSERT INTO equipment_alerts (
        equipment_id, type, severity, code, message, description, metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const values = [
      equipment_id,
      type,
      severity,
      code || null,
      message,
      description || null,
      metadata ? JSON.stringify(metadata) : null
    ];

    const result = await pool.query(query, values);

    res.status(201).json({
      success: true,
      message: 'Alert logged successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error logging alert:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to log alert',
      details: error.message
    });
  }
};

/**
 * Get alerts for equipment
 * GET /api/heating/alerts/:equipment_id
 */
export const getAlerts = async (req, res) => {
  try {
    const { equipment_id } = req.params;
    const { type, resolved = 'all', limit = 100 } = req.query;

    let query = `
      SELECT * FROM equipment_alerts
      WHERE equipment_id = $1
    `;

    const values = [equipment_id];
    let paramCount = 1;

    if (type) {
      paramCount++;
      query += ` AND type = $${paramCount}`;
      values.push(type);
    }

    if (resolved !== 'all') {
      paramCount++;
      query += ` AND resolved = $${paramCount}`;
      values.push(resolved === 'true');
    }

    query += ` ORDER BY timestamp DESC LIMIT $${paramCount + 1}`;
    values.push(limit);

    const result = await pool.query(query, values);

    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch alerts',
      details: error.message
    });
  }
};

/**
 * Acknowledge alert
 * PATCH /api/heating/alerts/:id/acknowledge
 */
export const acknowledgeAlert = async (req, res) => {
  try {
    const { id } = req.params;
    const { acknowledged_by } = req.body;

    const query = `
      UPDATE equipment_alerts
      SET acknowledged = true,
          acknowledged_at = NOW(),
          acknowledged_by = $1
      WHERE id = $2
      RETURNING *
    `;

    const result = await pool.query(query, [acknowledged_by || 'user', id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Alert not found'
      });
    }

    res.json({
      success: true,
      message: 'Alert acknowledged',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error acknowledging alert:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to acknowledge alert',
      details: error.message
    });
  }
};

/**
 * Resolve alert
 * PATCH /api/heating/alerts/:id/resolve
 */
export const resolveAlert = async (req, res) => {
  try {
    const { id } = req.params;
    const { resolution_notes } = req.body;

    const query = `
      UPDATE equipment_alerts
      SET resolved = true,
          resolved_at = NOW(),
          resolution_notes = $1
      WHERE id = $2
      RETURNING *
    `;

    const result = await pool.query(query, [resolution_notes || null, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Alert not found'
      });
    }

    res.json({
      success: true,
      message: 'Alert resolved',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error resolving alert:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to resolve alert',
      details: error.message
    });
  }
};

// ==========================================
// ANALYTICS & DASHBOARD ENDPOINTS
// ==========================================

/**
 * Get uptime statistics
 * GET /api/heating/uptime/:equipment_id
 */
export const getUptime = async (req, res) => {
  try {
    const { equipment_id } = req.params;
    const { days = 7 } = req.query;

    const query = 'SELECT * FROM get_equipment_uptime($1, $2)';
    const result = await pool.query(query, [equipment_id, days]);

    res.json({
      success: true,
      equipment_id: parseInt(equipment_id),
      days: parseInt(days),
      count: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching uptime:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch uptime',
      details: error.message
    });
  }
};

/**
 * Detect equipment issues
 * GET /api/heating/issues/:equipment_id
 */
export const detectIssues = async (req, res) => {
  try {
    const { equipment_id } = req.params;

    const query = 'SELECT * FROM detect_equipment_issues($1)';
    const result = await pool.query(query, [equipment_id]);

    res.json({
      success: true,
      equipment_id: parseInt(equipment_id),
      count: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    console.error('Error detecting issues:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to detect issues',
      details: error.message
    });
  }
};

/**
 * Get complete dashboard data for equipment
 * GET /api/heating/dashboard/:equipment_id
 */
export const getDashboardData = async (req, res) => {
  try {
    const { equipment_id } = req.params;

    const [equipment, latestStatus, recentAlerts, uptime, issues] = await Promise.all([
      pool.query('SELECT * FROM heating_equipment WHERE id = $1', [equipment_id]),
      pool.query('SELECT * FROM latest_equipment_status WHERE equipment_id = $1', [equipment_id]),
      pool.query('SELECT * FROM equipment_alerts WHERE equipment_id = $1 AND resolved = false ORDER BY timestamp DESC LIMIT 10', [equipment_id]),
      pool.query('SELECT * FROM get_equipment_uptime($1, 7)', [equipment_id]),
      pool.query('SELECT * FROM detect_equipment_issues($1)', [equipment_id])
    ]);

    if (equipment.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Equipment not found'
      });
    }

    res.json({
      success: true,
      data: {
        equipment: equipment.rows[0],
        latestStatus: latestStatus.rows[0] || null,
        recentAlerts: recentAlerts.rows,
        uptime: uptime.rows,
        issues: issues.rows
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard data',
      details: error.message
    });
  }
};

/**
 * Get all equipment dashboard overview
 * GET /api/heating/dashboard
 */
export const getAllDashboardData = async (req, res) => {
  try {
    const [equipment, latestStatuses, alertSummary] = await Promise.all([
      pool.query('SELECT * FROM heating_equipment ORDER BY created_at DESC'),
      pool.query('SELECT * FROM latest_equipment_status'),
      pool.query('SELECT * FROM equipment_alert_summary')
    ]);

    res.json({
      success: true,
      data: {
        equipment: equipment.rows,
        latestStatuses: latestStatuses.rows,
        alertSummary: alertSummary.rows
      }
    });
  } catch (error) {
    console.error('Error fetching all dashboard data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard data',
      details: error.message
    });
  }
};
