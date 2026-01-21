/**
 * Heater API Client
 * Service layer for Centrometal PelTec Lambda heater data
 */

import axios from 'axios';
import type {
  HeaterStatus,
  HeaterStatistics,
  HeaterEvent,
  HeaterDashboardData,
  FuelConsumptionData,
  EfficiencyMetrics,
  HeaterCorrelationData,
  SaveHeaterStatusRequest,
  SaveHeaterStatisticsRequest,
  LogHeaterEventRequest,
  ApiResponse,
} from '../types/heater';

// ============================================
// Heater Status API
// ============================================

/**
 * Get latest heater status
 */
export async function getLatestStatus(): Promise<HeaterStatus> {
  const response = await axios.get<ApiResponse<HeaterStatus>>('/heater/status/latest');
  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.error || 'Failed to fetch heater status');
  }
  return response.data.data;
}

/**
 * Save new heater status snapshot
 */
export async function saveStatus(data: SaveHeaterStatusRequest): Promise<HeaterStatus> {
  const response = await axios.post<ApiResponse<HeaterStatus>>('/heater/status', data);
  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.error || 'Failed to save heater status');
  }
  return response.data.data;
}

/**
 * Get heater status history
 */
export async function getStatusHistory(
  limit: number = 100,
  offset: number = 0
): Promise<HeaterStatus[]> {
  const response = await axios.get<ApiResponse<HeaterStatus[]>>('/heater/status/history', {
    params: { limit, offset },
  });
  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.error || 'Failed to fetch status history');
  }
  return response.data.data;
}

// ============================================
// Heater Statistics API
// ============================================

/**
 * Get latest heater statistics
 */
export async function getLatestStatistics(): Promise<HeaterStatistics> {
  const response = await axios.get<ApiResponse<HeaterStatistics>>('/heater/statistics/latest');
  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.error || 'Failed to fetch heater statistics');
  }
  return response.data.data;
}

/**
 * Save heater statistics snapshot
 */
export async function saveStatistics(data: SaveHeaterStatisticsRequest): Promise<HeaterStatistics> {
  const response = await axios.post<ApiResponse<HeaterStatistics>>('/heater/statistics', data);
  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.error || 'Failed to save heater statistics');
  }
  return response.data.data;
}

// ============================================
// Dashboard Data API
// ============================================

/**
 * Get complete heater dashboard data (status + statistics combined)
 */
export async function getDashboardData(): Promise<HeaterDashboardData> {
  const response = await axios.get<ApiResponse<HeaterDashboardData>>('/heater/dashboard');
  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.error || 'Failed to fetch dashboard data');
  }
  return response.data.data;
}

// ============================================
// Events API
// ============================================

/**
 * Get recent heater events
 */
export async function getEvents(limit: number = 50, eventType?: string): Promise<HeaterEvent[]> {
  const params: Record<string, any> = { limit };
  if (eventType) {
    params.type = eventType;
  }

  const response = await axios.get<ApiResponse<HeaterEvent[]>>('/heater/events', { params });
  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.error || 'Failed to fetch events');
  }
  return response.data.data;
}

/**
 * Log a heater event
 */
export async function logEvent(data: LogHeaterEventRequest): Promise<HeaterEvent> {
  const response = await axios.post<ApiResponse<HeaterEvent>>('/heater/events', data);
  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.error || 'Failed to log event');
  }
  return response.data.data;
}

// ============================================
// Analytics API
// ============================================

/**
 * Get fuel consumption for date range
 */
export async function getFuelConsumption(
  startDate: string,
  endDate: string
): Promise<FuelConsumptionData> {
  const response = await axios.get<ApiResponse<FuelConsumptionData>>(
    '/heater/analytics/fuel-consumption',
    {
      params: { start_date: startDate, end_date: endDate },
    }
  );
  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.error || 'Failed to fetch fuel consumption');
  }
  return response.data.data;
}

/**
 * Get heater efficiency metrics for date range
 */
export async function getEfficiencyMetrics(
  startDate: string,
  endDate: string
): Promise<EfficiencyMetrics> {
  const response = await axios.get<ApiResponse<EfficiencyMetrics>>('/heater/analytics/efficiency', {
    params: { start_date: startDate, end_date: endDate },
  });
  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.error || 'Failed to fetch efficiency metrics');
  }
  return response.data.data;
}

// ============================================
// Correlation API
// ============================================

/**
 * Get correlation between heater and pellet consumption for a specific week
 */
export async function getCorrelation(weekStartDate: string): Promise<HeaterCorrelationData> {
  const response = await axios.get<ApiResponse<HeaterCorrelationData>>(
    `/heater/correlation/${weekStartDate}`
  );
  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.error || 'Failed to fetch correlation data');
  }
  return response.data.data;
}

// ============================================
// Helper Functions
// ============================================

/**
 * Format temperature with unit
 */
export function formatTemperature(temp: number | undefined): string {
  if (temp === undefined || temp === null) return '—';
  return `${temp.toFixed(1)}°C`;
}

/**
 * Format fuel consumption with unit
 */
export function formatFuelConsumption(kg: number | undefined): string {
  if (kg === undefined || kg === null) return '—';
  return `${kg.toFixed(1)} kg`;
}

/**
 * Format operating hours
 */
export function formatOperatingHours(minutes: number | undefined): string {
  if (minutes === undefined || minutes === null) return '—';
  const hours = Math.floor(minutes / 60);
  const mins = Math.floor(minutes % 60);
  return `${hours}h ${mins}m`;
}

/**
 * Get state display name
 */
export function getStateDisplayName(state: string): string {
  const stateMap: Record<string, string> = {
    OFF: 'Off',
    'S7-3': 'Running',
    STANDBY: 'Standby',
    IGNITION: 'Ignition',
    CLEANING: 'Cleaning',
    ERROR: 'Error',
  };
  return stateMap[state] || state;
}

/**
 * Get state color class
 */
export function getStateColorClass(state: string): string {
  const colorMap: Record<string, string> = {
    OFF: 'state-off',
    'S7-3': 'state-running',
    STANDBY: 'state-standby',
    IGNITION: 'state-ignition',
    CLEANING: 'state-cleaning',
    ERROR: 'state-error',
  };
  return colorMap[state] || 'state-default';
}

/**
 * Get fuel level color class
 */
export function getFuelLevelColorClass(level: string | undefined): string {
  if (!level) return 'fuel-unknown';

  const colorMap: Record<string, string> = {
    full: 'fuel-full',
    reserve: 'fuel-reserve',
    empty: 'fuel-empty',
  };
  return colorMap[level.toLowerCase()] || 'fuel-unknown';
}

/**
 * Get efficiency rating color class
 */
export function getEfficiencyColorClass(rating: string): string {
  const colorMap: Record<string, string> = {
    excellent: 'efficiency-excellent',
    good: 'efficiency-good',
    normal: 'efficiency-normal',
  };
  return colorMap[rating] || 'efficiency-normal';
}

/**
 * Get severity color class for events
 */
export function getSeverityColorClass(severity: string): string {
  const colorMap: Record<string, string> = {
    info: 'severity-info',
    warning: 'severity-warning',
    error: 'severity-error',
    critical: 'severity-critical',
  };
  return colorMap[severity] || 'severity-info';
}

export default {
  // Status
  getLatestStatus,
  saveStatus,
  getStatusHistory,

  // Statistics
  getLatestStatistics,
  saveStatistics,

  // Dashboard
  getDashboardData,

  // Events
  getEvents,
  logEvent,

  // Analytics
  getFuelConsumption,
  getEfficiencyMetrics,

  // Correlation
  getCorrelation,

  // Helpers
  formatTemperature,
  formatFuelConsumption,
  formatOperatingHours,
  getStateDisplayName,
  getStateColorClass,
  getFuelLevelColorClass,
  getEfficiencyColorClass,
  getSeverityColorClass,
};
