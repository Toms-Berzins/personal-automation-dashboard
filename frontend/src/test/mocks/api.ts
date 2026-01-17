/**
 * Mock API Helpers for Component Tests
 *
 * Provides mocks for API calls used in components
 * Created: Phase 3.4 - Frontend Component Testing
 */

import { vi } from 'vitest';

/**
 * Mock API responses
 */
export const mockApiResponses = {
  // Scraper search results
  searchResults: {
    results: [
      {
        title: 'Test Product 1',
        url: 'https://example.com/product1',
        snippet: 'Great pellets at low price',
      },
      {
        title: 'Test Product 2',
        url: 'https://example.com/product2',
        snippet: 'Premium quality pellets',
      },
    ],
  },

  // Price history data
  priceHistory: {
    prices: [
      {
        id: 1,
        timestamp: '2025-01-01T00:00:00Z',
        store: 'Store A',
        product_name: 'Test Pellets 15kg',
        price: 299.99,
        currency: 'EUR',
        in_stock: true,
      },
      {
        id: 2,
        timestamp: '2025-01-08T00:00:00Z',
        store: 'Store A',
        product_name: 'Test Pellets 15kg',
        price: 289.99,
        currency: 'EUR',
        in_stock: true,
      },
    ],
  },

  // AI insights
  aiInsights: {
    insights: [
      'Prices are trending downward',
      'Best time to buy is during winter',
      'Store A offers the best value',
    ],
    recommendation: 'BUY',
    confidence: 0.85,
  },

  // Pellet stock data
  pelletStock: {
    current_stock: {
      bags: 150,
      kg: 2250,
      tons: 2.25,
    },
    purchases: [
      {
        id: 1,
        purchase_date: '2025-01-15',
        num_pallets: 2,
        bags_per_pallet: 65,
        supplier: 'Test Supplier',
        total_cost: 5800,
      },
    ],
    consumption: [
      {
        id: 1,
        week_year: '2025-W03',
        bags_used: 12,
        week_start_date: '2025-01-13',
        week_end_date: '2025-01-19',
      },
    ],
  },

  // Usage statistics
  usageStats: {
    total_requests: 150,
    successful_requests: 142,
    failed_requests: 8,
    avg_response_time: 1250,
    last_7_days: [
      { date: '2025-01-15', count: 25 },
      { date: '2025-01-16', count: 30 },
      { date: '2025-01-17', count: 28 },
      { date: '2025-01-18', count: 22 },
      { date: '2025-01-19', count: 26 },
      { date: '2025-01-20', count: 18 },
      { date: '2025-01-21', count: 15 },
    ],
  },
};

/**
 * Mock axios API client
 */
export const createMockApi = () => {
  return {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  };
};

/**
 * Setup mock API responses
 */
export const setupMockResponses = (mockApi: ReturnType<typeof createMockApi>) => {
  // Search endpoint
  mockApi.post.mockImplementation((url: string) => {
    if (url.includes('/search')) {
      return Promise.resolve({ data: mockApiResponses.searchResults });
    }
    if (url.includes('/scrape')) {
      return Promise.resolve({ data: { success: true } });
    }
    if (url.includes('/ai/query')) {
      return Promise.resolve({ data: mockApiResponses.aiInsights });
    }
    return Promise.reject(new Error('Unknown endpoint'));
  });

  // GET endpoints
  mockApi.get.mockImplementation((url: string) => {
    if (url.includes('/history')) {
      return Promise.resolve({ data: mockApiResponses.priceHistory });
    }
    if (url.includes('/pellets/dashboard')) {
      return Promise.resolve({ data: mockApiResponses.pelletStock });
    }
    if (url.includes('/usage')) {
      return Promise.resolve({ data: mockApiResponses.usageStats });
    }
    return Promise.reject(new Error('Unknown endpoint'));
  });
};

/**
 * Reset all mocks
 */
export const resetApiMocks = (mockApi: ReturnType<typeof createMockApi>) => {
  mockApi.get.mockClear();
  mockApi.post.mockClear();
  mockApi.put.mockClear();
  mockApi.delete.mockClear();
};

export default {
  mockApiResponses,
  createMockApi,
  setupMockResponses,
  resetApiMocks,
};
