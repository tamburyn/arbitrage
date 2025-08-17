import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn(() => ({
  disconnect: vi.fn(),
  observe: vi.fn(),
  unobserve: vi.fn(),
})) as any;

// Mock ResizeObserver
global.ResizeObserver = vi.fn(() => ({
  disconnect: vi.fn(),
  observe: vi.fn(),
  unobserve: vi.fn(),
})) as any;

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock environment variables for tests
vi.stubEnv('PUBLIC_SUPABASE_URL', 'http://localhost:54321');
vi.stubEnv('PUBLIC_SUPABASE_ANON_KEY', 'test-anon-key');
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key');

// Mock Supabase client
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: {
      signIn: vi.fn(),
      signOut: vi.fn(),
      signUp: vi.fn(),
      getUser: vi.fn(),
      onAuthStateChange: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn(),
      data: null,
      error: null,
    })),
    rpc: vi.fn(),
  })),
}));

// Global test utilities
global.testUtils = {
  // Add any global test utilities here
  createMockOrderbook: () => ({
    id: '1',
    exchange_id: 'binance',
    asset_id: 'BTC',
    bid_price: '50000',
    ask_price: '50100',
    timestamp: new Date().toISOString(),
  }),
  
  createMockUser: () => ({
    id: 'user-1',
    email: 'test@example.com',
    created_at: new Date().toISOString(),
  }),
};

// Type declaration for global utilities
declare global {
  var testUtils: {
    createMockOrderbook: () => any;
    createMockUser: () => any;
  };
}
