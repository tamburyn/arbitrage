import * as cron from 'node-cron';
import { BinanceClient } from '../binance/binance-client';
import { BybitClient } from '../bybit/bybit-client';
import { KrakenClient } from '../kraken/kraken-client';
import { OKXClient } from '../okx/okx-client';
import { SupabaseService } from '../database/supabase-service';
import { ArbitrageEngine } from '../arbitrage/arbitrage-engine';
import { logger } from '../../utils/logger';
import { ErrorHandler } from '../../utils/error-handler';
import { TOP_CRYPTO_ASSETS, CONFIG } from '../../constants/crypto-assets';

export class DataCollector {
  private binanceClient: BinanceClient;
  private bybitClient: BybitClient;
  private krakenClient: KrakenClient;
  private okxClient: OKXClient;
  private supabaseService: SupabaseService;
  private arbitrageEngine: ArbitrageEngine;
  private isRunning: boolean = false;
  private binanceExchangeId: string | null = null;
  private bybitExchangeId: string | null = null;
  private krakenExchangeId: string | null = null;
  private okxExchangeId: string | null = null;
  private cronJob: cron.ScheduledTask | null = null;
  private stats = {
    totalRuns: 0,
    successfulRuns: 0,
    failedRuns: 0,
    lastRun: null as string | null,
    lastError: null as string | null,
    startTime: new Date().toISOString()
  };

  constructor() {
    this.binanceClient = new BinanceClient();
    this.bybitClient = new BybitClient();
    this.krakenClient = new KrakenClient();
    this.okxClient = new OKXClient();
    this.supabaseService = new SupabaseService();
    this.arbitrageEngine = new ArbitrageEngine();
    
    logger.info('DataCollector initialized with Binance, Bybit, Kraken, and OKX support');
  }

  async initialize(): Promise<void> {
    try {
      logger.info('Initializing DataCollector...');

      // 1. Test connections
      await this.testConnections();

      // 2. Initialize exchange clients
      await this.krakenClient.initialize();
      await this.okxClient.initialize();

      // 3. Ensure exchanges exist in database
      this.binanceExchangeId = await this.supabaseService.ensureExchangeExists('Binance');
      this.bybitExchangeId = await this.supabaseService.ensureExchangeExists('Bybit');
      this.krakenExchangeId = await this.supabaseService.ensureExchangeExists('Kraken');
      this.okxExchangeId = await this.supabaseService.ensureExchangeExists('OKX');
      
      // 4. Ensure all crypto assets exist in database
      await this.ensureAssetsExist();

      // 5. Start the scheduler
      this.startScheduler();

      logger.info('DataCollector initialized successfully');

    } catch (error) {
      ErrorHandler.handle(error, 'DataCollector.initialize');
      throw error;
    }
  }

  private async testConnections(): Promise<void> {
    logger.info('Testing all connections...');

    // Test API connections
    const [binanceOk, bybitOk, krakenOk, okxOk] = await Promise.all([
      this.binanceClient.testConnection(),
      this.bybitClient.testConnection(),
      this.krakenClient.healthCheck().then(result => result.status === 'healthy').catch(() => false),
      this.okxClient.testConnection()
    ]);
    
    if (!binanceOk) {
      throw new Error('Failed to connect to Binance API');
    }
    
    if (!bybitOk) {
      logger.warn('Failed to connect to Bybit API - continuing without Bybit');
    }

    if (!krakenOk) {
      logger.warn('Failed to connect to Kraken API - continuing without Kraken');
    }

    if (!okxOk) {
      logger.warn('Failed to connect to OKX API - continuing without OKX');
    }

    // Test Supabase connection
    const supabaseOk = await this.supabaseService.testConnection();
    if (!supabaseOk) {
      throw new Error('Failed to connect to Supabase');
    }

    logger.info(`Connections successful: Binance=${binanceOk}, Bybit=${bybitOk}, Kraken=${krakenOk}, OKX=${okxOk}, Supabase=${supabaseOk}`);
  }

  private async ensureAssetsExist(): Promise<void> {
    logger.info('Ensuring crypto assets exist in database...');

    const assetPromises = TOP_CRYPTO_ASSETS.map(symbol => 
      this.supabaseService.ensureAssetExists(symbol)
    );

    await Promise.all(assetPromises);
    logger.info(`Ensured ${TOP_CRYPTO_ASSETS.length} crypto assets exist`);
  }

  private startScheduler(): void {
    if (this.cronJob) {
      logger.warn('Scheduler already running, stopping existing job');
      this.cronJob.stop();
    }

    // Schedule to run every 30 seconds
    // Format: */30 * * * * * (every 30 seconds)
    this.cronJob = cron.schedule('*/30 * * * * *', async () => {
      await this.collectData();
    }, {
      timezone: 'UTC'
    });

    this.cronJob.start();
    logger.info(`Scheduler started - will collect data every ${CONFIG.DATA_COLLECTION_INTERVAL / 1000} seconds`);
  }

  async collectData(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Data collection already in progress, skipping this cycle');
      return;
    }

    if (!this.binanceExchangeId) {
      logger.error('Binance Exchange ID not set, cannot collect data');
      return;
    }

    this.isRunning = true;
    this.stats.totalRuns++;
    const startTime = Date.now();

    try {
      logger.info(`Starting data collection cycle #${this.stats.totalRuns}`);

      // 1. Collect orderbooks from all exchanges
      const [binanceOrderBooks, bybitOrderBooks, krakenOrderBooks, okxOrderBooks] = await Promise.allSettled([
        this.binanceClient.getMultipleOrderBooks(
          Array.from(TOP_CRYPTO_ASSETS),
          this.binanceExchangeId
        ),
        this.bybitExchangeId ? this.bybitClient.getMultipleOrderBooks(
          Array.from(TOP_CRYPTO_ASSETS),
          this.bybitExchangeId
        ) : Promise.resolve(new Map()),
        this.krakenExchangeId ? this.krakenClient.getMultipleOrderBooks(
          Array.from(TOP_CRYPTO_ASSETS)
        ) : Promise.resolve(new Map()),
        this.okxExchangeId ? this.okxClient.getMultipleOrderBooks(
          Array.from(TOP_CRYPTO_ASSETS)
        ) : Promise.resolve(new Map())
      ]);

      const binanceData = binanceOrderBooks.status === 'fulfilled' ? binanceOrderBooks.value : new Map();
      const bybitData = bybitOrderBooks.status === 'fulfilled' ? bybitOrderBooks.value : new Map();
      const krakenData = krakenOrderBooks.status === 'fulfilled' ? krakenOrderBooks.value : new Map();
      const okxData = okxOrderBooks.status === 'fulfilled' ? okxOrderBooks.value : new Map();

      if (binanceData.size === 0 && bybitData.size === 0 && krakenData.size === 0 && okxData.size === 0) {
        throw new Error('No orderbooks retrieved from any exchange');
      }

      logger.info(`Collected orderbooks: Binance=${binanceData.size}, Bybit=${bybitData.size}, Kraken=${krakenData.size}, OKX=${okxData.size}`);

      // 2. Process through arbitrage engine (saves to DB + generates alerts)
      const result = await this.arbitrageEngine.processOrderBooks(binanceData, bybitData, krakenData, okxData);

      // 3. Log results
      const duration = Date.now() - startTime;
      this.stats.successfulRuns++;
      this.stats.lastRun = new Date().toISOString();

      logger.info(`Data collection cycle #${this.stats.totalRuns} completed successfully:`, {
        duration: `${duration}ms`,
        processed: result.processed,
        saved: result.saved,
        alerts: result.alerts,
        profitableOpportunities: result.opportunities.filter(o => o.isProfitable).length
      });

      // Log profitable opportunities
      const profitable = result.opportunities.filter(o => o.isProfitable);
      if (profitable.length > 0) {
        logger.info('🚨 PROFITABLE OPPORTUNITIES FOUND:', 
          profitable.map(o => `${o.symbol}: ${o.spread.toFixed(4)}%`).join(', ')
        );
      }

    } catch (error) {
      this.stats.failedRuns++;
      this.stats.lastError = error.message || 'Unknown error';
      
      ErrorHandler.handle(error, `DataCollector.collectData.cycle.${this.stats.totalRuns}`);
      logger.error(`Data collection cycle #${this.stats.totalRuns} failed after ${Date.now() - startTime}ms`);
    } finally {
      this.isRunning = false;
    }
  }

  // Manual data collection (for testing)
  async collectDataOnce(): Promise<void> {
    logger.info('Manual data collection requested');
    await this.collectData();
  }

  // Stop the scheduler
  stop(): void {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
      logger.info('Data collection scheduler stopped');
    }
  }

  // Restart the scheduler
  restart(): void {
    this.stop();
    this.startScheduler();
    logger.info('Data collection scheduler restarted');
  }

  // Get current statistics
  getStats(): any {
    const uptime = Date.now() - new Date(this.stats.startTime).getTime();
    const successRate = this.stats.totalRuns > 0 ? 
      (this.stats.successfulRuns / this.stats.totalRuns * 100).toFixed(2) : 
      '0.00';

    return {
      ...this.stats,
      uptime: `${Math.floor(uptime / 1000)}s`,
      successRate: `${successRate}%`,
      isRunning: this.isRunning,
      isScheduled: !!this.cronJob,
      binanceStatus: this.binanceClient.getConnectionStatus(),
      bybitStatus: this.bybitClient.getConnectionStatus(),
      krakenStatus: this.krakenClient.getConnectionStatus(),
      okxStatus: this.okxClient.getConnectionStatus()
    };
  }

  // Health check
  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    details: any;
  }> {
    try {
      const [binanceOk, bybitOk, krakenOk, okxOk, supabaseOk] = await Promise.all([
        this.binanceClient.testConnection(),
        this.bybitClient.testConnection(),
        this.krakenClient.healthCheck().then(result => result.status === 'healthy').catch(() => false),
        this.okxClient.testConnection(),
        this.supabaseService.testConnection()
      ]);

      const isHealthy = binanceOk && supabaseOk && !!this.binanceExchangeId;

      return {
        status: isHealthy ? 'healthy' : 'unhealthy',
        details: {
          binanceConnection: binanceOk,
          bybitConnection: bybitOk,
          krakenConnection: krakenOk,
          okxConnection: okxOk,
          supabaseConnection: supabaseOk,
          binanceExchangeId: this.binanceExchangeId,
          bybitExchangeId: this.bybitExchangeId,
          krakenExchangeId: this.krakenExchangeId,
          okxExchangeId: this.okxExchangeId,
          isRunning: this.isRunning,
          isScheduled: !!this.cronJob,
          stats: this.getStats()
        }
      };

    } catch (error) {
      ErrorHandler.handle(error, 'DataCollector.healthCheck');
      return {
        status: 'unhealthy',
        details: {
          error: error.message,
          stats: this.getStats()
        }
      };
    }
  }

  // Get database stats
  async getDatabaseStats(): Promise<any> {
    try {
      const [orderbookStats, arbitrageStats] = await Promise.all([
        this.supabaseService.getOrderbookStats(),
        this.supabaseService.getArbitrageOpportunityStats()
      ]);

      return {
        orderbooks: orderbookStats,
        arbitrageOpportunities: arbitrageStats,
        collector: this.getStats(),
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      ErrorHandler.handle(error, 'DataCollector.getDatabaseStats');
      return {
        orderbooks: null,
        arbitrage: null,
        collector: this.getStats(),
        error: error.message
      };
    }
  }
} 