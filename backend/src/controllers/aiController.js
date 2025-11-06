/**
 * AI Controller
 *
 * Handles API endpoints for AI-powered analytics features
 */

import * as openaiService from '../services/openaiService.js';
import * as db from '../database/db.js';
import * as analyticsService from '../services/analyticsService.js';
import marketInsights from '../data/marketInsights.js';

/**
 * POST /api/ai/query
 * Natural language query interface
 */
export async function naturalLanguageQuery(req, res) {
  try {
    const { query } = req.body;

    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Query parameter is required'
      });
    }

    // Parse the natural language query
    const parsed = await openaiService.parseNaturalLanguageQuery(query);

    // Execute the generated SQL query
    const result = await db.query(parsed.sql_query);

    // Summarize the results
    const summary = await openaiService.summarizeData(result.rows, 'query results');

    res.json({
      success: true,
      data: {
        query: query,
        intent: parsed.intent,
        results: result.rows,
        summary: summary,
        metadata: {
          product_type: parsed.product_type,
          timeframe: parsed.timeframe,
          metric: parsed.metric,
          retailer: parsed.retailer,
        }
      }
    });

  } catch (error) {
    console.error('Error processing natural language query:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * GET /api/ai/insights
 * Get cached AI insights (does not generate new ones)
 */
export async function getInsights(req, res) {
  try {
    const { productId, days = 30 } = req.query;

    // Try to get cached insights from database
    const cachedInsights = await db.getLatestInsights({
      product_id: productId ? parseInt(productId) : null,
      days: parseInt(days)
    });

    if (cachedInsights) {
      return res.json({
        success: true,
        data: {
          insights: cachedInsights.insights,
          summary: cachedInsights.summary,
          data_period: cachedInsights.data_period,
          sample_count: cachedInsights.sample_count,
          generated_at: cachedInsights.generated_at,
          cached: true
        }
      });
    }

    // No cached insights available
    return res.json({
      success: true,
      data: null,
      message: 'No cached insights available. Click refresh to generate new insights.'
    });

  } catch (error) {
    console.error('Error fetching insights:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * POST /api/ai/insights/generate
 * Generate new AI insights and save to database
 */
export async function generateInsights(req, res) {
  try {
    const { productId, days = 30 } = req.body;

    // Get recent price data from scraper's table (product_prices)
    let priceData;
    if (productId) {
      // Query specific product history
      const result = await db.query(
        `SELECT * FROM product_prices
         WHERE id = $1
         AND timestamp >= NOW() - INTERVAL '${parseInt(days)} days'
         ORDER BY timestamp DESC`,
        [parseInt(productId)]
      );
      priceData = result.rows;
    } else {
      // Query latest prices from scraper's view
      const result = await db.query(
        'SELECT * FROM latest_product_prices ORDER BY timestamp DESC LIMIT 50'
      );
      priceData = result.rows;
    }

    if (!priceData || priceData.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No price data available'
      });
    }

    // Generate AI insights
    const insights = await openaiService.generateInsights(priceData);

    // Deactivate old insights for this configuration
    await db.deactivateOldInsights({
      product_id: productId ? parseInt(productId) : null,
      days: parseInt(days)
    });

    // Save new insights to database
    const savedInsights = await db.saveInsights({
      insights: insights.insights || insights,
      summary: insights.summary || '',
      data_period: `Last ${days} days`,
      sample_count: priceData.length,
      product_id: productId ? parseInt(productId) : null,
      days_analyzed: parseInt(days),
      expires_at: null // No expiration by default
    });

    res.json({
      success: true,
      data: {
        insights: savedInsights.insights,
        summary: savedInsights.summary,
        data_period: savedInsights.data_period,
        sample_count: savedInsights.sample_count,
        generated_at: savedInsights.generated_at,
        cached: false
      }
    });

  } catch (error) {
    console.error('Error generating insights:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * POST /api/ai/recommendation
 * Get buying recommendation for a product
 */
export async function getBuyingRecommendation(req, res) {
  try {
    const { productId } = req.body;

    if (!productId) {
      return res.status(400).json({
        success: false,
        error: 'productId is required'
      });
    }

    // Get current price
    const latestPrices = await db.getLatestPrices();
    const currentProduct = latestPrices.find(p => p.product_id === parseInt(productId));

    if (!currentProduct) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    // Get historical data
    const historicalData = await db.getPriceHistory(parseInt(productId), { days: 90 });
    const trends = await analyticsService.getPriceTrends(parseInt(productId), { days: 90, groupBy: 'week' });

    // Generate recommendation
    const recommendation = await openaiService.getBuyingRecommendation(
      currentProduct.price,
      historicalData,
      {
        product_name: currentProduct.product_name,
        retailer: currentProduct.retailer_name,
        trends: trends,
      }
    );

    res.json({
      success: true,
      data: {
        product: {
          id: currentProduct.product_id,
          name: currentProduct.product_name,
          current_price: currentProduct.price,
          currency: currentProduct.currency,
          retailer: currentProduct.retailer_name,
        },
        recommendation: recommendation.recommendation || recommendation,
        reasoning: recommendation.reasoning || '',
        confidence: recommendation.confidence || 0,
        factors: recommendation.factors || [],
        estimated_savings: recommendation.estimated_savings || null,
      }
    });

  } catch (error) {
    console.error('Error generating recommendation:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * POST /api/ai/chat
 * Conversational interface for analytics
 */
export async function chat(req, res) {
  try {
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({
        success: false,
        error: 'messages array is required'
      });
    }

    // Get current data context from scraper's table
    const pricesResult = await db.query('SELECT * FROM latest_product_prices ORDER BY timestamp DESC LIMIT 5');
    const latestPrices = pricesResult.rows;
    const stats = await analyticsService.getDashboardStats();

    // Get consumption context
    const consumptionStatsResult = await db.query(`
      SELECT
        COUNT(*) as total_months,
        SUM(kg_consumed) as total_kg,
        AVG(kg_consumed) as avg_monthly_kg,
        MAX(kg_consumed) as peak_month_kg,
        (SELECT kg_consumed FROM consumption_history ORDER BY consumption_date DESC LIMIT 1) as last_month_kg
      FROM consumption_history
    `);
    const consumptionStats = consumptionStatsResult.rows[0];

    // Get recent consumption trend
    const recentConsumptionResult = await db.query(`
      SELECT consumption_date, kg_consumed
      FROM consumption_history
      ORDER BY consumption_date DESC
      LIMIT 6
    `);

    const context = {
      total_products: stats.total_products,
      total_retailers: stats.total_retailers,
      latest_prices: latestPrices.slice(0, 5), // Top 5 for context
      avg_price_today: stats.avg_price_today,
      last_scrape: stats.last_scrape,
      consumption: {
        total_months: parseInt(consumptionStats.total_months),
        total_kg: parseFloat(consumptionStats.total_kg),
        avg_monthly_kg: parseFloat(consumptionStats.avg_monthly_kg),
        peak_month_kg: parseFloat(consumptionStats.peak_month_kg),
        last_month_kg: parseFloat(consumptionStats.last_month_kg),
        recent_months: recentConsumptionResult.rows
      },
      market: {
        avgPricePerKg: marketInsights.averagePricePerKg,
        bulkPricePerKg: marketInsights.pricingTiers[0].pricePerKg,
        forecast6Months: marketInsights.forecast6Months,
        buyingStrategy: marketInsights.buyingStrategy.optimal,
        keyInsights: marketInsights.keyInsights.slice(0, 2) // Top 2 insights
      }
    };

    // Get AI response
    const response = await openaiService.chat(messages, context);

    res.json({
      success: true,
      data: {
        response: response,
        context_included: true,
      }
    });

  } catch (error) {
    console.error('Error in chat:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * GET /api/ai/summary/:productId
 * Get AI-generated summary for a specific product
 */
export async function getProductSummary(req, res) {
  try {
    const { productId } = req.params;
    const { days = 30 } = req.query;

    // Get product data
    const priceHistory = await db.getPriceHistory(parseInt(productId), { days: parseInt(days) });
    const comparison = await analyticsService.compareRetailersForProduct(parseInt(productId), parseInt(days));
    const trends = await analyticsService.getPriceTrends(parseInt(productId), { days: parseInt(days), groupBy: 'week' });

    const data = {
      price_history: priceHistory,
      retailer_comparison: comparison,
      trends: trends,
    };

    // Generate summary
    const summary = await openaiService.summarizeData(data, 'product analysis');

    res.json({
      success: true,
      data: {
        product_id: parseInt(productId),
        period: `Last ${days} days`,
        summary: summary,
      }
    });

  } catch (error) {
    console.error('Error generating product summary:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * GET /api/ai/test
 * Test OpenAI connection
 */
export async function testConnection(req, res) {
  try {
    const isConnected = await openaiService.testConnection();

    res.json({
      success: true,
      data: {
        connected: isConnected,
        model: process.env.OPENAI_MODEL || 'gpt-5-nano',
      }
    });

  } catch (error) {
    console.error('Error testing OpenAI connection:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

export default {
  naturalLanguageQuery,
  getInsights,
  generateInsights,
  getBuyingRecommendation,
  chat,
  getProductSummary,
  testConnection,
};
