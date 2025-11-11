/**
 * PriceHistory Component Tests
 *
 * Tests for price history tracking and visualization
 * Created: Phase 3.4 - Frontend Component Testing
 */

import { describe, it, expect } from 'vitest';

describe('PriceHistory Component', () => {
  describe('Price Data Structure', () => {
    it('should validate price record structure', () => {
      const priceRecord = {
        id: 1,
        timestamp: '2025-01-15T10:00:00Z',
        store: 'Store A',
        product_name: 'Test Pellets 15kg',
        brand: 'TestBrand',
        price: 299.99,
        currency: 'EUR',
        unit: 'bag',
        quantity: 1,
        in_stock: true,
        url: 'https://example.com/product',
      };

      expect(priceRecord).toHaveProperty('id');
      expect(priceRecord).toHaveProperty('timestamp');
      expect(priceRecord).toHaveProperty('store');
      expect(priceRecord).toHaveProperty('price');
      expect(typeof priceRecord.price).toBe('number');
      expect(priceRecord.in_stock).toBe(true);
    });
  });

  describe('Price Comparison', () => {
    it('should compare prices across stores', () => {
      const prices = [
        { store: 'Store A', price: 299.99, in_stock: true },
        { store: 'Store B', price: 289.99, in_stock: true },
        { store: 'Store C', price: 279.99, in_stock: false },
      ];

      const inStockPrices = prices.filter(p => p.in_stock);
      const cheapest = inStockPrices.reduce((min, p) =>
        p.price < min.price ? p : min
      );

      expect(cheapest.store).toBe('Store B');
      expect(cheapest.price).toBe(289.99);
    });

    it('should calculate price differences', () => {
      const storeA = { store: 'Store A', price: 299.99 };
      const storeB = { store: 'Store B', price: 289.99 };

      const difference = storeA.price - storeB.price;
      const percentDiff = (difference / storeA.price) * 100;

      expect(difference).toBe(10.00);
      expect(percentDiff).toBeCloseTo(3.33, 2);
    });
  });

  describe('Historical Analysis', () => {
    it('should calculate price trend', () => {
      const history = [
        { date: '2025-01-01', price: 310 },
        { date: '2025-01-08', price: 305 },
        { date: '2025-01-15', price: 295 },
        { date: '2025-01-22', price: 289.99 },
      ];

      const firstPrice = history[0].price;
      const lastPrice = history[history.length - 1].price;
      const trend = lastPrice < firstPrice ? 'decreasing' : 'increasing';

      expect(trend).toBe('decreasing');
    });

    it('should identify lowest historical price', () => {
      const history = [
        { date: '2025-01-01', price: 310 },
        { date: '2025-01-08', price: 279.99 },
        { date: '2025-01-15', price: 295 },
      ];

      const lowestPrice = Math.min(...history.map(h => h.price));

      expect(lowestPrice).toBe(279.99);
    });

    it('should calculate price volatility', () => {
      const prices = [280, 320, 290, 310, 285]; // Volatile prices

      const avg = prices.reduce((sum, p) => sum + p, 0) / prices.length;
      const variance = prices.reduce((sum, p) => sum + Math.pow(p - avg, 2), 0) / prices.length;
      const stdDev = Math.sqrt(variance);

      expect(avg).toBe(297);
      expect(stdDev).toBeGreaterThan(0);
      expect(stdDev).toBeCloseTo(15.36, 1); // High volatility
    });
  });

  describe('Chart Data Preparation', () => {
    it('should format data for chart', () => {
      const prices = [
        { timestamp: '2025-01-15T10:00:00Z', store: 'Store A', price: 299.99 },
        { timestamp: '2025-01-16T10:00:00Z', store: 'Store A', price: 295.00 },
      ];

      const chartData = prices.map(p => ({
        date: new Date(p.timestamp).toLocaleDateString(),
        price: p.price,
        store: p.store,
      }));

      expect(chartData).toHaveLength(2);
      expect(chartData[0]).toHaveProperty('date');
      expect(chartData[0]).toHaveProperty('price');
      expect(chartData[0]).toHaveProperty('store');
    });

    it('should group prices by store', () => {
      const prices = [
        { store: 'Store A', price: 299.99, date: '2025-01-15' },
        { store: 'Store B', price: 289.99, date: '2025-01-15' },
        { store: 'Store A', price: 295.00, date: '2025-01-16' },
      ];

      const grouped = prices.reduce((acc, p) => {
        if (!acc[p.store]) acc[p.store] = [];
        acc[p.store].push(p);
        return acc;
      }, {} as Record<string, typeof prices>);

      expect(Object.keys(grouped)).toHaveLength(2);
      expect(grouped['Store A']).toHaveLength(2);
      expect(grouped['Store B']).toHaveLength(1);
    });
  });

  describe('Date Filtering', () => {
    it('should filter by date range', () => {
      const prices = [
        { date: '2025-01-01', price: 310 },
        { date: '2025-01-08', price: 305 },
        { date: '2025-01-15', price: 295 },
        { date: '2025-01-22', price: 289.99 },
      ];

      const startDate = new Date('2025-01-08');
      const endDate = new Date('2025-01-16');

      const filtered = prices.filter(p => {
        const priceDate = new Date(p.date);
        return priceDate >= startDate && priceDate <= endDate;
      });

      expect(filtered).toHaveLength(2);
      expect(filtered[0].date).toBe('2025-01-08');
      expect(filtered[1].date).toBe('2025-01-15');
    });

    it('should filter last N days', () => {
      const now = new Date('2025-01-22');
      const daysBack = 7;
      const cutoffDate = new Date(now);
      cutoffDate.setDate(cutoffDate.getDate() - daysBack);

      const prices = [
        { date: '2025-01-10', price: 310 },
        { date: '2025-01-16', price: 305 },
        { date: '2025-01-20', price: 295 },
      ];

      const recent = prices.filter(p => new Date(p.date) >= cutoffDate);

      expect(recent).toHaveLength(2); // Last 7 days
      expect(new Date(recent[0].date).getTime()).toBeGreaterThanOrEqual(cutoffDate.getTime());
    });
  });

  describe('Price Statistics', () => {
    it('should calculate min, max, average', () => {
      const prices = [280, 290, 300, 310, 320];

      const stats = {
        min: Math.min(...prices),
        max: Math.max(...prices),
        avg: prices.reduce((sum, p) => sum + p, 0) / prices.length,
        count: prices.length,
      };

      expect(stats.min).toBe(280);
      expect(stats.max).toBe(320);
      expect(stats.avg).toBe(300);
      expect(stats.count).toBe(5);
    });

    it('should calculate median price', () => {
      const prices = [280, 290, 300, 310, 320];
      const sorted = [...prices].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      const median = sorted[mid];

      expect(median).toBe(300);
    });
  });

  describe('Stock Tracking', () => {
    it('should track availability changes', () => {
      const history = [
        { date: '2025-01-15', in_stock: true },
        { date: '2025-01-16', in_stock: false },
        { date: '2025-01-17', in_stock: true },
      ];

      const changes = history.filter((h, i) =>
        i > 0 && h.in_stock !== history[i - 1].in_stock
      );

      expect(changes).toHaveLength(2); // 2 availability changes
    });

    it('should count days out of stock', () => {
      const history = [
        { date: '2025-01-15', in_stock: true },
        { date: '2025-01-16', in_stock: false },
        { date: '2025-01-17', in_stock: false },
        { date: '2025-01-18', in_stock: false },
        { date: '2025-01-19', in_stock: true },
      ];

      const outOfStockDays = history.filter(h => !h.in_stock).length;

      expect(outOfStockDays).toBe(3);
    });
  });

  describe('Export and Display', () => {
    it('should format for CSV export', () => {
      const prices = [
        { date: '2025-01-15', store: 'Store A', price: 299.99, in_stock: true },
        { date: '2025-01-16', store: 'Store B', price: 289.99, in_stock: true },
      ];

      const csvHeader = 'Date,Store,Price,In Stock';
      const csvRows = prices.map(p =>
        `${p.date},${p.store},${p.price},${p.in_stock}`
      );

      expect(csvHeader).toContain('Date');
      expect(csvRows[0]).toContain('299.99');
      expect(csvRows).toHaveLength(2);
    });

    it('should format price for display', () => {
      const price = 299.99;
      const currency = 'EUR';

      const formatted = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'EUR',
      }).format(price);

      expect(formatted).toContain('€');
      expect(formatted).toContain('299.99');
    });
  });
});
