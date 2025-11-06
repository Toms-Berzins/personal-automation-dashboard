# OpenAI Integration Setup Guide

## Overview

Your Personal Automation Dashboard now includes AI-powered analytics features using OpenAI. This guide will help you set up and use these features.

---

## 🚀 Quick Setup

### 1. Get Your OpenAI API Key

1. Visit [https://platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. Sign up or log in to your OpenAI account
3. Click "Create new secret key"
4. Copy the key (it starts with `sk-proj-...`)
5. **Important:** Save it securely - you won't be able to see it again!

### 2. Add API Key to Your Environment

Open your `.env` file and add:

```env
# OpenAI Configuration
OPENAI_API_KEY=sk-proj-your-actual-api-key-here
OPENAI_MODEL=gpt-4o-mini  # Default model (cost-effective)
```

**Model Options:**
- `gpt-4o-mini` - Faster, cheaper (~$0.15 per 1M input tokens) - **Recommended for most use cases**
- `gpt-4o` - More powerful (~$2.50 per 1M input tokens) - Use for complex analysis

### 3. Restart Your Server

```bash
cd backend
npm run dev
```

You should see:
```
🚀 Backend API running on http://localhost:8000
📊 Health check: http://localhost:8000/health
```

### 4. Test the Connection

```bash
curl http://localhost:8000/api/ai/test
```

Expected response:
```json
{
  "success": true,
  "data": {
    "connected": true,
    "model": "gpt-4o-mini"
  }
}
```

---

## 📚 Available AI Features

### 1. Natural Language Queries

**Ask questions in plain English and get SQL-powered answers!**

**Endpoint:** `POST /api/ai/query`

**Example Request:**
```bash
curl -X POST http://localhost:8000/api/ai/query \
  -H "Content-Type: application/json" \
  -d '{"query": "Which retailer had the cheapest 15kg bags last month?"}'
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "query": "Which retailer had the cheapest 15kg bags last month?",
    "intent": "Find cheapest retailer for specific product type",
    "results": [
      {
        "retailer_name": "SIA Staļi",
        "avg_price": 230.00,
        "currency": "EUR"
      }
    ],
    "summary": "Based on last month's data, SIA Staļi had the cheapest 15kg bags at an average of €230."
  }
}
```

**More Example Queries:**
- "What's the price trend for the last 3 months?"
- "Show me all products currently in stock"
- "When should I buy granules?"
- "Compare prices across all retailers"

---

### 2. AI-Generated Insights

**Automatically discover trends, opportunities, and anomalies in your price data!**

**Endpoint:** `GET /api/ai/insights`

**Example Request:**
```bash
# Get insights for all products
curl http://localhost:8000/api/ai/insights

# Get insights for specific product (last 30 days)
curl "http://localhost:8000/api/ai/insights?productId=1&days=30"
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "insights": [
      {
        "title": "📉 Price Drop Trend",
        "description": "Prices have decreased by 8% over the last 2 weeks",
        "type": "trend",
        "confidence": 92,
        "actionable": true
      },
      {
        "title": "💰 Best Deal Alert",
        "description": "SIA Staļi is currently 12% below market average",
        "type": "opportunity",
        "confidence": 88,
        "actionable": true
      },
      {
        "title": "⚠️ Stock Fluctuation",
        "description": "Your preferred retailer has been out of stock 40% of the time",
        "type": "warning",
        "confidence": 75,
        "actionable": true
      }
    ],
    "summary": "Overall market conditions are favorable for buying. Prices are trending downward with good availability.",
    "data_period": "Last 30 days",
    "sample_count": 124
  }
}
```

**Insight Types:**
- `trend` - Market trends and patterns
- `opportunity` - Good buying opportunities
- `anomaly` - Unusual price movements
- `warning` - Potential issues or concerns

---

### 3. Buying Recommendations

**Get AI-powered advice on whether to buy now or wait!**

**Endpoint:** `POST /api/ai/recommendation`

**Example Request:**
```bash
curl -X POST http://localhost:8000/api/ai/recommendation \
  -H "Content-Type: application/json" \
  -d '{"productId": 1}'
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "product": {
      "id": 1,
      "name": "6 mm kokskaidu granulas 15KG MAISOS",
      "current_price": 235,
      "currency": "EUR",
      "retailer": "SIA Staļi"
    },
    "recommendation": "WAIT",
    "reasoning": "Current price (€235) is 5% above the 3-month average (€228). Historical data shows prices typically drop in mid-November. Waiting 2-3 weeks could save you approximately €10-15 per ton.",
    "confidence": 78,
    "factors": [
      "Current price above historical average",
      "Seasonal pattern indicates upcoming price drop",
      "Good stock availability across retailers",
      "Recent price trend is stable, not rising"
    ],
    "estimated_savings": 12.50
  }
}
```

**Recommendation Types:**
- `BUY_NOW` - Good time to purchase
- `WAIT` - Better prices expected soon
- `NEUTRAL` - No strong signal either way

---

### 4. Conversational Chat

**Have a conversation with AI about your data!**

**Endpoint:** `POST /api/ai/chat`

**Example Request:**
```bash
curl -X POST http://localhost:8000/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "What products do you have data for?"}
    ]
  }'
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "response": "I currently have data for 3 products from 2 retailers:\n\n1. **6 mm kokskaidu granulas 15KG MAISOS** - €235\n2. **6 mm kokskaidu granulas BIG BAG** - €234\n\nThe latest data was collected today. Would you like to see price trends for any of these?",
    "context_included": true
  }
}
```

**Follow-up Conversation:**
```bash
curl -X POST http://localhost:8000/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "What products do you have data for?"},
      {"role": "assistant", "content": "I currently have data for 3 products..."},
      {"role": "user", "content": "Show me trends for the 15kg bags"}
    ]
  }'
```

---

### 5. Product Summary

**Get a comprehensive AI-generated summary for a specific product!**

**Endpoint:** `GET /api/ai/summary/:productId`

**Example Request:**
```bash
curl "http://localhost:8000/api/ai/summary/1?days=30"
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "product_id": 1,
    "period": "Last 30 days",
    "summary": "## Product Analysis: 6 mm kokskaidu granulas 15KG MAISOS\n\n### Price Overview\n- **Current Price:** €235\n- **30-Day Average:** €232\n- **Price Range:** €230 - €240\n- **Trend:** Stable with slight upward movement\n\n### Retailer Comparison\n- **Best Price:** SIA Staļi at €230\n- **Availability:** 95% in stock\n\n### Recommendations\n✅ **Good time to buy** - Prices are stable and stock is available\n💡 **Best retailer:** SIA Staļi offers the most competitive pricing\n📊 **Watch for:** Seasonal price changes typically occur in mid-November"
  }
}
```

---

## 💰 Cost Management

### Understanding Costs

OpenAI charges based on tokens (words/characters processed). Here's what to expect:

**Estimated Monthly Costs (based on typical usage):**

| Feature | Daily Use | Cost/Day | Cost/Month |
|---------|-----------|----------|------------|
| Natural Language Queries | 20 queries | $0.06 | ~$2.00 |
| Daily Insights | 1 report | $0.01 | ~$0.30 |
| Buying Recommendations | 5 checks | $0.02 | ~$0.60 |
| Chat Conversations | 50 messages | $0.15 | ~$4.50 |
| **Total** | **~76 calls** | **~$0.24** | **~$7.50/month** |

**With gpt-4o-mini:** Most operations cost less than $0.01 each

### Tips to Reduce Costs

1. **Use Caching** - Insights are generated once per day, then cached
2. **Batch Queries** - Ask multiple questions in one chat session
3. **Use Webhooks** - Only generate insights when new data arrives
4. **Set Budgets** - OpenAI allows you to set spending limits

### Monitor Your Usage

Check your usage at: [https://platform.openai.com/usage](https://platform.openai.com/usage)

---

## 🔒 Security Best Practices

### 1. Protect Your API Key

✅ **DO:**
- Store API key in `.env` file (never commit it!)
- Add `.env` to `.gitignore`
- Use different keys for development and production
- Rotate keys regularly

❌ **DON'T:**
- Commit API keys to GitHub
- Share API keys in public channels
- Use production keys in development

### 2. Set Usage Limits

1. Go to [OpenAI Settings](https://platform.openai.com/account/limits)
2. Set a monthly budget (e.g., $10/month)
3. Configure email alerts at 50% and 80% usage

### 3. Rate Limiting (Coming Soon)

We'll add rate limiting to prevent abuse:
- Max 10 AI queries per user per minute
- Max 100 AI queries per user per day

---

## 🧪 Testing the Integration

### Test All Endpoints

```bash
# 1. Test connection
curl http://localhost:8000/api/ai/test

# 2. Test natural language query
curl -X POST http://localhost:8000/api/ai/query \
  -H "Content-Type: application/json" \
  -d '{"query": "Show me all products"}'

# 3. Test insights
curl http://localhost:8000/api/ai/insights

# 4. Test recommendation (replace productId with real ID)
curl -X POST http://localhost:8000/api/ai/recommendation \
  -H "Content-Type: application/json" \
  -d '{"productId": 1}'

# 5. Test chat
curl -X POST http://localhost:8000/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "Hello!"}]}'

# 6. Test product summary (replace 1 with real productId)
curl http://localhost:8000/api/ai/summary/1
```

---

## 🎨 Frontend Integration Examples

### Example 1: Natural Language Search Bar

```javascript
// React component
import { useState } from 'react';

function AISearchBar() {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:8000/api/ai/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });
      const data = await response.json();
      setResult(data.data);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ai-search">
      <input
        type="text"
        placeholder="Ask me anything about prices..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
      />
      <button onClick={handleSearch} disabled={loading}>
        {loading ? 'Thinking...' : 'Ask AI'}
      </button>

      {result && (
        <div className="result">
          <p>{result.summary}</p>
          <small>Based on {result.results.length} records</small>
        </div>
      )}
    </div>
  );
}
```

### Example 2: AI Insights Dashboard Widget

```javascript
// React component
import { useEffect, useState } from 'react';

function AIInsightsWidget() {
  const [insights, setInsights] = useState(null);

  useEffect(() => {
    fetch('http://localhost:8000/api/ai/insights')
      .then(res => res.json())
      .then(data => setInsights(data.data));
  }, []);

  if (!insights) return <div>Loading insights...</div>;

  return (
    <div className="insights-widget">
      <h3>🤖 AI Insights</h3>
      <p>{insights.summary}</p>

      <div className="insights-list">
        {insights.insights.map((insight, i) => (
          <div key={i} className={`insight insight-${insight.type}`}>
            <h4>{insight.title}</h4>
            <p>{insight.description}</p>
            <small>Confidence: {insight.confidence}%</small>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Example 3: Buying Recommendation Button

```javascript
// React component
function BuyingRecommendation({ productId }) {
  const [recommendation, setRecommendation] = useState(null);
  const [loading, setLoading] = useState(false);

  const getRecommendation = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:8000/api/ai/recommendation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId }),
      });
      const data = await response.json();
      setRecommendation(data.data);
    } catch (error) {
      console.error('Failed to get recommendation:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="recommendation">
      <button onClick={getRecommendation} disabled={loading}>
        {loading ? 'Analyzing...' : 'Should I Buy Now?'}
      </button>

      {recommendation && (
        <div className={`recommendation-result ${recommendation.recommendation.toLowerCase()}`}>
          <h4>{recommendation.recommendation === 'BUY_NOW' ? '✅' : '⏳'} {recommendation.recommendation.replace('_', ' ')}</h4>
          <p>{recommendation.reasoning}</p>

          {recommendation.estimated_savings > 0 && (
            <p className="savings">💰 Potential savings: €{recommendation.estimated_savings}</p>
          )}

          <details>
            <summary>Key Factors</summary>
            <ul>
              {recommendation.factors.map((factor, i) => (
                <li key={i}>{factor}</li>
              ))}
            </ul>
          </details>
        </div>
      )}
    </div>
  );
}
```

---

## 🐛 Troubleshooting

### Error: "Missing credentials"

**Problem:** OpenAI API key not set

**Solution:**
1. Check `.env` file has `OPENAI_API_KEY=sk-proj-...`
2. Restart your server: `npm run dev`
3. Verify key is valid at [OpenAI API Keys](https://platform.openai.com/api-keys)

### Error: "Insufficient quota"

**Problem:** You've exceeded your OpenAI usage limit or haven't added payment method

**Solution:**
1. Check usage at [OpenAI Usage](https://platform.openai.com/usage)
2. Add payment method at [OpenAI Billing](https://platform.openai.com/account/billing)
3. Increase usage limits if needed

### Slow Responses

**Problem:** AI responses taking too long

**Solutions:**
- Use `gpt-4o-mini` instead of `gpt-4o`
- Reduce amount of data sent to AI
- Implement caching for frequently asked questions
- Consider adding streaming responses

### Rate Limit Errors

**Problem:** "Rate limit exceeded" errors

**Solutions:**
- Implement exponential backoff retry logic
- Cache AI responses
- Reduce frequency of AI calls
- Upgrade OpenAI tier if needed

---

## 📖 Next Steps

1. **Set up your OpenAI API key** (see step 1 above)
2. **Test the endpoints** using the examples
3. **Integrate into your frontend** using the component examples
4. **Monitor your usage** to ensure costs stay within budget
5. **Customize prompts** in `openaiService.js` for better results

---

## 🎓 Learn More

- [OpenAI API Documentation](https://platform.openai.com/docs)
- [OpenAI Best Practices](https://platform.openai.com/docs/guides/production-best-practices)
- [Prompt Engineering Guide](https://platform.openai.com/docs/guides/prompt-engineering)
- [Token Pricing](https://openai.com/api/pricing/)

---

## 📝 Summary

You now have a fully functional AI-powered analytics system with:

✅ **Natural language queries** - Ask questions in plain English
✅ **Automated insights** - Daily AI-generated market analysis
✅ **Smart recommendations** - AI-powered buying advice
✅ **Conversational interface** - Chat with your data
✅ **Product summaries** - Comprehensive AI reports

**Estimated cost:** ~$7.50/month for typical usage

**Next:** Add your OpenAI API key and start exploring! 🚀
