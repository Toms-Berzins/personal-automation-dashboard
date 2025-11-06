import pool from '../database/db.js';

/**
 * Pellet Stock and Consumption Tracking Controller
 * Handles all API endpoints for managing pellet inventory
 */

// ==========================================
// STOCK PURCHASE ENDPOINTS
// ==========================================

/**
 * Add new stock purchase
 * POST /api/pellets/stock
 */
export const addStockPurchase = async (req, res) => {
  try {
    const {
      purchase_date,
      num_pallets,
      num_bags,
      bags_per_pallet = 65,
      weight_per_bag = 15.0,
      notes,
      supplier,
      price_per_pallet,
      total_cost
    } = req.body;

    // Validation
    if (!purchase_date) {
      return res.status(400).json({
        success: false,
        error: 'Purchase date is required'
      });
    }

    // Must provide either num_pallets or num_bags
    if (!num_pallets && !num_bags) {
      return res.status(400).json({
        success: false,
        error: 'Either number of pallets or number of bags is required'
      });
    }

    // Validate numeric values
    if (num_pallets !== undefined && num_pallets <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Number of pallets must be greater than zero'
      });
    }

    if (num_bags !== undefined && num_bags <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Number of bags must be greater than zero'
      });
    }

    if (weight_per_bag <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Weight per bag must be greater than zero'
      });
    }

    // If using pallets, bags_per_pallet is required
    if (num_pallets && bags_per_pallet <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Bags per pallet must be greater than zero when entering pallets'
      });
    }

    const query = `
      INSERT INTO pellet_stock (
        purchase_date, num_pallets, num_bags, bags_per_pallet, weight_per_bag,
        notes, supplier, price_per_pallet, total_cost
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

    const values = [
      purchase_date,
      num_pallets || null,
      num_bags || null,
      bags_per_pallet || null,
      weight_per_bag,
      notes,
      supplier,
      price_per_pallet,
      total_cost
    ];

    const result = await pool.query(query, values);

    res.status(201).json({
      success: true,
      message: 'Stock purchase added successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error adding stock purchase:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add stock purchase',
      details: error.message
    });
  }
};

/**
 * Get all stock purchases
 * GET /api/pellets/stock
 */
export const getAllStockPurchases = async (req, res) => {
  try {
    const query = `
      SELECT * FROM pellet_stock
      ORDER BY purchase_date DESC
    `;

    const result = await pool.query(query);

    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching stock purchases:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch stock purchases',
      details: error.message
    });
  }
};

/**
 * Get single stock purchase by ID
 * GET /api/pellets/stock/:id
 */
export const getStockPurchaseById = async (req, res) => {
  try {
    const { id } = req.params;

    const query = 'SELECT * FROM pellet_stock WHERE id = $1';
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Stock purchase not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching stock purchase:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch stock purchase',
      details: error.message
    });
  }
};

/**
 * Update stock purchase
 * PUT /api/pellets/stock/:id
 */
export const updateStockPurchase = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      purchase_date,
      num_pallets,
      num_bags,
      bags_per_pallet,
      weight_per_bag,
      notes,
      supplier,
      price_per_pallet,
      total_cost
    } = req.body;

    const query = `
      UPDATE pellet_stock
      SET purchase_date = COALESCE($1, purchase_date),
          num_pallets = COALESCE($2, num_pallets),
          num_bags = COALESCE($3, num_bags),
          bags_per_pallet = COALESCE($4, bags_per_pallet),
          weight_per_bag = COALESCE($5, weight_per_bag),
          notes = COALESCE($6, notes),
          supplier = COALESCE($7, supplier),
          price_per_pallet = COALESCE($8, price_per_pallet),
          total_cost = COALESCE($9, total_cost)
      WHERE id = $10
      RETURNING *
    `;

    const values = [
      purchase_date,
      num_pallets,
      num_bags,
      bags_per_pallet,
      weight_per_bag,
      notes,
      supplier,
      price_per_pallet,
      total_cost,
      id
    ];

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Stock purchase not found'
      });
    }

    res.json({
      success: true,
      message: 'Stock purchase updated successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating stock purchase:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update stock purchase',
      details: error.message
    });
  }
};

/**
 * Delete stock purchase
 * DELETE /api/pellets/stock/:id
 */
export const deleteStockPurchase = async (req, res) => {
  try {
    const { id } = req.params;

    const query = 'DELETE FROM pellet_stock WHERE id = $1 RETURNING *';
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Stock purchase not found'
      });
    }

    res.json({
      success: true,
      message: 'Stock purchase deleted successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error deleting stock purchase:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete stock purchase',
      details: error.message
    });
  }
};

// ==========================================
// CONSUMPTION TRACKING ENDPOINTS
// ==========================================

/**
 * Log weekly consumption
 * POST /api/pellets/consumption
 */
export const logConsumption = async (req, res) => {
  try {
    const {
      week_year,
      week_start_date,
      week_end_date,
      bags_used,
      manual_weight_kg,
      notes,
      temperature_avg,
      heating_hours
    } = req.body;

    // Validation
    if (!week_year || !week_start_date || !week_end_date || bags_used === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Week year, start date, end date, and bags used are required'
      });
    }

    if (bags_used < 0) {
      return res.status(400).json({
        success: false,
        error: 'Bags used cannot be negative'
      });
    }

    const query = `
      INSERT INTO pellet_consumption (
        week_year, week_start_date, week_end_date, bags_used,
        manual_weight_kg, notes, temperature_avg, heating_hours
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (week_year)
      DO UPDATE SET
        week_start_date = EXCLUDED.week_start_date,
        week_end_date = EXCLUDED.week_end_date,
        bags_used = EXCLUDED.bags_used,
        manual_weight_kg = EXCLUDED.manual_weight_kg,
        notes = EXCLUDED.notes,
        temperature_avg = EXCLUDED.temperature_avg,
        heating_hours = EXCLUDED.heating_hours
      RETURNING *
    `;

    const values = [
      week_year,
      week_start_date,
      week_end_date,
      bags_used,
      manual_weight_kg,
      notes,
      temperature_avg,
      heating_hours
    ];

    const result = await pool.query(query, values);

    res.status(201).json({
      success: true,
      message: 'Consumption logged successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error logging consumption:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to log consumption',
      details: error.message
    });
  }
};

/**
 * Get all consumption records
 * GET /api/pellets/consumption
 */
export const getAllConsumption = async (req, res) => {
  try {
    const { limit = 50 } = req.query;

    const query = `
      SELECT * FROM pellet_consumption
      ORDER BY week_start_date DESC
      LIMIT $1
    `;

    const result = await pool.query(query, [limit]);

    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching consumption records:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch consumption records',
      details: error.message
    });
  }
};

/**
 * Get recent consumption (last 12 weeks)
 * GET /api/pellets/consumption/recent
 */
export const getRecentConsumption = async (req, res) => {
  try {
    const query = 'SELECT * FROM v_recent_consumption';
    const result = await pool.query(query);

    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching recent consumption:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch recent consumption',
      details: error.message
    });
  }
};

/**
 * Get monthly consumption
 * GET /api/pellets/consumption/monthly/:year/:month
 */
export const getMonthlyConsumption = async (req, res) => {
  try {
    const { year, month } = req.params;

    const query = 'SELECT * FROM get_monthly_consumption($1, $2)';
    const result = await pool.query(query, [year, month]);

    res.json({
      success: true,
      year: parseInt(year),
      month: parseInt(month),
      count: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching monthly consumption:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch monthly consumption',
      details: error.message
    });
  }
};

/**
 * Delete consumption record
 * DELETE /api/pellets/consumption/:id
 */
export const deleteConsumption = async (req, res) => {
  try {
    const { id } = req.params;

    const query = 'DELETE FROM pellet_consumption WHERE id = $1 RETURNING *';
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Consumption record not found'
      });
    }

    res.json({
      success: true,
      message: 'Consumption record deleted successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error deleting consumption record:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete consumption record',
      details: error.message
    });
  }
};

// ==========================================
// ANALYTICS & STATISTICS ENDPOINTS
// ==========================================

/**
 * Get current stock levels
 * GET /api/pellets/current
 */
export const getCurrentStock = async (req, res) => {
  try {
    const query = 'SELECT * FROM v_current_stock';
    const result = await pool.query(query);

    res.json({
      success: true,
      data: result.rows[0] || {
        total_purchased_bags: 0,
        total_purchased_kg: 0,
        total_purchased_tons: 0,
        total_consumed_bags: 0,
        total_consumed_kg: 0,
        remaining_bags: 0,
        remaining_kg: 0,
        remaining_tons: 0,
        stock_percentage: 0
      }
    });
  } catch (error) {
    console.error('Error fetching current stock:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch current stock',
      details: error.message
    });
  }
};

/**
 * Get consumption statistics
 * GET /api/pellets/stats
 */
export const getStatistics = async (req, res) => {
  try {
    const statsQuery = 'SELECT * FROM v_consumption_stats';
    const projectionQuery = 'SELECT * FROM v_stock_projection';

    const [statsResult, projectionResult] = await Promise.all([
      pool.query(statsQuery),
      pool.query(projectionQuery)
    ]);

    res.json({
      success: true,
      data: {
        consumption: statsResult.rows[0] || {},
        projection: projectionResult.rows[0] || {}
      }
    });
  } catch (error) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics',
      details: error.message
    });
  }
};

/**
 * Get complete dashboard data (all-in-one)
 * GET /api/pellets/dashboard
 */
export const getDashboardData = async (req, res) => {
  try {
    const [currentStock, stats, projection, recentConsumption, stockPurchases] = await Promise.all([
      pool.query('SELECT * FROM v_current_stock'),
      pool.query('SELECT * FROM v_consumption_stats'),
      pool.query('SELECT * FROM v_stock_projection'),
      pool.query('SELECT * FROM v_recent_consumption'),
      pool.query('SELECT * FROM pellet_stock ORDER BY purchase_date DESC LIMIT 5')
    ]);

    res.json({
      success: true,
      data: {
        currentStock: currentStock.rows[0] || {},
        statistics: stats.rows[0] || {},
        projection: projection.rows[0] || {},
        recentConsumption: recentConsumption.rows || [],
        recentPurchases: stockPurchases.rows || []
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
 * Get stock level at specific date
 * GET /api/pellets/stock-at/:date
 */
export const getStockAtDate = async (req, res) => {
  try {
    const { date } = req.params;

    const query = 'SELECT * FROM get_stock_at_date($1)';
    const result = await pool.query(query, [date]);

    res.json({
      success: true,
      date,
      data: result.rows[0] || { remaining_bags: 0, remaining_kg: 0 }
    });
  } catch (error) {
    console.error('Error fetching stock at date:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch stock at date',
      details: error.message
    });
  }
};
