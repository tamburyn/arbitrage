/**
 * Rate Limiter Service for API endpoints
 * Implements sliding window rate limiting with configurable limits
 */
interface RateLimitConfig {
  windowMs: number;  // Time window in milliseconds
  maxRequests: number;  // Maximum requests per window
}

interface RateLimitEntry {
  requests: number[];  // Timestamps of requests
  lastCleanup: number;  // Last cleanup timestamp
}

class RateLimiterService {
  private clients: Map<string, RateLimitEntry> = new Map();
  private readonly CLEANUP_INTERVAL = 60 * 1000; // 1 minute

  constructor() {
    // Auto cleanup every minute
    setInterval(() => {
      this.cleanup();
    }, this.CLEANUP_INTERVAL);
  }

  /**
   * Checks if a request is allowed based on rate limit
   * @param clientId - Unique identifier for the client (IP, user ID, etc.)
   * @param config - Rate limit configuration
   * @returns Object with isAllowed flag and remaining requests
   */
  checkLimit(clientId: string, config: RateLimitConfig): {
    isAllowed: boolean;
    remaining: number;
    resetTime: number;
  } {
    const now = Date.now();
    const windowStart = now - config.windowMs;
    
    // Get or create client entry
    let entry = this.clients.get(clientId);
    if (!entry) {
      entry = { requests: [], lastCleanup: now };
      this.clients.set(clientId, entry);
    }

    // Clean old requests from the window
    entry.requests = entry.requests.filter(timestamp => timestamp > windowStart);
    entry.lastCleanup = now;

    // Check if limit is exceeded
    const currentRequests = entry.requests.length;
    const isAllowed = currentRequests < config.maxRequests;
    
    if (isAllowed) {
      entry.requests.push(now);
    }

    return {
      isAllowed,
      remaining: Math.max(0, config.maxRequests - currentRequests - (isAllowed ? 1 : 0)),
      resetTime: windowStart + config.windowMs
    };
  }

  /**
   * Cleans up old entries to prevent memory leaks
   */
  private cleanup(): void {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    
    for (const [clientId, entry] of this.clients.entries()) {
      if (now - entry.lastCleanup > maxAge) {
        this.clients.delete(clientId);
      }
    }
  }

  /**
   * Gets rate limiter statistics
   */
  getStats(): { totalClients: number; memoryUsage: number } {
    return {
      totalClients: this.clients.size,
      memoryUsage: JSON.stringify(Array.from(this.clients.entries())).length
    };
  }

  /**
   * Clears all rate limit data for a specific client
   */
  clearClient(clientId: string): void {
    this.clients.delete(clientId);
  }

  /**
   * Clears all rate limit data
   */
  clearAll(): void {
    this.clients.clear();
  }
}

// Predefined rate limit configurations
export const RATE_LIMITS = {
  // Public endpoints - more generous for development and dashboard usage
  PUBLIC: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 500  // Increased from 100 to 500
  },
  
  // Authenticated endpoints - more generous
  AUTHENTICATED: {
    windowMs: 15 * 60 * 1000, // 15 minutes  
    maxRequests: 1000
  },
  
  // Heavy operations - very restrictive
  HEAVY: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 10
  }
} as const;

// Singleton instance
export const rateLimiter = new RateLimiterService();

/**
 * Helper function to reset rate limit for a specific client (for development)
 */
export function resetClientLimit(clientId: string): void {
  (rateLimiter as any).clients.delete(clientId);
}

/**
 * Helper function to get client identifier from request
 */
export function getClientId(request: Request): string {
  // Try to get client IP from various headers
  const xForwardedFor = request.headers.get('x-forwarded-for');
  const xRealIp = request.headers.get('x-real-ip');
  const cfConnectingIp = request.headers.get('cf-connecting-ip');
  
  return xForwardedFor?.split(',')[0] || 
         xRealIp || 
         cfConnectingIp || 
         'unknown';
} 