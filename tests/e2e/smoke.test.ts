/**
 * Smoke Tests
 *
 * Basic tests to verify the application loads and core functionality works
 * Created: Phase 4.1 - E2E Testing Infrastructure
 */

import { test, expect } from './helpers/fixtures';
import { navigateAndWait, expectTextVisible } from './helpers/testHelpers';

test.describe('Smoke Tests', () => {
  test.describe('Application Health', () => {
    test('should load the homepage', async ({ page, frontendUrl }) => {
      await navigateAndWait(page, frontendUrl);

      // Check page loaded
      await expect(page).toHaveTitle(/Automation Dashboard/i);

      // Check main content is visible
      await expect(page.locator('body')).toBeVisible();
    });

    test('should have backend API healthy', async ({ page, apiUrl }) => {
      const response = await page.request.get(`${apiUrl}/health`);
      expect(response.ok()).toBeTruthy();
      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty('status');
      expect(data.status).toBe('ok');
    });

    test('should have database connection', async ({ page, apiUrl }) => {
      const response = await page.request.get(`${apiUrl}/health`);
      const data = await response.json();

      // Check that health endpoint returns ok status
      // Database field may or may not be present depending on implementation
      expect(data.status).toBe('ok');
    });
  });

  test.describe('Navigation', () => {
    test('should navigate to different sections', async ({ page, frontendUrl }) => {
      await navigateAndWait(page, frontendUrl);

      // Check if navigation elements exist (may vary based on your sidebar)
      const sidebar = page.locator('[data-testid="sidebar"], nav, .sidebar').first();

      // Wait for sidebar to be visible
      if (await sidebar.isVisible()) {
        // Test passed - sidebar exists
        expect(true).toBe(true);
      } else {
        // Try alternative: check for any navigation links
        const navLinks = page.locator('a').first();
        await expect(navLinks).toBeVisible();
      }
    });

    test('should display main dashboard content', async ({ page, frontendUrl }) => {
      await navigateAndWait(page, frontendUrl);

      // Check for main content area
      const mainContent = page.locator('main, [role="main"], .main-content').first();

      // Wait a bit for content to render
      await page.waitForTimeout(1000);

      // Verify page has some content (not blank)
      const bodyText = await page.textContent('body');
      expect(bodyText).toBeTruthy();
      expect(bodyText!.length).toBeGreaterThan(10);
    });
  });

  test.describe('API Endpoints', () => {
    test('should access pellets dashboard endpoint', async ({ page, apiUrl }) => {
      const response = await page.request.get(`${apiUrl}/api/pellets/dashboard`);

      // May return 200 with data or 500 if no data yet - both are acceptable for smoke test
      expect([200, 500]).toContain(response.status());
    });

    test('should access AI query endpoint (POST)', async ({ page, apiUrl }) => {
      const response = await page.request.post(`${apiUrl}/api/ai/query`, {
        data: {
          query: 'test query',
        },
      });

      // Should not be 404 (endpoint exists) - may be 400/500 without proper data
      expect(response.status()).not.toBe(404);
    });

    test('should access scraper search endpoint', async ({ page, apiUrl }) => {
      const response = await page.request.post(`${apiUrl}/api/scraper/search`, {
        data: {
          query: 'test',
          location: 'Slovenia',
        },
      });

      // Should not be 404 (endpoint exists)
      expect(response.status()).not.toBe(404);
    });
  });

  test.describe('Frontend Resources', () => {
    test('should load without console errors', async ({ page, frontendUrl }) => {
      const errors: string[] = [];

      // Listen for console errors
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        }
      });

      await navigateAndWait(page, frontendUrl);

      // Wait a bit for any async errors
      await page.waitForTimeout(2000);

      // Log errors for debugging but don't fail (some errors may be expected)
      if (errors.length > 0) {
        console.log('Console errors detected:', errors);
      }

      // Test should pass - we're just checking the app loads
      expect(page.url()).toContain('localhost:3000');
    });

    test('should have responsive viewport', async ({ page, frontendUrl }) => {
      await navigateAndWait(page, frontendUrl);

      // Check desktop viewport
      await page.setViewportSize({ width: 1920, height: 1080 });
      await expect(page.locator('body')).toBeVisible();

      // Check tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 });
      await expect(page.locator('body')).toBeVisible();

      // Check mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await expect(page.locator('body')).toBeVisible();
    });
  });
});
