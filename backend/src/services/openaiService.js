/**
 * OpenAI Service
 *
 * Provides AI-powered analytics features:
 * - Natural language query parsing
 * - Automated insights generation
 * - Buying recommendations
 * - Data summarization
 */

import OpenAI from 'openai';
import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

// Lazy initialization of OpenAI client
let openai = null;

function getOpenAIClient() {
  if (!openai) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not set. Please add it to your .env file.');
    }
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openai;
}

// Zod schemas for structured outputs
const InsightSchema = z.object({
  insights: z.array(
    z.object({
      title: z.string(),
      description: z.string(),
      type: z.enum(['trend', 'anomaly', 'opportunity', 'warning']),
      confidence: z.number().min(0).max(100),
      actionable: z.boolean(),
    })
  ),
  summary: z.string(),
});

const RecommendationSchema = z.object({
  recommendation: z.enum(['BUY_NOW', 'WAIT', 'NEUTRAL']),
  reasoning: z.string(),
  confidence: z.number().min(0).max(100),
  factors: z.array(z.string()),
  estimated_savings: z.number().optional(),
});

const QueryParseSchema = z.object({
  intent: z.string(),
  product_type: z.string().optional(),
  timeframe: z.string().optional(),
  metric: z.string().optional(),
  retailer: z.string().optional(),
  sql_query: z.string(),
});

/**
 * Parse natural language query and convert to SQL
 * @param {string} userQuery - User's question in plain English
 * @returns {Promise<Object>} Parsed query with SQL
 */
async function parseNaturalLanguageQuery(userQuery) {
  try {
    const client = getOpenAIClient();
    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-5-nano',
      messages: [
        {
          role: 'system',
          content: `You are a SQL query generator for a granules price tracking system.

Database schema:
- retailers (id, name, location, website_url)
- products (id, product_name, brand, category, specifications JSONB, normalized_name)
- price_history (id, product_id, retailer_id, price, currency, in_stock, quantity, unit, source_url, scraped_at)

Convert natural language queries to valid PostgreSQL queries.
Focus on: price trends, comparisons, cheapest times, stock availability.

Return response in JSON format with:
- intent: What the user wants to know
- product_type: Type of product (if specified)
- timeframe: Time period (if specified)
- metric: What to measure (price, availability, etc.)
- retailer: Specific retailer (if specified)
- sql_query: Valid PostgreSQL query`
        },
        { role: 'user', content: userQuery }
      ],
      // GPT-5 Nano only supports default temperature (1)
      response_format: { type: 'json_object' },
    });

    const result = JSON.parse(completion.choices[0].message.content);
    return result;
  } catch (error) {
    console.error('Error parsing natural language query:', error);
    throw new Error(`Failed to parse query: ${error.message}`);
  }
}

/**
 * Generate AI-powered insights from price data
 * @param {Array} priceData - Historical price data
 * @param {Object} options - Analysis options
 * @returns {Promise<Object>} Structured insights
 */
async function generateInsights(priceData, options = {}) {
  try {
    const client = getOpenAIClient();
    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-5-nano',
      messages: [
        {
          role: 'system',
          content: `You are a data analyst specializing in price trends and consumer insights.
Analyze the provided price data and generate 3-5 key insights.
Focus on: trends, anomalies, opportunities, patterns, and warnings.

Each insight should have:
- title: Short, catchy title
- description: Detailed explanation
- type: trend/anomaly/opportunity/warning
- confidence: 0-100 (how confident you are)
- actionable: true if user can act on it

Also provide a brief summary of overall market conditions.

Respond in JSON format with this structure:
{
  "insights": [array of insight objects],
  "summary": "overall summary text"
}`
        },
        {
          role: 'user',
          content: `Analyze this price data and generate insights:\n${JSON.stringify(priceData, null, 2)}`
        }
      ],
      // GPT-5 Nano only supports default temperature (1)
      response_format: { type: 'json_object' },
    });

    const result = JSON.parse(completion.choices[0].message.content);
    return result;
  } catch (error) {
    console.error('Error generating insights:', error);
    throw new Error(`Failed to generate insights: ${error.message}`);
  }
}

/**
 * Get AI-powered buying recommendation
 * @param {number} currentPrice - Current price
 * @param {Array} historicalData - Historical price data
 * @param {Object} options - Additional context
 * @returns {Promise<Object>} Recommendation with reasoning
 */
async function getBuyingRecommendation(currentPrice, historicalData, options = {}) {
  try {
    const client = getOpenAIClient();
    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-5-nano',
      messages: [
        {
          role: 'system',
          content: `You are a price advisor helping users decide when to buy granules.
Based on current price and historical data, recommend whether to BUY NOW or WAIT.

Consider:
- Current price vs historical average
- Seasonal trends
- Recent price direction
- Stock availability patterns

Return response in JSON format with:
- recommendation: BUY_NOW/WAIT/NEUTRAL
- reasoning: Detailed explanation
- confidence: 0-100 (how confident you are)
- factors: Array of key factors influencing decision
- estimated_savings: Potential savings if waiting (optional)`
        },
        {
          role: 'user',
          content: `Current Price: €${currentPrice}
Historical Data: ${JSON.stringify(historicalData, null, 2)}
Additional Context: ${JSON.stringify(options, null, 2)}`
        }
      ],
      // GPT-5 Nano only supports default temperature (1)
      response_format: { type: 'json_object' },
    });

    const result = JSON.parse(completion.choices[0].message.content);
    return result;
  } catch (error) {
    console.error('Error generating recommendation:', error);
    throw new Error(`Failed to generate recommendation: ${error.message}`);
  }
}

/**
 * Generate a natural language summary of data
 * @param {Object} data - Data to summarize
 * @param {string} context - What the summary is for
 * @returns {Promise<string>} Natural language summary
 */
async function summarizeData(data, context = 'general') {
  try {
    const client = getOpenAIClient();
    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-5-nano',
      messages: [
        {
          role: 'system',
          content: `You are a data summarizer. Convert complex analytics into easy-to-understand summaries.
Use clear language, highlight key numbers, and make it actionable.
Format with markdown for better readability.`
        },
        {
          role: 'user',
          content: `Summarize this ${context} data:\n${JSON.stringify(data, null, 2)}`
        }
      ],
      // GPT-5 Nano only supports default temperature (1)
    });

    return completion.choices[0].message.content;
  } catch (error) {
    console.error('Error summarizing data:', error);
    throw new Error(`Failed to summarize data: ${error.message}`);
  }
}

/**
 * Conversational chat interface for analytics
 * @param {Array} messages - Chat history
 * @param {Object} context - Current data context
 * @returns {Promise<string>} AI response
 */
async function chat(messages, context = {}) {
  try {
    const client = getOpenAIClient();
    const systemMessage = {
      role: 'system',
      content: `You are an AI assistant helping users analyze granules price and consumption data.
Be helpful, concise, and actionable.
You have access to:
- Price data from multiple retailers over time
- Historical consumption data (monthly granules usage)
- Usage patterns and seasonal trends

Current context: ${JSON.stringify(context, null, 2)}

When users ask questions:
1. Understand their intent
2. Reference both price AND consumption data in the context
3. Provide clear, actionable answers
4. Combine usage patterns with price trends for better recommendations
5. For example: "Based on your average monthly consumption of ${context.consumption?.avg_monthly_kg || 'N/A'} kg and current prices, you should..."
6. Suggest visualizations when helpful

Key capabilities:
- Analyze consumption patterns (heating season vs summer)
- Calculate cost projections based on usage
- Recommend optimal buying times considering both price and consumption
- Forecast future needs based on historical usage`
    };

    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-5-nano',
      messages: [systemMessage, ...messages],
      // GPT-5 Nano only supports default temperature (1)
    });

    return completion.choices[0].message.content;
  } catch (error) {
    console.error('Error in chat:', error);
    throw new Error(`Chat failed: ${error.message}`);
  }
}

/**
 * Test OpenAI connection
 * @returns {Promise<boolean>} True if connected
 */
async function testConnection() {
  try {
    const client = getOpenAIClient();
    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-5-nano',
      messages: [{ role: 'user', content: 'Hello!' }],
      max_completion_tokens: 10, // GPT-5 models use max_completion_tokens instead of max_tokens
    });

    console.log('✅ OpenAI connection successful');
    console.log('   Model:', process.env.OPENAI_MODEL || 'gpt-5-nano');
    console.log('   Response:', completion.choices[0].message.content);
    return true;
  } catch (error) {
    console.error('❌ OpenAI connection failed:', error.message);
    return false;
  }
}

// Export functions
export {
  parseNaturalLanguageQuery,
  generateInsights,
  getBuyingRecommendation,
  summarizeData,
  chat,
  testConnection,
};

export default {
  parseNaturalLanguageQuery,
  generateInsights,
  getBuyingRecommendation,
  summarizeData,
  chat,
  testConnection,
};
