import axios from 'axios';
import type {
  StockPurchase,
  CreateStockPurchase,
  UpdateStockPurchase,
  Consumption,
  CreateConsumption,
  CurrentStock,
  ConsumptionStats,
  StockProjection,
  DashboardData,
  ApiResponse,
  ApiListResponse,
} from '../types/pellets';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
const PELLETS_API = `${API_BASE_URL}/pellets`;

/**
 * Pellet API Service
 * Handles all API calls for pellet stock and consumption tracking
 */

// ==========================================
// STOCK PURCHASE API
// ==========================================

export const addStockPurchase = async (data: CreateStockPurchase): Promise<StockPurchase> => {
  const response = await axios.post<ApiResponse<StockPurchase>>(`${PELLETS_API}/stock`, data);
  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.error || 'Failed to add stock purchase');
  }
  return response.data.data;
};

export const getAllStockPurchases = async (): Promise<StockPurchase[]> => {
  const response = await axios.get<ApiListResponse<StockPurchase>>(`${PELLETS_API}/stock`);
  if (!response.data.success) {
    throw new Error(response.data.error || 'Failed to fetch stock purchases');
  }
  return response.data.data;
};

export const getStockPurchaseById = async (id: number): Promise<StockPurchase> => {
  const response = await axios.get<ApiResponse<StockPurchase>>(`${PELLETS_API}/stock/${id}`);
  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.error || 'Failed to fetch stock purchase');
  }
  return response.data.data;
};

export const updateStockPurchase = async (
  id: number,
  data: UpdateStockPurchase
): Promise<StockPurchase> => {
  const response = await axios.put<ApiResponse<StockPurchase>>(`${PELLETS_API}/stock/${id}`, data);
  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.error || 'Failed to update stock purchase');
  }
  return response.data.data;
};

export const deleteStockPurchase = async (id: number): Promise<void> => {
  const response = await axios.delete<ApiResponse<void>>(`${PELLETS_API}/stock/${id}`);
  if (!response.data.success) {
    throw new Error(response.data.error || 'Failed to delete stock purchase');
  }
};

// ==========================================
// CONSUMPTION TRACKING API
// ==========================================

export const logConsumption = async (data: CreateConsumption): Promise<Consumption> => {
  const response = await axios.post<ApiResponse<Consumption>>(`${PELLETS_API}/consumption`, data);
  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.error || 'Failed to log consumption');
  }
  return response.data.data;
};

export const getAllConsumption = async (limit = 50): Promise<Consumption[]> => {
  const response = await axios.get<ApiListResponse<Consumption>>(
    `${PELLETS_API}/consumption?limit=${limit}`
  );
  if (!response.data.success) {
    throw new Error(response.data.error || 'Failed to fetch consumption records');
  }
  return response.data.data;
};

export const getRecentConsumption = async (): Promise<Consumption[]> => {
  const response = await axios.get<ApiListResponse<Consumption>>(
    `${PELLETS_API}/consumption/recent`
  );
  if (!response.data.success) {
    throw new Error(response.data.error || 'Failed to fetch recent consumption');
  }
  return response.data.data;
};

export const getMonthlyConsumption = async (year: number, month: number): Promise<Consumption[]> => {
  const response = await axios.get<ApiListResponse<Consumption>>(
    `${PELLETS_API}/consumption/monthly/${year}/${month}`
  );
  if (!response.data.success) {
    throw new Error(response.data.error || 'Failed to fetch monthly consumption');
  }
  return response.data.data;
};

export const deleteConsumption = async (id: number): Promise<void> => {
  const response = await axios.delete<ApiResponse<void>>(`${PELLETS_API}/consumption/${id}`);
  if (!response.data.success) {
    throw new Error(response.data.error || 'Failed to delete consumption record');
  }
};

// ==========================================
// ANALYTICS & STATISTICS API
// ==========================================

export const getCurrentStock = async (): Promise<CurrentStock> => {
  const response = await axios.get<ApiResponse<CurrentStock>>(`${PELLETS_API}/current`);
  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.error || 'Failed to fetch current stock');
  }
  return response.data.data;
};

export const getStatistics = async (): Promise<{
  consumption: ConsumptionStats;
  projection: StockProjection;
}> => {
  const response = await axios.get<
    ApiResponse<{ consumption: ConsumptionStats; projection: StockProjection }>
  >(`${PELLETS_API}/stats`);
  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.error || 'Failed to fetch statistics');
  }
  return response.data.data;
};

export const getDashboardData = async (): Promise<DashboardData> => {
  const response = await axios.get<ApiResponse<DashboardData>>(`${PELLETS_API}/dashboard`);
  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.error || 'Failed to fetch dashboard data');
  }
  return response.data.data;
};

export const getStockAtDate = async (
  date: string
): Promise<{ remaining_bags: number; remaining_kg: number }> => {
  const response = await axios.get<
    ApiResponse<{ remaining_bags: number; remaining_kg: number }>
  >(`${PELLETS_API}/stock-at/${date}`);
  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.error || 'Failed to fetch stock at date');
  }
  return response.data.data;
};

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

/**
 * Calculate week year string (ISO 8601 format) from a date
 * @param date - Date object
 * @returns Week year string in format "YYYY-WNN"
 */
export const getWeekYear = (date: Date): string => {
  const tempDate = new Date(date);
  tempDate.setHours(0, 0, 0, 0);
  // Thursday in current week decides the year
  tempDate.setDate(tempDate.getDate() + 3 - ((tempDate.getDay() + 6) % 7));
  const week1 = new Date(tempDate.getFullYear(), 0, 4);
  const weekNumber = Math.ceil(
    (((tempDate.getTime() - week1.getTime()) / 86400000 + week1.getDay() + 1) / 7)
  );
  const year = tempDate.getFullYear();
  return `${year}-W${String(weekNumber).padStart(2, '0')}`;
};

/**
 * Get week start and end dates from a date
 * @param date - Date object
 * @returns Object with weekStart and weekEnd Date objects
 */
export const getWeekBounds = (date: Date): { weekStart: Date; weekEnd: Date } => {
  const tempDate = new Date(date);
  const day = tempDate.getDay();
  const diff = tempDate.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday

  const weekStart = new Date(tempDate.setDate(diff));
  weekStart.setHours(0, 0, 0, 0);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  return { weekStart, weekEnd };
};

/**
 * Format date to ISO string (YYYY-MM-DD)
 * @param date - Date object
 * @returns ISO date string
 */
export const formatDateISO = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

/**
 * Calculate total cost from pallet count and price
 * @param numPallets - Number of pallets
 * @param pricePerPallet - Price per pallet
 * @returns Total cost
 */
export const calculateTotalCost = (numPallets: number, pricePerPallet: number): number => {
  return numPallets * pricePerPallet;
};

/**
 * Calculate total weight in tons
 * @param numPallets - Number of pallets
 * @param bagsPerPallet - Bags per pallet
 * @param weightPerBag - Weight per bag in kg
 * @returns Total weight in tons
 */
export const calculateTotalTons = (
  numPallets: number,
  bagsPerPallet: number,
  weightPerBag: number
): number => {
  return (numPallets * bagsPerPallet * weightPerBag) / 1000;
};

/**
 * Get stock status color based on percentage
 * @param percentage - Stock percentage (0-100)
 * @returns Color class/hex
 */
export const getStockStatusColor = (percentage: number): string => {
  if (percentage > 50) return '#10b981'; // Green
  if (percentage > 20) return '#f59e0b'; // Yellow
  if (percentage > 0) return '#ef4444'; // Red
  return '#6b7280'; // Gray
};

/**
 * Get stock status label
 * @param percentage - Stock percentage (0-100)
 * @returns Status label
 */
export const getStockStatusLabel = (
  percentage: number
): 'Good Stock' | 'Low Stock' | 'Critical' | 'Empty' => {
  if (percentage > 50) return 'Good Stock';
  if (percentage > 20) return 'Low Stock';
  if (percentage > 0) return 'Critical';
  return 'Empty';
};

/**
 * Get stock status emoji
 * @param percentage - Stock percentage (0-100)
 * @returns Emoji indicator
 */
export const getStockStatusEmoji = (percentage: number): string => {
  if (percentage > 50) return '🟢';
  if (percentage > 20) return '🟡';
  if (percentage > 0) return '🔴';
  return '⚫';
};

/**
 * Format number with thousand separators
 * @param num - Number to format
 * @param decimals - Number of decimal places
 * @returns Formatted string
 */
export const formatNumber = (num: number, decimals = 0): string => {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
};
