/**
 * TypeScript interfaces for Pellet Stock Tracking System
 */

// ==========================================
// STOCK PURCHASE TYPES
// ==========================================

export interface StockPurchase {
  id: number;
  purchase_date: string; // ISO date format
  num_pallets?: number; // Optional: used for pallet-based entry
  num_bags?: number; // Optional: used for direct bag entry
  bags_per_pallet?: number; // Optional: only needed when using pallets
  weight_per_bag: number;
  total_bags: number; // Calculated: num_bags OR (num_pallets * bags_per_pallet)
  total_weight_kg: number; // Calculated: total_bags * weight_per_bag
  total_weight_tons: number; // Calculated: total_weight_kg / 1000
  notes?: string;
  supplier?: string;
  price_per_pallet?: number;
  total_cost?: number;
  created_at: string;
  updated_at: string;
}

export interface CreateStockPurchase {
  purchase_date: string;
  num_pallets?: number; // Either num_pallets OR num_bags must be provided
  num_bags?: number; // Either num_pallets OR num_bags must be provided
  bags_per_pallet?: number; // Default: 65 (required when using num_pallets)
  weight_per_bag?: number; // Default: 15.0
  notes?: string;
  supplier?: string;
  price_per_pallet?: number;
  total_cost?: number;
}

export interface UpdateStockPurchase {
  purchase_date?: string;
  num_pallets?: number;
  num_bags?: number;
  bags_per_pallet?: number;
  weight_per_bag?: number;
  notes?: string;
  supplier?: string;
  price_per_pallet?: number;
  total_cost?: number;
}

// ==========================================
// CONSUMPTION TRACKING TYPES
// ==========================================

export interface Consumption {
  id: number;
  week_year: string; // Format: "2025-W48"
  week_start_date: string; // ISO date format
  week_end_date: string; // ISO date format
  bags_used: number;
  weight_kg: number; // Calculated: bags_used * 15.0
  manual_weight_kg?: number; // Optional manual override
  notes?: string;
  temperature_avg?: number; // Average temperature for the week
  heating_hours?: number; // Hours heating system was active
  created_at: string;
  updated_at: string;
}

export interface CreateConsumption {
  week_year: string;
  week_start_date: string;
  week_end_date: string;
  bags_used: number;
  manual_weight_kg?: number;
  notes?: string;
  temperature_avg?: number;
  heating_hours?: number;
}

// ==========================================
// ANALYTICS & STATISTICS TYPES
// ==========================================

export interface CurrentStock {
  total_purchased_bags: number;
  total_purchased_kg: number;
  total_purchased_tons: number;
  total_consumed_bags: number;
  total_consumed_kg: number;
  remaining_bags: number;
  remaining_kg: number;
  remaining_tons: number;
  stock_percentage: number;
}

export interface ConsumptionStats {
  total_weeks_logged: number;
  avg_bags_per_week: number;
  min_bags_per_week: number;
  max_bags_per_week: number;
  total_bags_consumed: number;
  avg_kg_per_week: number;
  total_kg_consumed: number;
}

export interface StockProjection {
  remaining_bags: number;
  remaining_kg: number;
  stock_percentage: number;
  avg_bags_per_week: number;
  estimated_weeks_remaining: number | null;
  estimated_depletion_date: string | null; // ISO date format
  stock_status: 'good' | 'low' | 'critical' | 'empty';
}

export interface DashboardData {
  currentStock: CurrentStock;
  statistics: ConsumptionStats;
  projection: StockProjection;
  recentConsumption: Consumption[];
  recentPurchases: StockPurchase[];
}

// ==========================================
// CHART DATA TYPES
// ==========================================

export interface ConsumptionChartData {
  labels: string[]; // Week labels (e.g., "W48", "W49")
  datasets: {
    label: string;
    data: number[]; // Bags used per week
    backgroundColor?: string;
    borderColor?: string;
    borderWidth?: number;
  }[];
}

export interface StockTimelineData {
  date: string;
  remaining_bags: number;
  remaining_kg: number;
}

// ==========================================
// API RESPONSE TYPES
// ==========================================

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  details?: string;
}

export interface ApiListResponse<T> {
  success: boolean;
  count: number;
  data: T[];
  error?: string;
}

// ==========================================
// FORM TYPES (for React components)
// ==========================================

export interface StockPurchaseFormData {
  purchase_date: Date | null;
  entry_mode: 'pallets' | 'bags'; // Toggle between pallet and bag entry
  num_pallets: number;
  num_bags: number;
  bags_per_pallet: number;
  weight_per_bag: number;
  notes: string;
  supplier: string;
  price_per_pallet: number | '';
  total_cost: number | '';
}

export interface ConsumptionFormData {
  week_date: Date | null; // User selects date, we calculate week bounds
  bags_used: number;
  manual_weight_kg: number | '';
  notes: string;
  temperature_avg: number | '';
  heating_hours: number | '';
}

// ==========================================
// UTILITY TYPES
// ==========================================

export interface WeekInfo {
  weekYear: string; // e.g., "2025-W48"
  weekStart: string; // ISO date
  weekEnd: string; // ISO date
  weekNumber: number;
  year: number;
}

export type StockStatus = 'good' | 'low' | 'critical' | 'empty';

export interface StockAlert {
  type: 'info' | 'warning' | 'error';
  message: string;
  action?: string;
}

// ==========================================
// COMPONENT PROPS TYPES
// ==========================================

export interface PelletTrackerProps {
  initialView?: 'overview' | 'purchase' | 'consumption' | 'history';
}

export interface StockOverviewProps {
  currentStock: CurrentStock;
  projection: StockProjection;
  onQuickEntry?: () => void;
  onAddStock?: () => void;
}

export interface ConsumptionHistoryProps {
  consumptions: Consumption[];
  onEdit?: (consumption: Consumption) => void;
  onDelete?: (id: number) => void;
}

export interface ConsumptionChartProps {
  consumptions: Consumption[];
  height?: number;
}

export interface StockPurchaseFormProps {
  initialData?: StockPurchase;
  onSubmit: (data: CreateStockPurchase) => Promise<void>;
  onCancel?: () => void;
}

export interface WeeklyConsumptionFormProps {
  initialData?: Consumption;
  onSubmit: (data: CreateConsumption) => Promise<void>;
  onCancel?: () => void;
}
