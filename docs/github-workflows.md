# GitHub Workflows Documentation

This document describes the GitHub Actions workflows configured for the arbitrage application.

## Workflows Overview

### 1. `test.yml` - Main Test Suite
**Trigger**: Push to `main`/`develop`, Pull Requests to `main`

**Purpose**: Comprehensive testing pipeline for main branch updates.

**Jobs Flow**:
```
Lint → Unit Tests → [Integration Tests + E2E Tests] → Build
       ↓
Security Audit (parallel)
```

**Features**:
- Full test coverage with Codecov integration
- PostgreSQL service for integration tests
- Artifact storage for test results
- Security audit with dependency checking

---

### 2. `pull-request.yml` - PR Validation ⭐ **NEW**
**Trigger**: Pull Request events (opened, synchronize, reopened)

**Purpose**: Fast feedback loop for pull requests with automated status comments.

**Jobs Flow**:
```
Lint → [Unit Tests + E2E Tests] → Status Comment
```

**Key Features**:
- **Parallel Testing**: Unit and E2E tests run simultaneously for faster feedback
- **Environment Integration**: Uses `integration` environment with secrets
- **Automated PR Comments**: Posts detailed test results to PR
- **Coverage Collection**: Collects and reports both unit and E2E coverage
- **Status Checks**: Sets PR status based on test results

**Environment Variables** (from `.env.example`):
- `SUPABASE_URL_INTEGRATION`
- `SUPABASE_SERVICE_KEY_INTEGRATION`
- `BINANCE_API_KEY_INTEGRATION`
- `BYBIT_API_KEY_INTEGRATION`
- `KRAKEN_API_KEY_INTEGRATION`
- `OKX_API_KEY_INTEGRATION`
- All corresponding secret keys and passphrases

---

### 3. `publish-data.yml` - Data Publication ⭐ **NEW**
**Trigger**: 
- Scheduled (every 6 hours)
- Manual dispatch with options

**Purpose**: Automated data collection and publication to repository.

**Jobs Flow**:
```
Collect Data → Check Changes → Publish to Branch → Create Summary Issue
```

**Data Types**:
- **Arbitrage Opportunities**: Latest opportunities from database
- **Market Data**: Exchange and asset summaries
- **Performance Metrics**: System health and response times

**Output Structure**:
```
data/
├── arbitrage/
│   └── latest.json           # Latest arbitrage opportunities
├── market/
│   └── summary.json          # Market data summary
└── metrics/
    └── performance.json      # System performance metrics
```

**Features**:
- **Smart Updates**: Only commits when data actually changes
- **Separate Branch**: Publishes to `data-updates` branch
- **Automated Issues**: Creates summary issues for scheduled runs
- **Force Update**: Manual trigger option to force updates
- **Data Validation**: Generates hashes to track changes

## Workflow Configuration

### Required Secrets

#### Integration Environment
```bash
# Supabase
SUPABASE_URL_INTEGRATION=https://your-project.supabase.co
SUPABASE_SERVICE_KEY_INTEGRATION=your_service_key

# Exchange APIs (Integration)
BINANCE_API_KEY_INTEGRATION=your_integration_api_key
BINANCE_SECRET_KEY_INTEGRATION=your_integration_secret
BYBIT_API_KEY_INTEGRATION=your_integration_api_key
BYBIT_SECRET_KEY_INTEGRATION=your_integration_secret
KRAKEN_API_KEY_INTEGRATION=your_integration_api_key
KRAKEN_SECRET_KEY_INTEGRATION=your_integration_secret
OKX_API_KEY_INTEGRATION=your_integration_api_key
OKX_SECRET_KEY_INTEGRATION=your_integration_secret
OKX_PASSPHRASE_INTEGRATION=your_integration_passphrase
```

#### Production Environment
```bash
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_service_key

# Exchange APIs (Production)
BINANCE_API_KEY=your_production_api_key
BINANCE_SECRET_KEY=your_production_secret
BYBIT_API_KEY=your_production_api_key
BYBIT_SECRET_KEY=your_production_secret
KRAKEN_API_KEY=your_production_api_key
KRAKEN_SECRET_KEY=your_production_secret
OKX_API_KEY=your_production_api_key
OKX_SECRET_KEY=your_production_secret
OKX_PASSPHRASE=your_production_passphrase
```

### Environment Setup

1. **Create GitHub Environments**:
   - `integration` - For PR testing
   - `production` - For data collection

2. **Configure Environment Protection**:
   - `integration`: No restrictions (for PR testing)
   - `production`: Restrict to `main` branch only

3. **Add Secrets to Environments**:
   - Go to repository Settings → Environments
   - Add secrets to respective environments

## Usage Examples

### Pull Request Workflow

When a PR is created, the workflow will:

1. **Run Lint** → Pass/Fail feedback
2. **Run Tests** (parallel):
   - Unit tests with coverage
   - E2E tests with integration environment
3. **Post Comment** with results:

```markdown
## 🧪 Test Results for PR #123

### Test Status Summary
✅ **Unit Tests**: PASSED
✅ **E2E Tests**: PASSED

### 🎉 Overall Status: **ALL TESTS PASSED**
This PR is ready for review!

### 📊 Coverage Report
- **Unit Test Coverage**: 85.4%

### 📋 Test Details
- **Lint**: ✅ Passed
- **Unit Tests**: ✅ Passed
- **E2E Tests**: ✅ Passed
```

### Data Publication Workflow

**Manual Trigger**:
```bash
# Via GitHub UI:
Actions → Publish Data to Repository → Run workflow
# Select data type: arbitrage-opportunities, market-data, performance-metrics, all
# Check "Force update" if needed
```

**Output Example**:
```json
// data/arbitrage/latest.json
{
  "timestamp": "2024-01-15T12:00:00Z",
  "count": 15,
  "opportunities": [
    {
      "buy_exchange": "binance",
      "sell_exchange": "bybit",
      "asset_id": "BTC",
      "spread_percentage": "0.45",
      "profit_usd": "225.50"
    }
  ]
}
```

## Monitoring and Debugging

### Test Failures

1. **Check PR Comments**: Detailed status in PR comments
2. **View Artifacts**: Download test results and coverage reports
3. **Logs**: Check job logs for detailed error information

### Data Collection Issues

1. **Check Scheduled Runs**: Actions tab → Publish Data to Repository
2. **Review Issues**: Automated issues created for failed runs
3. **Validate Secrets**: Ensure all environment secrets are configured
4. **Data Branch**: Check `data-updates` branch for published data

### Common Troubleshooting

**PR Tests Failing**:
- Check integration environment secrets
- Verify API key permissions
- Review test logs for specific failures

**Data Collection Not Running**:
- Check production environment secrets
- Verify cron schedule (every 6 hours)
- Check for API rate limits

**No PR Comments**:
- Verify `pull-requests: write` permission
- Check if PR is from fork (requires additional setup)

## Best Practices

### For Developers

1. **PR Testing**: Always wait for tests to complete before requesting review
2. **Test Coverage**: Maintain minimum 70% coverage for new code
3. **Environment Separation**: Use integration environment for testing, production for data collection

### For Maintainers

1. **Secret Rotation**: Regularly rotate API keys and update secrets
2. **Environment Monitoring**: Monitor integration environment usage
3. **Data Validation**: Review automated data collection issues
4. **Branch Management**: Periodically clean up old data from `data-updates` branch

## Security Considerations

1. **Separate Environments**: Integration and production use different API keys
2. **Limited Permissions**: API keys should have read-only permissions
3. **Secret Management**: All sensitive data stored in GitHub Secrets
4. **Branch Protection**: Production environment restricted to main branch only

## Future Enhancements

- **Slack/Discord Notifications**: Add notification integrations
- **Data Retention Policies**: Implement automatic cleanup of old data
- **Performance Monitoring**: Add alerts for degraded performance
- **Multi-Environment Testing**: Add staging environment for more comprehensive testing
