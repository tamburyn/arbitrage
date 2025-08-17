import { test, expect } from '@playwright/test';
import { AuthHelper, DashboardHelper, ApiHelper, TestDataFactory } from './utils/test-helpers';

test.describe('Dashboard Functionality', () => {
  let authHelper: AuthHelper;
  let dashboardHelper: DashboardHelper;
  let apiHelper: ApiHelper;

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper(page);
    dashboardHelper = new DashboardHelper(page);
    apiHelper = new ApiHelper(page);
    
    // Login before each test
    await authHelper.login();
  });

  test('should load dashboard with arbitrage data', async ({ page }) => {
    await dashboardHelper.waitForArbitrageData();

    // Should show arbitrage table
    await expect(page.locator('[data-testid="arbitrage-table"]')).toBeVisible();
    
    // Should have at least one opportunity
    const opportunitiesCount = await dashboardHelper.getOpportunitiesCount();
    expect(opportunitiesCount).toBeGreaterThan(0);
  });

  test('should filter arbitrage opportunities by exchange', async ({ page }) => {
    await dashboardHelper.waitForArbitrageData();
    
    // Apply Binance filter
    await dashboardHelper.applyFilters({ exchange: 'binance' });
    
    // All visible opportunities should be from Binance
    const rows = page.locator('[data-testid="arbitrage-row"]');
    const count = await rows.count();
    
    for (let i = 0; i < count; i++) {
      const row = rows.nth(i);
      const buyExchange = await row.locator('[data-testid="buy-exchange"]').textContent();
      const sellExchange = await row.locator('[data-testid="sell-exchange"]').textContent();
      
      expect(buyExchange === 'binance' || sellExchange === 'binance').toBe(true);
    }
  });

  test('should filter opportunities by asset', async ({ page }) => {
    await dashboardHelper.waitForArbitrageData();
    
    // Apply BTC filter
    await dashboardHelper.applyFilters({ asset: 'BTC' });
    
    // All visible opportunities should be for BTC
    const rows = page.locator('[data-testid="arbitrage-row"]');
    const count = await rows.count();
    
    for (let i = 0; i < count; i++) {
      const row = rows.nth(i);
      const asset = await row.locator('[data-testid="asset"]').textContent();
      expect(asset).toBe('BTC');
    }
  });

  test('should filter opportunities by spread range', async ({ page }) => {
    await dashboardHelper.waitForArbitrageData();
    
    // Apply spread filter (min 0.5%, max 2%)
    await dashboardHelper.applyFilters({ 
      minSpread: 0.5, 
      maxSpread: 2.0 
    });
    
    // All visible opportunities should be within spread range
    const rows = page.locator('[data-testid="arbitrage-row"]');
    const count = await rows.count();
    
    for (let i = 0; i < count; i++) {
      const row = rows.nth(i);
      const spreadText = await row.locator('[data-testid="spread"]').textContent();
      const spread = parseFloat(spreadText?.replace('%', '') || '0');
      
      expect(spread).toBeGreaterThanOrEqual(0.5);
      expect(spread).toBeLessThanOrEqual(2.0);
    }
  });

  test('should sort opportunities by different columns', async ({ page }) => {
    await dashboardHelper.waitForArbitrageData();
    
    // Sort by spread (descending)
    await page.click('[data-testid="sort-spread"]');
    
    // Get first two spread values
    const firstSpread = await page.locator('[data-testid="arbitrage-row"]').first()
      .locator('[data-testid="spread"]').textContent();
    const secondSpread = await page.locator('[data-testid="arbitrage-row"]').nth(1)
      .locator('[data-testid="spread"]').textContent();
    
    const firstValue = parseFloat(firstSpread?.replace('%', '') || '0');
    const secondValue = parseFloat(secondSpread?.replace('%', '') || '0');
    
    expect(firstValue).toBeGreaterThanOrEqual(secondValue);
  });

  test('should show opportunity details in modal', async ({ page }) => {
    await dashboardHelper.waitForArbitrageData();
    
    // Click on first opportunity
    await page.locator('[data-testid="arbitrage-row"]').first().click();
    
    // Should open details modal
    await expect(page.locator('[data-testid="opportunity-modal"]')).toBeVisible();
    
    // Should show detailed information
    await expect(page.locator('[data-testid="buy-exchange-detail"]')).toBeVisible();
    await expect(page.locator('[data-testid="sell-exchange-detail"]')).toBeVisible();
    await expect(page.locator('[data-testid="profit-calculation"]')).toBeVisible();
  });

  test('should refresh data manually', async ({ page }) => {
    await dashboardHelper.waitForArbitrageData();
    
    // Get current timestamp
    const initialTimestamp = await page.locator('[data-testid="last-update"]').textContent();
    
    // Click refresh button
    await page.click('[data-testid="refresh-button"]');
    
    // Should show loading state
    await expect(page.locator('[data-testid="loading-indicator"]')).toBeVisible();
    
    // Wait for data to refresh
    await page.waitForFunction((initial) => {
      const current = document.querySelector('[data-testid="last-update"]')?.textContent;
      return current !== initial;
    }, initialTimestamp);
    
    // Should hide loading indicator
    await expect(page.locator('[data-testid="loading-indicator"]')).not.toBeVisible();
  });

  test('should handle API errors gracefully', async ({ page }) => {
    // Mock API to return error
    await page.route('**/api/arbitrage-opportunities', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' })
      });
    });
    
    await dashboardHelper.goto('/dashboard');
    
    // Should show error message
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText('Failed to load data');
    
    // Should show retry button
    await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
  });

  test('should be responsive on mobile devices', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await dashboardHelper.waitForArbitrageData();
    
    // Should show mobile-optimized layout
    await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();
    await expect(page.locator('[data-testid="arbitrage-table"]')).toBeVisible();
    
    // Should be able to scroll table horizontally
    const table = page.locator('[data-testid="arbitrage-table"]');
    await expect(table).toHaveCSS('overflow-x', 'auto');
  });
});
