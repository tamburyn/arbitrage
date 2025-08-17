# Test Scenarios for GET /assets

## Overview
This document outlines comprehensive test scenarios for the assets retrieval endpoint. These tests should be implemented when a testing framework (like Vitest, Jest, or similar) is added to the project.

## Test Categories

### 1. Rate Limiting

#### TC-001: Successful Request Within Rate Limit
- **Input**: `GET /assets` (within rate limit)
- **Expected**: 200 OK with assets data and rate limit headers

#### TC-002: Rate Limit Exceeded
- **Input**: Multiple rapid requests exceeding `RATE_LIMITS.PUBLIC`
- **Expected**: 429 Too Many Requests with rate limit information

#### TC-003: Rate Limit Headers Validation
- **Input**: `GET /assets` (valid request)
- **Expected**: 200 OK with headers:
  - `X-RateLimit-Limit`: Maximum requests allowed
  - `X-RateLimit-Remaining`: Remaining requests
  - `X-RateLimit-Reset`: Reset timestamp

### 2. Query Parameter Validation - Filter

#### TC-004: Valid Filter Parameter
- **Input**: `GET /assets?filter=BTC`
- **Expected**: 200 OK with assets containing "BTC" in symbol or full_name

#### TC-005: Empty Filter Parameter
- **Input**: `GET /assets?filter=`
- **Expected**: 400 Bad Request with message "filter must be a non-empty string"

#### TC-006: Filter Too Long
- **Input**: `GET /assets?filter=` + 101 character string
- **Expected**: 400 Bad Request with message "filter must be less than 100 characters"

#### TC-007: Filter with Special Characters
- **Input**: `GET /assets?filter=BTC%20ETH`
- **Expected**: 200 OK with assets matching the decoded filter string

#### TC-008: Filter Case Insensitive Search
- **Input**: `GET /assets?filter=bitcoin`
- **Expected**: 200 OK with assets containing "bitcoin" (case insensitive)

#### TC-009: Filter with No Results
- **Input**: `GET /assets?filter=nonexistentcoin`
- **Expected**: 200 OK with empty data array

### 3. Query Parameter Validation - Sort

#### TC-010: Valid Sort by Symbol Ascending
- **Input**: `GET /assets?sort=symbol`
- **Expected**: 200 OK with assets sorted by symbol ascending

#### TC-011: Valid Sort by Symbol Descending
- **Input**: `GET /assets?sort=-symbol`
- **Expected**: 200 OK with assets sorted by symbol descending

#### TC-012: Valid Sort by Full Name
- **Input**: `GET /assets?sort=full_name`
- **Expected**: 200 OK with assets sorted by full_name ascending

#### TC-013: Valid Sort by Created At
- **Input**: `GET /assets?sort=-created_at`
- **Expected**: 200 OK with assets sorted by created_at descending

#### TC-014: Invalid Sort Field
- **Input**: `GET /assets?sort=invalid_field`
- **Expected**: 400 Bad Request with message "sort must be one of: symbol, full_name, created_at (prefix with - for descending)"

#### TC-015: Invalid Sort Field with Prefix
- **Input**: `GET /assets?sort=-invalid_field`
- **Expected**: 400 Bad Request with message "sort must be one of: symbol, full_name, created_at (prefix with - for descending)"

#### TC-016: Default Sort (No Parameter)
- **Input**: `GET /assets` (no sort parameter)
- **Expected**: 200 OK with assets sorted by symbol ascending (default)

### 4. Query Parameter Validation - Pagination

#### TC-017: Valid Page Parameter
- **Input**: `GET /assets?page=2`
- **Expected**: 200 OK with second page of results

#### TC-018: Invalid Page Parameter (Zero)
- **Input**: `GET /assets?page=0`
- **Expected**: 400 Bad Request with message "page must be a positive integer"

#### TC-019: Invalid Page Parameter (Negative)
- **Input**: `GET /assets?page=-1`
- **Expected**: 400 Bad Request with message "page must be a positive integer"

#### TC-020: Invalid Page Parameter (Non-numeric)
- **Input**: `GET /assets?page=abc`
- **Expected**: 400 Bad Request with message "page must be a positive integer"

#### TC-021: Valid Limit Parameter
- **Input**: `GET /assets?limit=25`
- **Expected**: 200 OK with maximum 25 results

#### TC-022: Invalid Limit Parameter (Zero)
- **Input**: `GET /assets?limit=0`
- **Expected**: 400 Bad Request with message "limit must be a positive integer between 1 and 100"

#### TC-023: Invalid Limit Parameter (Too Large)
- **Input**: `GET /assets?limit=101`
- **Expected**: 400 Bad Request with message "limit must be a positive integer between 1 and 100"

#### TC-024: Invalid Limit Parameter (Non-numeric)
- **Input**: `GET /assets?limit=many`
- **Expected**: 400 Bad Request with message "limit must be a positive integer between 1 and 100"

#### TC-025: Default Pagination Values
- **Input**: `GET /assets` (no page/limit parameters)
- **Expected**: 200 OK with page=1, limit=10 (default values)

#### TC-026: Valid Pagination Combination
- **Input**: `GET /assets?page=3&limit=20`
- **Expected**: 200 OK with pagination metadata showing page 3, limit 20

### 5. Complex Query Combinations

#### TC-027: All Valid Parameters
- **Input**: `GET /assets?filter=coin&sort=-symbol&page=2&limit=15`
- **Expected**: 200 OK with all filters applied correctly

#### TC-028: Filter with Pagination
- **Input**: `GET /assets?filter=BTC&page=1&limit=5`
- **Expected**: 200 OK with filtered results and correct pagination

#### TC-029: Sort with Pagination
- **Input**: `GET /assets?sort=-created_at&page=2&limit=10`
- **Expected**: 200 OK with sorted results and correct page

#### TC-030: Mixed Valid and Invalid Parameters
- **Input**: `GET /assets?filter=BTC&page=-1`
- **Expected**: 400 Bad Request with first validation error (page validation)

### 6. Response Format Validation

#### TC-031: Successful Response Structure
- **Input**: `GET /assets?limit=5`
- **Expected**: 200 OK with structure:
  ```json
  {
    "data": [
      {
        "id": "uuid",
        "symbol": "string",
        "full_name": "string or null",
        "description": "string or null",
        "created_at": "ISO string or null",
        "updated_at": "ISO string or null"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 5,
      "total": 50,
      "total_pages": 10
    }
  }
  ```

#### TC-032: Empty Results Response
- **Input**: `GET /assets?filter=nonexistentasset`
- **Expected**: 200 OK with empty data array and pagination showing total: 0

#### TC-033: Single Result Response
- **Input**: `GET /assets?filter=uniqueasset`
- **Expected**: 200 OK with data array containing single AssetDTO

#### TC-034: Null Field Handling
- **Input**: `GET /assets` (with assets having null full_name/description)
- **Expected**: 200 OK with null fields properly represented

### 7. Service Layer Error Handling

#### TC-035: AssetService Exception
- **Mock**: AssetService.getAssets throws error
- **Expected**: 500 Internal Server Error with message "Failed to retrieve assets"

#### TC-036: Database Connection Error
- **Mock**: Database unavailable during query
- **Expected**: 500 Internal Server Error with message "Failed to retrieve assets"

#### TC-037: Database Query Timeout
- **Mock**: Database query timeout
- **Expected**: 500 Internal Server Error with proper error handling

#### TC-038: Service Error Audit Logging
- **Input**: Request causing service error
- **Expected**: Audit log entry with operation "SERVICE_ERROR"

### 8. Cache Functionality

#### TC-039: Cache Hit on Repeated Request
- **Input**: Identical GET requests within cache TTL
- **Expected**: Second request served from cache (faster response)

#### TC-040: Cache Miss After TTL Expiry
- **Input**: Request after cache TTL expires
- **Expected**: Fresh database query executed

#### TC-041: Cache Invalidation
- **Mock**: Asset data modified externally
- **Expected**: Cache cleared appropriately via AssetService.clearCache()

#### TC-042: Different Cache Keys for Different Parameters
- **Input**: 
  - `GET /assets?filter=BTC&page=1`
  - `GET /assets?filter=ETH&page=1`
- **Expected**: Separate cache entries for different parameter combinations

### 9. Performance and Edge Cases

#### TC-043: Large Result Set
- **Input**: `GET /assets?limit=100` (with large dataset)
- **Expected**: 200 OK with performance within acceptable limits (<2s)

#### TC-044: Deep Pagination
- **Input**: `GET /assets?page=1000&limit=100`
- **Expected**: 200 OK with empty results if beyond dataset

#### TC-045: Multiple Concurrent Requests
- **Input**: Multiple concurrent GET requests
- **Expected**: All requests succeed with consistent results

#### TC-046: Memory Usage Validation
- **Input**: High-volume requests with large result sets
- **Expected**: Memory usage within acceptable limits

### 10. Data Integrity and Mapping

#### TC-047: AssetDTO Field Mapping
- **Input**: `GET /assets?limit=1`
- **Expected**: Response data fields match AssetDTO interface exactly

#### TC-048: UUID Format Validation
- **Input**: `GET /assets?limit=1`
- **Expected**: All ID fields are valid UUIDs

#### TC-049: Timestamp Format Validation
- **Input**: `GET /assets?limit=1`
- **Expected**: created_at and updated_at in ISO 8601 format or null

#### TC-050: Data Consistency
- **Input**: Multiple requests with same parameters
- **Expected**: Consistent results across requests (within cache TTL)

### 11. Filtering Logic

#### TC-051: Filter Matches Symbol Only
- **Input**: `GET /assets?filter=BTC` (with asset having symbol=BTC, full_name=Bitcoin)
- **Expected**: Asset returned when filter matches symbol

#### TC-052: Filter Matches Full Name Only
- **Input**: `GET /assets?filter=Bitcoin` (with asset having symbol=BTC, full_name=Bitcoin)
- **Expected**: Asset returned when filter matches full_name

#### TC-053: Filter Matches Both Fields
- **Input**: `GET /assets?filter=coin` (matches both symbol and full_name of different assets)
- **Expected**: All matching assets returned

#### TC-054: Filter Partial Match
- **Input**: `GET /assets?filter=bit` (matches Bitcoin, Bitcash, etc.)
- **Expected**: All assets with "bit" in symbol or full_name returned

#### TC-055: Filter with Spaces
- **Input**: `GET /assets?filter=stable coin`
- **Expected**: Assets containing "stable coin" in symbol or full_name

### 12. Sorting Logic

#### TC-056: Sort by Symbol with Null Values
- **Input**: `GET /assets?sort=symbol`
- **Expected**: Proper handling of null symbols (nulls first or last)

#### TC-057: Sort by Full Name with Null Values
- **Input**: `GET /assets?sort=full_name`
- **Expected**: Proper handling of null full_name values

#### TC-058: Sort by Created At with Null Values
- **Input**: `GET /assets?sort=created_at`
- **Expected**: Proper handling of null created_at values

#### TC-059: Case Insensitive Sort
- **Input**: `GET /assets?sort=symbol` (with mixed case symbols)
- **Expected**: Proper alphabetical ordering regardless of case

### 13. Pagination Logic

#### TC-060: Pagination Metadata Accuracy
- **Input**: `GET /assets?page=2&limit=10` (with 25 total assets)
- **Expected**: 
  ```json
  {
    "pagination": {
      "page": 2,
      "limit": 10,
      "total": 25,
      "total_pages": 3
    }
  }
  ```

#### TC-061: Last Page Partial Results
- **Input**: `GET /assets?page=3&limit=10` (with 25 total assets)
- **Expected**: 5 assets returned on last page

#### TC-062: Page Beyond Dataset
- **Input**: `GET /assets?page=10&limit=10` (with 25 total assets)
- **Expected**: Empty data array with correct pagination metadata

#### TC-063: Total Pages Calculation
- **Input**: Various limit values with fixed dataset
- **Expected**: Accurate total_pages calculation (Math.ceil(total / limit))

## Setup Requirements for Testing

When implementing these tests, ensure:

1. **Test Environment Setup**
   - Mock Supabase client with assets table
   - Mock AssetService methods
   - Mock CacheService
   - Mock AuditService
   - Mock rate limiter service

2. **Test Data Management**
   - Seed database with known asset records
   - Include assets with null full_name/description
   - Various symbols and full_names for filtering tests
   - Different created_at values for sorting tests
   - Clean database state between test suites

3. **Mock Configuration**
   - Database operation responses (success/error)
   - Service method behaviors
   - Cache hit/miss scenarios
   - Rate limiter responses
   - Different dataset sizes for pagination testing

4. **Performance Testing Setup**
   - Large dataset scenarios
   - Concurrent request handling
   - Memory usage monitoring
   - Response time measurement

## Performance Testing Considerations

- Response time validation (should be < 1s for normal requests)
- Cache performance (cached requests should be <100ms)
- Memory usage with large result sets
- Database query optimization verification
- Pagination performance with deep pages
- Filter performance with large datasets

## Integration Testing

- End-to-end workflow with real database
- Cross-service communication (AssetService, CacheService, AuditService)
- Database constraint verification
- Real Supabase client integration testing
- Cache integration with real CacheService

## Security Testing

- SQL injection attempts in filter parameters
- XSS payload testing in filter parameters
- Parameter pollution attacks
- Large payload handling (query string limits)
- Input sanitization verification
- Rate limiting bypass attempts

## Cache Testing Scenarios

- Cache key uniqueness for different parameter combinations
- Cache TTL expiration behavior
- Cache invalidation after data modifications
- Cache performance under load
- Cache memory usage optimization
- Cache statistics and monitoring 