# Test Scenarios for /exchanges API Endpoints

## Overview
This document outlines comprehensive test scenarios for the exchanges API endpoints:
- **POST /exchanges** - Admin endpoint for creating new exchanges 
- **GET /exchanges** - Public endpoint for retrieving exchanges with pagination and sorting

These tests should be implemented when a testing framework (like Vitest, Jest, or similar) is added to the project.

---

# Test Scenarios for (Admin) POST /exchanges

## Test Categories

### 1. Content-Type Validation

#### TC-001: Missing Content-Type Header
- **Input**: Request without Content-Type header
- **Expected**: 400 Bad Request with message "Content-Type must be application/json"

#### TC-002: Invalid Content-Type
- **Input**: Request with Content-Type "text/plain"
- **Expected**: 400 Bad Request with message "Content-Type must be application/json"

### 2. JSON Parsing

#### TC-003: Invalid JSON Format
- **Input**: Malformed JSON in request body
- **Expected**: 400 Bad Request with message "Invalid JSON format"

#### TC-004: Empty Request Body
- **Input**: Empty request body with valid Content-Type
- **Expected**: 400 Bad Request (JSON parsing error)

### 3. Basic Input Validation

#### TC-005: Missing Exchange Name
- **Input**: `{ "api_endpoint": "https://api.test.com", "integration_status": "active" }`
- **Expected**: 400 Bad Request with message "name is required and must be a non-empty string"

#### TC-006: Empty Exchange Name
- **Input**: `{ "name": "", "api_endpoint": "https://api.test.com", "integration_status": "active" }`
- **Expected**: 400 Bad Request with message "name is required and must be a non-empty string"

#### TC-007: Non-String Exchange Name
- **Input**: `{ "name": 123, "api_endpoint": "https://api.test.com", "integration_status": "active" }`
- **Expected**: 400 Bad Request with message "name is required and must be a non-empty string"

#### TC-008: Missing API Endpoint
- **Input**: `{ "name": "Test Exchange", "integration_status": "active" }`
- **Expected**: 400 Bad Request with message "api_endpoint is required and must be a non-empty string"

#### TC-009: Invalid URL Format
- **Input**: `{ "name": "Test Exchange", "api_endpoint": "not-a-url", "integration_status": "active" }`
- **Expected**: 400 Bad Request with message "api_endpoint must be a valid URL"

#### TC-010: Missing Integration Status
- **Input**: `{ "name": "Test Exchange", "api_endpoint": "https://api.test.com" }`
- **Expected**: 400 Bad Request with message "integration_status is required and must be either 'active' or 'inactive'"

#### TC-011: Invalid Integration Status
- **Input**: `{ "name": "Test Exchange", "api_endpoint": "https://api.test.com", "integration_status": "pending" }`
- **Expected**: 400 Bad Request with message "integration_status is required and must be either 'active' or 'inactive'"

### 4. Advanced Input Validation

#### TC-012: Exchange Name Too Short
- **Input**: `{ "name": "A", "api_endpoint": "https://api.test.com", "integration_status": "active" }`
- **Expected**: 400 Bad Request with message "Exchange name must be at least 2 characters long"

#### TC-013: Exchange Name Too Long
- **Input**: Exchange name with 101+ characters
- **Expected**: 400 Bad Request with message "Exchange name cannot exceed 100 characters"

#### TC-014: Exchange Name Invalid Characters
- **Input**: `{ "name": "Test@Exchange!", "api_endpoint": "https://api.test.com", "integration_status": "active" }`
- **Expected**: 400 Bad Request with message "Exchange name can only contain letters, numbers, spaces, hyphens, dots and underscores"

#### TC-015: Exchange Name Starting with Number
- **Input**: `{ "name": "123Exchange", "api_endpoint": "https://api.test.com", "integration_status": "active" }`
- **Expected**: 400 Bad Request with message "Exchange name cannot start with a number"

#### TC-016: HTTP Instead of HTTPS in Production
- **Input**: `{ "name": "Test Exchange", "api_endpoint": "http://api.test.com", "integration_status": "active" }`
- **Expected**: 400 Bad Request when NODE_ENV=production with message "API endpoint must use HTTPS protocol"

#### TC-017: Local Endpoint in Production
- **Input**: `{ "name": "Test Exchange", "api_endpoint": "https://localhost:3000", "integration_status": "active" }`
- **Expected**: 400 Bad Request when NODE_ENV=production with message "Local endpoints are not allowed in production environment"

#### TC-018: API Endpoint with Fragment
- **Input**: `{ "name": "Test Exchange", "api_endpoint": "https://api.test.com#fragment", "integration_status": "active" }`
- **Expected**: 400 Bad Request with message "API endpoint should not contain URL fragments (#)"

#### TC-019: Metadata Too Large
- **Input**: Exchange with metadata object > 10KB
- **Expected**: 400 Bad Request with message "Metadata object is too large (max 10KB allowed)"

#### TC-020: Invalid Metadata Type
- **Input**: `{ "name": "Test Exchange", "api_endpoint": "https://api.test.com", "integration_status": "active", "metadata": "string-instead-of-object" }`
- **Expected**: 400 Bad Request with message "Metadata must be a valid JSON object"

### 5. Authorization and Authentication

#### TC-021: Missing Authorization Header
- **Input**: Valid exchange data without Authorization header
- **Expected**: 401 Unauthorized with message "Authorization header with Bearer token is required"

#### TC-022: Invalid Authorization Format
- **Input**: Valid exchange data with Authorization header "InvalidFormat token"
- **Expected**: 401 Unauthorized with message "Authorization header with Bearer token is required"

#### TC-023: Invalid JWT Token
- **Input**: Valid exchange data with Authorization header "Bearer invalid-token"
- **Expected**: 401 Unauthorized with message "Invalid or expired token"

#### TC-024: Expired JWT Token
- **Input**: Valid exchange data with expired JWT token
- **Expected**: 401 Unauthorized with message "Invalid or expired token"

#### TC-025: Valid User Token (Non-Admin)
- **Input**: Valid exchange data with valid user token (role: 'user')
- **Expected**: 401 Unauthorized with message "Admin privileges required to access this endpoint"

#### TC-026: Missing Role in User Metadata
- **Input**: Valid exchange data with valid token but no role in metadata
- **Expected**: 401 Unauthorized with message "Admin privileges required to access this endpoint"

### 6. Business Logic Validation

#### TC-027: Duplicate Exchange Name
- **Input**: Valid exchange data with name that already exists
- **Expected**: 400 Bad Request with message "Exchange with this name already exists"

#### TC-028: Duplicate API Endpoint
- **Input**: Valid exchange data with API endpoint that already exists
- **Expected**: 400 Bad Request with message "Exchange with this API endpoint already exists"

### 7. Successful Creation Scenarios

#### TC-029: Valid Exchange Creation (Minimal Data)
- **Input**: 
  ```json
  {
    "name": "Test Exchange",
    "api_endpoint": "https://api.test.com",
    "integration_status": "active"
  }
  ```
- **Expected**: 201 Created with ExchangeDTO containing generated ID and timestamps

#### TC-030: Valid Exchange Creation (With Metadata)
- **Input**: 
  ```json
  {
    "name": "Test Exchange",
    "api_endpoint": "https://api.test.com",
    "integration_status": "active",
    "metadata": {"version": "v1", "rate_limit": 1000}
  }
  ```
- **Expected**: 201 Created with ExchangeDTO including metadata

#### TC-031: Valid Exchange Creation (Inactive Status)
- **Input**: Valid exchange data with integration_status: "inactive"
- **Expected**: 201 Created with correct status

### 8. Data Sanitization

#### TC-032: Name with Extra Spaces
- **Input**: `{ "name": "  Test   Exchange  ", ... }`
- **Expected**: Exchange created with name "Test Exchange" (normalized spaces)

#### TC-033: Uppercase API Endpoint
- **Input**: `{ "api_endpoint": "HTTPS://API.TEST.COM", ... }`
- **Expected**: Exchange created with api_endpoint "https://api.test.com" (lowercase)

#### TC-034: Mixed Case Integration Status
- **Input**: `{ "integration_status": "ACTIVE", ... }`
- **Expected**: Exchange created with integration_status "active" (lowercase)

### 9. Database Error Handling

#### TC-035: Database Connection Error
- **Mock**: Database unavailable
- **Expected**: 500 Internal Server Error with message "Database operation failed. Please try again later."

#### TC-036: Database Constraint Violation
- **Mock**: Database constraint error
- **Expected**: 500 Internal Server Error with appropriate error handling

### 10. Audit Logging

#### TC-037: Successful Creation Audit Log
- **Input**: Valid exchange creation
- **Expected**: Audit log entry with operation "CREATE_SUCCESS"

#### TC-038: Failed Authorization Audit Log
- **Input**: Request without admin privileges
- **Expected**: Audit log entry with operation "ADMIN_ACCESS_DENIED"

#### TC-039: Service Error Audit Log
- **Input**: Request causing service error
- **Expected**: Audit log entry with operation "CREATE_SERVICE_ERROR"

---

# Test Scenarios for (Public) GET /exchanges

## Test Categories

### 1. Rate Limiting

#### TC-GET-001: Within Rate Limit
- **Input**: Request within allowed rate limit
- **Expected**: 200 OK with exchanges data and rate limit headers

#### TC-GET-002: Rate Limit Exceeded
- **Input**: Request exceeding rate limit
- **Expected**: 429 Too Many Requests with rate limit headers and retry information

#### TC-GET-003: Rate Limit Headers Present
- **Input**: Any valid request
- **Expected**: Response includes `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` headers

### 2. Query Parameter Validation

#### TC-GET-004: Valid Default Parameters
- **Input**: GET /exchanges (no query parameters)
- **Expected**: 200 OK with first 10 exchanges sorted by created_at DESC

#### TC-GET-005: Valid Page Parameter
- **Input**: GET /exchanges?page=2
- **Expected**: 200 OK with second page of results

#### TC-GET-006: Invalid Page Parameter (Zero)
- **Input**: GET /exchanges?page=0
- **Expected**: 400 Bad Request with message "page must be a positive integer"

#### TC-GET-007: Invalid Page Parameter (Negative)
- **Input**: GET /exchanges?page=-1
- **Expected**: 400 Bad Request with message "page must be a positive integer"

#### TC-GET-008: Invalid Page Parameter (Non-numeric)
- **Input**: GET /exchanges?page=abc
- **Expected**: 400 Bad Request with message "page must be a positive integer"

#### TC-GET-009: Valid Limit Parameter
- **Input**: GET /exchanges?limit=25
- **Expected**: 200 OK with up to 25 exchanges

#### TC-GET-010: Invalid Limit Parameter (Zero)
- **Input**: GET /exchanges?limit=0
- **Expected**: 400 Bad Request with message "limit must be a positive integer between 1 and 100"

#### TC-GET-011: Invalid Limit Parameter (Over Maximum)
- **Input**: GET /exchanges?limit=150
- **Expected**: 400 Bad Request with message "limit must be a positive integer between 1 and 100"

#### TC-GET-012: Invalid Limit Parameter (Non-numeric)
- **Input**: GET /exchanges?limit=xyz
- **Expected**: 400 Bad Request with message "limit must be a positive integer between 1 and 100"

### 3. Sorting Validation

#### TC-GET-013: Valid Sort Ascending
- **Input**: GET /exchanges?sort=name
- **Expected**: 200 OK with exchanges sorted by name ascending

#### TC-GET-014: Valid Sort Descending
- **Input**: GET /exchanges?sort=-name
- **Expected**: 200 OK with exchanges sorted by name descending

#### TC-GET-015: Valid Sort by API Endpoint
- **Input**: GET /exchanges?sort=api_endpoint
- **Expected**: 200 OK with exchanges sorted by api_endpoint ascending

#### TC-GET-016: Valid Sort by Integration Status
- **Input**: GET /exchanges?sort=integration_status
- **Expected**: 200 OK with exchanges sorted by integration_status ascending

#### TC-GET-017: Valid Sort by Created Date
- **Input**: GET /exchanges?sort=created_at
- **Expected**: 200 OK with exchanges sorted by created_at ascending

#### TC-GET-018: Valid Sort by Updated Date
- **Input**: GET /exchanges?sort=-updated_at
- **Expected**: 200 OK with exchanges sorted by updated_at descending

#### TC-GET-019: Invalid Sort Field
- **Input**: GET /exchanges?sort=invalid_field
- **Expected**: 400 Bad Request with message "sort must be one of: name, api_endpoint, integration_status, created_at, updated_at (prefix with - for descending)"

#### TC-GET-020: Invalid Sort Format
- **Input**: GET /exchanges?sort=--name
- **Expected**: 400 Bad Request with sorting validation error

### 4. Pagination Response Format

#### TC-GET-021: Pagination Metadata Included
- **Input**: GET /exchanges?page=1&limit=5
- **Expected**: Response includes pagination object with page, limit, total, total_pages

#### TC-GET-022: First Page Pagination
- **Input**: GET /exchanges?page=1&limit=5 (assume 12 total exchanges)
- **Expected**: 
  ```json
  {
    "data": [...],
    "pagination": {
      "page": 1,
      "limit": 5,
      "total": 12,
      "total_pages": 3
    }
  }
  ```

#### TC-GET-023: Last Page Pagination
- **Input**: GET /exchanges?page=3&limit=5 (assume 12 total exchanges)
- **Expected**: Response with 2 exchanges and correct pagination metadata

#### TC-GET-024: Empty Page
- **Input**: GET /exchanges?page=10 (assume only 2 pages exist)
- **Expected**: 200 OK with empty data array and correct pagination metadata

### 5. Data Response Format

#### TC-GET-025: ExchangeDTO Structure
- **Input**: Any valid request returning data
- **Expected**: Each exchange contains: id, name, api_endpoint, integration_status, metadata, created_at, updated_at

#### TC-GET-026: Null Metadata Handling
- **Input**: Request where some exchanges have null metadata
- **Expected**: Null values properly returned in metadata field

#### TC-GET-027: Integration Status Values
- **Input**: Request returning exchanges
- **Expected**: integration_status only contains "active" or "inactive" values

#### TC-GET-028: Date Format Consistency
- **Input**: Any request returning data
- **Expected**: created_at and updated_at in ISO 8601 format

### 6. Combined Parameters

#### TC-GET-029: Page and Limit Combined
- **Input**: GET /exchanges?page=2&limit=15
- **Expected**: 200 OK with second page of 15 exchanges

#### TC-GET-030: All Parameters Combined
- **Input**: GET /exchanges?page=1&limit=20&sort=-created_at
- **Expected**: 200 OK with first 20 exchanges sorted by creation date descending

#### TC-GET-031: Parameters with Edge Values
- **Input**: GET /exchanges?page=1&limit=100&sort=name
- **Expected**: 200 OK with up to 100 exchanges sorted by name

### 7. Database Error Handling

#### TC-GET-032: Database Connection Error
- **Mock**: Database unavailable
- **Expected**: 500 Internal Server Error with message "Failed to retrieve exchanges"

#### TC-GET-033: Database Query Error
- **Mock**: Database query fails
- **Expected**: 500 Internal Server Error with appropriate error handling and audit logging

#### TC-GET-034: Database Timeout
- **Mock**: Database query timeout
- **Expected**: 500 Internal Server Error with timeout handling

### 8. Performance and Edge Cases

#### TC-GET-035: Large Dataset Performance
- **Input**: Request with large number of exchanges in database
- **Expected**: Response time < 500ms, proper pagination handling

#### TC-GET-036: Empty Database
- **Input**: GET /exchanges when no exchanges exist
- **Expected**: 200 OK with empty data array and total: 0

#### TC-GET-037: Single Exchange in Database
- **Input**: GET /exchanges when only one exchange exists
- **Expected**: 200 OK with single exchange and correct pagination

#### TC-GET-038: Exact Page Boundary
- **Input**: GET /exchanges?page=2&limit=10 when exactly 10 exchanges exist
- **Expected**: 200 OK with empty data array for page 2

### 9. Service Layer Testing

#### TC-GET-039: ExchangeService.getExchangesWithPagination Success
- **Mock**: Service returns valid data
- **Expected**: Proper mapping to ExchangeDTO format

#### TC-GET-040: ExchangeService Error Handling
- **Mock**: Service throws exception
- **Expected**: 500 error with proper audit logging

#### TC-GET-041: Sort Field Validation in Service
- **Mock**: Invalid sort field passed to service
- **Expected**: Service throws validation error

### 10. Audit Logging

#### TC-GET-042: Service Error Audit Log
- **Input**: Request causing service error
- **Expected**: Audit log entry with operation "SERVICE_ERROR"

#### TC-GET-043: Unexpected Error Audit Log
- **Input**: Request causing unexpected error
- **Expected**: Audit log entry with operation "UNEXPECTED_ERROR"

---

## Setup Requirements for Testing

When implementing these tests, ensure:

### 1. Test Environment Setup
- Mock Supabase client for both POST and GET endpoints
- Mock validation functions
- Mock audit service
- Mock exchange service
- Mock rate limiter service

### 2. Test Data Management
- Clean database state between tests
- Consistent test exchange data
- Predictable UUID generation for assertions
- Test data sets with various sizes (empty, single, multiple, large)

### 3. Mock Configuration
- Supabase Auth responses (valid/invalid tokens)
- User metadata with different roles
- Database operation responses (success, error, timeout)
- Service method behaviors
- Rate limiter responses

### 4. Environment Variables
- Test environment configuration
- Mock NODE_ENV values for production-specific tests

## Performance Testing Considerations

### POST /exchanges
- Load testing with multiple concurrent requests
- Memory usage during large metadata processing
- Response time validation (should be < 500ms for valid requests)

### GET /exchanges
- Response time with large datasets (should be < 500ms)
- Memory usage with maximum page size (100 items)
- Database query optimization testing
- Rate limiting performance under load

## Security Testing

### POST /exchanges
- SQL injection attempts in input fields
- XSS payload testing in metadata
- Authentication bypass attempts
- Authorization escalation testing
- Token manipulation testing

### GET /exchanges
- SQL injection in query parameters
- Rate limiting bypass attempts
- Resource exhaustion via large limit values
- Parameter pollution testing

## Integration Testing

### End-to-End Workflows
- Complete exchange creation and retrieval flow
- Supabase Auth integration testing
- Audit log persistence verification
- Cross-service communication validation
- Rate limiting integration with real requests

### Multi-Endpoint Testing
- Create exchange via POST, retrieve via GET
- Pagination consistency across multiple requests
- Data consistency between creation and retrieval 