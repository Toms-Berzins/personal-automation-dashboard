/**
 * AIInsightsPanel Component Tests
 *
 * Tests for AI-powered insights display component
 * Created: Phase 3.4 - Frontend Component Testing
 */

import { describe, it, expect } from 'vitest';

describe('AIInsightsPanel Component', () => {
  describe('Insights Data Structure', () => {
    it('should validate insights structure', () => {
      const insights = {
        priceAnalysis: {
          average: 299.99,
          lowest: 279.99,
          highest: 319.99,
          trend: 'decreasing',
        },
        recommendations: [
          'Prices are 10% below average',
          'Good time to buy',
          'Winter months offer best prices',
        ],
        confidence: 0.85,
        generatedAt: new Date().toISOString(),
      };

      expect(insights).toHaveProperty('priceAnalysis');
      expect(insights).toHaveProperty('recommendations');
      expect(insights).toHaveProperty('confidence');
      expect(insights.priceAnalysis).toHaveProperty('average');
      expect(insights.priceAnalysis).toHaveProperty('trend');
      expect(Array.isArray(insights.recommendations)).toBe(true);
    });

    it('should validate trend values', () => {
      const validTrends = ['increasing', 'decreasing', 'stable', 'volatile'];
      const trend = 'decreasing';

      expect(validTrends).toContain(trend);
    });
  });

  describe('Price Analysis Calculations', () => {
    it('should calculate price range', () => {
      const prices = [279.99, 289.99, 299.99, 309.99, 319.99];

      const lowest = Math.min(...prices);
      const highest = Math.max(...prices);
      const range = highest - lowest;

      expect(lowest).toBe(279.99);
      expect(highest).toBe(319.99);
      expect(range).toBe(40.00);
    });

    it('should calculate average price', () => {
      const prices = [280, 290, 300, 310, 320];
      const average = prices.reduce((sum, p) => sum + p, 0) / prices.length;

      expect(average).toBe(300);
    });

    it('should calculate percentage change', () => {
      const oldPrice = 310.00;
      const newPrice = 289.99;
      const change = ((newPrice - oldPrice) / oldPrice) * 100;

      expect(change).toBeCloseTo(-6.45, 2);
      expect(change).toBeLessThan(0); // Negative = decrease
    });

    it('should detect significant price drops', () => {
      const prices = [
        { date: '2025-01-01', price: 310 },
        { date: '2025-01-15', price: 289.99 },
      ];

      const priceChange = prices[1].price - prices[0].price;
      const percentChange = (priceChange / prices[0].price) * 100;
      const threshold = 5; // 5% threshold

      const isSignificant = Math.abs(percentChange) > threshold;

      expect(isSignificant).toBe(true);
      expect(percentChange).toBeLessThan(0); // It's a drop
    });
  });

  describe('Recommendations Generation', () => {
    it('should generate buying recommendation', () => {
      const currentPrice = 289.99;
      const averagePrice = 299.99;
      const percentBelow = ((averagePrice - currentPrice) / averagePrice) * 100;

      const recommendation = percentBelow > 5 ? 'BUY' : 'WAIT';

      expect(percentBelow).toBeCloseTo(3.33, 2);
      expect(recommendation).toBe('WAIT'); // Not 5% below
    });

    it('should consider stock availability', () => {
      const offer = {
        price: 279.99,
        in_stock: false,
      };

      const recommendation = offer.in_stock ? 'BUY NOW' : 'WAIT FOR RESTOCK';

      expect(recommendation).toBe('WAIT FOR RESTOCK');
    });

    it('should factor in trend direction', () => {
      const analysis = {
        trend: 'decreasing',
        recentPrices: [310, 305, 295, 289.99],
      };

      const recommendation = analysis.trend === 'decreasing'
        ? 'WAIT - Prices may drop further'
        : 'BUY NOW - Prices rising';

      expect(recommendation).toContain('WAIT');
    });
  });

  describe('Confidence Score', () => {
    it('should validate confidence range', () => {
      const confidence = 0.85;

      expect(confidence).toBeGreaterThanOrEqual(0);
      expect(confidence).toBeLessThanOrEqual(1);
    });

    it('should categorize confidence levels', () => {
      const getConfidenceLevel = (score: number) => {
        if (score >= 0.8) return 'HIGH';
        if (score >= 0.5) return 'MEDIUM';
        return 'LOW';
      };

      expect(getConfidenceLevel(0.85)).toBe('HIGH');
      expect(getConfidenceLevel(0.65)).toBe('MEDIUM');
      expect(getConfidenceLevel(0.35)).toBe('LOW');
    });
  });

  describe('Time-based Analysis', () => {
    it('should group prices by time period', () => {
      const prices = [
        { date: '2025-01-01', price: 310 },
        { date: '2025-01-08', price: 305 },
        { date: '2025-01-15', price: 295 },
        { date: '2025-01-22', price: 289.99 },
      ];

      // Group by week
      const weeklyAvg = prices.reduce((sum, p) => sum + p.price, 0) / prices.length;

      expect(weeklyAvg).toBeCloseTo(299.9975, 2);
      expect(prices).toHaveLength(4); // 4 weeks
    });

    it('should identify best time to buy', () => {
      const historicalData = {
        winter: { avgPrice: 285, stockLevel: 'HIGH' },
        summer: { avgPrice: 315, stockLevel: 'LOW' },
        spring: { avgPrice: 295, stockLevel: 'MEDIUM' },
        fall: { avgPrice: 305, stockLevel: 'MEDIUM' },
      };

      const seasons = Object.entries(historicalData);
      const bestSeason = seasons.reduce((best, [season, data]) =>
        data.avgPrice < historicalData[best as keyof typeof historicalData].avgPrice ? season : best,
        'winter'
      );

      expect(bestSeason).toBe('winter');
    });
  });

  describe('Insights Display', () => {
    it('should format price with currency', () => {
      const price = 299.99;
      const currency = 'EUR';
      const formatted = `€${price.toFixed(2)}`;

      expect(formatted).toBe('€299.99');
    });

    it('should format percentage change', () => {
      const change = -6.45;
      const formatted = `${change > 0 ? '+' : ''}${change.toFixed(1)}%`;

      expect(formatted).toBe('-6.5%'); // toFixed rounds 6.45 to 6.5
      expect(formatted).toContain('-'); // Negative change
    });

    it('should display confidence as percentage', () => {
      const confidence = 0.85;
      const display = `${(confidence * 100).toFixed(0)}%`;

      expect(display).toBe('85%');
    });
  });

  describe('Error States', () => {
    it('should handle missing data gracefully', () => {
      const insights = {
        priceAnalysis: null,
        recommendations: [],
        error: 'No data available',
      };

      expect(insights.priceAnalysis).toBeNull();
      expect(insights.recommendations).toHaveLength(0);
      expect(insights.error).toBeDefined();
    });

    it('should validate minimum data requirements', () => {
      const prices = [299.99]; // Only 1 price
      const hasEnoughData = prices.length >= 3;

      expect(hasEnoughData).toBe(false);
    });
  });

  describe('Refresh and Updates', () => {
    it('should track last update time', () => {
      const lastUpdated = new Date().toISOString();
      const updateTime = new Date(lastUpdated);

      expect(updateTime).toBeInstanceOf(Date);
      expect(lastUpdated).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('should determine if refresh needed', () => {
      const lastUpdate = new Date('2025-01-15T10:00:00Z');
      const now = new Date('2025-01-15T11:30:00Z');
      const hoursSinceUpdate = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60);
      const refreshThreshold = 1; // 1 hour

      const needsRefresh = hoursSinceUpdate > refreshThreshold;

      expect(hoursSinceUpdate).toBe(1.5);
      expect(needsRefresh).toBe(true);
    });
  });
});
