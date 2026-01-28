/**
 * Centrometal Portal Data Scraper (Template)
 *
 * This is a template for your final scraper.
 * Update the API endpoints and data extraction logic based on what you discover
 * from running centrometal-debug.js
 *
 * Usage:
 *   node tools/scrapers/centrometal-scraper.js
 */

import { chromium } from 'playwright';
import dotenv from 'dotenv';
import axios from 'axios';

// Import your heater service to save data to database
// import { saveHeaterStatus, saveHeaterStatistics } from '../../backend/src/services/heaterService.js';

dotenv.config();

// Portal URLs from environment
const PORTAL_URL = process.env.CENTROMETAL_PORTAL_URL || 'https://www.portal.centrometal.hr';
const LOGIN_URL = process.env.CENTROMETAL_LOGIN_URL || `${PORTAL_URL}/login`;
const DASHBOARD_URL = process.env.CENTROMETAL_DASHBOARD_URL || `${PORTAL_URL}/#/widgetsgrid`;

// Session management
let sessionCookie = null;
let sessionExpiry = null;

/**
 * APPROACH 1: If you found a REST API
 * Use this if centrometal-debug.js revealed API endpoints
 */
async function fetchViaAPI() {
  console.log('📡 Fetching data via API...');

  // First, ensure we have a valid session
  if (!sessionCookie || Date.now() > sessionExpiry) {
    await login();
  }

  try {
    // Example: Replace with actual API endpoint discovered
    const response = await axios.get(`${PORTAL_URL}/api/heater/status`, {
      headers: {
        'Cookie': `PHPSESSID=${sessionCookie}`,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json'
      }
    });

    const data = response.data;

    // Transform API data to your database schema
    const heaterStatus = {
      state: data.state,
      isLive: true,
      mainTemperature: data.temperatures?.main,
      supplyTemperature: data.temperatures?.supply,
      returnTemperature: data.temperatures?.return,
      bufferTankTemperature: data.temperatures?.buffer,
      radiatorTemperature: data.temperatures?.radiator,
      externalTemperature: data.temperatures?.external,
      dhwTemperature: data.temperatures?.dhw,
      fuelLevelStatus: data.fuel?.level,
      oxygenLevel: data.oxygen,
      pumpP1Status: data.pumps?.p1?.status,
      pumpP2Status: data.pumps?.p2?.status,
      pumpP3Status: data.pumps?.p3?.status,
      pumpP1Demand: data.pumps?.p1?.demand,
      pumpP2Demand: data.pumps?.p2?.demand,
      pumpP3Demand: data.pumps?.p3?.demand,
      fanStatus: data.fan?.status,
      configurationType: 'PelTec Lambda',
      installationId: process.env.CENTROMETAL_INSTALLATION_ID
    };

    // Save to database
    // await saveHeaterStatus(heaterStatus);

    console.log('✅ Data fetched and saved via API');
    return heaterStatus;

  } catch (error) {
    console.error('❌ API fetch failed:', error.message);

    // If unauthorized, re-login and retry
    if (error.response?.status === 401 || error.response?.status === 403) {
      console.log('🔐 Session expired, re-logging in...');
      await login();
      return fetchViaAPI(); // Retry
    }

    throw error;
  }
}

/**
 * APPROACH 2: If you need to scrape DOM
 * Use this if no API was found and you need to extract data from HTML
 */
async function fetchViaBrowser() {
  console.log('🌐 Fetching data via browser automation...');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Login
    await page.goto(LOGIN_URL);
    await page.fill('input[name="username"]', process.env.CENTROMETAL_USERNAME);
    await page.fill('input[type="password"]', process.env.CENTROMETAL_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle' });

    // Navigate to dashboard
    await page.goto(DASHBOARD_URL, { waitUntil: 'networkidle' });

    // Wait for data to load
    await page.waitForSelector('.heater-status', { timeout: 10000 });

    // Extract data from DOM
    const heaterData = await page.evaluate(() => {
      // Update these selectors based on actual HTML structure
      const getText = (selector) => {
        const el = document.querySelector(selector);
        return el ? el.textContent.trim() : null;
      };

      const getNumber = (selector) => {
        const text = getText(selector);
        return text ? parseFloat(text.replace(/[^0-9.-]/g, '')) : null;
      };

      return {
        mainTemperature: getNumber('.temperature-main'),
        supplyTemperature: getNumber('.temperature-supply'),
        returnTemperature: getNumber('.temperature-return'),
        bufferTankTemperature: getNumber('.temperature-buffer'),
        radiatorTemperature: getNumber('.temperature-radiator'),
        externalTemperature: getNumber('.temperature-external'),
        dhwTemperature: getNumber('.temperature-dhw'),
        oxygenLevel: getNumber('.oxygen-level'),
        fanSpeed: getNumber('.fan-rpm'),
        state: getText('.heater-state'),
        fuelLevel: getText('.fuel-level'),
        // Add more fields as needed
      };
    });

    // Transform to database schema
    const heaterStatus = {
      ...heaterData,
      isLive: true,
      configurationType: 'PelTec Lambda',
      installationId: process.env.CENTROMETAL_INSTALLATION_ID
    };

    // Save to database
    // await saveHeaterStatus(heaterStatus);

    console.log('✅ Data scraped and saved via browser');
    return heaterStatus;

  } catch (error) {
    console.error('❌ Browser scraping failed:', error.message);
    throw error;
  } finally {
    await browser.close();
  }
}

/**
 * APPROACH 3: If the portal uses WebSocket
 * Use this to listen for real-time updates
 */
async function subscribeToWebSocket() {
  console.log('🔌 Subscribing to WebSocket updates...');

  // First login to get session
  await login();

  const WebSocket = (await import('ws')).default;

  // Replace with actual WebSocket URL discovered from debug script
  const ws = new WebSocket('wss://portal.centrometal.hr/live-stream', {
    headers: {
      'Cookie': `PHPSESSID=${sessionCookie}`,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  });

  ws.on('open', () => {
    console.log('✅ WebSocket connected');
  });

  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data.toString());
      console.log('📨 Received WebSocket message:', message);

      // Transform and save data
      if (message.type === 'heater_status') {
        const heaterStatus = {
          ...message.data,
          isLive: true,
          installationId: process.env.CENTROMETAL_INSTALLATION_ID
        };

        // await saveHeaterStatus(heaterStatus);
        console.log('✅ Real-time data saved');
      }

    } catch (error) {
      console.error('❌ Error processing WebSocket message:', error.message);
    }
  });

  ws.on('error', (error) => {
    console.error('❌ WebSocket error:', error.message);
  });

  ws.on('close', () => {
    console.log('🔌 WebSocket closed. Reconnecting in 10 seconds...');
    setTimeout(subscribeToWebSocket, 10000);
  });
}

/**
 * Login and get session cookie
 * Used by API and WebSocket approaches
 */
async function login() {
  console.log('🔐 Logging in to Centrometal portal...');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto(LOGIN_URL);
    await page.fill('input[name="username"]', process.env.CENTROMETAL_USERNAME);
    await page.fill('input[type="password"]', process.env.CENTROMETAL_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle' });

    // Extract session cookie
    const cookies = await context.cookies();
    const phpSession = cookies.find(c => c.name === 'PHPSESSID');

    if (phpSession) {
      sessionCookie = phpSession.value;
      sessionExpiry = Date.now() + (20 * 60 * 60 * 1000); // 20 hours
      console.log('✅ Login successful, session valid until:', new Date(sessionExpiry).toLocaleString());
    } else {
      throw new Error('Failed to get session cookie');
    }

  } catch (error) {
    console.error('❌ Login failed:', error.message);
    throw error;
  } finally {
    await browser.close();
  }
}

/**
 * Main scraper function
 * Chooses the best approach based on what you discovered
 */
async function scrapeHeaterData() {
  console.log('🚀 Starting Centrometal heater data scraper...\n');

  // Validate credentials
  if (!process.env.CENTROMETAL_USERNAME || !process.env.CENTROMETAL_PASSWORD) {
    console.error('❌ Missing credentials in .env');
    console.error('Please set CENTROMETAL_USERNAME and CENTROMETAL_PASSWORD');
    process.exit(1);
  }

  try {
    // Choose your approach based on what you discovered:

    // Option 1: If you found REST API endpoints
    // const data = await fetchViaAPI();

    // Option 2: If you need to scrape DOM
    const data = await fetchViaBrowser();

    // Option 3: If you found WebSocket (runs continuously)
    // await subscribeToWebSocket();
    // await new Promise(() => {}); // Keep running

    console.log('\n✅ Scraper completed successfully!');
    console.log('Data:', JSON.stringify(data, null, 2));

  } catch (error) {
    console.error('\n❌ Scraper failed:', error);
    process.exit(1);
  }
}

// Run the scraper
if (process.argv[1] === new URL(import.meta.url).pathname) {
  scrapeHeaterData().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { scrapeHeaterData, fetchViaAPI, fetchViaBrowser, subscribeToWebSocket };
