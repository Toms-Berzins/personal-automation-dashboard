/**
 * Heater Data Types
 * TypeScript definitions for Centrometal PelTec Lambda heater data
 */

// ============================================
// Heater Status Types
// ============================================

export interface HeaterStatus {
  id: number;
  timestamp: string;

  // Operating State
  state: string; // 'OFF', 'S7-3', etc.
  is_live: boolean;

  // Temperature Readings (°C)
  main_temperature?: number;
  supply_temperature?: number;
  return_temperature?: number;
  buffer_tank_temperature?: number;
  radiator_temperature?: number;
  external_temperature?: number;
  dhw_temperature?: number; // Domestic hot water

  // Fuel Status
  fuel_level_status?: string; // 'full', 'reserve', 'empty'
  oxygen_level?: number;

  // Pump Status
  pump_p1_status: boolean; // Main circulation
  pump_p2_status: boolean; // Radiator circuit
  pump_p3_status: boolean; // Buffer tank
  pump_p1_demand: boolean;
  pump_p2_demand: boolean;
  pump_p3_demand: boolean;

  // Fan Status
  fan_status: boolean;

  // System Configuration
  configuration_type?: number;
  installation_id?: string;

  created_at: string;
}

// ============================================
// Heater Statistics Types
// ============================================

export interface HeaterStatistics {
  id: number;
  timestamp: string;

  // Burner Statistics
  burner_work_minutes?: number; // Total burner operating time
  burner_start_count?: number; // Number of burner starts
  fuel_consumed_kg?: number; // Total fuel consumed in kg

  // Component Working Times (minutes)
  pellet_accumulator_minutes?: number;
  fan_working_minutes?: number;
  vacuum_boiler_minutes?: number;
  vacuum_turbine_minutes?: number;
  vacuum_turbine_cycles?: number;

  // State Times (minutes)
  time_on_state_01?: number;
  time_on_state_02?: number;
  time_on_state_03?: number;
  time_on_state_04?: number;
  time_on_state_05?: number;
  time_on_state_06?: number;

  created_at: string;
}

// ============================================
// Heater Events Types
// ============================================

export interface HeaterEvent {
  id: number;
  timestamp: string;
  event_type: string; // 'start', 'stop', 'error', 'alarm', 'fuel_low'
  message: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  event_data?: Record<string, any>;
  created_at: string;
}

// ============================================
// Dashboard Data Type
// ============================================

export interface HeaterDashboardData {
  status_id: number;
  status_timestamp: string;

  // Operating State
  state: string;
  is_live: boolean;

  // Key Temperatures
  main_temperature?: number;
  supply_temperature?: number;
  return_temperature?: number;
  buffer_tank_temperature?: number;
  radiator_temperature?: number;
  external_temperature?: number;

  // Fuel Status
  fuel_level_status?: string;
  oxygen_level?: number;

  // Pump Status
  pump_p1_status: boolean;
  pump_p2_status: boolean;
  pump_p3_status: boolean;

  // Fan Status
  fan_status: boolean;

  // Statistics
  burner_work_minutes?: number;
  burner_start_count?: number;
  fuel_consumed_kg?: number;
  fan_working_minutes?: number;
}

// ============================================
// Analytics Types
// ============================================

export interface FuelConsumptionData {
  start_kg: number;
  end_kg: number;
  consumed_kg: number;
  start_time: string;
  end_time: string;
}

export interface EfficiencyMetrics extends FuelConsumptionData {
  start_minutes: number;
  end_minutes: number;
  work_minutes: number;
  work_hours: number;
  kg_per_hour: number;
  efficiency_rating: 'excellent' | 'good' | 'normal';
}

export interface HeaterCorrelationData {
  week_year: string;
  bags_used: number;
  weight_kg: number;
  consumption_temp?: number;
  heater_avg_temp?: number;
  supply_avg_temp?: number;
  active_readings: number;
  total_readings: number;
}

// ============================================
// API Request Types
// ============================================

export interface SaveHeaterStatusRequest {
  state: string;
  isLive: boolean;
  mainTemperature?: number;
  supplyTemperature?: number;
  returnTemperature?: number;
  bufferTankTemperature?: number;
  radiatorTemperature?: number;
  externalTemperature?: number;
  dhwTemperature?: number;
  fuelLevelStatus?: string;
  oxygenLevel?: number;
  pumpP1Status: boolean;
  pumpP2Status: boolean;
  pumpP3Status: boolean;
  pumpP1Demand: boolean;
  pumpP2Demand: boolean;
  pumpP3Demand: boolean;
  fanStatus: boolean;
  configurationType?: number;
  installationId?: string;
}

export interface SaveHeaterStatisticsRequest {
  timestamp?: string;
  burnerWorkMinutes?: number;
  burnerStartCount?: number;
  fuelConsumedKg?: number;
  pelletAccumulatorMinutes?: number;
  fanWorkingMinutes?: number;
  vacuumBoilerMinutes?: number;
  vacuumTurbineMinutes?: number;
  vacuumTurbineCycles?: number;
  timeOnState01?: number;
  timeOnState02?: number;
  timeOnState03?: number;
  timeOnState04?: number;
  timeOnState05?: number;
  timeOnState06?: number;
}

export interface LogHeaterEventRequest {
  eventType: string;
  message: string;
  severity?: 'info' | 'warning' | 'error' | 'critical';
  eventData?: Record<string, any>;
}

// ============================================
// API Response Types
// ============================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  count?: number;
}
