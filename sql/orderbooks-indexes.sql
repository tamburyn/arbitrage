-- =============================================================================
-- Orderbooks API Performance Indexes
-- =============================================================================
-- This script creates all necessary indexes for optimal performance of the
-- GET /orderbooks endpoint. Run these in production during low-traffic periods.
-- 
-- Usage: psql -d your_database -f orderbooks-indexes.sql
-- =============================================================================

-- Start transaction for atomic index creation
BEGIN;

-- =============================================================================
-- 1. PRIMARY FILTERING INDEXES
-- =============================================================================

-- Exchange + Timestamp composite index (most common query pattern)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orderbooks_exchange_timestamp 
ON orderbooks (exchange_id, timestamp DESC)
WHERE exchange_id IS NOT NULL AND timestamp IS NOT NULL;

-- Asset + Timestamp composite index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orderbooks_asset_timestamp 
ON orderbooks (asset_id, timestamp DESC)
WHERE asset_id IS NOT NULL AND timestamp IS NOT NULL;

-- Exchange + Asset + Timestamp composite index (for combined filters)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orderbooks_exchange_asset_timestamp 
ON orderbooks (exchange_id, asset_id, timestamp DESC)
WHERE exchange_id IS NOT NULL AND asset_id IS NOT NULL AND timestamp IS NOT NULL;

-- =============================================================================
-- 2. DATE RANGE OPTIMIZATION INDEXES
-- =============================================================================

-- Timestamp range queries optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orderbooks_timestamp_range 
ON orderbooks (timestamp DESC)
WHERE timestamp IS NOT NULL;

-- Partial index for recent data (last 30 days) - most common use case
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orderbooks_recent 
ON orderbooks (timestamp DESC, exchange_id, asset_id)
WHERE timestamp > (NOW() - INTERVAL '30 days');

-- =============================================================================
-- 3. SORTING OPTIMIZATION INDEXES
-- =============================================================================

-- Spread sorting index (includes timestamp for tie-breaking)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orderbooks_spread_desc 
ON orderbooks (spread DESC, timestamp DESC)
WHERE spread IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orderbooks_spread_asc 
ON orderbooks (spread ASC, timestamp DESC)
WHERE spread IS NOT NULL;

-- Volume sorting index (includes timestamp for tie-breaking)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orderbooks_volume_desc 
ON orderbooks (volume DESC, timestamp DESC)
WHERE volume IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orderbooks_volume_asc 
ON orderbooks (volume ASC, timestamp DESC)
WHERE volume IS NOT NULL;

-- Created_at sorting index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orderbooks_created_at 
ON orderbooks (created_at DESC, timestamp DESC)
WHERE created_at IS NOT NULL;

-- =============================================================================
-- 4. FOREIGN KEY REFERENCE INDEXES
-- =============================================================================
-- Note: These should already exist due to foreign key constraints,
-- but we verify they exist for validation queries

-- Exchange reference index (for validation caching)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orderbooks_exchange_id 
ON orderbooks (exchange_id)
WHERE exchange_id IS NOT NULL;

-- Asset reference index (for validation caching)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orderbooks_asset_id 
ON orderbooks (asset_id)
WHERE asset_id IS NOT NULL;

-- =============================================================================
-- 5. COMPLEX QUERY PATTERN INDEXES
-- =============================================================================

-- Exchange + Date Range + Sorting
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orderbooks_exchange_daterange 
ON orderbooks (exchange_id, timestamp DESC, spread DESC)
WHERE exchange_id IS NOT NULL AND timestamp IS NOT NULL;

-- Asset + Date Range + Sorting
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orderbooks_asset_daterange 
ON orderbooks (asset_id, timestamp DESC, spread DESC)
WHERE asset_id IS NOT NULL AND timestamp IS NOT NULL;

-- Combined filters with spread sorting
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orderbooks_combined_spread 
ON orderbooks (exchange_id, asset_id, spread DESC, timestamp DESC)
WHERE exchange_id IS NOT NULL AND asset_id IS NOT NULL AND spread IS NOT NULL;

-- =============================================================================
-- 6. STATISTICS UPDATE
-- =============================================================================

-- Update table statistics for optimal query planning
ANALYZE orderbooks;

-- Update statistics for related tables used in validation
ANALYZE exchanges;
ANALYZE assets;

COMMIT;

-- =============================================================================
-- 7. INDEX USAGE VERIFICATION QUERIES
-- =============================================================================
-- Run these queries after index creation to verify proper usage

/*
-- Check index usage statistics
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_tup_read,
  idx_tup_fetch,
  idx_tup_read::float / GREATEST(idx_tup_fetch, 1) as selectivity
FROM pg_stat_user_indexes 
WHERE tablename = 'orderbooks'
ORDER BY idx_tup_read DESC;

-- Test query performance for common patterns
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT) 
SELECT * FROM orderbooks 
WHERE exchange_id = 'your-test-exchange-id'
ORDER BY timestamp DESC 
LIMIT 10;

EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT * FROM orderbooks 
WHERE exchange_id = 'your-test-exchange-id'
  AND asset_id = 'your-test-asset-id'
  AND timestamp >= '2024-01-01T00:00:00Z'
  AND timestamp <= '2024-12-31T23:59:59Z'
ORDER BY spread DESC
LIMIT 50 OFFSET 0;

-- Check table and index sizes
SELECT 
  tablename,
  pg_size_pretty(pg_total_relation_size(tablename::regclass)) as table_size,
  pg_size_pretty(pg_indexes_size(tablename::regclass)) as indexes_size
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'orderbooks';
*/

-- =============================================================================
-- 8. MAINTENANCE RECOMMENDATIONS
-- =============================================================================

/*
-- Run these commands periodically for optimal performance:

-- Update statistics (recommended: daily during low traffic)
ANALYZE orderbooks;

-- Rebuild indexes if fragmentation is high (recommended: monthly)
REINDEX INDEX CONCURRENTLY idx_orderbooks_exchange_timestamp;
REINDEX INDEX CONCURRENTLY idx_orderbooks_asset_timestamp;
-- ... repeat for other indexes as needed

-- Monitor index bloat
SELECT 
  schemaname, 
  tablename, 
  indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) AS index_size,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes 
WHERE schemaname = 'public' AND tablename = 'orderbooks'
ORDER BY pg_relation_size(indexrelid) DESC;
*/

-- =============================================================================
-- NOTES
-- =============================================================================
-- 1. All indexes use CONCURRENTLY to avoid blocking production traffic
-- 2. WHERE clauses on indexes improve performance and reduce index size
-- 3. Composite indexes are ordered by selectivity (most selective first)
-- 4. DESC sorting on timestamp matches default API behavior
-- 5. Partial indexes for recent data optimize common query patterns
-- 6. Regular ANALYZE is crucial for optimal query planning 