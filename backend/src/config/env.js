// Load environment variables FIRST, before anything else
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { validateEnv } from './validateEnv.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from project root
const envPath = join(__dirname, '../../../.env');
const result = dotenv.config({ path: envPath });

if (result.error) {
  console.error('❌ Error loading .env file:', result.error);
  process.exit(1);
} else {
  console.log('✅ Environment variables loaded from:', envPath);
}

// Validate environment variables with Zod
// This will exit with error if critical variables are missing
const validatedEnv = validateEnv();

export default validatedEnv;
