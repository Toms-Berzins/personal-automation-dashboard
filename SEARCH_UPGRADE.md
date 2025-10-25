# Upgrade to Better Search

## Current Issue

DuckDuckGo's instant answer API returns very limited results (0-2 results). It's designed for quick facts, not product searches.

## ✅ Solution: Use Brave Search (You Have MCP!)

You have **Brave Search MCP** available which is much better for product searches!

### Option 1: Use Brave Search MCP Directly (Recommended)

Since you have Kapture and Brave MCP enabled, the fastest way is:

**In your dashboard UI, when user searches:**
1. User types "laptop" and clicks GO
2. Frontend calls: `mcp__brave-search__brave_web_search({ query: "laptop", count: 5 })`
3. Get instant, high-quality product results
4. Display them in the UI

### Option 2: Integrate Brave Search into Backend

Would require Brave API key from https://brave.com/search/api/

**Or** use the MCP approach which is already available!

## 🚀 Quick Test With MCP

Try this in Claude Code with your dashboard open:

```javascript
// Search for products using Brave
mcp__brave-search__brave_web_search({
  query: "macbook pro m3",
  count: 5
})
```

This will return **real product search results** instantly!

## Recommendation

Since you have MCP tools available:
1. Update frontend to use Brave MCP for search
2. Keep Firecrawl for scraping (works great!)
3. Get fast, relevant product results

Want me to integrate Brave MCP into the dashboard?
