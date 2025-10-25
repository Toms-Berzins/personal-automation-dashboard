import axios from 'axios';
import type { ScrapeRequest, SearchRequest, ScrapeResult, SearchResult, PriceHistoryItem } from '../types';

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
