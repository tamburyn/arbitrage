# GET /assets - API Documentation

## Endpoint Overview

**URL:** `/assets`  
**Method:** `GET`  
**Description:** Retrieves a paginated list of cryptocurrency assets with optional filtering and sorting capabilities.  
**Rate Limit:** Public endpoint rate limit applies  
**Authentication:** Not required  
**Cache:** Implemented with TTL-based caching for performance optimization  

## Query Parameters

### filter (optional)
- **Type:** `string`
- **Description:** Filters assets by symbol or full name (case-insensitive, partial match)
- **Validation:** 
  - Must be non-empty string if provided
  - Maximum length: 100 characters
- **Example:** `?filter=BTC` returns assets containing "BTC" in symbol or full_name

### sort (optional)
- **Type:** `string`
- **Description:** Sorts results by specified field
- **Valid Values:**
  - `symbol` - Sort by symbol ascending
  - `-symbol` - Sort by symbol descending
  - `full_name` - Sort by full name ascending
  - `-full_name` - Sort by full name descending
  - `created_at` - Sort by creation date ascending
  - `-created_at` - Sort by creation date descending
- **Default:** `symbol` (ascending)
- **Example:** `?sort=-created_at` returns newest assets first

### page (optional)
- **Type:** `integer`
- **Description:** Page number for pagination
- **Validation:** Must be positive integer ≥ 1
- **Default:** `1`
- **Example:** `?page=2` returns second page of results

### limit (optional)
- **Type:** `integer`
- **Description:** Number of results per page
- **Validation:** Must be integer between 1 and 100 (inclusive)
- **Default:** `10`
- **Example:** `?limit=25` returns up to 25 assets per page

## Request Examples

```bash
# Basic request (default pagination and sorting)
GET /assets

# Filtered search with custom pagination
GET /assets?filter=bitcoin&page=1&limit=20

# Sorted by creation date, descending
GET /assets?sort=-created_at&limit=5

# Complex query with all parameters
GET /assets?filter=stable&sort=symbol&page=2&limit=15
```

## Response Format

### Success Response (200 OK)

```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "symbol": "BTC",
      "full_name": "Bitcoin",
      "description": "The first and largest cryptocurrency by market cap",
      "created_at": "2024-01-15T10:30:00.000Z",
      "updated_at": "2024-01-15T10:30:00.000Z"
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "symbol": "ETH",
      "full_name": "Ethereum",
      "description": null,
      "created_at": "2024-01-15T11:00:00.000Z",
      "updated_at": null
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 156,
    "total_pages": 16
  }
}
```

### Response Headers

```
Content-Type: application/json
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 2024-01-15T12:00:00.000Z
```

## Data Model (AssetDTO)

| Field | Type | Description | Nullable |
|-------|------|-------------|----------|
| `id` | `string` | Unique UUID identifier | No |
| `symbol` | `string` | Asset symbol (e.g., "BTC", "ETH") | No |
| `full_name` | `string` | Full asset name (e.g., "Bitcoin") | Yes |
| `description` | `string` | Asset description | Yes |
| `created_at` | `string` | ISO 8601 timestamp of creation | Yes |
| `updated_at` | `string` | ISO 8601 timestamp of last update | Yes |

## Error Responses

### 400 Bad Request
Invalid query parameters provided.

```json
{
  "error": "Bad Request",
  "message": "page must be a positive integer"
}
```

**Common validation errors:**
- `"filter must be a non-empty string"`
- `"filter must be less than 100 characters"`
- `"sort must be one of: symbol, full_name, created_at (prefix with - for descending)"`
- `"page must be a positive integer"`
- `"limit must be a positive integer between 1 and 100"`

### 429 Too Many Requests
Rate limit exceeded.

```json
{
  "error": "Too Many Requests",
  "message": "Rate limit exceeded. Please try again later.",
  "retryAfter": 60
}
```

**Response Headers:**
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 2024-01-15T12:00:00.000Z
Retry-After: 60
```

### 500 Internal Server Error
Server-side error occurred.

```json
{
  "error": "Internal Server Error",
  "message": "Failed to retrieve assets"
}
```

## Performance Characteristics

### Caching Strategy
- **List queries with filters:** 3-minute TTL
- **Simple list queries:** 10-minute TTL
- **Cache key format:** `assets:{JSON.stringify(params)}`
- **Cache invalidation:** Automatic TTL expiry + manual clearing after data modifications

### Database Optimization
- **Indexes:** Optimized for filtering and sorting operations
- **Query performance:** Sub-second response times for typical queries
- **Pagination:** Efficient OFFSET/LIMIT implementation

### Rate Limiting
- **Public endpoint limits:** Shared across all public endpoints
- **Monitoring:** Request counts tracked per client IP
- **Headers:** Rate limit information included in all responses

## Usage Examples

### JavaScript/TypeScript
```typescript
// Fetch first page of Bitcoin-related assets
const response = await fetch('/assets?filter=bitcoin&limit=5');
const data = await response.json();

if (response.ok) {
  console.log(`Found ${data.pagination.total} assets`);
  data.data.forEach(asset => {
    console.log(`${asset.symbol}: ${asset.full_name}`);
  });
} else {
  console.error(data.message);
}
```

### curl
```bash
# Get all assets with default pagination
curl -X GET "https://api.example.com/assets"

# Search for stablecoin assets, sorted by name
curl -X GET "https://api.example.com/assets?filter=stable&sort=full_name&limit=20"
```

### Python
```python
import requests

# Search and paginate through results
params = {
    'filter': 'coin',
    'sort': '-created_at',
    'page': 1,
    'limit': 50
}

response = requests.get('/assets', params=params)
if response.status_code == 200:
    data = response.json()
    print(f"Page {data['pagination']['page']} of {data['pagination']['total_pages']}")
    for asset in data['data']:
        print(f"{asset['symbol']}: {asset['full_name']}")
else:
    print(f"Error: {response.json()['message']}")
```

## Filtering Behavior

The `filter` parameter performs case-insensitive partial matching against both `symbol` and `full_name` fields:

- **Symbol match:** `?filter=BTC` matches assets with symbol containing "BTC"
- **Full name match:** `?filter=bitcoin` matches assets with full_name containing "bitcoin" 
- **Combined search:** Returns assets matching either field
- **Partial matching:** `?filter=bit` matches "Bitcoin", "Bitcash", etc.
- **Space handling:** `?filter=stable coin` matches "Stable Coin USD"

## Sorting Behavior

- **Default sort:** `symbol` ascending (A-Z)
- **Null handling:** Null values sorted consistently (typically last)
- **Case sensitivity:** Case-insensitive sorting for text fields
- **Descending prefix:** Use `-` prefix for descending order (e.g., `-symbol`)

## Pagination Details

- **Page numbering:** Starts from 1 (not 0)
- **Total pages calculation:** `Math.ceil(total / limit)`
- **Beyond dataset:** Requests beyond available data return empty arrays
- **Metadata accuracy:** Total count reflects current filter state

## Best Practices

1. **Use appropriate page sizes:** Balance between performance and data needs
2. **Implement client-side caching:** Respect cache headers for optimal performance
3. **Handle rate limits gracefully:** Implement exponential backoff on 429 responses
4. **Validate pagination metadata:** Check `total_pages` before requesting specific pages
5. **Use specific filters:** More specific filters improve cache hit rates and performance

## Changelog

- **v1.0.0:** Initial implementation with basic filtering, sorting, and pagination
- **v1.1.0:** Added caching layer for improved performance
- **v1.2.0:** Enhanced filter capabilities with trigram indexing 