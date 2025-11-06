# API Endpoints Reference

Quick reference for all available API endpoints in the Personal Automation Dashboard.

---

## 🏥 Health & Status

### GET /health
Health check endpoint

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-10-26T12:00:00.000Z"
}
```

---

## 🔍 Scraping Endpoints

### POST /api/scrape
Scrape a URL using Firecrawl

**Request:**
```json
{
  "url": "https://www.stali.lv/lv/granulas",
  "format": "markdown"
}
```

**Response:**
```json
{
  "success": true,
  "url": "https://www.stali.lv/lv/granulas",
  "products": [...],
  "savedCount": 2
}
```

---

## 🤖 AI-Powered Analytics

### POST /api/ai/query
Natural language query interface

**Request:**
```json
{
  "query": "Which retailer had the cheapest 15kg bags last month?"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "query": "Which retailer had...",
    "intent": "Find cheapest retailer",
    "results": [...],
    "summary": "SIA Staļi had the cheapest...",
    "metadata": {
      "product_type": "15kg bags",
      "timeframe": "last month"
    }
  }
}
```

---

### GET /api/ai/insights
Get AI-generated insights

**Query Parameters:**
- `productId` (optional) - Specific product ID
- `days` (optional, default: 30) - Number of days to analyze

**Request:**
```
GET /api/ai/insights?productId=1&days=30
```

**Response:**
```json
{
  "success": true,
  "data": {
    "insights": [
      {
        "title": "Price Drop Trend",
        "description": "Prices have decreased 8%...",
        "type": "trend",
        "confidence": 92,
        "actionable": true
      }
    ],
    "summary": "Overall market conditions...",
    "data_period": "Last 30 days",
    "sample_count": 124
  }
}
```

---

### POST /api/ai/recommendation
Get buying recommendation

**Request:**
```json
{
  "productId": 1
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "product": {
      "id": 1,
      "name": "6 mm kokskaidu granulas...",
      "current_price": 235,
      "currency": "EUR"
    },
    "recommendation": "WAIT",
    "reasoning": "Current price is 5% above...",
    "confidence": 78,
    "factors": [...],
    "estimated_savings": 12.50
  }
}
```

---

### POST /api/ai/chat
Conversational interface

**Request:**
```json
{
  "messages": [
    {
      "role": "user",
      "content": "What products do you have data for?"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "response": "I currently have data for 3 products...",
    "context_included": true
  }
}
```

---

### GET /api/ai/summary/:productId
Get product summary

**Query Parameters:**
- `days` (optional, default: 30) - Number of days to analyze

**Request:**
```
GET /api/ai/summary/1?days=30
```

**Response:**
```json
{
  "success": true,
  "data": {
    "product_id": 1,
    "period": "Last 30 days",
    "summary": "## Product Analysis...\n\n### Price Overview..."
  }
}
```

---

### GET /api/ai/test
Test OpenAI connection

**Response:**
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

## 📊 Database Queries (Coming Soon)

Future endpoints for direct database access:

- `GET /api/products` - List all products
- `GET /api/products/:id` - Get product details
- `GET /api/products/:id/history` - Get price history
- `GET /api/retailers` - List all retailers
- `GET /api/retailers/:id` - Get retailer details
- `GET /api/prices/latest` - Get latest prices
- `GET /api/analytics/trends` - Get price trends
- `GET /api/analytics/comparison` - Compare retailers

---

## ⚠️ Error Responses

All endpoints follow this error format:

```json
{
  "success": false,
  "error": "Error message here"
}
```

**Common HTTP Status Codes:**
- `200` - Success
- `400` - Bad Request (missing parameters)
- `404` - Not Found
- `500` - Internal Server Error

---

## 🔐 Authentication (Coming Soon)

Future endpoints will require authentication via API keys or JWT tokens.

**Header Format:**
```
Authorization: Bearer your-api-key-here
```

---

## 📝 Notes

- All timestamps are in ISO 8601 format (UTC)
- Prices are returned as numbers (not strings)
- Currency codes follow ISO 4217 (EUR, USD, etc.)
- All endpoints support CORS for frontend integration

---

## 🧪 Testing with curl

```bash
# Health check
curl http://localhost:8000/health

# Test AI connection
curl http://localhost:8000/api/ai/test

# Natural language query
curl -X POST http://localhost:8000/api/ai/query \
  -H "Content-Type: application/json" \
  -d '{"query": "Show me all products"}'

# Get insights
curl http://localhost:8000/api/ai/insights

# Get recommendation
curl -X POST http://localhost:8000/api/ai/recommendation \
  -H "Content-Type: application/json" \
  -d '{"productId": 1}'

# Chat
curl -X POST http://localhost:8000/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "Hello!"}]}'

# Product summary
curl http://localhost:8000/api/ai/summary/1?days=30
```

---

## 🚀 Base URL

**Development:** `http://localhost:8000`
**Production:** TBD

All endpoints are prefixed with `/api` except for `/health`.
