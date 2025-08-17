# Test Scenarios for GET /orderbooks

## Overview
This document outlines comprehensive test scenarios for the orderbooks retrieval endpoint. These tests should be implemented when a testing framework (like Vitest, Jest, or similar) is added to the project.

## Test Categories

### 1. Query Parameter Validation - exchangeId

#### TC-001: Valid exchangeId Parameter
- **Input**: `GET /orderbooks?exchangeId=550e8400-e29b-41d4-a716-446655440000`
- **Expected**: 200 OK with filtered results for specific exchange

#### TC-002: Invalid exchangeId Format
- **Input**: `GET /orderbooks?exchangeId=invalid-uuid`
- **Expected**: 400 Bad Request with message "exchangeId must be a valid UUID"

#### TC-003: Non-existent exchangeId
- **Input**: `GET /orderbooks?exchangeId=550e8400-e29b-41d4-a716-446655440999`
- **Expected**: 400 Bad Request with message "Invalid exchangeId - exchange does not exist"

#### TC-004: Empty exchangeId Parameter
- **Input**: `GET /orderbooks?exchangeId=`
- **Expected**: 200 OK (empty parameter ignored)

### 2. Query Parameter Validation - assetId

#### TC-005: Valid assetId Parameter
- **Input**: `GET /orderbooks?assetId=550e8400-e29b-41d4-a716-446655440001`
- **Expected**: 200 OK with filtered results for specific asset

#### TC-006: Invalid assetId Format
- **Input**: `GET /orderbooks?assetId=not-a-uuid`
- **Expected**: 400 Bad Request with message "assetId must be a valid UUID"

#### TC-007: Non-existent assetId
- **Input**: `GET /orderbooks?assetId=550e8400-e29b-41d4-a716-446655440888`
- **Expected**: 400 Bad Request with message "Invalid assetId - asset does not exist"

#### TC-008: Combined Valid exchangeId and assetId
- **Input**: `GET /orderbooks?exchangeId=550e8400-e29b-41d4-a716-446655440000&assetId=550e8400-e29b-41d4-a716-446655440001`
- **Expected**: 200 OK with results filtered by both parameters

### 3. Date Range Validation

#### TC-009: Valid start_date Parameter
- **Input**: `GET /orderbooks?start_date=2024-01-01T00:00:00.000Z`
- **Expected**: 200 OK with results from specified date onwards

#### TC-010: Invalid start_date Format
- **Input**: `GET /orderbooks?start_date=2024-01-01`
- **Expected**: 400 Bad Request with message "start_date must be a valid ISO date string"

#### TC-011: Invalid start_date Value
- **Input**: `GET /orderbooks?start_date=invalid-date`
- **Expected**: 400 Bad Request with message "start_date must be a valid ISO date string"

#### TC-012: Valid end_date Parameter
- **Input**: `GET /orderbooks?end_date=2024-12-31T23:59:59.999Z`
- **Expected**: 200 OK with results up to specified date

#### TC-013: Invalid end_date Format
- **Input**: `GET /orderbooks?end_date=2024-12-31`
- **Expected**: 400 Bad Request with message "end_date must be a valid ISO date string"

#### TC-014: Valid Date Range
- **Input**: `GET /orderbooks?start_date=2024-01-01T00:00:00.000Z&end_date=2024-12-31T23:59:59.999Z`
- **Expected**: 200 OK with results within specified date range

#### TC-015: Invalid Date Range (start > end)
- **Input**: `GET /orderbooks?start_date=2024-12-31T23:59:59.999Z&end_date=2024-01-01T00:00:00.000Z`
- **Expected**: 400 Bad Request with message "start_date cannot be after end_date"

#### TC-016: Same start_date and end_date
- **Input**: `GET /orderbooks?start_date=2024-06-15T12:00:00.000Z&end_date=2024-06-15T12:00:00.000Z`
- **Expected**: 200 OK with results for exact timestamp match

### 4. Pagination Validation

#### TC-017: Valid page Parameter
- **Input**: `GET /orderbooks?page=2`
- **Expected**: 200 OK with second page of results

#### TC-018: Invalid page Parameter (Zero)
- **Input**: `GET /orderbooks?page=0`
- **Expected**: 400 Bad Request with message "page must be a positive integer"

#### TC-019: Invalid page Parameter (Negative)
- **Input**: `GET /orderbooks?page=-1`
- **Expected**: 400 Bad Request with message "page must be a positive integer"

#### TC-020: Invalid page Parameter (Non-numeric)
- **Input**: `GET /orderbooks?page=abc`
- **Expected**: 400 Bad Request with message "page must be a positive integer"

#### TC-021: Valid limit Parameter
- **Input**: `GET /orderbooks?limit=25`
- **Expected**: 200 OK with maximum 25 results

#### TC-022: Invalid limit Parameter (Zero)
- **Input**: `GET /orderbooks?limit=0`
- **Expected**: 400 Bad Request with message "limit must be an integer between 1 and 100"

#### TC-023: Invalid limit Parameter (Too Large)
- **Input**: `GET /orderbooks?limit=101`
- **Expected**: 400 Bad Request with message "limit must be an integer between 1 and 100"

#### TC-024: Invalid limit Parameter (Non-numeric)
- **Input**: `GET /orderbooks?limit=many`
- **Expected**: 400 Bad Request with message "limit must be an integer between 1 and 100"

#### TC-025: Valid Pagination Combination
- **Input**: `GET /orderbooks?page=3&limit=20`
- **Expected**: 200 OK with pagination metadata showing page 3, limit 20

### 5. Sorting Validation

#### TC-026: Valid Sort by timestamp (Ascending)
- **Input**: `GET /orderbooks?sort=timestamp`
- **Expected**: 200 OK with results sorted by timestamp ascending

#### TC-027: Valid Sort by timestamp (Descending)
- **Input**: `GET /orderbooks?sort=-timestamp`
- **Expected**: 200 OK with results sorted by timestamp descending

#### TC-028: Valid Sort by spread
- **Input**: `GET /orderbooks?sort=spread`
- **Expected**: 200 OK with results sorted by spread ascending

#### TC-029: Valid Sort by volume
- **Input**: `GET /orderbooks?sort=-volume`
- **Expected**: 200 OK with results sorted by volume descending

#### TC-030: Invalid Sort Field
- **Input**: `GET /orderbooks?sort=invalid_field`
- **Expected**: 400 Bad Request with message "sort field must be one of: timestamp, spread, volume, created_at (prefix with '-' for descending)"

#### TC-031: Invalid Sort Field with Prefix
- **Input**: `GET /orderbooks?sort=-invalid_field`
- **Expected**: 400 Bad Request with message "sort field must be one of: timestamp, spread, volume, created_at (prefix with '-' for descending)"

### 6. Default Behavior

#### TC-032: No Parameters
- **Input**: `GET /orderbooks`
- **Expected**: 200 OK with first page (limit 10) sorted by timestamp descending

#### TC-033: Default Pagination
- **Input**: `GET /orderbooks` (no page/limit specified)
- **Expected**: 200 OK with pagination metadata showing page 1, limit 10

#### TC-034: Default Sorting
- **Input**: `GET /orderbooks` (no sort specified)
- **Expected**: 200 OK with results sorted by timestamp descending

### 7. Complex Query Combinations

#### TC-035: All Parameters Valid
- **Input**: `GET /orderbooks?exchangeId=550e8400-e29b-41d4-a716-446655440000&assetId=550e8400-e29b-41d4-a716-446655440001&start_date=2024-01-01T00:00:00.000Z&end_date=2024-12-31T23:59:59.999Z&page=2&limit=50&sort=-spread`
- **Expected**: 200 OK with all filters applied correctly

#### TC-036: Mixed Valid and Invalid Parameters
- **Input**: `GET /orderbooks?exchangeId=valid-uuid&assetId=invalid-uuid`
- **Expected**: 400 Bad Request with first validation error encountered

#### TC-037: Multiple Invalid Parameters
- **Input**: `GET /orderbooks?page=-1&limit=101&sort=invalid`
- **Expected**: 400 Bad Request with first validation error (page validation first)

### 8. Response Format Validation

#### TC-038: Successful Response Structure
- **Input**: `GET /orderbooks?limit=5`
- **Expected**: 200 OK with structure:
  ```json
  {
    "data": [
      {
        "id": "uuid",
        "asset_id": "uuid",
        "exchange_id": "uuid",
        "snapshot": {},
        "spread": 0.01,
        "timestamp": "ISO string",
        "volume": 123.45,
        "created_at": "ISO string or null"
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

#### TC-039: Empty Results Response
- **Input**: `GET /orderbooks?start_date=2099-01-01T00:00:00.000Z`
- **Expected**: 200 OK with empty data array and pagination showing total: 0

#### TC-040: Single Result Response
- **Input**: `GET /orderbooks` (with data that returns exactly 1 result)
- **Expected**: 200 OK with data array containing single OrderbookDTO

### 9. Database Error Handling

#### TC-041: Database Connection Error
- **Mock**: Database unavailable during query
- **Expected**: 500 Internal Server Error with message "Failed to retrieve orderbooks"

#### TC-042: Database Query Timeout
- **Mock**: Database query timeout
- **Expected**: 500 Internal Server Error with appropriate error handling

#### TC-043: Corrupted Data in Database
- **Mock**: Database returns malformed data
- **Expected**: 500 Internal Server Error with proper error logging

### 10. Service Layer Error Handling

#### TC-044: OrderbookService Exception
- **Mock**: OrderbookService.getOrderbooks throws error
- **Expected**: 500 Internal Server Error with message "Failed to retrieve orderbooks"

#### TC-045: Validation Service Exception
- **Mock**: Exchange/Asset validation throws error
- **Expected**: 500 Internal Server Error with proper error handling

### 11. Performance and Edge Cases

#### TC-046: Large Result Set
- **Input**: `GET /orderbooks?limit=100` (with large dataset)
- **Expected**: 200 OK with performance within acceptable limits (<2s)

#### TC-047: Deep Pagination
- **Input**: `GET /orderbooks?page=1000&limit=100`
- **Expected**: 200 OK with empty results if beyond dataset

#### TC-048: Very Long Date Range
- **Input**: `GET /orderbooks?start_date=2020-01-01T00:00:00.000Z&end_date=2024-12-31T23:59:59.999Z`
- **Expected**: 200 OK with proper pagination for large timespan

#### TC-049: Multiple Rapid Requests
- **Input**: Multiple concurrent GET requests
- **Expected**: All requests succeed with consistent results

### 12. Data Integrity

#### TC-050: OrderbookDTO Field Mapping
- **Input**: `GET /orderbooks?limit=1`
- **Expected**: Response data fields match OrderbookDTO interface exactly

#### TC-051: Null Volume Handling
- **Input**: Request returning orderbooks with null volume
- **Expected**: 200 OK with volume: null in response

#### TC-052: JSON Snapshot Field
- **Input**: Request returning orderbooks with complex snapshot data
- **Expected**: 200 OK with snapshot field as valid JSON object

### 13. Audit Logging

#### TC-053: Successful Request Audit
- **Input**: Valid orderbooks request
- **Expected**: No audit log entry (read operations typically not logged)

#### TC-054: Service Error Audit Log
- **Input**: Request causing service error
- **Expected**: Audit log entry with operation "SERVICE_ERROR"

#### TC-055: Database Error Audit Log
- **Input**: Request causing database error
- **Expected**: Audit log entry with operation "DATABASE_ERROR"

## Setup Requirements for Testing

When implementing these tests, ensure:

1. **Test Environment Setup**
   - Mock Supabase client with orderbooks table
   - Mock OrderbookService methods
   - Mock AuditService
   - Test data seeding

2. **Test Data Management**
   - Seed database with known orderbook records
   - Create test exchanges and assets
   - Consistent UUID generation for predictable results
   - Clean database state between test suites

3. **Mock Configuration**
   - Database operation responses (success/error)
   - Service method behaviors
   - Validation service responses
   - Different dataset sizes for pagination testing

4. **Date/Time Handling**
   - Consistent timezone handling in tests
   - Mock system time for predictable date comparisons
   - Various ISO date format scenarios

## Performance Testing Considerations

- Response time validation (should be < 1s for normal requests)
- Memory usage with large result sets
- Database query optimization verification
- Pagination performance with deep pages

## Integration Testing

- End-to-end workflow with real database
- Cross-service communication (OrderbookService, AuditService)
- Database constraint verification
- Real Supabase client integration testing

## Security Testing

- SQL injection attempts in query parameters
- XSS payload testing in filter parameters
- Parameter pollution attacks
- Large payload handling (query string limits)
- Input sanitization verification 