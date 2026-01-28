/**
 * Centrometal Portal Network Interceptor
 *
 * This script logs in to the Centrometal portal and intercepts all network requests
 * to help you discover API endpoints, WebSocket connections, and data structures.
 *
 * Usage:
 *   node tools/scrapers/centrometal-debug.js
 *
 * Make sure to add your credentials to .env:
 *   CENTROMETAL_USERNAME=your_username
 *   CENTROMETAL_PASSWORD=your_password
 */

import { chromium } from 'playwright';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const OUTPUT_FILE = path.join(process.cwd(), 'centrometal-api-calls.json');
const apiCalls = [];

// Portal URLs from environment
const PORTAL_URL = process.env.CENTROMETAL_PORTAL_URL || 'https://www.portal.centrometal.hr';
const LOGIN_URL = process.env.CENTROMETAL_LOGIN_URL || `${PORTAL_URL}/login`;
const DASHBOARD_URL = process.env.CENTROMETAL_DASHBOARD_URL || `${PORTAL_URL}/#/widgetsgrid`;

async function interceptCentrometalAPI() {
  console.log('🚀 Starting Centrometal API Discovery...\n');

  // Validate credentials
  if (!process.env.CENTROMETAL_USERNAME || !process.env.CENTROMETAL_PASSWORD) {
    console.error('❌ Missing credentials in .env file');
    console.error('Please add:');
    console.error('  CENTROMETAL_USERNAME=your_username');
    console.error('  CENTROMETAL_PASSWORD=your_password');
    process.exit(1);
  }

  const browser = await chromium.launch({
    headless: false, // Show browser so you can see what's happening
    args: ['--start-maximized']
  });

  const context = await browser.newContext({
    viewport: null
  });

  const page = await context.newPage();

  // Intercept requests
  page.on('request', request => {
    const url = request.url();
    const method = request.method();

    // Log interesting requests
    if (url.includes('centrometal.hr') && !url.includes('.js') && !url.includes('.css') && !url.includes('.png') && !url.includes('.jpg')) {
      console.log(`→ ${method} ${url}`);

      apiCalls.push({
        type: 'request',
        method,
        url,
        headers: request.headers(),
        postData: request.postDataJSON(),
        timestamp: new Date().toISOString()
      });
    }
  });

  // Intercept responses
  page.on('response', async response => {
    const url = response.url();
    const status = response.status();

    // Look for API calls
    if (url.includes('centrometal.hr') && (url.includes('/api/') || url.includes('/data/') || url.includes('/v1/') || url.includes('.json'))) {
      console.log(`← ${status} ${url}`);
      console.log('  Headers:', response.headers());

      try {
        const contentType = response.headers()['content-type'];

        if (contentType?.includes('application/json')) {
          const data = await response.json();
          console.log('  📦 JSON Response:', JSON.stringify(data, null, 2).substring(0, 500));

          apiCalls.push({
            type: 'response',
            url,
            status,
            headers: response.headers(),
            data: data,
            timestamp: new Date().toISOString()
          });
        }
      } catch (e) {
        // Not JSON or already consumed
      }
    }

    // Check for WebSocket upgrade
    if (response.headers()['upgrade'] === 'websocket') {
      console.log('\n🔌 WebSocket connection detected!');
      console.log('  URL:', url);
      console.log('  This portal uses real-time WebSocket communication');
      console.log('  You should use a WebSocket client for live updates\n');

      apiCalls.push({
        type: 'websocket',
        url,
        headers: response.headers(),
        timestamp: new Date().toISOString()
      });
    }
  });

  try {
    // Step 1: Navigate to login page
    console.log('\n📝 Step 1: Navigating to login page...');
    console.log(`  URL: ${LOGIN_URL}`);
    await page.goto(LOGIN_URL, {
      waitUntil: 'domcontentloaded',  // Changed from 'networkidle' - more reliable
      timeout: 30000
    });

    // Wait for page to fully render
    console.log('  Waiting for page to render...');
    await page.waitForTimeout(3000);

    // Take screenshot
    await page.screenshot({ path: 'centrometal-login.png' });
    console.log('  Screenshot saved: centrometal-login.png');

    // Step 2: Find login form fields
    console.log('\n🔍 Step 2: Looking for login form...');

    // Wait a bit more to ensure dynamic content loads
    await page.waitForTimeout(2000);

    // Try to find username/email field
    const usernameSelectors = [
      'input[name="username"]',
      'input[name="email"]',
      'input[type="email"]',
      'input[id="username"]',
      'input[id="email"]',
      'input[placeholder*="mail" i]',
      'input[placeholder*="user" i]',
      '#login input[type="text"]',
      'form input[type="text"]',
      'input[type="text"]'  // Fallback to any text input
    ];

    let usernameField = null;
    let usernameSelector = null;
    for (const selector of usernameSelectors) {
      try {
        const element = await page.$(selector);
        if (element && await element.isVisible()) {
          usernameField = element;
          usernameSelector = selector;
          console.log(`  ✓ Found username field: ${selector}`);
          break;
        }
      } catch (e) {
        // Try next selector
      }
    }

    // Try to find password field
    const passwordSelectors = [
      'input[name="password"]',
      'input[type="password"]',
      'input[id="password"]',
      'input[placeholder*="password" i]',
      '#login input[type="password"]',
      'form input[type="password"]'
    ];

    let passwordField = null;
    let passwordSelector = null;
    for (const selector of passwordSelectors) {
      try {
        const element = await page.$(selector);
        if (element && await element.isVisible()) {
          passwordField = element;
          passwordSelector = selector;
          console.log(`  ✓ Found password field: ${selector}`);
          break;
        }
      } catch (e) {
        // Try next selector
      }
    }

    if (!usernameField || !passwordField) {
      console.error('\n❌ Could not find login form fields');
      console.error('Please inspect the page manually and update the selectors in this script');

      // Save page content for manual inspection
      const content = await page.content();
      fs.writeFileSync('centrometal-login-page.html', content);
      console.error('Saved page HTML to: centrometal-login-page.html');

      await page.waitForTimeout(60000); // Wait 1 minute for manual inspection
      return;
    }

    // Step 3: Login
    console.log('\n🔐 Step 3: Logging in...');
    console.log(`  Username: ${process.env.CENTROMETAL_USERNAME}`);

    await usernameField.fill(process.env.CENTROMETAL_USERNAME);
    await page.waitForTimeout(500);
    await passwordField.fill(process.env.CENTROMETAL_PASSWORD);
    await page.waitForTimeout(500);

    // Find and click submit button
    const submitSelectors = [
      'button[type="submit"]',
      'input[type="submit"]',
      'button:has-text("Login")',
      'button:has-text("Sign in")',
      '#login button',
      'form button'
    ];

    let submitted = false;
    for (const selector of submitSelectors) {
      try {
        const button = await page.$(selector);
        if (button) {
          console.log(`  Clicking submit button: ${selector}`);
          await button.click();
          submitted = true;
          break;
        }
      } catch (e) {
        // Try next selector
      }
    }

    if (!submitted) {
      console.error('❌ Could not find submit button');
      console.error('Please login manually in the browser window');
      await page.waitForTimeout(60000);
    }

    // Wait for navigation after login
    console.log('  Waiting for login to complete...');
    try {
      await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 10000 });
      console.log('  ✓ Login successful!');
    } catch (e) {
      console.log('  Navigation timeout (might be okay if already on dashboard)');
    }

    // Step 4: Navigate to dashboard
    console.log('\n📊 Step 4: Navigating to dashboard...');
    console.log(`  URL: ${DASHBOARD_URL}`);
    await page.goto(DASHBOARD_URL, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    // Wait for dashboard to load
    await page.waitForTimeout(5000);

    // Take screenshot of dashboard
    await page.screenshot({ path: 'centrometal-dashboard.png', fullPage: true });
    console.log('  Screenshot saved: centrometal-dashboard.png');

    // Step 5: Wait and monitor network traffic
    console.log('\n⏱️  Step 5: Monitoring network traffic for 60 seconds...');
    console.log('  Watch for API calls, WebSocket connections, and data updates');
    console.log('  You can interact with the page in the browser window\n');

    await page.waitForTimeout(60000);

    // Step 6: Save results
    console.log('\n💾 Step 6: Saving results...');
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(apiCalls, null, 2));
    console.log(`  Saved ${apiCalls.length} API calls to: ${OUTPUT_FILE}`);

    // Analyze results
    console.log('\n📊 Analysis:');

    const apiEndpoints = apiCalls.filter(call => call.type === 'response' && call.url.includes('/api/'));
    const webSockets = apiCalls.filter(call => call.type === 'websocket');
    const uniqueEndpoints = [...new Set(apiEndpoints.map(call => call.url))];

    console.log(`  Total network calls logged: ${apiCalls.length}`);
    console.log(`  Unique API endpoints found: ${uniqueEndpoints.length}`);
    console.log(`  WebSocket connections: ${webSockets.length}`);

    if (uniqueEndpoints.length > 0) {
      console.log('\n🎯 Discovered API Endpoints:');
      uniqueEndpoints.forEach((endpoint, i) => {
        console.log(`  ${i + 1}. ${endpoint}`);
      });
    }

    if (webSockets.length > 0) {
      console.log('\n🔌 WebSocket Connections:');
      webSockets.forEach((ws, i) => {
        console.log(`  ${i + 1}. ${ws.url}`);
      });
    }

    console.log('\n✅ Analysis complete!');
    console.log('\nNext steps:');
    console.log('1. Review the API calls in: ' + OUTPUT_FILE);
    console.log('2. Identify which endpoints provide heater data');
    console.log('3. Build a scraper using those endpoints');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('Stack:', error.stack);

    // Save error state
    await page.screenshot({ path: 'centrometal-error.png' });
    console.log('Error screenshot saved: centrometal-error.png');
  }

  // Keep browser open for inspection
  console.log('\n🔍 Browser will stay open for manual inspection.');
  console.log('Press Ctrl+C to close and exit.\n');

  // Wait indefinitely until user closes
  await new Promise(() => {});
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 Shutting down...');
  process.exit(0);
});

// Run
interceptCentrometalAPI().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
