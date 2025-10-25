# Dashboard Troubleshooting Guide

## Search Not Working - Quick Fix

### ✅ Backend is Working
The backend is running correctly on http://localhost:8000 and returns DuckDuckGo search results.

**Test:**
```bash
curl -X POST http://localhost:8000/api/search \
  -H "Content-Type: application/json" \
  -d '{"query":"laptop","limit":5}'
```

### 🔧 Fix Steps

**1. Restart Frontend (IMPORTANT)**
```bash
# Stop the frontend (Ctrl+C)
cd frontend

# Restart it
npm run dev
```

**2. Restart Backend**
```bash
# Stop the backend (Ctrl+C)
cd backend

# Install axios if you haven't
npm install

# Restart
npm run dev
```

**3. Clear Browser Cache**
- Press `Ctrl + Shift + R` (hard refresh)
- Or clear cache in DevTools (F12 > Network > Disable cache)

**4. Check Both Servers Are Running**
```bash
# Backend should show:
🚀 Backend API running on http://localhost:8000
📊 Health check: http://localhost:8000/health

# Frontend should show:
VITE v5.x.x  ready in xxx ms
➜  Local:   http://localhost:3000/
```

### 🐛 Common Issues

#### Issue: "Network Error" in browser console
**Cause:** Backend not running or wrong port
**Fix:**
```bash
cd backend
npm run dev
```

#### Issue: Search button doesn't respond
**Cause:** Frontend cache or not restarted
**Fix:**
1. Stop frontend (`Ctrl+C`)
2. `npm run dev`
3. Hard refresh browser (`Ctrl+Shift+R`)

#### Issue: CORS errors
**Cause:** Backend CORS not configured
**Fix:** Already configured in backend/src/server.js with `cors()`

### 📝 Test Checklist

- [ ] Backend running on port 8000
- [ ] Frontend running on port 3000
- [ ] Browser at http://localhost:3000
- [ ] Hard refresh done (`Ctrl+Shift+R`)
- [ ] DevTools console open (F12) to see errors
- [ ] Type a search query (e.g., "laptop")
- [ ] Click GO button
- [ ] Check Network tab in DevTools for `/api/search` request

### 🔍 Manual Test

**In browser console (F12):**
```javascript
// Test API directly
fetch('/api/search', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: 'laptop', limit: 5 })
})
  .then(r => r.json())
  .then(console.log)
  .catch(console.error);
```

**Expected result:**
```json
{
  "results": [
    {
      "title": "Laptop...",
      "url": "https://...",
      "description": "..."
    }
  ],
  "engine": "duckduckgo",
  "query": "laptop"
}
```

### ✨ Quick Fix Summary

Most common issue: **Frontend needs restart after backend changes**

```bash
# 1. Kill both servers (Ctrl+C on both terminals)

# 2. Start backend
cd backend && npm run dev

# 3. Start frontend
cd frontend && npm run dev

# 4. Hard refresh browser
# Ctrl+Shift+R
```

---

*If still not working, check browser DevTools console (F12) for specific error messages.*
