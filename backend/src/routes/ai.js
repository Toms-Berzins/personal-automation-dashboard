/**
 * AI Routes
 *
 * API endpoints for AI-powered analytics features
 */

import express from 'express';
import * as aiController from '../controllers/aiController.js';

const router = express.Router();

/**
 * POST /api/ai/query
 * Natural language query interface
 * Body: { query: "Which retailer had the cheapest 15kg bags last month?" }
 */
router.post('/query', aiController.naturalLanguageQuery);

/**
 * GET /api/ai/insights
 * Get cached AI insights (does not generate new ones)
 * Query params: ?productId=1&days=30
 */
router.get('/insights', aiController.getInsights);

/**
 * POST /api/ai/insights/generate
 * Generate new AI insights and save to database
 * Body: { productId: 1, days: 30 }
 */
router.post('/insights/generate', aiController.generateInsights);

/**
 * POST /api/ai/recommendation
 * Get buying recommendation for a product
 * Body: { productId: 1 }
 */
router.post('/recommendation', aiController.getBuyingRecommendation);

/**
 * POST /api/ai/chat
 * Conversational interface for analytics
 * Body: { messages: [{ role: 'user', content: 'Show me price trends' }] }
 */
router.post('/chat', aiController.chat);

/**
 * GET /api/ai/summary/:productId
 * Get AI-generated summary for a specific product
 * Query params: ?days=30
 */
router.get('/summary/:productId', aiController.getProductSummary);

/**
 * GET /api/ai/test
 * Test OpenAI connection
 */
router.get('/test', aiController.testConnection);

export default router;
