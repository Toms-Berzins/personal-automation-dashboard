/**
 * Playwright Test Fixtures
 *
 * Provides common setup, helpers, and utilities for E2E tests
 * Created: Phase 4.1 - E2E Testing Infrastructure
 */

import { test as base, expect, Page } from '@playwright/test';

/**
 * Extended Page object with custom helpers
 */
export interface TestPage extends Page {
  /**
   * Wait for API response and return the data
   */
  waitForApiResponse(urlPattern: string | RegExp): Promise<any>;

  /**
   * Fill form and submit
   */
  fillAndSubmit(formData: Record<string, string>, submitButton: string): Promise<void>;

  /**
   * Check if element exists without throwing
   */
  elementExists(selector: string): Promise<boolean>;

  /**
   * Wait for loading to finish
   */
  waitForLoadingComplete(): Promise<void>;
}

/**
 * Custom fixtures for the test suite
 */
type CustomFixtures = {
  /**
   * Extended page with helper methods
   */
  testPage: TestPage;

  /**
   * API base URL for backend calls
   */
  apiUrl: string;

  /**
   * Frontend base URL
   */
  frontendUrl: string;
};

/**
 * Extend base test with custom fixtures
 */
export const test = base.extend<CustomFixtures>({
  // API URL fixture (use 127.0.0.1 instead of localhost to avoid IPv6 issues)
  apiUrl: async ({}, use) => {
    await use(process.env.API_URL || 'http://127.0.0.1:8000');
  },

  // Frontend URL fixture
  frontendUrl: async ({}, use) => {
    await use(process.env.FRONTEND_URL || 'http://localhost:3000');
  },

  // Extended page with helper methods
  testPage: async ({ page }, use) => {
    const testPage = page as TestPage;

    // Add waitForApiResponse helper
    testPage.waitForApiResponse = async (urlPattern: string | RegExp) => {
      const response = await page.waitForResponse(urlPattern);
      return await response.json();
    };

    // Add fillAndSubmit helper
    testPage.fillAndSubmit = async (
      formData: Record<string, string>,
      submitButton: string
    ) => {
      for (const [selector, value] of Object.entries(formData)) {
        await page.fill(selector, value);
      }
      await page.click(submitButton);
    };

    // Add elementExists helper
    testPage.elementExists = async (selector: string) => {
      try {
        await page.waitForSelector(selector, { timeout: 1000 });
        return true;
      } catch {
        return false;
      }
    };

    // Add waitForLoadingComplete helper
    testPage.waitForLoadingComplete = async () => {
      // Wait for common loading indicators to disappear
      await page.waitForLoadState('networkidle');

      // Check for common loading spinners/indicators
      const loadingSelectors = [
        '[data-testid="loading"]',
        '.loading',
        '.spinner',
        '[role="progressbar"]',
      ];

      for (const selector of loadingSelectors) {
        const exists = await testPage.elementExists(selector);
        if (exists) {
          await page.waitForSelector(selector, { state: 'hidden', timeout: 10000 });
        }
      }
    };

    await use(testPage);
  },
});

export { expect };
