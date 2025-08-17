# REST API Plan

## 1. Resources

- **Users**: Represents application users. Managed by Supabase Auth with unique email and role constraints (admin or user).
- **Exchanges**: Contains exchange information (name, API endpoint, integration status, metadata).
- **Assets**: Contains cryptocurrency asset details such as symbol, full name, and description.
- **Orderbooks**: Stores orderbook snapshots including exchange and asset references, snapshot data, timestamp, volume, and a positive spread. Partitioned by timestamp for performance.
- **Alerts**: Records alerts for arbitrage opportunities. Links to users, exchanges, and assets. Includes spread (must be > 0), notification status, and additional info. Enforces rate limiting and subscription limits.
- **Subscriptions**: Manages user subscription details, supporting freemium and pro plans, with fields such as status, start date, end date, and payment method.
- **Watchlist**: Stores a user-specific list of assets. Enforces uniqueness on the (user, asset) pair.
- **Settings**: Contains user preferences for notifications and alerts.
- **Audit Logs**: Logs changes and operations performed within the system for audit and compliance.

## 2. Endpoints

### Users

- **GET /users/me**
  - Description: Retrieve details of the currently authenticated user.
  - Response JSON:
    ```json
    {
      "id": "UUID",
      "email": "string",
      "first_name": "string",
      "last_name": "string",
      "registration_date": "timestamp",
      "role": "admin|user",
      "notification_settings": { ... }
    }
    ```
  - Success: 200 OK
  - Errors: 401 Unauthorized

- **PUT /users/me**
  - Description: Update details for the authenticated user.
  - Request JSON:
    ```json
    {
      "first_name": "string",
      "last_name": "string",
      "notification_settings": { ... }
    }
    ```
  - Response: Updated user object.
  - Success: 200 OK
  - Errors: 400 Bad Request, 401 Unauthorized

### Exchanges

- **GET /exchanges**
  - Description: Retrieve a list of exchanges.
  - Query Parameters: Pagination (page, limit), sorting options.
  - Response: Array of exchange objects.
  - Success: 200 OK
  - Errors: 500 Internal Server Error

- **GET /exchanges/{exchangeId}**
  - Description: Retrieve details of a specific exchange.
  - Success: 200 OK
  - Errors: 404 Not Found

- **(Admin) POST /exchanges**
  - Description: Create a new exchange (admin only).
  - Request JSON:
    ```json
    {
      "name": "string",
      "api_endpoint": "string",
      "integration_status": "active|inactive",
      "metadata": { ... }
    }
    ```
  - Success: 201 Created
  - Errors: 400 Bad Request, 401 Unauthorized

### Assets

- **GET /assets**
  - Description: List all assets with support for filtering and pagination.
  - Query Parameters: filter, sort, page, limit.
  - Success: 200 OK

- **GET /assets/{assetId}**
  - Description: Retrieve a specific asset's details.
  - Success: 200 OK
  - Errors: 404 Not Found

### Orderbooks

- **GET /orderbooks**
  - Description: Retrieve orderbook snapshots with filtering by exchange, asset, and date range. Supports pagination and sorting.
  - Query Parameters: exchangeId, assetId, start_date, end_date, page, limit, sort.
  - Success: 200 OK
  - Errors: 400 Bad Request

- **GET /orderbooks/{orderbookId}**
  - Description: Retrieve full details of a specific orderbook snapshot, including order data and calculated metrics.
  - Success: 200 OK
  - Errors: 404 Not Found

- **GET /orderbooks/export**
  - Description: Export orderbook data within a specified date range to a CSV file.
  - Query Parameters: from (ISO date), to (ISO date).
  - Success: 200 OK (CSV file download)
  - Errors: 400 Bad Request

### Alerts

- **GET /alerts**
  - Description: Retrieve a list of alerts for the authenticated user. Supports filtering by status and date range.
  - Query Parameters: status, start_date, end_date, page, limit.
  - Success: 200 OK

- **POST /alerts**
  - Description: Create a new alert based on arbitrage conditions. Implements business rules such as:
    - Spread must be > 0
    - Rate limiting: max 1 alert per minute per asset pair
    - Freemium limits: max 3 alerts per 24 hours
  - Request JSON:
    ```json
    {
      "exchangeId": "UUID",
      "assetId": "UUID",
      "spread": number,
      "additional_info": { ... }
    }
    ```
  - Response: Created alert object including notification status.
  - Success: 201 Created
  - Errors: 400 Bad Request, 429 Too Many Requests, 403 Forbidden

### Subscriptions

- **GET /subscriptions/me**
  - Description: Retrieve current subscription details for the authenticated user.
  - Success: 200 OK

- **POST /subscriptions/upgrade**
  - Description: Upgrade the user's subscription plan using Stripe integration.
  - Request JSON:
    ```json
    {
      "payment_method": "string",
      "stripe_token": "string"
    }
    ```
  - Success: 200 OK
  - Errors: 400 Bad Request, 402 Payment Required

- **(Webhook) POST /subscriptions/stripe-webhook**
  - Description: Receive Stripe webhook events to update subscription status.
  - Success: 200 OK
  - Errors: 400 Bad Request

### Watchlist

- **GET /watchlist**
  - Description: Retrieve the authenticated user's watchlist.
  - Success: 200 OK

- **POST /watchlist**
  - Description: Add an asset to the user's watchlist. Enforces unique (userId, assetId) constraint.
  - Request JSON:
    ```json
    {
      "assetId": "UUID"
    }
    ```
  - Success: 201 Created
  - Errors: 400 Bad Request, 409 Conflict

- **DELETE /watchlist/{watchlistId}**
  - Description: Remove an asset from the user's watchlist.
  - Success: 200 OK
  - Errors: 404 Not Found

### Settings

- **GET /settings/me**
  - Description: Retrieve notification and alert preferences for the authenticated user.
  - Success: 200 OK

- **PUT /settings/me**
  - Description: Update the user's notification configuration and alert preferences.
  - Request JSON:
    ```json
    {
      "notification_config": { ... },
      "alert_preferences": { ... }
    }
    ```
  - Success: 200 OK
  - Errors: 400 Bad Request

### Audit Logs (Admin Only)

- **GET /admin/audit-logs**
  - Description: Retrieve audit logs with support for filtering by user, entity, and date range. Requires admin privileges.
  - Query Parameters: userId, entity, start_date, end_date, page, limit.
  - Success: 200 OK
  - Errors: 403 Forbidden, 400 Bad Request

### Admin Configuration and Metrics (Admin Only)

- **PUT /admin/alert-threshold**
  - Description: Update the global alert spread threshold.
  - Request JSON:
    ```json
    {
      "threshold": number  // e.g., 2 for 2%
    }
    ```
  - Success: 200 OK
  - Errors: 400 Bad Request, 403 Forbidden

- **GET /admin/metrics**
  - Description: Retrieve system performance and error metrics (e.g., API error rate and success rate).
  - Success: 200 OK
  - Errors: 403 Forbidden

## 3. Authentication and Authorization

- **Authentication**: All endpoints require JWT-based authentication through Supabase Auth. Clients must include an `Authorization: Bearer <token>` header in every request.
- **Role-Based Access**: 
  - Standard endpoints ensure that users can only access and modify their own data.
  - Admin endpoints (e.g., audit logs, alert threshold updates, metrics) are restricted to users with an admin role.
- **Enhanced Security**: Admins are required to use Multi-Factor Authentication (MFA) for an additional layer of security.

## 4. Validation and Business Logic

- **Input Validation**:
  - Ensure unique email addresses and validate role values for users.
  - Validate that numerical fields like `spread` in orderbooks and alerts are greater than 0.
  - Enforce unique constraints (e.g., watchlist must have unique (user, asset) entries).
  - For CSV export, validate that the date range does not exceed the allowed history of 3 months.

- **Business Logic
  Implementation**:
  - **Alerts**: The POST /alerts endpoint implements rate limiting (max 1 per minute per asset pair) and freemium limitations (max 3 alerts per 24 hours), triggering email and Telegram notifications within 5 seconds.
  - **Orderbook Data**: Orderbooks are updated every 30 seconds from multiple exchanges. Endpoint logic supports filtering, pagination, and sorting for efficient data retrieval.
  - **Subscription Management**: Integration with Stripe for upgrade transactions and webhook handling to update subscription status.
  - **Admin Functions**: Endpoints for updating alert thresholds and retrieving system metrics are available only to admin users with MFA enabled.

- **Error Handling**:
  - API responses include appropriate HTTP status codes (e.g., 400, 401, 403, 404, 429, 500) with descriptive error messages.

- **Pagination, Filtering, and Sorting**:
  - List endpoints support query parameters such as `page`, `limit`, `sort`, and various filters (e.g., date range, status) to optimize data retrieval. 