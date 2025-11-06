# Module System Conversion Notes

## Issue Fixed

**Error:** `SyntaxError: The requested module '../database/db.js' does not provide an export named 'default'`

**Cause:** Database modules were using CommonJS (`module.exports`) while the project uses ES modules (`"type": "module"` in package.json)

---

## Files Converted to ES Modules

All database-related files were converted from CommonJS to ES modules:

### 1. **backend/src/database/db.js**
- Changed `const { Pool } = require('pg')` → `import pkg from 'pg'`
- Changed `require('dotenv').config()` → `import dotenv from 'dotenv'`
- Changed `module.exports = {...}` → `export {...}` + `export default {...}`

### 2. **backend/src/utils/productNormalizer.js**
- Changed `module.exports = {...}` → `export {...}` + `export default {...}`

### 3. **backend/src/services/dataPipeline.js**
- Changed `const db = require('../database/db')` → `import * as db from '../database/db.js'`
- Changed `const {...} = require('../utils/productNormalizer')` → `import {...} from '../utils/productNormalizer.js'`
- Changed `module.exports = {...}` → `export {...}` + `export default {...}`

### 4. **backend/src/services/analyticsService.js**
- Changed `const db = require('../database/db')` → `import * as db from '../database/db.js'`
- Changed `module.exports = {...}` → `export {...}` + `export default {...}`

### 5. **backend/src/database/testDatabase.js**
- Converted all imports to ES module syntax
- Changed `require.main === module` check to ES module equivalent using `import.meta.url`

### 6. **backend/src/controllers/scraperController.js**
- Updated to import database module correctly: `import * as dbModule from '../database/db.js'`
- Added compatibility line: `const db = dbModule.default || dbModule`

---

## ES Module Import Patterns Used

### Named Exports
```javascript
// Export
export { function1, function2 };

// Import
import { function1, function2 } from './module.js';
```

### Default Export
```javascript
// Export
export default { function1, function2 };

// Import
import moduleName from './module.js';
```

### Namespace Import
```javascript
// Import all exports as namespace
import * as moduleName from './module.js';

// Use as: moduleName.function1()
```

### Both Named and Default
```javascript
// Export (provides flexibility)
export { function1, function2 };
export default { function1, function2 };

// Import (choose what works best)
import defaultExport from './module.js';
// OR
import { function1, function2 } from './module.js';
// OR
import * as namespace from './module.js';
```

---

## Key Differences: CommonJS vs ES Modules

| Feature | CommonJS | ES Modules |
|---------|----------|------------|
| Syntax | `require()` / `module.exports` | `import` / `export` |
| File extension | `.js` (default) | `.js` (with `"type": "module"`) |
| Loading | Synchronous | Asynchronous |
| `__dirname` | Available | Need to create manually |
| `__filename` | Available | Need to create manually |
| `.js` extension | Optional in `require()` | **Required** in `import` |

---

## Important Notes

### 1. File Extensions Required
In ES modules, you **must** include the `.js` extension:
```javascript
// ❌ Wrong
import db from '../database/db';

// ✅ Correct
import db from '../database/db.js';
```

### 2. `__dirname` and `__filename` in ES Modules
Not available by default, create them:
```javascript
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
```

### 3. Checking if Module is Main
CommonJS:
```javascript
if (require.main === module) {
  // This is the main module
}
```

ES Modules:
```javascript
const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  // This is the main module
}
```

### 4. Dynamic Imports
ES modules support dynamic imports:
```javascript
const module = await import('./module.js');
```

---

## Verification Steps

1. ✅ **Server starts without errors**
   ```bash
   npm run dev
   # Output: 🚀 Backend API running on http://localhost:8000
   ```

2. ✅ **Health check works**
   ```bash
   curl http://localhost:8000/health
   # Output: {"status":"ok","timestamp":"..."}
   ```

3. ✅ **All modules load correctly**
   - No import errors
   - No missing default export errors

---

## Testing Database Integration

To test the new database modules:

```bash
# 1. Set up database (one time)
psql -U postgres
CREATE DATABASE granules_tracker;
\q

# 2. Run migrations
psql -U postgres -d granules_tracker -f backend/src/database/migrations/001_create_initial_schema.sql

# 3. Configure .env
# Add database credentials to .env file

# 4. Test database connection
node backend/src/database/testDatabase.js
```

---

## Usage Examples After Conversion

### Import Database Functions
```javascript
// Option 1: Named imports (recommended)
import { testConnection, getLatestPrices, compareRetailers } from './database/db.js';

await testConnection();
const prices = await getLatestPrices();

// Option 2: Default import
import db from './database/db.js';

await db.testConnection();
const prices = await db.getLatestPrices();

// Option 3: Namespace import
import * as db from './database/db.js';

await db.testConnection();
const prices = await db.getLatestPrices();
```

### Import Data Pipeline
```javascript
import { processScrapedData, processBatch } from './services/dataPipeline.js';

const result = await processScrapedData(scrapedItem);
const batchResult = await processBatch(scrapedItems);
```

### Import Analytics
```javascript
import { getPriceTrends, findCheapestTimes } from './services/analyticsService.js';

const trends = await getPriceTrends(productId, { days: 90 });
const cheapest = await findCheapestTimes(productId);
```

---

## Benefits of ES Modules

1. **Standard JavaScript** - ES modules are the ECMAScript standard
2. **Tree Shaking** - Better dead code elimination in bundlers
3. **Static Analysis** - Imports can be analyzed at compile time
4. **Async Loading** - Native support for async module loading
5. **Browser Compatibility** - Works in modern browsers without transpilation
6. **Future Proof** - Node.js is moving towards ES modules as default

---

## Troubleshooting

### Error: `Cannot find module`
- Check file extension is included: `.js`
- Verify relative path is correct
- Ensure file exists

### Error: `does not provide an export named 'default'`
- Module doesn't have `export default`
- Use named imports: `import { funcName } from ...`
- Or use namespace: `import * as module from ...`

### Error: `__dirname is not defined`
- Create it manually using `fileURLToPath` and `dirname`
- See "Important Notes" section above

---

## Status

✅ **All modules successfully converted to ES modules**
✅ **Server starts and runs correctly**
✅ **All imports working as expected**
✅ **Ready for database integration**

Next steps:
1. Set up PostgreSQL database
2. Run migrations
3. Test with real scraped data
