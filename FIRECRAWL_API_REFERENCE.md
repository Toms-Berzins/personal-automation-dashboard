# Firecrawl API Reference

## Version: 1.29.3

### ✅ Correct Method Names

**v1.29.3 uses:**
```javascript
firecrawl.scrapeUrl(url, options)  // ✅ Correct
```

**NOT:**
```javascript
firecrawl.scrape(url, options)  // ❌ Old API
```

### Scrape URL Example

```javascript
const result = await firecrawl.scrapeUrl('https://example.com/product', {
  formats: ['markdown', 'extract'],
  extract: {
    schema: {
      type: "object",
      properties: {
        product_name: { type: "string" },
        price: { type: "number" },
        currency: { type: "string" },
        brand: { type: "string" },
        in_stock: { type: "boolean" }
      },
      required: ["product_name", "price"]
    }
  },
  onlyMainContent: true,
  waitFor: 2000
});

// Access extracted data
const data = result.extract || result.data?.extract || {};
```

### Response Structure

```javascript
{
  success: true,
  extract: {
    product_name: "MacBook Pro",
    price: 2499,
    currency: "USD",
    brand: "Apple",
    in_stock: true
  },
  markdown: "...",  // If 'markdown' format requested
  // ... other fields
}
```

### Common Issues

**Error: "firecrawl.scrape is not a function"**
- **Fix:** Use `scrapeUrl` instead of `scrape`

**Error: "Cannot read property 'json'"**
- **Fix:** Use `result.extract` instead of `result.data.json`

### Migration from Old API

```javascript
// Old (doesn't work in v1.29.3)
const result = await firecrawl.scrape(url, {
  formats: [{ type: 'json', schema: {...} }]
});
const data = result.data?.json;

// New (v1.29.3)
const result = await firecrawl.scrapeUrl(url, {
  formats: ['extract'],
  extract: { schema: {...} }
});
const data = result.extract;
```

## ✅ Fixed!

The backend controller has been updated to use the correct API.
