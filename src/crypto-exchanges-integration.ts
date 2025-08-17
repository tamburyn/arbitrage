#!/usr/bin/env tsx
import 'dotenv/config';
import { DataCollector } from './services/scheduler/data-collector';
import { logger } from './utils/logger';
import { ErrorHandler } from './utils/error-handler';

// Global error handlers
process.on('uncaughtException', (error) => {
  ErrorHandler.handle(error, 'UNCAUGHT_EXCEPTION');
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  ErrorHandler.handle(reason, 'UNHANDLED_REJECTION');
  process.exit(1);
});

// Graceful shutdown handlers
let dataCollector: DataCollector | null = null;

const gracefulShutdown = (signal: string) => {
  logger.info(`Received ${signal}, starting graceful shutdown...`);
  
  if (dataCollector) {
    dataCollector.stop();
  }
  
  logger.info('Crypto Exchanges Integration service stopped');
  process.exit(0);
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Main function
async function main() {
  try {
    logger.info('🚀 Starting Crypto Exchanges Integration Service');
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    
    // Check required environment variables
    checkRequiredEnvVars();
    
    // Initialize and start data collector
    dataCollector = new DataCollector();
    await dataCollector.initialize();
    
    logger.info('✅ Crypto Exchanges Integration Service started successfully');
    logger.info('📊 Multi-exchange data collection is now running every 30 seconds');
    
    // Keep the process alive
    process.stdin.resume();
    
  } catch (error) {
    logger.error('❌ Failed to start Crypto Exchanges Integration Service:', error);
    ErrorHandler.handle(error, 'main');
    process.exit(1);
  }
}

function checkRequiredEnvVars() {
  const requiredVars = [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_KEY',
    'BINANCE_API_KEY',
    'BINANCE_SECRET_KEY'
  ];
  
  const optionalVars = [
    'BYBIT_API_KEY',
    'BYBIT_SECRET_KEY',
    'KRAKEN_API_KEY', 
    'KRAKEN_SECRET_KEY',
    'OKX_API_KEY',
    'OKX_SECRET_KEY',
    'OKX_PASSPHRASE'
  ];
  
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }
  
  // Check optional exchange credentials
  const bybitMissing = !process.env.BYBIT_API_KEY || !process.env.BYBIT_SECRET_KEY;
  const krakenMissing = !process.env.KRAKEN_API_KEY || !process.env.KRAKEN_SECRET_KEY;
  const okxMissing = !process.env.OKX_API_KEY || !process.env.OKX_SECRET_KEY || !process.env.OKX_PASSPHRASE;
  
  if (bybitMissing) {
    logger.warn('Missing Bybit credentials - Bybit integration will be disabled');
  }
  
  if (krakenMissing) {
    logger.warn('Missing Kraken credentials - Kraken integration will be disabled');
  }
  
  if (okxMissing) {
    logger.warn('Missing OKX credentials - OKX integration will be disabled');
  }
  
  logger.info('✅ All required environment variables are set');
}

// Health check endpoint (simple HTTP server for monitoring)
if (process.env.ENABLE_HEALTH_CHECK === 'true') {
  import('http').then(http => {
    const port = parseInt(process.env.HEALTH_CHECK_PORT || '3001');
    
    const server = http.createServer(async (req, res) => {
      res.setHeader('Content-Type', 'application/json');
      
      if (req.url === '/health' && req.method === 'GET') {
        try {
          const health = dataCollector ? await dataCollector.healthCheck() : { status: 'unhealthy', details: { message: 'Service not initialized' } };
          
          res.statusCode = health.status === 'healthy' ? 200 : 503;
          res.end(JSON.stringify(health, null, 2));
        } catch (error) {
          res.statusCode = 500;
          res.end(JSON.stringify({ status: 'error', error: error.message }, null, 2));
        }
      } else if (req.url === '/stats' && req.method === 'GET') {
        try {
          const stats = dataCollector ? await dataCollector.getDatabaseStats() : { error: 'Service not initialized' };
          
          res.statusCode = 200;
          res.end(JSON.stringify(stats, null, 2));
        } catch (error) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: error.message }, null, 2));
        }
      } else {
        res.statusCode = 404;
        res.end(JSON.stringify({ error: 'Not found' }, null, 2));
      }
    });
    
    server.listen(port, () => {
      logger.info(`🔍 Health check server listening on port ${port}`);
      logger.info(`📊 Health: http://localhost:${port}/health`);
      logger.info(`📈 Stats: http://localhost:${port}/stats`);
    });
  });
}

// Start the service
main().catch(error => {
  logger.error('Fatal error in main:', error);
  process.exit(1);
}); 