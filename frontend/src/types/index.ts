export interface ProductData {
  product_name: string;
  price: number;
  currency: string;
  brand?: string;
  in_stock: boolean;
  description?: string;
  specifications?: Record<string, any>;
}

export interface ScrapeResult {
  success: boolean;
  data?: {
    products: ProductData[];
    count: number;
  };
  url: string;
  timestamp: string;
  saved: boolean;
  savedCount?: number;
  error?: string;
}

export interface SearchResult {
  title: string;
  url: string;
  description?: string;
}

export interface PriceHistoryItem {
  id: number;
  timestamp: string;
  product_name: string;
  price: number;
  currency: string;
  brand?: string;
  url: string;
  in_stock: boolean;
}

export interface ScrapeRequest {
  url: string;
  saveToDb: boolean;
}

export interface SearchRequest {
  query: string;
  limit: number;
}

export interface SearchAndScrapeRequest {
  query: string;
  limit?: number;
  saveToDb?: boolean;
  maxSites?: number;
  maxPages?: number;
}

export interface SearchAndScrapeResult {
  success: boolean;
  query: string;
  searchEngine: string;
  searchResultsCount: number;
  scrapableSitesCount: number;
  scrapedSitesCount: number;
  totalProducts: number;
  scrapedData: Array<{
    url: string;
    title: string;
    products: ProductData[];
    count: number;
    saved: boolean;
    savedCount: number;
    pagesScraped?: number;
  }>;
  message?: string;
}

// Price Comparison Types
export interface ComparisonProduct extends ProductData {
  status: 'new' | 'price_increase' | 'price_decrease' | 'unchanged';
  oldPrice?: number;
  newPrice?: number;
  changePercent?: number;
  changeAmount?: number;
  lastChecked?: string;
  url?: string;
}

export interface ComparisonSummary {
  total: number;
  new: number;
  updated: number;
  unchanged: number;
}

export interface PriceComparisonResult {
  success: boolean;
  query: string;
  searchEngine: string;
  totalScraped: number;
  saved: boolean;
  savedCount: number;
  comparison: {
    summary: ComparisonSummary;
    newProducts: ComparisonProduct[];
    priceIncreases: ComparisonProduct[];
    priceDecreases: ComparisonProduct[];
    unchanged: ComparisonProduct[];
  };
}

export interface SearchScrapeCompareRequest {
  query: string;
  limit?: number;
  saveToDb?: boolean;
  maxSites?: number;
  maxPages?: number;
  priceChangeThreshold?: number;
}

export type ScraperMode = 'search' | 'scrape' | 'auto' | 'compare';

export interface ScraperState {
  mode: ScraperMode;
  loading: boolean;
  error: string | null;
  searchResults: SearchResult[];
  scrapeResult: ScrapeResult | null;
}

// AI Types
export interface AIInsight {
  title: string;
  description: string;
  type: 'trend' | 'anomaly' | 'opportunity' | 'warning';
  confidence: number;
  actionable: boolean;
}

export interface AIInsightsResponse {
  insights: AIInsight[];
  summary: string;
  data_period: string;
  sample_count: number;
}

export interface AIRecommendation {
  recommendation: 'BUY_NOW' | 'WAIT' | 'NEUTRAL';
  reasoning: string;
  confidence: number;
  factors: string[];
  estimated_savings?: number;
}

export interface AIChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AIChatRequest {
  messages: AIChatMessage[];
}

export interface AIChatResponse {
  response: string;
  context_included: boolean;
}

export interface AITestResponse {
  connected: boolean;
  model: string;
}

// Consumption Types
export interface ConsumptionRecord {
  consumption_date: string;
  kg_consumed: number;
  notes?: string;
}

export interface MonthlyConsumption {
  month: string;
  total_kg: number;
  avg_daily_kg: number;
  peak_kg: number;
  record_count: number;
}

export interface YearlyConsumption {
  year: number;
  total_kg: number;
  avg_monthly_kg: number;
  peak_month_kg: number;
  lowest_month_kg: number;
  months_count: number;
}

export interface SeasonalConsumption {
  year: number;
  season: 'heating_season' | 'non_heating_season';
  total_kg: number;
  avg_kg: number;
  months_count: number;
}

export interface ConsumptionTrends {
  overall: {
    total_months: number;
    total_kg: number;
    avg_kg_monthly: number;
    peak_kg: number;
    lowest_kg: number;
    earliest_date: string;
    latest_date: string;
  };
  yearly: YearlyConsumption[];
  seasonal: SeasonalConsumption[];
  recent_trend: Array<{
    consumption_date: string;
    kg_consumed: number;
    notes?: string;
    moving_avg_3months: number;
  }>;
}

export interface ConsumptionPriceComparison {
  comparison: Array<{
    month: string;
    kg_consumed: number;
    avg_price: number | null; // Price per kg
    avg_price_per_ton?: number | null; // Price per ton (for reference)
    avg_price_type?: 'monthly' | 'historical' | 'overall_avg';
    price_confidence?: number;
    min_price: number | null; // Min price per kg
    max_price: number | null; // Max price per kg
    price_variance: number | null; // Variance per kg
    estimated_cost: string | null;
  }>;
  summary: {
    total_kg: number;
    total_cost: string;
    avg_price_per_ton: string | null;
    avg_cost_per_kg: string | null;
    period: string;
    months_with_monthly_price?: number;
    months_with_historical_price?: number;
    months_with_overall_price?: number;
    price_confidence?: string;
    price_calculation_method?: string;
    cost_trend?: {
      recent_avg: string;
      older_avg: string;
      percent_change: string;
      direction: 'increasing' | 'decreasing' | 'stable';
    };
    best_month?: {
      month: string;
      price: string;
    };
    worst_month?: {
      month: string;
      price: string;
    };
    potential_savings?: {
      amount: string;
      percent: string;
      best_price: string;
      best_month: string;
    };
  };
}

export interface ConsumptionStats {
  total_months: number;
  total_kg: number;
  avg_monthly_kg: number;
  peak_month_kg: number;
  last_month_kg: number;
  last_update: string;
}
