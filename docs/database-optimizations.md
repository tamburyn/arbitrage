# Database Optimizations for Orderbooks API

## Overview
This document outlines database optimizations, indexing strategies, and performance recommendations for the GET /orderbooks endpoint to ensure production-ready performance.

## Required Database Indexes

### 1. Primary Indexes for Filtering

#### Composite Index for Exchange + Timestamp Queries
```sql
CREATE INDEX CONCURRENTLY idx_orderbooks_exchange_timestamp 
ON orderbooks (exchange_id, timestamp DESC);
```
**Purpose**: Optimizes queries filtering by exchange with date sorting  
**Use Case**: `GET /orderbooks?exchangeId=uuid&sort=-timestamp`

#### Composite Index for Asset + Timestamp Queries  
```sql
CREATE INDEX CONCURRENTLY idx_orderbooks_asset_timestamp 
ON orderbooks (asset_id, timestamp DESC);
```
**Purpose**: Optimizes queries filtering by asset with date sorting  
**Use Case**: `GET /orderbooks?assetId=uuid&sort=-timestamp`

#### Composite Index for Exchange + Asset + Timestamp
```sql
CREATE INDEX CONCURRENTLY idx_orderbooks_exchange_asset_timestamp 
ON orderbooks (exchange_id, asset_id, timestamp DESC);
```
**Purpose**: Optimizes queries filtering by both exchange and asset  
**Use Case**: `GET /orderbooks?exchangeId=uuid&assetId=uuid`

### 2. Date Range Indexes

#### Timestamp Range Index
```sql
CREATE INDEX CONCURRENTLY idx_orderbooks_timestamp_range 
ON orderbooks (timestamp) 
WHERE timestamp IS NOT NULL;
```
**Purpose**: Optimizes date range queries  
**Use Case**: `GET /orderbooks?start_date=...&end_date=...`

#### Partial Index for Recent Data
```sql
CREATE INDEX CONCURRENTLY idx_orderbooks_recent 
ON orderbooks (timestamp DESC, exchange_id, asset_id) 
WHERE timestamp > (NOW() - INTERVAL '30 days');
```
**Purpose**: Optimizes queries for recent data (most common use case)  
**Use Case**: Default queries without date filters

### 3. Sorting Indexes

#### Index for Spread Sorting
```sql
CREATE INDEX CONCURRENTLY idx_orderbooks_spread 
ON orderbooks (spread DESC, timestamp DESC) 
WHERE spread IS NOT NULL;
```
**Purpose**: Optimizes sorting by spread  
**Use Case**: `GET /orderbooks?sort=-spread`

#### Index for Volume Sorting
```sql
CREATE INDEX CONCURRENTLY idx_orderbooks_volume 
ON orderbooks (volume DESC, timestamp DESC) 
WHERE volume IS NOT NULL;
```
**Purpose**: Optimizes sorting by volume  
**Use Case**: `GET /orderbooks?sort=-volume`

### 4. Foreign Key Optimization

#### Exchange Reference Index (should already exist)
```sql
-- Verify this index exists
CREATE INDEX CONCURRENTLY idx_orderbooks_exchange_id 
ON orderbooks (exchange_id);
```

#### Asset Reference Index (should already exist)
```sql
-- Verify this index exists  
CREATE INDEX CONCURRENTLY idx_orderbooks_asset_id 
ON orderbooks (asset_id);
```

## Query Optimization Strategies

### 1. Pagination Optimization

Current implementation uses `OFFSET/LIMIT` which can be slow for deep pagination. Consider cursor-based pagination for better performance:

```typescript
// In OrderbookService.getOrderbooks - future enhancement
static async getOrderbooksWithCursor(filters: {
  cursor?: string; // timestamp of last item
  limit: number;
  // ... other filters
}): Promise<{ orderbooks: OrderbookDTO[]; nextCursor?: string }> {
  let query = supabaseClient
    .from('orderbooks')
    .select('*')
    .order('timestamp', { ascending: false })
    .limit(filters.limit);

  if (filters.cursor) {
    query = query.lt('timestamp', filters.cursor);
  }

  // ... apply other filters
  // Return results with nextCursor
}
```

### 2. Query Plan Analysis

Use these queries to analyze performance:

```sql
-- Analyze query performance for common patterns
EXPLAIN (ANALYZE, BUFFERS) 
SELECT * FROM orderbooks 
WHERE exchange_id = $1 
ORDER BY timestamp DESC 
LIMIT 10 OFFSET 0;

-- Check index usage
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM orderbooks 
WHERE exchange_id = $1 
  AND asset_id = $2 
  AND timestamp >= $3 
  AND timestamp <= $4
ORDER BY timestamp DESC;
```

### 3. Statistics and Maintenance

```sql
-- Update table statistics for better query planning
ANALYZE orderbooks;

-- Monitor index usage
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes 
WHERE tablename = 'orderbooks'
ORDER BY idx_tup_read DESC;
```

## Connection Pool Configuration

### Supabase Configuration
```typescript
// In supabase.client.ts - production settings
export const supabaseClient = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!,
  {
    db: {
      schema: 'public',
    },
    auth: {
      persistSession: false, // For API-only usage
    },
    realtime: {
      params: {
        eventsPerSecond: 10, // Limit realtime events
      },
    },
  }
);
```

### Connection Pool Settings (if using direct PostgreSQL)
```sql
-- Recommended PostgreSQL settings for high-traffic API
-- In postgresql.conf:

max_connections = 200
shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 4MB
maintenance_work_mem = 64MB

# Connection pooling with PgBouncer (recommended)
default_pool_size = 25
min_pool_size = 10
max_pool_size = 50
```

## Monitoring and Performance Metrics

### 1. Key Metrics to Monitor

```sql
-- Query to monitor orderbooks table performance
SELECT 
  schemaname,
  tablename,
  seq_tup_read,
  idx_tup_fetch,
  n_tup_ins,
  n_tup_upd,
  n_tup_del
FROM pg_stat_user_tables 
WHERE tablename = 'orderbooks';

-- Index effectiveness
SELECT 
  indexname,
  idx_tup_read,
  idx_tup_fetch,
  idx_tup_read::float / GREATEST(idx_tup_fetch, 1) as selectivity
FROM pg_stat_user_indexes 
WHERE tablename = 'orderbooks'
ORDER BY idx_tup_read DESC;
```

### 2. Performance Alerts

Set up monitoring for:
- Query response time > 500ms
- High number of sequential scans
- Low index hit ratio < 95%
- Connection pool exhaustion

## Data Archiving Strategy

For long-term scalability:

```sql
-- Partition table by timestamp (future enhancement)
CREATE TABLE orderbooks_recent PARTITION OF orderbooks
FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');

CREATE TABLE orderbooks_archived PARTITION OF orderbooks  
FOR VALUES FROM ('2023-01-01') TO ('2024-01-01');

-- Archive old data periodically
-- Move data older than 1 year to archive partition
```

## Cache Layer Recommendations

### 1. Application-Level Caching
- ✅ Already implemented: Exchange/Asset validation caching
- Consider: Query result caching for popular filter combinations
- Consider: CDN caching with appropriate TTL for static-ish data

### 2. Database Query Result Caching
```typescript
// Example: Cache popular query patterns
const cacheKey = `orderbooks_${exchangeId}_${assetId}_${page}_${limit}`;
const cached = await cache.get(cacheKey);
if (cached) return cached;

const result = await OrderbookService.getOrderbooks(filters);
await cache.set(cacheKey, result, 60); // 1 minute TTL
```

## Production Deployment Checklist

### Database
- [ ] All indexes created with `CONCURRENTLY` option
- [ ] `ANALYZE` run on orderbooks table
- [ ] Connection pooling configured
- [ ] Backup strategy implemented
- [ ] Monitoring alerts set up

### Application
- [ ] Rate limiting enabled
- [ ] Cache service deployed
- [ ] Error logging configured
- [ ] Health check endpoint added
- [ ] Performance monitoring enabled

### Infrastructure
- [ ] Database connection limits configured
- [ ] Load balancer health checks
- [ ] CDN configuration (if applicable)
- [ ] SSL/TLS certificates
- [ ] Environment variables secured

## Expected Performance Targets

With proper optimization:

- **Simple queries** (no filters): < 100ms
- **Filtered queries** (exchange/asset): < 200ms  
- **Complex queries** (multiple filters + sorting): < 500ms
- **Deep pagination** (page > 100): < 1s
- **Concurrent requests**: Support 1000+ req/min

## Troubleshooting Common Issues

### Slow Queries
1. Check if indexes are being used: `EXPLAIN ANALYZE`
2. Verify statistics are up to date: `ANALYZE orderbooks`
3. Consider query rewriting for complex filters

### High Memory Usage
1. Reduce `work_mem` if sorting operations are memory-intensive
2. Implement cursor-based pagination for deep pagination
3. Add `LIMIT` clauses to development/debug queries

### Connection Pool Exhaustion
1. Review connection pool configuration
2. Check for connection leaks in application code
3. Consider implementing connection retry logic 