/**
 * Cache Service for optimizing validation queries and database operations
 * Implements in-memory caching with TTL for frequently accessed data
 */
class CacheService {
  private cache: Map<string, { data: any; timestamp: number; ttl: number }> = new Map();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

  /**
   * Sets a value in cache with optional TTL
   */
  set(key: string, data: any, ttl: number = this.DEFAULT_TTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  /**
   * Gets a value from cache, returns null if expired or not found
   */
  get(key: string): any {
    const cached = this.cache.get(key);
    
    if (!cached) {
      return null;
    }

    const now = Date.now();
    const isExpired = (now - cached.timestamp) > cached.ttl;

    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  /**
   * Clears specific key from cache
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clears entire cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Gets cache statistics for monitoring
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }

  /**
   * Cleans up expired entries (should be called periodically)
   */
  cleanup(): void {
    const now = Date.now();
    
    for (const [key, cached] of this.cache.entries()) {
      const isExpired = (now - cached.timestamp) > cached.ttl;
      if (isExpired) {
        this.cache.delete(key);
      }
    }
  }
}

// Singleton instance
export const cacheService = new CacheService();

// Auto cleanup every 10 minutes
setInterval(() => {
  cacheService.cleanup();
}, 10 * 60 * 1000); 