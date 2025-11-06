import axios from 'axios';
import type {
  ScrapeRequest,
  SearchRequest,
  SearchAndScrapeRequest,
  SearchScrapeCompareRequest,
  ScrapeResult,
  SearchResult,
  SearchAndScrapeResult,
  PriceComparisonResult,
  PriceHistoryItem,
  AIInsightsResponse,
  AIRecommendation,
  AIChatRequest,
  AIChatResponse,
  AITestResponse,
  ConsumptionStats,
  MonthlyConsumption,
  ConsumptionRecord,
  ConsumptionTrends,
  ConsumptionPriceComparison
} from '../types';

const API_BASE = '/api';

export const scraperApi = {
  search: async (params: SearchRequest): Promise<SearchResult[]> => {
    const response = await axios.post<{ results: SearchResult[] }>(
      `${API_BASE}/search`,
      params
    );
    return response.data.results;
  },

  scrape: async (params: ScrapeRequest): Promise<ScrapeResult> => {
    const response = await axios.post<ScrapeResult>(
      `${API_BASE}/scrape`,
      params
    );
    return response.data;
  },

  searchAndScrape: async (params: SearchAndScrapeRequest): Promise<SearchAndScrapeResult> => {
    const response = await axios.post<SearchAndScrapeResult>(
      `${API_BASE}/search-and-scrape`,
      params
    );
    return response.data;
  },

  searchScrapeCompare: async (params: SearchScrapeCompareRequest): Promise<PriceComparisonResult> => {
    const response = await axios.post<PriceComparisonResult>(
      `${API_BASE}/search-scrape-compare`,
      params
    );
    return response.data;
  },

  getHistory: async (productName: string, limit: number = 10): Promise<PriceHistoryItem[]> => {
    const response = await axios.get<{ history: PriceHistoryItem[] }>(
      `${API_BASE}/history`,
      {
        params: { product: productName, limit }
      }
    );
    return response.data.history;
  },

  getLatestPrices: async (): Promise<PriceHistoryItem[]> => {
    const response = await axios.get<{ prices: PriceHistoryItem[] }>(
      `${API_BASE}/prices/latest`
    );
    return response.data.prices;
  }
};

export const aiApi = {
  testConnection: async (): Promise<AITestResponse> => {
    const response = await axios.get<{ success: boolean; data: AITestResponse }>(
      `${API_BASE}/ai/test`
    );
    return response.data.data;
  },

  getInsights: async (productId?: number, days: number = 30): Promise<AIInsightsResponse | null> => {
    const params = productId ? { productId, days } : { days };
    const response = await axios.get<{ success: boolean; data: AIInsightsResponse | null }>(
      `${API_BASE}/ai/insights`,
      { params }
    );
    return response.data.data;
  },

  generateInsights: async (productId?: number, days: number = 30): Promise<AIInsightsResponse> => {
    const body = productId ? { productId, days } : { days };
    const response = await axios.post<{ success: boolean; data: AIInsightsResponse }>(
      `${API_BASE}/ai/insights/generate`,
      body
    );
    return response.data.data;
  },

  getRecommendation: async (productId: number): Promise<AIRecommendation> => {
    const response = await axios.post<{ success: boolean; data: { recommendation: AIRecommendation } }>(
      `${API_BASE}/ai/recommendation`,
      { productId }
    );
    return response.data.data.recommendation;
  },

  chat: async (request: AIChatRequest): Promise<AIChatResponse> => {
    const response = await axios.post<{ success: boolean; data: AIChatResponse }>(
      `${API_BASE}/ai/chat`,
      request
    );
    return response.data.data;
  },

  getSummary: async (productId: number, days: number = 30): Promise<string> => {
    const response = await axios.get<{ success: boolean; data: { summary: string } }>(
      `${API_BASE}/ai/summary/${productId}`,
      { params: { days } }
    );
    return response.data.data.summary;
  }
};

export const consumptionApi = {
  getStats: async (): Promise<ConsumptionStats> => {
    const response = await axios.get<{ success: boolean; data: ConsumptionStats }>(
      `${API_BASE}/consumption/stats`
    );
    return response.data.data;
  },

  getMonthly: async (): Promise<MonthlyConsumption[]> => {
    const response = await axios.get<{ success: boolean; data: MonthlyConsumption[] }>(
      `${API_BASE}/consumption/monthly`
    );
    return response.data.data;
  },

  getHistory: async (months: number = 12): Promise<ConsumptionRecord[]> => {
    const response = await axios.get<{ success: boolean; data: ConsumptionRecord[] }>(
      `${API_BASE}/consumption/history`,
      { params: { months } }
    );
    return response.data.data;
  },

  getTrends: async (): Promise<ConsumptionTrends> => {
    const response = await axios.get<{ success: boolean; data: ConsumptionTrends }>(
      `${API_BASE}/consumption/trends`
    );
    return response.data.data;
  },

  getComparison: async (months: number = 12): Promise<ConsumptionPriceComparison> => {
    const response = await axios.get<{ success: boolean; data: ConsumptionPriceComparison }>(
      `${API_BASE}/consumption/comparison`,
      { params: { months } }
    );
    return response.data.data;
  },

  addConsumption: async (data: { consumption_date: string; kg_consumed: number; notes?: string }): Promise<ConsumptionRecord> => {
    const response = await axios.post<{ success: boolean; data: ConsumptionRecord }>(
      `${API_BASE}/consumption`,
      data
    );
    return response.data.data;
  }
};
