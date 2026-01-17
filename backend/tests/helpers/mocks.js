/**
 * Mock Helpers for External Services
 *
 * Provides mocks for:
 * - Firecrawl API
 * - OpenAI API
 * - Database connections
 * - Search APIs (Brave, Exa)
 *
 * Created: Phase 3.2 - Backend Testing
 */

import { jest } from '@jest/globals';

/**
 * Mock Firecrawl SDK responses
 */
export const mockFirecrawl = {
  search: jest.fn().mockResolvedValue({
    success: true,
    data: [
      {
        title: 'Test Product 1',
        url: 'https://example.com/product1',
        markdown: 'Product description',
      },
      {
        title: 'Test Product 2',
        url: 'https://example.com/product2',
        markdown: 'Another product',
      },
    ],
  }),

  scrapeUrl: jest.fn().mockResolvedValue({
    success: true,
    data: {
      markdown: 'Scraped content',
      metadata: { title: 'Test Product' },
    },
  }),

  extractUrl: jest.fn().mockResolvedValue({
    success: true,
    data: {
      product_name: 'Test Pellets',
      price: 299.99,
      currency: 'EUR',
      brand: 'TestBrand',
      in_stock: true,
      description: 'High quality pellets',
    },
  }),
};

/**
 * Mock OpenAI API responses
 */
export const mockOpenAI = {
  chat: {
    completions: {
      create: jest.fn().mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({
              answer: 'Based on the data, Store A had the cheapest prices.',
              insights: ['Price trend is downward', 'Best time to buy is winter'],
              confidence: 0.85,
            }),
          },
        }],
        usage: {
          prompt_tokens: 100,
          completion_tokens: 50,
          total_tokens: 150,
        },
      }),
    },
  },
};

/**
 * Mock Database Query Results
 */
export const mockDatabase = {
  // Pellet stock purchases
  stockPurchases: [
    {
      id: 1,
      purchase_date: '2025-01-15',
      num_pallets: 2,
      bags_per_pallet: 65,
      weight_per_bag: 15,
      supplier: 'Test Supplier',
      total_bags: 130,
      created_at: new Date(),
    },
  ],

  // Consumption records
  consumptionRecords: [
    {
      id: 1,
      week_year: '2025-W03',
      week_start_date: '2025-01-13',
      week_end_date: '2025-01-19',
      bags_used: 3,
      manual_weight_kg: 45,
      created_at: new Date(),
    },
  ],

  // Price history
  priceHistory: [
    {
      id: 1,
      timestamp: new Date(),
      store: 'Test Store',
      product_name: 'Test Pellets',
      brand: 'TestBrand',
      price: 299.99,
      currency: 'EUR',
      unit: 'pallet',
      quantity: 65,
      in_stock: true,
      url: 'https://example.com/product',
    },
  ],

  // Mock query function
  query: jest.fn().mockImplementation((sql, params) => {
    // Default empty result
    return Promise.resolve({ rows: [], rowCount: 0 });
  }),
};

/**
 * Mock Brave Search API response
 */
export const mockBraveSearch = {
  web: {
    results: [
      {
        title: 'Test Product - Brave Result',
        url: 'https://example.com/brave-product',
        description: 'Product found via Brave search',
      },
    ],
  },
};

/**
 * Mock Exa AI Search response
 */
export const mockExaSearch = {
  results: [
    {
      title: 'Test Product - Exa Result',
      url: 'https://example.com/exa-product',
      text: 'Product found via Exa search',
      score: 0.95,
    },
  ],
};

/**
 * Reset all mocks (call in beforeEach)
 */
export const resetAllMocks = () => {
  jest.clearAllMocks();
  mockFirecrawl.search.mockClear();
  mockFirecrawl.scrapeUrl.mockClear();
  mockFirecrawl.extractUrl.mockClear();
  mockOpenAI.chat.completions.create.mockClear();
  mockDatabase.query.mockClear();
};

/**
 * Setup mock implementations for a test
 */
export const setupMocks = (customMocks = {}) => {
  return {
    firecrawl: { ...mockFirecrawl, ...customMocks.firecrawl },
    openai: { ...mockOpenAI, ...customMocks.openai },
    database: { ...mockDatabase, ...customMocks.database },
  };
};

export default {
  mockFirecrawl,
  mockOpenAI,
  mockDatabase,
  mockBraveSearch,
  mockExaSearch,
  resetAllMocks,
  setupMocks,
};
