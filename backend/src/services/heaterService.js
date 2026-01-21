/**
 * Heater Service
 * Manages Centrometal PelTec Lambda heater data
 */

import pool from '../database/db.js';

// ============================================
// Heater Status Operations
// ============================================

/**
 * Save heater status snapshot
 */
export async function saveHeaterStatus(data) {
  const query = `
    INSERT INTO heater_status (
      state, is_live,
      main_temperature, supply_temperature, return_temperature,
      buffer_tank_temperature, radiator_temperature, external_temperature, dhw_temperature,
      fuel_level_status, oxygen_level,
      pump_p1_status, pump_p2_status, pump_p3_status,
      pump_p1_demand, pump_p2_demand, pump_p3_demand,
      fan_status,
      configuration_type, installation_id
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
      $12, $13, $14, $15, $16, $17, $18, $19, $20
    ) RETURNING *
  `;

  const values = [
    data.state,
    data.isLive,
    data.mainTemperature,
    data.supplyTemperature,
    data.returnTemperature,
    data.bufferTankTemperature,
    data.radiatorTemperature,
    data.externalTemperature,
    data.dhwTemperature,
    data.fuelLevelStatus,
    data.oxygenLevel,
    data.pumpP1Status,
    data.pumpP2Status,
    data.pumpP3Status,
    data.pumpP1Demand,
    data.pumpP2Demand,
    data.pumpP3Demand,
    data.fanStatus,
    data.configurationType,
    data.installationId,
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
}

/**
 * Get latest heater status
 */
export async function getLatestStatus() {
  const query = 'SELECT * FROM latest_heater_status';
  const result = await pool.query(query);
  return result.rows[0] || null;
}

/**
 * Get heater status history
 */
export async function getStatusHistory(limit = 100, offset = 0) {
  const query = `
    SELECT * FROM heater_status
    ORDER BY timestamp DESC
    LIMIT $1 OFFSET $2
  `;
  const result = await pool.query(query, [limit, offset]);
  return result.rows;
}

/**
 * Get heater status for date range
 */
export async function getStatusByDateRange(startDate, endDate) {
  const query = `
    SELECT * FROM heater_status
    WHERE timestamp BETWEEN $1 AND $2
    ORDER BY timestamp ASC
  `;
  const result = await pool.query(query, [startDate, endDate]);
  return result.rows;
}

// ============================================
// Heater Statistics Operations
// ============================================

/**
 * Save heater statistics snapshot
 */
export async function saveHeaterStatistics(data) {
  const query = `
    INSERT INTO heater_statistics (
      timestamp,
      burner_work_minutes, burner_start_count, fuel_consumed_kg,
      pellet_accumulator_minutes, fan_working_minutes,
      vacuum_boiler_minutes, vacuum_turbine_minutes, vacuum_turbine_cycles,
      time_on_state_01, time_on_state_02, time_on_state_03,
      time_on_state_04, time_on_state_05, time_on_state_06
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
    )
    ON CONFLICT (timestamp) DO UPDATE SET
      burner_work_minutes = EXCLUDED.burner_work_minutes,
      burner_start_count = EXCLUDED.burner_start_count,
      fuel_consumed_kg = EXCLUDED.fuel_consumed_kg,
      pellet_accumulator_minutes = EXCLUDED.pellet_accumulator_minutes,
      fan_working_minutes = EXCLUDED.fan_working_minutes,
      vacuum_boiler_minutes = EXCLUDED.vacuum_boiler_minutes,
      vacuum_turbine_minutes = EXCLUDED.vacuum_turbine_minutes,
      vacuum_turbine_cycles = EXCLUDED.vacuum_turbine_cycles,
      time_on_state_01 = EXCLUDED.time_on_state_01,
      time_on_state_02 = EXCLUDED.time_on_state_02,
      time_on_state_03 = EXCLUDED.time_on_state_03,
      time_on_state_04 = EXCLUDED.time_on_state_04,
      time_on_state_05 = EXCLUDED.time_on_state_05,
      time_on_state_06 = EXCLUDED.time_on_state_06
    RETURNING *
  `;

  const values = [
    data.timestamp || new Date(),
    data.burnerWorkMinutes,
    data.burnerStartCount,
    data.fuelConsumedKg,
    data.pelletAccumulatorMinutes,
    data.fanWorkingMinutes,
    data.vacuumBoilerMinutes,
    data.vacuumTurbineMinutes,
    data.vacuumTurbineCycles,
    data.timeOnState01,
    data.timeOnState02,
    data.timeOnState03,
    data.timeOnState04,
    data.timeOnState05,
    data.timeOnState06,
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
}

/**
 * Get latest statistics
 */
export async function getLatestStatistics() {
  const query = 'SELECT * FROM latest_heater_statistics';
  const result = await pool.query(query);
  return result.rows[0] || null;
}

/**
 * Get statistics history
 */
export async function getStatisticsHistory(limit = 100, offset = 0) {
  const query = `
    SELECT * FROM heater_statistics
    ORDER BY timestamp DESC
    LIMIT $1 OFFSET $2
  `;
  const result = await pool.query(query, [limit, offset]);
  return result.rows;
}

// ============================================
// Heater Events Operations
// ============================================

/**
 * Log heater event
 */
export async function logHeaterEvent(eventType, message, severity = 'info', eventData = null) {
  const query = `
    INSERT INTO heater_events (event_type, message, severity, event_data)
    VALUES ($1, $2, $3, $4)
    RETURNING *
  `;
  const result = await pool.query(query, [eventType, message, severity, eventData]);
  return result.rows[0];
}

/**
 * Get recent events
 */
export async function getRecentEvents(limit = 50) {
  const query = `
    SELECT * FROM heater_events
    ORDER BY timestamp DESC
    LIMIT $1
  `;
  const result = await pool.query(query, [limit]);
  return result.rows;
}

/**
 * Get events by type
 */
export async function getEventsByType(eventType, limit = 50) {
  const query = `
    SELECT * FROM heater_events
    WHERE event_type = $1
    ORDER BY timestamp DESC
    LIMIT $2
  `;
  const result = await pool.query(query, [eventType, limit]);
  return result.rows;
}

// ============================================
// Dashboard Data
// ============================================

/**
 * Get complete dashboard data
 */
export async function getDashboardData() {
  const query = 'SELECT * FROM heater_dashboard_data';
  const result = await pool.query(query);
  return result.rows[0] || null;
}

// ============================================
// Analytics Functions
// ============================================

/**
 * Calculate fuel consumption for date range
 */
export async function getFuelConsumptionByDateRange(startDate, endDate) {
  const query = `
    SELECT
      MIN(fuel_consumed_kg) as start_kg,
      MAX(fuel_consumed_kg) as end_kg,
      MAX(fuel_consumed_kg) - MIN(fuel_consumed_kg) as consumed_kg,
      MIN(timestamp) as start_time,
      MAX(timestamp) as end_time
    FROM heater_statistics
    WHERE timestamp BETWEEN $1 AND $2
  `;
  const result = await pool.query(query, [startDate, endDate]);
  return result.rows[0];
}

/**
 * Calculate average temperatures for date range
 */
export async function getAverageTemperatures(startDate, endDate) {
  const query = `
    SELECT
      AVG(main_temperature) as avg_main,
      AVG(supply_temperature) as avg_supply,
      AVG(return_temperature) as avg_return,
      AVG(buffer_tank_temperature) as avg_buffer,
      AVG(radiator_temperature) as avg_radiator,
      AVG(external_temperature) as avg_external,
      MIN(main_temperature) as min_main,
      MAX(main_temperature) as max_main
    FROM heater_status
    WHERE timestamp BETWEEN $1 AND $2
      AND main_temperature IS NOT NULL
  `;
  const result = await pool.query(query, [startDate, endDate]);
  return result.rows[0];
}

/**
 * Calculate operating hours for date range
 */
export async function getOperatingHours(startDate, endDate) {
  const query = `
    SELECT
      MIN(burner_work_minutes) as start_minutes,
      MAX(burner_work_minutes) as end_minutes,
      MAX(burner_work_minutes) - MIN(burner_work_minutes) as work_minutes,
      (MAX(burner_work_minutes) - MIN(burner_work_minutes)) / 60.0 as work_hours
    FROM heater_statistics
    WHERE timestamp BETWEEN $1 AND $2
  `;
  const result = await pool.query(query, [startDate, endDate]);
  return result.rows[0];
}

/**
 * Get heater efficiency metrics
 */
export async function getEfficiencyMetrics(startDate, endDate) {
  const fuelData = await getFuelConsumptionByDateRange(startDate, endDate);
  const operatingData = await getOperatingHours(startDate, endDate);

  if (!fuelData || !operatingData || !fuelData.consumed_kg || !operatingData.work_hours) {
    return null;
  }

  // Calculate kg per hour
  const kgPerHour = fuelData.consumed_kg / operatingData.work_hours;

  return {
    ...fuelData,
    ...operatingData,
    kg_per_hour: kgPerHour,
    efficiency_rating: kgPerHour < 2.5 ? 'excellent' : kgPerHour < 3.0 ? 'good' : 'normal',
  };
}

/**
 * Correlate heater data with pellet consumption
 */
export async function correlateWithPelletConsumption(weekStartDate) {
  const weekEndDate = new Date(weekStartDate);
  weekEndDate.setDate(weekEndDate.getDate() + 6);

  const query = `
    SELECT
      c.week_year,
      c.bags_used,
      c.weight_kg,
      c.temperature_avg as consumption_temp,
      AVG(h.main_temperature) as heater_avg_temp,
      AVG(h.supply_temperature) as supply_avg_temp,
      COUNT(CASE WHEN h.state != 'OFF' THEN 1 END) as active_readings,
      COUNT(*) as total_readings
    FROM consumption c
    LEFT JOIN heater_status h ON DATE(h.timestamp) BETWEEN $1 AND $2
    WHERE c.week_start_date = $1
    GROUP BY c.id, c.week_year, c.bags_used, c.weight_kg, c.temperature_avg
  `;

  const result = await pool.query(query, [weekStartDate, weekEndDate]);
  return result.rows[0] || null;
}

export default {
  saveHeaterStatus,
  getLatestStatus,
  getStatusHistory,
  getStatusByDateRange,
  saveHeaterStatistics,
  getLatestStatistics,
  getStatisticsHistory,
  logHeaterEvent,
  getRecentEvents,
  getEventsByType,
  getDashboardData,
  getFuelConsumptionByDateRange,
  getAverageTemperatures,
  getOperatingHours,
  getEfficiencyMetrics,
  correlateWithPelletConsumption,
};
