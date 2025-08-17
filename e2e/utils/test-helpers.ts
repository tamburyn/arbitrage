import { Page, expect } from '@playwright/test';

/**
 * Page Object Model base class for common functionality
 */
export class BasePage {
  constructor(public readonly page: Page) {}

  /**
   * Navigate to a specific URL
   */
  async goto(url: string) {
    await this.page.goto(url);
  }

  /**
   * Wait for page to be fully loaded
   */
  async waitForPageLoad() {
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Take a screenshot for debugging
   */
  async takeScreenshot(name: string) {
    await this.page.screenshot({ path: `e2e/screenshots/${name}.png` });
  }
}

/**
 * Authentication helper functions
 */
export class AuthHelper extends BasePage {
  /**
   * Login with test credentials
   */
  async login(email: string = 'test@example.com', password: string = 'password123') {
    await this.goto('/login');
    await this.page.fill('[data-testid="email-input"]', email);
    await this.page.fill('[data-testid="password-input"]', password);
    await this.page.click('[data-testid="login-button"]');
    
    // Wait for redirect to dashboard
    await this.page.waitForURL('/dashboard');
  }

  /**
   * Register a new user
   */
  async register(email: string, password: string, confirmPassword?: string) {
    await this.goto('/register');
    await this.page.fill('[data-testid="email-input"]', email);
    await this.page.fill('[data-testid="password-input"]', password);
    await this.page.fill('[data-testid="confirm-password-input"]', confirmPassword || password);
    await this.page.click('[data-testid="register-button"]');
  }

  /**
   * Logout user
   */
  async logout() {
    await this.page.click('[data-testid="user-menu"]');
    await this.page.click('[data-testid="logout-button"]');
    await this.page.waitForURL('/');
  }

  /**
   * Check if user is logged in
   */
  async isLoggedIn(): Promise<boolean> {
    try {
      await this.page.waitForSelector('[data-testid="user-menu"]', { timeout: 3000 });
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Dashboard helper functions
 */
export class DashboardHelper extends BasePage {
  /**
   * Wait for arbitrage data to load
   */
  async waitForArbitrageData() {
    await this.page.waitForSelector('[data-testid="arbitrage-table"]');
    await this.page.waitForFunction(() => {
      const rows = document.querySelectorAll('[data-testid="arbitrage-row"]');
      return rows.length > 0;
    });
  }

  /**
   * Apply filters to the dashboard
   */
  async applyFilters(filters: {
    exchange?: string;
    asset?: string;
    minSpread?: number;
    maxSpread?: number;
  }) {
    if (filters.exchange) {
      await this.page.selectOption('[data-testid="exchange-filter"]', filters.exchange);
    }
    
    if (filters.asset) {
      await this.page.selectOption('[data-testid="asset-filter"]', filters.asset);
    }
    
    if (filters.minSpread !== undefined) {
      await this.page.fill('[data-testid="min-spread-input"]', filters.minSpread.toString());
    }
    
    if (filters.maxSpread !== undefined) {
      await this.page.fill('[data-testid="max-spread-input"]', filters.maxSpread.toString());
    }
    
    await this.page.click('[data-testid="apply-filters-button"]');
  }

  /**
   * Get arbitrage opportunities count
   */
  async getOpportunitiesCount(): Promise<number> {
    const rows = await this.page.locator('[data-testid="arbitrage-row"]').count();
    return rows;
  }

  /**
   * Check if filters are applied correctly
   */
  async verifyFiltersApplied(expectedCount: number) {
    await expect(this.page.locator('[data-testid="arbitrage-row"]')).toHaveCount(expectedCount);
  }
}

/**
 * API helper functions for backend testing
 */
export class ApiHelper {
  constructor(private page: Page) {}

  /**
   * Make authenticated API request
   */
  async makeAuthenticatedRequest(endpoint: string, options: any = {}) {
    return await this.page.request.fetch(endpoint, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
  }

  /**
   * Test API endpoint response
   */
  async testApiEndpoint(endpoint: string, expectedStatus: number = 200) {
    const response = await this.page.request.get(endpoint);
    expect(response.status()).toBe(expectedStatus);
    return response;
  }

  /**
   * Create test data via API
   */
  async createTestOrderbook(data: any) {
    return await this.makeAuthenticatedRequest('/api/orderbooks', {
      method: 'POST',
      data: JSON.stringify(data),
    });
  }

  /**
   * Clean up test data via API
   */
  async cleanupTestData() {
    // Implementation for cleaning up test data
    await this.makeAuthenticatedRequest('/api/test/cleanup', {
      method: 'DELETE',
    });
  }
}

/**
 * Test data factories
 */
export const TestDataFactory = {
  createOrderbook: (overrides: any = {}) => ({
    exchange_id: 'binance',
    asset_id: 'BTC',
    bid_price: '50000',
    ask_price: '50100',
    timestamp: new Date().toISOString(),
    ...overrides,
  }),

  createUser: (overrides: any = {}) => ({
    email: `test-${Date.now()}@example.com`,
    password: 'password123',
    ...overrides,
  }),

  createArbitrageOpportunity: (overrides: any = {}) => ({
    buy_exchange: 'binance',
    sell_exchange: 'bybit',
    asset_id: 'BTC',
    buy_price: '50000',
    sell_price: '50200',
    spread_percentage: '0.4',
    profit_usd: '200',
    ...overrides,
  }),
};

/**
 * Custom assertions for common patterns
 */
export const customAssertions = {
  async toHaveLoadingState(page: Page, selector: string) {
    await expect(page.locator(selector)).toHaveAttribute('aria-busy', 'true');
  },

  async toHaveFinishedLoading(page: Page, selector: string) {
    await expect(page.locator(selector)).not.toHaveAttribute('aria-busy', 'true');
  },

  async toBeAccessible(page: Page) {
    // Basic accessibility checks
    const title = await page.title();
    expect(title).toBeTruthy();
    
    // Check for main landmark
    await expect(page.locator('main')).toBeVisible();
  },
};
