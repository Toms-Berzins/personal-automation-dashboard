/**
 * Centrometal Heater Data Scraper (Production)
 *
 * Scrapes real-time heater data and saves to PostgreSQL database
 *
 * Usage:
 *   node tools/scrapers/centrometal-scraper.js
 */

import { chromium } from 'playwright';
import dotenv from 'dotenv';
import { saveHeaterStatus, saveHeaterStatistics } from '../../backend/src/services/heaterService.js';

dotenv.config();

// Configuration
const PORTAL_URL = process.env.CENTROMETAL_PORTAL_URL || 'https://www.portal.centrometal.hr';
const LOGIN_URL = `${PORTAL_URL}/login`;
const DASHBOARD_URL = `${PORTAL_URL}/#/widgetsgrid`;
const INSTALLATION_ID = process.env.CENTROMETAL_INSTALLATION_ID || '56F0C163';
const DATABASE_ID = 4210; // Discovered from debug script

async function scrapeHeaterData() {
  console.log('[*] Starting Centrometal heater scraper...\n');

  // Validate credentials
  if (!process.env.CENTROMETAL_USERNAME || !process.env.CENTROMETAL_PASSWORD) {
    console.error('[ERR] Missing credentials in .env file');
    process.exit(1);
  }

  const browser = await chromium.launch({
    headless: true  // Run in background
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  // Storage for captured data
  let temperatureData = null;
  let errorData = null;
  let statusData = null;

  // Intercept API responses to capture heater data
  page.on('response', async response => {
    const url = response.url();

    // Optionally log all API calls for debugging
    // if (url.includes('centrometal.hr') && (url.includes('/api/') || url.includes('/wdata/'))) {
    //   console.log(`[DEBUG] API call: ${url.split('?')[0]}`);
    // }

    try {
      // Capture temperature data from traffic endpoint
      if (url.includes('/wdata/data/multi/traffic/')) {
        const data = await response.json();

        if (data.rows && data.rows.length > 0) {
          const latest = data.rows[data.rows.length - 1];
          // Columns: timestamp, boiler_temp, flue_gas_temp, return_temp, dhw_temp
          temperatureData = {
            timestamp: latest[0],
            boilerTemp: parseFloat(latest[1]) || null,
            flueGasTemp: parseFloat(latest[2]) || null,
            returnTemp: parseFloat(latest[3]) || null,
            dhwTemp: parseFloat(latest[4]) || null
          };
          console.log('[OK] Captured temperature data:', temperatureData);
        }
      }

      // Capture cumulative statistics and status data
      if (url.includes('/wdata/data/installation-status-all')) {
        const data = await response.json();

        if (data && data[DATABASE_ID] && data[DATABASE_ID].params) {
          const params = data[DATABASE_ID].params;

          statusData = {
            // Heater state
            state: params.B_STATE?.v || null,
            cmd: params.B_CMD?.v || null,

            // Current measurements
            mainTemp: parseFloat(params.B_Tk1?.v) || null,
            supplyTemp: parseFloat(params.B_Tdpl1?.v) || null,
            returnTemp: parseFloat(params.B_Tpov1?.v) || null,
            dhwTemp: parseFloat(params.B_Tptv1?.v) || null,
            externalTemp: parseFloat(params.B_Out1?.v) || null,
            oxygenLevel: parseFloat(params.B_Oxy1?.v) || null,
            fanSpeed: parseFloat(params.B_fan?.v) || null,

            // Pump statuses
            pumpP1Status: params.B_P1?.v || null,
            pumpP2Status: params.B_P2?.v || null,
            pumpP3Status: params.B_P3?.v || null,
            pumpP1Demand: params.B_zahP1?.v || null,
            pumpP2Demand: params.B_zahP2?.v || null,
            pumpP3Demand: params.B_zahP3?.v || null,

            // Fan status
            fanStatus: params.B_FotV?.v || null,

            // Cumulative statistics
            burnerWorkMinutes: parseInt(params.CNT_0?.v) || null,
            burnerStartCount: parseInt(params.CNT_1?.v) || null,
            fuelConsumedKg: parseFloat(params.CNT_2?.v) || null,
            flameDurationMinutes: parseInt(params.CNT_3?.v) || null,
            fanWorkingMinutes: parseInt(params.CNT_4?.v) || null,
            pelletAccumulatorMinutes: parseInt(params.CNT_5?.v) || null,
            vacuumBoilerMinutes: parseInt(params.CNT_6?.v) || null,
            vacuumTurbineMinutes: parseInt(params.CNT_7?.v) || null,
            vacuumTurbineCycles: parseInt(params.CNT_8?.v) || null,
            timeOnState01: parseInt(params.CNT_8?.v) || null,
            timeOnState02: parseInt(params.CNT_9?.v) || null,
          };

          console.log('[OK] Captured status and statistics data');
          console.log('[OK] Heater state:', statusData.state);
          console.log('[OK] Burner work: ', statusData.burnerWorkMinutes, 'min');
          console.log('[OK] Fuel consumed:', statusData.fuelConsumedKg, 'kg');
        }
      }

      // Capture error list
      if (url.includes('/wdata/data/multi/errors-list')) {
        const data = await response.json();
        if (data.rows && data.rows.length > 0) {
          errorData = data;
          console.log(`[WARN] Found ${data.rows.length} error events`);
        }
      }

    } catch (e) {
      // Ignore non-JSON responses
    }
  });

  try {
    // Step 1: Login
    console.log('[*] Logging in...');
    await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);

    // Find and fill login form
    const usernameSelectors = [
      'input[name="username"]',
      'input[name="_username"]',
      'input[type="email"]',
      'input[type="text"]'
    ];

    for (const selector of usernameSelectors) {
      try {
        const field = await page.$(selector);
        if (field && await field.isVisible()) {
          await field.fill(process.env.CENTROMETAL_USERNAME);
          console.log(`[OK] Filled username`);
          break;
        }
      } catch (e) { }
    }

    const passwordField = await page.$('input[type="password"]');
    if (passwordField) {
      await passwordField.fill(process.env.CENTROMETAL_PASSWORD);
      console.log('[OK] Filled password');
    }

    // Submit
    const submitButton = await page.$('button[type="submit"]');
    if (submitButton) {
      await submitButton.click();
      console.log('[OK] Submitted login form');

      // Wait for navigation
      try {
        await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 10000 });
      } catch (e) {
        // Might already be on dashboard
      }
    }

    // Step 2: Navigate to dashboard
    console.log('[*] Loading dashboard...');
    await page.goto(DASHBOARD_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Wait for data to load
    console.log('[*] Waiting for dashboard data...');
    await page.waitForTimeout(15000); // Give time for API calls to complete

    // Step 3: Save to database
    if (statusData || temperatureData) {
      console.log('[*] Saving to database...');

      // Helper to convert string/number to boolean
      const toBoolean = (val) => {
        if (val === null || val === undefined) return null;
        if (typeof val === 'boolean') return val;
        if (typeof val === 'string') {
          const num = parseInt(val);
          return num === 1;
        }
        if (typeof val === 'number') {
          return val === 1;
        }
        return null;
      };

      // Save heater status (temperatures, state, component statuses)
      const heaterStatus = {
        state: statusData?.state || 'UNKNOWN',
        isLive: true,
        mainTemperature: statusData?.mainTemp || temperatureData?.boilerTemp || null,
        supplyTemperature: statusData?.supplyTemp || temperatureData?.flueGasTemp || null,
        returnTemperature: statusData?.returnTemp || temperatureData?.returnTemp || null,
        bufferTankTemperature: null,
        radiatorTemperature: null,
        externalTemperature: statusData?.externalTemp || null,
        dhwTemperature: statusData?.dhwTemp || temperatureData?.dhwTemp || null,
        fuelLevelStatus: null,
        oxygenLevel: statusData?.oxygenLevel || null,
        pumpP1Status: toBoolean(statusData?.pumpP1Status),
        pumpP2Status: toBoolean(statusData?.pumpP2Status),
        pumpP3Status: toBoolean(statusData?.pumpP3Status),
        pumpP1Demand: toBoolean(statusData?.pumpP1Demand),
        pumpP2Demand: toBoolean(statusData?.pumpP2Demand),
        pumpP3Demand: toBoolean(statusData?.pumpP3Demand),
        fanStatus: toBoolean(statusData?.fanStatus),
        configurationType: DATABASE_ID,
        installationId: INSTALLATION_ID
      };

      const statusResult = await saveHeaterStatus(heaterStatus);
      console.log(`[OK] Saved status to database (ID: ${statusResult.id})`);

      // Save heater statistics if available
      if (statusData) {
        const heaterStats = {
          timestamp: new Date(),
          burnerWorkMinutes: statusData.burnerWorkMinutes,
          burnerStartCount: statusData.burnerStartCount,
          fuelConsumedKg: statusData.fuelConsumedKg,
          pelletAccumulatorMinutes: statusData.pelletAccumulatorMinutes,
          fanWorkingMinutes: statusData.fanWorkingMinutes,
          vacuumBoilerMinutes: statusData.vacuumBoilerMinutes,
          vacuumTurbineMinutes: statusData.vacuumTurbineMinutes,
          vacuumTurbineCycles: statusData.vacuumTurbineCycles,
          timeOnState01: statusData.timeOnState01,
          timeOnState02: statusData.timeOnState02,
          timeOnState03: null,
          timeOnState04: null,
          timeOnState05: null,
          timeOnState06: null,
        };

        const statsResult = await saveHeaterStatistics(heaterStats);
        console.log('[OK] Saved statistics to database');
        console.log('[OK] Burner work:', statusData.burnerWorkMinutes, 'min');
        console.log('[OK] Fuel consumed:', statusData.fuelConsumedKg, 'kg');
        console.log('[OK] Burner starts:', statusData.burnerStartCount);
      }

    } else {
      console.log('[WARN] No data captured');
    }

    console.log('\n[OK] Scraping completed successfully!');

  } catch (error) {
    console.error('[ERR] Scraping failed:', error.message);
    throw error;

  } finally {
    await browser.close();
  }
}

// Run
scrapeHeaterData()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('[ERR] Fatal error:', error);
    process.exit(1);
  });
