/**
 * TypeScript interfaces for Heating Equipment Monitoring System
 */

// ==========================================
// EQUIPMENT TYPES
// ==========================================

export interface HeatingEquipment {
  id: number;
  name: string;
  type: 'boiler' | 'pellet_stove' | 'furnace' | 'heat_pump' | 'other';
  brand?: string;
  model?: string;
  location?: string;
  installation_date?: string; // ISO date format
  serial_number?: string;
  is_connected: boolean;
  last_connection?: string; // ISO timestamp
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface CreateEquipment {
  name: string;
  type: 'boiler' | 'pellet_stove' | 'furnace' | 'heat_pump' | 'other';
  brand?: string;
  model?: string;
  location?: string;
  installation_date?: string;
  serial_number?: string;
  metadata?: Record<string, any>;
}

export interface UpdateEquipment {
  name?: string;
  type?: 'boiler' | 'pellet_stove' | 'furnace' | 'heat_pump' | 'other';
  brand?: string;
  model?: string;
  location?: string;
  installation_date?: string;
  serial_number?: string;
  is_connected?: boolean;
  metadata?: Record<string, any>;
}

// ==========================================
// STATUS TYPES
// ==========================================

export interface EquipmentStatus {
  id: number;
  equipment_id: number;
  timestamp: string; // ISO timestamp

  // Burner metrics (in minutes)
  burner_work_min?: number;
  burner_starts_count?: number;
  feeder_work_min?: number;
  flame_duration_min?: number;
  fan_work_min?: number;

  // Temperature readings (in Celsius)
  boiler_temp?: number;
  flue_gas_temp?: number;
  room_temp?: number;
  target_temp?: number;

  // Power/consumption
  power_level?: number; // 0-100%
  fuel_consumption_kg?: number;

  // Operational state
  is_running: boolean;
  work_phase?: 'heating' | 'idle' | 'ignition' | 'shutdown' | 'cleaning' | 'error';

  // Additional metrics
  metrics?: Record<string, any>;
}

export interface CreateStatus {
  equipment_id: number;
  burner_work_min?: number;
  burner_starts_count?: number;
  feeder_work_min?: number;
  flame_duration_min?: number;
  fan_work_min?: number;
  boiler_temp?: number;
  flue_gas_temp?: number;
  room_temp?: number;
  target_temp?: number;
  power_level?: number;
  fuel_consumption_kg?: number;
  is_running?: boolean;
  work_phase?: string;
  metrics?: Record<string, any>;
}

export interface LatestEquipmentStatus extends EquipmentStatus {
  equipment_name: string;
  equipment_type: string;
}

// ==========================================
// PARAMETERS TYPES
// ==========================================

export interface EquipmentParameter {
  id: number;
  equipment_id: number;
  timestamp: string; // ISO timestamp
  parameter_name: string;
  work_phase?: string;
  description?: string;
  value?: string;
  unit?: string;
  time_on_regulator?: number; // minutes
  start_time?: string; // ISO timestamp
  end_time?: string; // ISO timestamp
  data?: Record<string, any>;
}

export interface CreateParameter {
  equipment_id: number;
  parameter_name: string;
  work_phase?: string;
  description?: string;
  value?: string;
  unit?: string;
  time_on_regulator?: number;
  start_time?: string;
  end_time?: string;
  data?: Record<string, any>;
}

// ==========================================
// ALERTS TYPES
// ==========================================

export type AlertType = 'error' | 'warning' | 'info';
export type AlertSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export interface EquipmentAlert {
  id: number;
  equipment_id: number;
  timestamp: string; // ISO timestamp
  type: AlertType;
  severity: AlertSeverity;
  code?: string;
  message: string;
  description?: string;
  acknowledged: boolean;
  acknowledged_at?: string; // ISO timestamp
  acknowledged_by?: string;
  resolved: boolean;
  resolved_at?: string; // ISO timestamp
  resolution_notes?: string;
  metadata?: Record<string, any>;
}

export interface CreateAlert {
  equipment_id: number;
  type: AlertType;
  severity: AlertSeverity;
  code?: string;
  message: string;
  description?: string;
  metadata?: Record<string, any>;
}

export interface AcknowledgeAlert {
  acknowledged_by?: string;
}

export interface ResolveAlert {
  resolution_notes?: string;
}

// ==========================================
// ANALYTICS & STATISTICS TYPES
// ==========================================

export interface UptimeData {
  date: string; // ISO date format
  total_runtime_hours: number;
  burner_starts: number;
  avg_temp: number;
}

export interface DetectedIssue {
  issue_type: string;
  issue_description: string;
  detected_at: string; // ISO timestamp
  severity: AlertSeverity;
}

export interface DashboardData {
  equipment: HeatingEquipment;
  latestStatus: LatestEquipmentStatus | null;
  recentAlerts: EquipmentAlert[];
  uptime: UptimeData[];
  issues: DetectedIssue[];
}

export interface AllDashboardData {
  equipment: HeatingEquipment[];
  latestStatuses: LatestEquipmentStatus[];
  alertSummary: AlertSummary[];
}

export interface AlertSummary {
  equipment_id: number;
  type: AlertType;
  severity: AlertSeverity;
  alert_count: number;
  unresolved_count: number;
  last_alert: string; // ISO timestamp
}

// ==========================================
// CHART DATA TYPES
// ==========================================

export interface StatusChartData {
  labels: string[]; // Timestamps or dates
  datasets: {
    label: string;
    data: number[];
    backgroundColor?: string;
    borderColor?: string;
    borderWidth?: number;
    fill?: boolean;
  }[];
}

export interface TemperatureChartData {
  timestamp: string;
  boiler_temp?: number;
  room_temp?: number;
  target_temp?: number;
  flue_gas_temp?: number;
}

export interface UptimeChartData {
  date: string;
  runtime_hours: number;
  starts: number;
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
  details?: string;
}

// ==========================================
// FORM TYPES (for React components)
// ==========================================

export interface EquipmentFormData {
  name: string;
  type: 'boiler' | 'pellet_stove' | 'furnace' | 'heat_pump' | 'other';
  brand: string;
  model: string;
  location: string;
  installation_date: Date | null;
  serial_number: string;
}

export interface StatusFormData {
  burner_work_min: number | '';
  burner_starts_count: number | '';
  feeder_work_min: number | '';
  flame_duration_min: number | '';
  fan_work_min: number | '';
  boiler_temp: number | '';
  room_temp: number | '';
  target_temp: number | '';
  power_level: number | '';
  is_running: boolean;
  work_phase: string;
}

export interface AlertFormData {
  type: AlertType;
  severity: AlertSeverity;
  code: string;
  message: string;
  description: string;
}

// ==========================================
// COMPONENT PROPS TYPES
// ==========================================

export interface HeatingDashboardProps {
  initialEquipmentId?: number;
  initialView?: 'overview' | 'status' | 'parameters' | 'alerts' | 'charts';
}

export interface EquipmentStatusCardProps {
  status: LatestEquipmentStatus | null;
  loading?: boolean;
  onRefresh?: () => void;
}

export interface ParametersTableProps {
  parameters: EquipmentParameter[];
  loading?: boolean;
  onRefresh?: () => void;
}

export interface AlertsLogProps {
  alerts: EquipmentAlert[];
  loading?: boolean;
  onAcknowledge?: (id: number) => Promise<void>;
  onResolve?: (id: number, notes?: string) => Promise<void>;
  onRefresh?: () => void;
}

export interface HeatingChartProps {
  data: TemperatureChartData[] | UptimeChartData[];
  type: 'temperature' | 'uptime' | 'fuel';
  height?: number;
  timeRange?: '24h' | '7d' | '30d';
}

export interface EquipmentSelectorProps {
  equipment: HeatingEquipment[];
  selected?: number;
  onChange: (equipmentId: number) => void;
}

// ==========================================
// UTILITY TYPES
// ==========================================

export interface ConnectionStatus {
  is_connected: boolean;
  last_connection?: string;
  status: 'online' | 'offline' | 'unknown';
  statusText: string;
}

export interface WorkPhaseInfo {
  phase: string;
  description: string;
  color: string;
  icon: string;
}

export interface AlertFilterOptions {
  type?: AlertType | 'all';
  severity?: AlertSeverity | 'all';
  resolved?: boolean | 'all';
}

export interface TimeRange {
  label: string;
  value: string;
  hours: number;
}

export const TIME_RANGES: TimeRange[] = [
  { label: '6 hours', value: '6h', hours: 6 },
  { label: '12 hours', value: '12h', hours: 12 },
  { label: '24 hours', value: '24h', hours: 24 },
  { label: '3 days', value: '3d', hours: 72 },
  { label: '1 week', value: '7d', hours: 168 },
  { label: '2 weeks', value: '14d', hours: 336 },
  { label: '1 month', value: '30d', hours: 720 },
];

export const WORK_PHASES: Record<string, WorkPhaseInfo> = {
  heating: { phase: 'Heating', description: 'Active heating cycle', color: '#ef4444', icon: '🔥' },
  idle: { phase: 'Idle', description: 'Standby mode', color: '#3b82f6', icon: '⏸️' },
  ignition: { phase: 'Ignition', description: 'Starting up', color: '#f59e0b', icon: '⚡' },
  shutdown: { phase: 'Shutdown', description: 'Shutting down', color: '#6b7280', icon: '⏹️' },
  cleaning: { phase: 'Cleaning', description: 'Self-cleaning cycle', color: '#8b5cf6', icon: '🧹' },
  error: { phase: 'Error', description: 'Error state', color: '#dc2626', icon: '⚠️' },
};

export const ALERT_COLORS: Record<AlertSeverity, string> = {
  critical: '#dc2626', // red-600
  high: '#ea580c', // orange-600
  medium: '#f59e0b', // amber-500
  low: '#3b82f6', // blue-500
  info: '#6b7280', // gray-500
};

export const ALERT_TYPE_COLORS: Record<AlertType, string> = {
  error: '#dc2626', // red-600
  warning: '#f59e0b', // amber-500
  info: '#3b82f6', // blue-500
};
