/**
 * E2E Test Helper Functions
 *
 * Common utilities and helpers for Playwright tests
 * Created: Phase 4.1 - E2E Testing Infrastructure
 */

import { Page, expect } from '@playwright/test';

/**
 * Wait for element to be visible and return it
 */
export async function waitForElement(page: Page, selector: string, timeout = 5000) {
  await page.waitForSelector(selector, { state: 'visible', timeout });
  return page.locator(selector);
}

/**
 * Check if text is visible on the page
 */
export async function expectTextVisible(page: Page, text: string) {
  await expect(page.getByText(text, { exact: false })).toBeVisible();
}

/**
 * Check if element contains text
 */
export async function expectElementText(page: Page, selector: string, text: string) {
  const element = page.locator(selector);
  await expect(element).toContainText(text);
}

/**
 * Click button by text
 */
export async function clickButton(page: Page, buttonText: string) {
  await page.getByRole('button', { name: buttonText }).click();
}

/**
 * Fill input by label
 */
export async function fillInputByLabel(page: Page, label: string, value: string) {
  await page.getByLabel(label).fill(value);
}

/**
 * Fill input by placeholder
 */
export async function fillInputByPlaceholder(page: Page, placeholder: string, value: string) {
  await page.getByPlaceholder(placeholder).fill(value);
}

/**
 * Wait for API call to complete
 */
export async function waitForApiCall(
  page: Page,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  urlPattern: string | RegExp
) {
  const responsePromise = page.waitForResponse(
    (response) => {
      const matchesMethod = response.request().method() === method;
      const matchesUrl =
        typeof urlPattern === 'string'
          ? response.url().includes(urlPattern)
          : urlPattern.test(response.url());
      return matchesMethod && matchesUrl;
    },
    { timeout: 15000 }
  );

  return responsePromise;
}

/**
 * Wait for successful API response
 */
export async function waitForSuccessfulApi(
  page: Page,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  urlPattern: string | RegExp
) {
  const response = await waitForApiCall(page, method, urlPattern);
  expect(response.status()).toBeLessThan(400);
  return response;
}

/**
 * Check for error message
 */
export async function expectErrorMessage(page: Page, message?: string) {
  const errorElement = page.locator('.error, [role="alert"], .alert-error').first();
  await expect(errorElement).toBeVisible();

  if (message) {
    await expect(errorElement).toContainText(message);
  }
}

/**
 * Check for success message
 */
export async function expectSuccessMessage(page: Page, message?: string) {
  const successElement = page.locator('.success, .alert-success, [role="status"]').first();
  await expect(successElement).toBeVisible();

  if (message) {
    await expect(successElement).toContainText(message);
  }
}

/**
 * Navigate to a route and wait for it to load
 */
export async function navigateAndWait(page: Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState('networkidle');
}

/**
 * Take screenshot with timestamp
 */
export async function takeScreenshot(page: Page, name: string) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  await page.screenshot({
    path: `test-results/screenshots/${name}-${timestamp}.png`,
    fullPage: true,
  });
}

/**
 * Scroll to bottom of page
 */
export async function scrollToBottom(page: Page) {
  await page.evaluate(() => {
    window.scrollTo(0, document.body.scrollHeight);
  });
  await page.waitForTimeout(500); // Wait for any lazy-loaded content
}

/**
 * Clear all inputs in a form
 */
export async function clearForm(page: Page, formSelector: string) {
  const inputs = await page.locator(`${formSelector} input`).all();
  for (const input of inputs) {
    await input.clear();
  }
}

/**
 * Check if page contains any text from array
 */
export async function expectAnyText(page: Page, texts: string[]) {
  const pageContent = await page.textContent('body');
  const hasAnyText = texts.some((text) => pageContent?.includes(text));
  expect(hasAnyText).toBeTruthy();
}

/**
 * Wait for table to have rows
 */
export async function waitForTableRows(page: Page, tableSelector: string, minRows = 1) {
  await page.waitForFunction(
    ({ selector, min }) => {
      const table = document.querySelector(selector);
      const rows = table?.querySelectorAll('tbody tr');
      return rows && rows.length >= min;
    },
    { selector: tableSelector, min: minRows },
    { timeout: 10000 }
  );
}

/**
 * Get table row count
 */
export async function getTableRowCount(page: Page, tableSelector: string): Promise<number> {
  return await page.locator(`${tableSelector} tbody tr`).count();
}

/**
 * Retry action until successful
 */
export async function retryUntilSuccess<T>(
  action: () => Promise<T>,
  maxAttempts = 3,
  delayMs = 1000
): Promise<T> {
  let lastError: Error | undefined;

  for (let i = 0; i < maxAttempts; i++) {
    try {
      return await action();
    } catch (error) {
      lastError = error as Error;
      if (i < maxAttempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  throw lastError;
}
