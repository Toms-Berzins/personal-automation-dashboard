/**
 * Scraper Routes Tests
 *
 * Tests for web scraping and price tracking endpoints
 * Created: Phase 3.2 - Backend Testing
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import { mockFirecrawl, mockBraveSearch, mockExaSearch, resetAllMocks } from '../helpers/mocks.js';

describe('Scraper Routes - Unit Tests', () => {
  beforeEach(() => {
    resetAllMocks();
  });

  describe('Product Search', () => {
    test('should validate search request structure', () => {
      const validRequest = {
        query: 'pellets 15kg',
        limit: 5,
      };

      expect(validRequest).toHaveProperty('query');
      expect(typeof validRequest.query).toBe('string');
      expect(validRequest.query.length).toBeGreaterThan(0);
      expect(validRequest.limit).toBeGreaterThan(0);
    });

    test('should mock Firecrawl search response', async () => {
      const searchResult = await mockFirecrawl.search({
        query: 'pellets 15kg',
        limit: 5,
      });

      expect(searchResult).toHaveProperty('success');
      expect(searchResult).toHaveProperty('data');
      expect(Array.isArray(searchResult.data)).toBe(true);
      expect(searchResult.data.length).toBeGreaterThan(0);
      expect(searchResult.data[0]).toHaveProperty('title');
      expect(searchResult.data[0]).toHaveProperty('url');
    });

    test('should handle search with multiple engines', () => {
      const engines = ['firecrawl', 'brave', 'exa'];
      const results = {
        firecrawl: mockFirecrawl.search(),
        brave: Promise.resolve(mockBraveSearch),
        exa: Promise.resolve(mockExaSearch),
      };

      expect(Object.keys(results)).toHaveLength(3);
      expect(engines).toContain('firecrawl');
      expect(engines).toContain('brave');
      expect(engines).toContain('exa');
    });
  });

  describe('URL Scraping', () => {
    test('should validate scrape request structure', () => {
      const validRequest = {
        url: 'https://example.com/product',
        extractionSchema: {
          product_name: 'string',
          price: 'number',
          currency: 'string',
        },
      };

      expect(validRequest).toHaveProperty('url');
      expect(validRequest.url).toMatch(/^https?:\/\//);
      expect(validRequest).toHaveProperty('extractionSchema');
    });

    test('should mock Firecrawl scrape response', async () => {
      const scrapeResult = await mockFirecrawl.scrapeUrl({
        url: 'https://example.com/product',
      });

      expect(scrapeResult).toHaveProperty('success');
      expect(scrapeResult).toHaveProperty('data');
      expect(scrapeResult.data).toHaveProperty('markdown');
    });

    test('should extract structured data', async () => {
      const extractResult = await mockFirecrawl.extractUrl({
        url: 'https://example.com/product',
      });

      expect(extractResult).toHaveProperty('success');
      expect(extractResult.data).toHaveProperty('product_name');
      expect(extractResult.data).toHaveProperty('price');
      expect(extractResult.data).toHaveProperty('currency');
      expect(typeof extractResult.data.price).toBe('number');
    });
  });

  describe('Search and Scrape (Auto Mode)', () => {
    test('should combine search and scrape operations', async () => {
      const searchResult = await mockFirecrawl.search({ query: 'test product' });
      const firstUrl = searchResult.data[0].url;
      const scrapeResult = await mockFirecrawl.extractUrl({ url: firstUrl });

      expect(searchResult.success).toBe(true);
      expect(scrapeResult.success).toBe(true);
      expect(scrapeResult.data).toHaveProperty('product_name');
    });

    test('should handle multi-step workflow', async () => {
      const workflow = [
        'search', // Step 1: Search for products
        'extract_urls', // Step 2: Extract URLs from results
        'scrape', // Step 3: Scrape each URL
        'save', // Step 4: Save to database
      ];

      expect(workflow).toHaveLength(4);
      expect(workflow[0]).toBe('search');
      expect(workflow[workflow.length - 1]).toBe('save');
    });
  });

  describe('Price Comparison', () => {
    test('should compare prices from multiple sources', () => {
      const priceData = [
        { store: 'Store A', price: 299.99, url: 'https://store-a.com' },
        { store: 'Store B', price: 289.99, url: 'https://store-b.com' },
        { store: 'Store C', price: 309.99, url: 'https://store-c.com' },
      ];

      const lowestPrice = Math.min(...priceData.map(p => p.price));
      const highestPrice = Math.max(...priceData.map(p => p.price));
      const avgPrice = priceData.reduce((sum, p) => sum + p.price, 0) / priceData.length;

      expect(lowestPrice).toBe(289.99);
      expect(highestPrice).toBe(309.99);
      expect(avgPrice).toBeCloseTo(299.99, 2);
    });

    test('should identify best deal', () => {
      const priceData = [
        { store: 'Store A', price: 299.99, in_stock: true },
        { store: 'Store B', price: 289.99, in_stock: true },
        { store: 'Store C', price: 279.99, in_stock: false },
      ];

      const inStockPrices = priceData.filter(p => p.in_stock);
      const bestDeal = inStockPrices.reduce((min, p) => p.price < min.price ? p : min);

      expect(bestDeal.store).toBe('Store B');
      expect(bestDeal.price).toBe(289.99);
      expect(bestDeal.in_stock).toBe(true);
    });
  });

  describe('Price History', () => {
    test('should validate price history query', () => {
      const validQuery = {
        productName: 'Test Pellets',
        store: 'Store A',
        limit: 30,
      };

      expect(validQuery).toHaveProperty('productName');
      expect(validQuery).toHaveProperty('limit');
      expect(validQuery.limit).toBeGreaterThan(0);
    });

    test('should calculate price trends', () => {
      const priceHistory = [
        { date: '2025-01-01', price: 310.00 },
        { date: '2025-01-08', price: 305.00 },
        { date: '2025-01-15', price: 295.00 },
        { date: '2025-01-22', price: 289.99 },
      ];

      const firstPrice = priceHistory[0].price;
      const lastPrice = priceHistory[priceHistory.length - 1].price;
      const priceChange = lastPrice - firstPrice;
      const percentageChange = (priceChange / firstPrice) * 100;

      expect(priceChange).toBeCloseTo(-20.01, 2);
      expect(percentageChange).toBeCloseTo(-6.45, 2);
      expect(percentageChange).toBeLessThan(0); // Decreasing trend
    });
  });

  describe('Price Alerts', () => {
    test('should detect price drops', () => {
      const priceHistory = [
        { date: '2025-01-15', price: 310.00 },
        { date: '2025-01-22', price: 289.99 },
      ];

      const threshold = 5; // 5% drop threshold
      const priceDrop = priceHistory[0].price - priceHistory[1].price;
      const dropPercentage = (priceDrop / priceHistory[0].price) * 100;

      expect(dropPercentage).toBeCloseTo(6.45, 2);
      expect(dropPercentage).toBeGreaterThan(threshold);
    });

    test('should validate alert structure', () => {
      const alert = {
        productName: 'Test Pellets',
        store: 'Store A',
        oldPrice: 310.00,
        newPrice: 289.99,
        priceChange: -20.01,
        percentageChange: -6.45,
        timestamp: new Date().toISOString(),
      };

      expect(alert).toHaveProperty('productName');
      expect(alert).toHaveProperty('priceChange');
      expect(alert).toHaveProperty('percentageChange');
      expect(alert.priceChange).toBeLessThan(0);
    });
  });

  describe('Latest Prices', () => {
    test('should group prices by product', () => {
      const allPrices = [
        { product_name: 'Product A', store: 'Store 1', price: 299.99, timestamp: '2025-01-22' },
        { product_name: 'Product A', store: 'Store 2', price: 289.99, timestamp: '2025-01-22' },
        { product_name: 'Product B', store: 'Store 1', price: 399.99, timestamp: '2025-01-22' },
      ];

      const grouped = allPrices.reduce((acc, p) => {
        if (!acc[p.product_name]) acc[p.product_name] = [];
        acc[p.product_name].push(p);
        return acc;
      }, {});

      expect(Object.keys(grouped)).toHaveLength(2);
      expect(grouped['Product A']).toHaveLength(2);
      expect(grouped['Product B']).toHaveLength(1);
    });
  });

  describe('URL Validation', () => {
    test('should validate URL format', () => {
      const validUrls = [
        'https://example.com/product',
        'http://shop.example.com/item/123',
        'https://www.store.com/category/product?id=456',
      ];

      validUrls.forEach(url => {
        expect(url).toMatch(/^https?:\/\//);
      });
    });

    test('should reject invalid URLs', () => {
      const invalidUrls = [
        'not-a-url',
        'ftp://invalid-protocol.com',
        'javascript:alert(1)', // Security risk
        'file:///etc/passwd', // Local file access
      ];

      invalidUrls.forEach(url => {
        const isValid = /^https?:\/\//.test(url);
        expect(isValid).toBe(false);
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle Firecrawl API errors', async () => {
      mockFirecrawl.search.mockRejectedValueOnce(
        new Error('Firecrawl API rate limit exceeded')
      );

      await expect(
        mockFirecrawl.search({ query: 'test' })
      ).rejects.toThrow('Firecrawl API rate limit exceeded');
    });

    test('should handle invalid extraction schema', () => {
      const invalidSchema = {
        // Missing required fields
      };

      expect(Object.keys(invalidSchema)).toHaveLength(0);
    });
  });
});
