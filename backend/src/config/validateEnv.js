import { z } from 'zod';

/**
 * Environment Variable Validation with Zod
 *
 * This module validates all environment variables on startup to catch
 * configuration errors early. It distinguishes between:
 * - REQUIRED: Variables that must be present
 * - OPTIONAL: Variables that enhance functionality but aren't critical
 *
 * Created: Phase 2.1 - Security Quick Wins
 */

// Define the schema for environment variables
const envSchema = z.object({
  // ============================================
  // CRITICAL - REQUIRED FOR BASIC FUNCTIONALITY
  // ============================================
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  BACKEND_PORT: z.string().regex(/^\d+$/).transform(Number).default('8000'),

  // Firecrawl - Required for web scraping functionality
  FIRECRAWL_API_KEY: z.string().min(1, 'Firecrawl API key is required for scraping'),
  FIRECRAWL_API_URL: z.string().url().default('https://api.firecrawl.dev'),

  // OpenAI - Required for AI features
  OPENAI_API_KEY: z.string().min(1, 'OpenAI API key is required for AI features'),
  OPENAI_MODEL: z.string().default('gpt-5-nano'),
  OPENAI_ORG_ID: z.string().optional(),

  // Database - Required for data persistence
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // Alternative database configuration (if DATABASE_URL not provided)
  DB_HOST: z.string().optional(),
  DB_PORT: z.string().optional(),
  DB_NAME: z.string().optional(),
  DB_USER: z.string().optional(),
  DB_PASSWORD: z.string().optional(),

  // ============================================
  // OPTIONAL - ENHANCED FUNCTIONALITY
  // ============================================

  // Search APIs - Optional but recommended for multi-source search
  BRAVE_API_KEY: z.string().optional(),
  EXA_API_KEY: z.string().optional(),

  // Redis - Optional for caching
  REDIS_URL: z.string().url().optional(),
  REDIS_PORT: z.string().optional(),

  // Logging & Monitoring
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  DEBUG: z.string().optional(),

  // Alert Configuration - Optional for email notifications
  ALERT_EMAIL: z.string().email().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),

  // Scraping Schedules - Optional cron schedules
  SCRAPE_SCHEDULE_GRANULES: z.string().optional(),

  // n8n Integration - Optional
  N8N_WEBHOOK_URL: z.string().url().optional(),
  N8N_PASSWORD: z.string().optional(),

  // PostgreSQL credentials (for Docker Compose)
  POSTGRES_DB: z.string().optional(),
  POSTGRES_USER: z.string().optional(),
  POSTGRES_PASSWORD: z.string().optional(),
  POSTGRES_PORT: z.string().optional(),
});

/**
 * Validate environment variables and provide helpful error messages
 * @returns {object} Validated and typed environment variables
 * @throws {Error} If critical environment variables are missing or invalid
 */
export function validateEnv() {
  console.log('🔍 Validating environment variables...');

  try {
    // Parse and validate environment variables
    const env = envSchema.parse(process.env);

    // Check for optional but recommended variables
    const warnings = [];

    if (!env.BRAVE_API_KEY && !env.EXA_API_KEY) {
      warnings.push('⚠️  No search API keys found (BRAVE_API_KEY, EXA_API_KEY). Multi-source search will be limited.');
    }

    if (!env.REDIS_URL && !env.REDIS_PORT) {
      warnings.push('⚠️  Redis not configured. Caching will be disabled.');
    }

    if (!env.ALERT_EMAIL || !env.SMTP_HOST) {
      warnings.push('⚠️  Email alerts not configured. Notifications will be disabled.');
    }

    // Display warnings
    if (warnings.length > 0) {
      console.log('\n⚠️  Configuration Warnings:');
      warnings.forEach(warning => console.log(`   ${warning}`));
      console.log('');
    }

    // Success message
    console.log('✅ Environment validation passed!');
    console.log(`   NODE_ENV: ${env.NODE_ENV}`);
    console.log(`   BACKEND_PORT: ${env.BACKEND_PORT}`);
    console.log(`   OPENAI_MODEL: ${env.OPENAI_MODEL}`);
    console.log(`   LOG_LEVEL: ${env.LOG_LEVEL}`);
    console.log('');

    return env;

  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('\n❌ Environment Validation Failed!\n');
      console.error('The following environment variables are missing or invalid:\n');

      error.errors.forEach((err) => {
        const path = err.path.join('.');
        console.error(`   • ${path}: ${err.message}`);
      });

      console.error('\n💡 Tips:');
      console.error('   1. Copy .env.example to .env in the project root');
      console.error('   2. Fill in the required API keys and configuration');
      console.error('   3. Restart the server\n');

      // Exit with error code
      process.exit(1);
    }

    // Re-throw unexpected errors
    throw error;
  }
}

/**
 * Get a validated environment variable with type safety
 * @param {string} key - Environment variable key
 * @returns {string|undefined} Environment variable value
 */
export function getEnv(key) {
  return process.env[key];
}

export default validateEnv;
