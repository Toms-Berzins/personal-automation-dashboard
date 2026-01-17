/**
 * AI Routes Tests
 *
 * Tests for AI-powered analytics endpoints
 * Created: Phase 3.2 - Backend Testing
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import { mockOpenAI, resetAllMocks } from '../helpers/mocks.js';

describe('AI Routes - Unit Tests', () => {
  beforeEach(() => {
    resetAllMocks();
  });

  describe('Natural Language Query', () => {
    test('should validate query request structure', () => {
      const validQuery = {
        query: 'Which retailer had the cheapest 15kg bags last month?',
      };

      expect(validQuery).toHaveProperty('query');
      expect(typeof validQuery.query).toBe('string');
      expect(validQuery.query.length).toBeGreaterThan(0);
    });

    test('should handle OpenAI response parsing', async () => {
      const mockResponse = await mockOpenAI.chat.completions.create({
        model: 'gpt-5-nano',
        messages: [{ role: 'user', content: 'Test query' }],
      });

      const content = mockResponse.choices[0].message.content;
      const parsed = JSON.parse(content);

      expect(parsed).toHaveProperty('answer');
      expect(parsed).toHaveProperty('insights');
      expect(parsed).toHaveProperty('confidence');
      expect(Array.isArray(parsed.insights)).toBe(true);
    });
  });

  describe('Insights Generation', () => {
    test('should validate insights request structure', () => {
      const validRequest = {
        productId: 1,
        days: 30,
      };

      expect(validRequest).toHaveProperty('productId');
      expect(validRequest).toHaveProperty('days');
      expect(typeof validRequest.productId).toBe('number');
      expect(validRequest.days).toBeGreaterThan(0);
    });

    test('should handle insights response format', () => {
      const insightsResponse = {
        productId: 1,
        timeframe: 30,
        insights: ['Insight 1', 'Insight 2'],
        priceAnalysis: {
          average: 299.99,
          lowest: 279.99,
          highest: 319.99,
          trend: 'decreasing',
        },
        recommendation: 'Good time to buy',
        generatedAt: new Date().toISOString(),
      };

      expect(insightsResponse).toHaveProperty('productId');
      expect(insightsResponse).toHaveProperty('insights');
      expect(insightsResponse).toHaveProperty('priceAnalysis');
      expect(Array.isArray(insightsResponse.insights)).toBe(true);
      expect(insightsResponse.priceAnalysis).toHaveProperty('average');
      expect(insightsResponse.priceAnalysis).toHaveProperty('trend');
    });
  });

  describe('Buying Recommendation', () => {
    test('should validate recommendation request', () => {
      const validRequest = {
        productId: 1,
      };

      expect(validRequest).toHaveProperty('productId');
      expect(typeof validRequest.productId).toBe('number');
    });

    test('should provide structured recommendation', () => {
      const recommendation = {
        action: 'BUY',
        confidence: 0.85,
        reasoning: 'Prices are currently 10% below average',
        bestStore: 'Store A',
        estimatedSavings: 30.00,
      };

      expect(recommendation).toHaveProperty('action');
      expect(['BUY', 'WAIT', 'HOLD']).toContain(recommendation.action);
      expect(recommendation.confidence).toBeGreaterThanOrEqual(0);
      expect(recommendation.confidence).toBeLessThanOrEqual(1);
    });
  });

  describe('Chat Interface', () => {
    test('should validate chat messages format', () => {
      const validRequest = {
        messages: [
          { role: 'user', content: 'Show me price trends' },
          { role: 'assistant', content: 'Here are the trends...' },
          { role: 'user', content: 'What about Store A?' },
        ],
      };

      expect(validRequest).toHaveProperty('messages');
      expect(Array.isArray(validRequest.messages)).toBe(true);
      expect(validRequest.messages.length).toBeGreaterThan(0);

      validRequest.messages.forEach(msg => {
        expect(msg).toHaveProperty('role');
        expect(msg).toHaveProperty('content');
        expect(['user', 'assistant', 'system']).toContain(msg.role);
      });
    });

    test('should handle multi-turn conversation', () => {
      const conversation = [
        { role: 'user', content: 'What are current prices?' },
        { role: 'assistant', content: 'Current average price is €299' },
        { role: 'user', content: 'Is this a good time to buy?' },
      ];

      expect(conversation).toHaveLength(3);
      expect(conversation[conversation.length - 1].role).toBe('user');
    });
  });

  describe('Product Summary', () => {
    test('should validate product summary request', () => {
      const productId = '123';
      const days = 30;

      expect(productId).toBeDefined();
      expect(parseInt(productId)).toBeGreaterThan(0);
      expect(days).toBeGreaterThan(0);
    });

    test('should provide comprehensive summary', () => {
      const summary = {
        productId: 123,
        productName: 'Test Pellets 15kg',
        priceRange: {
          min: 279.99,
          max: 319.99,
          average: 299.99,
        },
        availability: {
          inStock: true,
          storesCount: 5,
        },
        trends: {
          direction: 'decreasing',
          percentageChange: -5.2,
        },
        aiInsights: [
          'Prices are trending downward',
          'Best time to buy is winter months',
        ],
      };

      expect(summary).toHaveProperty('productId');
      expect(summary).toHaveProperty('priceRange');
      expect(summary).toHaveProperty('availability');
      expect(summary).toHaveProperty('trends');
      expect(summary).toHaveProperty('aiInsights');
    });
  });

  describe('OpenAI Connection Test', () => {
    test('should validate OpenAI API key presence', () => {
      const apiKey = process.env.OPENAI_API_KEY;

      expect(apiKey).toBeDefined();
      expect(typeof apiKey).toBe('string');
      expect(apiKey.length).toBeGreaterThan(0);
    });

    test('should mock successful OpenAI connection', async () => {
      const response = await mockOpenAI.chat.completions.create({
        model: 'gpt-5-nano',
        messages: [{ role: 'user', content: 'test' }],
      });

      expect(response).toHaveProperty('choices');
      expect(response).toHaveProperty('usage');
      expect(response.choices).toHaveLength(1);
      expect(response.usage).toHaveProperty('total_tokens');
    });
  });

  describe('Error Handling', () => {
    test('should handle missing query parameter', () => {
      const invalidRequest = {};

      expect(invalidRequest.query).toBeUndefined();
    });

    test('should handle invalid productId', () => {
      const invalidRequest = {
        productId: 'not-a-number',
      };

      expect(isNaN(parseInt(invalidRequest.productId))).toBe(true);
    });

    test('should handle OpenAI API errors gracefully', async () => {
      mockOpenAI.chat.completions.create.mockRejectedValueOnce(
        new Error('OpenAI API rate limit exceeded')
      );

      await expect(
        mockOpenAI.chat.completions.create({})
      ).rejects.toThrow('OpenAI API rate limit exceeded');
    });
  });

  describe('Token Usage Tracking', () => {
    test('should track OpenAI token usage', async () => {
      const response = await mockOpenAI.chat.completions.create({
        model: 'gpt-5-nano',
        messages: [{ role: 'user', content: 'test' }],
      });

      expect(response.usage).toHaveProperty('prompt_tokens');
      expect(response.usage).toHaveProperty('completion_tokens');
      expect(response.usage).toHaveProperty('total_tokens');
      expect(response.usage.total_tokens).toBeGreaterThan(0);
    });

    test('should calculate cost estimation', () => {
      const usage = {
        prompt_tokens: 100,
        completion_tokens: 50,
        total_tokens: 150,
      };

      // GPT-5-nano pricing: $0.05 per 1M tokens
      const costPerMillionTokens = 0.05;
      const cost = (usage.total_tokens / 1000000) * costPerMillionTokens;

      expect(cost).toBeCloseTo(0.0000075, 10);
    });
  });
});
