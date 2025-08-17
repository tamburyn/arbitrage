import type { OrderBookSnapshot } from '../binance/types';
import type { BybitOrderBookSnapshot } from '../bybit/types';
import type { KrakenOrderBookSnapshot } from '../kraken/types';
import type { OKXOrderBookSnapshot } from '../okx/types';
import { SupabaseService } from '../database/supabase-service';
import { logger } from '../../utils/logger';
import { ErrorHandler } from '../../utils/error-handler';
import { CONFIG } from '../../constants/crypto-assets';

export interface ArbitrageOpportunity {
  symbol: string;
  spread: number;
  volume: number | null;
  timestamp: string;
  threshold: number;
  isProfitable: boolean;
  exchange?: string; // Added to track which exchange
}

export interface CrossExchangeArbitrageOpportunity {
  symbol: string;
  binancePrice: number | null;
  bybitPrice: number | null;
  spread: number;
  direction: 'buy_binance_sell_bybit' | 'buy_bybit_sell_binance' | null;
  isProfitable: boolean;
  timestamp: string;
}

export class ArbitrageEngine {
  private supabaseService: SupabaseService;

  constructor() {
    this.supabaseService = new SupabaseService();
    logger.info('ArbitrageEngine initialized');
  }

  async processOrderBooks(
    binanceOrderBooks: Map<string, OrderBookSnapshot>,
    bybitOrderBooks?: Map<string, BybitOrderBookSnapshot>,
    krakenOrderBooks?: Map<string, KrakenOrderBookSnapshot>,
    okxOrderBooks?: Map<string, OKXOrderBookSnapshot>
  ): Promise<{
    processed: number;
    saved: number;
    alerts: number;
    opportunities: ArbitrageOpportunity[];
    crossExchangeOpportunities: CrossExchangeArbitrageOpportunity[];
  }> {
    let savedCount = 0;
    let alertCount = 0;
    const opportunities: ArbitrageOpportunity[] = [];
    const crossExchangeOpportunities: CrossExchangeArbitrageOpportunity[] = [];

    try {
      const totalOrderbooks = binanceOrderBooks.size + (bybitOrderBooks?.size || 0) + (krakenOrderBooks?.size || 0) + (okxOrderBooks?.size || 0);
      logger.info(`Processing ${totalOrderbooks} orderbooks for arbitrage analysis (Binance: ${binanceOrderBooks.size}, Bybit: ${bybitOrderBooks?.size || 0}, Kraken: ${krakenOrderBooks?.size || 0}, OKX: ${okxOrderBooks?.size || 0})`);

      // Process Binance orderbooks
      for (const [symbol, snapshot] of Array.from(binanceOrderBooks.entries())) {
        try {
          // 1. Save orderbook to database
          await this.supabaseService.saveOrderBook(snapshot);
          savedCount++;

          // 2. Analyze for arbitrage opportunities
          const opportunity = this.analyzeSpread(snapshot, 'Binance');
          opportunities.push(opportunity);

          // 3. Save arbitrage opportunity to database (ALL opportunities, not just alerts)
          await this.supabaseService.saveArbitrageOpportunity(
            'intra_exchange',
            snapshot.asset_id,
            opportunity.spread,
            opportunity.threshold,
            opportunity.isProfitable,
            snapshot.exchange_id,
            undefined,
            undefined,
            snapshot.snapshot.asks[0] ? parseFloat(snapshot.snapshot.asks[0][0]) : undefined,
            snapshot.snapshot.bids[0] ? parseFloat(snapshot.snapshot.bids[0][0]) : undefined,
            snapshot.volume,
            {
              symbol: snapshot.symbol,
              exchange: 'Binance',
              orderbook_snapshot: {
                best_bid: snapshot.snapshot.bids[0],
                best_ask: snapshot.snapshot.asks[0]
              }
            }
          );

          // 4. Generate alerts if threshold met (only for PRO users)
          if (opportunity.isProfitable) {
            const alertsGenerated = await this.generateAlerts(snapshot, opportunity);
            alertCount += alertsGenerated;
          }

          logger.debug(`Processed ${symbol} (Binance): spread=${opportunity.spread.toFixed(4)}%, saved=${opportunity.isProfitable ? 'ALERT' : 'OK'}`);

        } catch (error) {
          ErrorHandler.handle(error, `ArbitrageEngine.processOrderBooks.Binance.${symbol}`);
        }
      }

      // Process Bybit orderbooks
      if (bybitOrderBooks) {
        for (const [symbol, snapshot] of Array.from(bybitOrderBooks.entries())) {
          try {
            // 1. Save orderbook to database (convert to common format)
            const commonSnapshot: OrderBookSnapshot = {
              asset_id: snapshot.asset_id,
              exchange_id: snapshot.exchange_id,
              snapshot: snapshot.snapshot,
              spread: snapshot.spread,
              timestamp: snapshot.timestamp,
              volume: snapshot.volume,
              symbol: snapshot.symbol
            };
            await this.supabaseService.saveOrderBook(commonSnapshot);
            savedCount++;

            // 2. Analyze for arbitrage opportunities
            const opportunity = this.analyzeSpread(commonSnapshot, 'Bybit');
            opportunities.push(opportunity);

            // 3. Save arbitrage opportunity to database (ALL opportunities, not just alerts)
            await this.supabaseService.saveArbitrageOpportunity(
              'intra_exchange',
              commonSnapshot.asset_id,
              opportunity.spread,
              opportunity.threshold,
              opportunity.isProfitable,
              commonSnapshot.exchange_id,
              undefined,
              undefined,
              commonSnapshot.snapshot.asks[0] ? parseFloat(commonSnapshot.snapshot.asks[0][0]) : undefined,
              commonSnapshot.snapshot.bids[0] ? parseFloat(commonSnapshot.snapshot.bids[0][0]) : undefined,
              commonSnapshot.volume,
              {
                symbol: commonSnapshot.symbol,
                exchange: 'Bybit',
                orderbook_snapshot: {
                  best_bid: commonSnapshot.snapshot.bids[0],
                  best_ask: commonSnapshot.snapshot.asks[0]
                }
              }
            );

            // 4. Generate alerts if threshold met
            if (opportunity.isProfitable) {
              const alertsGenerated = await this.generateAlerts(commonSnapshot, opportunity);
              alertCount += alertsGenerated;
            }

            logger.debug(`Processed ${symbol} (Bybit): spread=${opportunity.spread.toFixed(4)}%, saved=${opportunity.isProfitable ? 'ALERT' : 'OK'}`);

          } catch (error) {
            ErrorHandler.handle(error, `ArbitrageEngine.processOrderBooks.Bybit.${symbol}`);
          }
        }
      }

      // Process Kraken orderbooks
      if (krakenOrderBooks) {
        for (const [symbol, snapshot] of Array.from(krakenOrderBooks.entries())) {
          try {
            // 1. Save orderbook to database (convert to common format)
            const commonSnapshot: OrderBookSnapshot = {
              asset_id: snapshot.asset_id,
              exchange_id: snapshot.exchange_id,
              snapshot: snapshot.snapshot,
              spread: snapshot.spread,
              timestamp: snapshot.timestamp,
              volume: snapshot.volume,
              symbol: snapshot.symbol
            };
            await this.supabaseService.saveOrderBook(commonSnapshot);
            savedCount++;

            // 2. Analyze for arbitrage opportunities
            const opportunity = this.analyzeSpread(commonSnapshot, 'Kraken');
            opportunities.push(opportunity);

            // 3. Save arbitrage opportunity to database (ALL opportunities, not just alerts)
            await this.supabaseService.saveArbitrageOpportunity(
              'intra_exchange',
              commonSnapshot.asset_id,
              opportunity.spread,
              opportunity.threshold,
              opportunity.isProfitable,
              commonSnapshot.exchange_id,
              undefined,
              undefined,
              commonSnapshot.snapshot.asks[0] ? parseFloat(commonSnapshot.snapshot.asks[0][0]) : undefined,
              commonSnapshot.snapshot.bids[0] ? parseFloat(commonSnapshot.snapshot.bids[0][0]) : undefined,
              commonSnapshot.volume,
              {
                symbol: commonSnapshot.symbol,
                exchange: 'Kraken',
                orderbook_snapshot: {
                  best_bid: commonSnapshot.snapshot.bids[0],
                  best_ask: commonSnapshot.snapshot.asks[0]
                }
              }
            );

            // 4. Generate alerts if threshold met
            if (opportunity.isProfitable) {
              const alertsGenerated = await this.generateAlerts(commonSnapshot, opportunity);
              alertCount += alertsGenerated;
            }

            logger.debug(`Processed ${symbol} (Kraken): spread=${opportunity.spread.toFixed(4)}%, saved=${opportunity.isProfitable ? 'ALERT' : 'OK'}`);

          } catch (error) {
            ErrorHandler.handle(error, `ArbitrageEngine.processOrderBooks.Kraken.${symbol}`);
          }
        }
      }

      // Process OKX orderbooks
      if (okxOrderBooks) {
        for (const [symbol, snapshot] of Array.from(okxOrderBooks.entries())) {
          try {
            // 1. Save orderbook to database (convert to common format)
            const commonSnapshot: OrderBookSnapshot = {
              asset_id: snapshot.asset_id,
              exchange_id: snapshot.exchange_id,
              snapshot: snapshot.snapshot,
              spread: snapshot.spread,
              timestamp: snapshot.timestamp,
              volume: snapshot.volume,
              symbol: snapshot.symbol
            };
            await this.supabaseService.saveOrderBook(commonSnapshot);
            savedCount++;

            // 2. Analyze for arbitrage opportunities
            const opportunity = this.analyzeSpread(commonSnapshot, 'OKX');
            opportunities.push(opportunity);

            // 3. Save arbitrage opportunity to database (ALL opportunities, not just alerts)
            await this.supabaseService.saveArbitrageOpportunity(
              'intra_exchange',
              commonSnapshot.asset_id,
              opportunity.spread,
              opportunity.threshold,
              opportunity.isProfitable,
              commonSnapshot.exchange_id,
              undefined,
              undefined,
              commonSnapshot.snapshot.asks[0] ? parseFloat(commonSnapshot.snapshot.asks[0][0]) : undefined,
              commonSnapshot.snapshot.bids[0] ? parseFloat(commonSnapshot.snapshot.bids[0][0]) : undefined,
              commonSnapshot.volume,
              {
                symbol: commonSnapshot.symbol,
                exchange: 'OKX',
                orderbook_snapshot: {
                  best_bid: commonSnapshot.snapshot.bids[0],
                  best_ask: commonSnapshot.snapshot.asks[0]
                }
              }
            );

            // 4. Generate alerts if threshold met
            if (opportunity.isProfitable) {
              const alertsGenerated = await this.generateAlerts(commonSnapshot, opportunity);
              alertCount += alertsGenerated;
            }

            logger.debug(`Processed ${symbol} (OKX): spread=${opportunity.spread.toFixed(4)}%, saved=${opportunity.isProfitable ? 'ALERT' : 'OK'}`);

          } catch (error) {
            ErrorHandler.handle(error, `ArbitrageEngine.processOrderBooks.OKX.${symbol}`);
          }
        }
      }

      // Analyze cross-exchange arbitrage opportunities
      if (bybitOrderBooks) {
        crossExchangeOpportunities.push(...this.analyzeCrossExchangeOpportunities(binanceOrderBooks, bybitOrderBooks));
      }
      
      // Add Kraken cross-exchange opportunities
      if (krakenOrderBooks) {
        crossExchangeOpportunities.push(...this.analyzeCrossExchangeOpportunitiesWithKraken(binanceOrderBooks, krakenOrderBooks));
        if (bybitOrderBooks) {
          crossExchangeOpportunities.push(...this.analyzeCrossExchangeOpportunitiesKrakenBybit(krakenOrderBooks, bybitOrderBooks));
        }
      }

      // Add OKX cross-exchange opportunities
      if (okxOrderBooks) {
        crossExchangeOpportunities.push(...this.analyzeCrossExchangeOpportunitiesWithOKX(binanceOrderBooks, okxOrderBooks));
        if (bybitOrderBooks) {
          crossExchangeOpportunities.push(...this.analyzeCrossExchangeOpportunitiesOKXBybit(okxOrderBooks, bybitOrderBooks));
        }
        if (krakenOrderBooks) {
          crossExchangeOpportunities.push(...this.analyzeCrossExchangeOpportunitiesOKXKraken(okxOrderBooks, krakenOrderBooks));
        }
      }

      const summary = {
        processed: totalOrderbooks,
        saved: savedCount,
        alerts: alertCount,
        opportunities,
        crossExchangeOpportunities
      };

      logger.info(`Arbitrage processing completed: ${summary.processed} processed, ${summary.saved} saved, ${summary.alerts} alerts, ${summary.crossExchangeOpportunities.length} cross-exchange opportunities`);
      return summary;

    } catch (error) {
      ErrorHandler.handle(error, 'ArbitrageEngine.processOrderBooks');
      throw error;
    }
  }

  private analyzeSpread(snapshot: OrderBookSnapshot, exchange?: string): ArbitrageOpportunity {
    const spread = snapshot.spread;
    const threshold = CONFIG.ARBITRAGE_THRESHOLD;
    const isProfitable = spread >= threshold;

    return {
      symbol: snapshot.symbol,
      spread,
      volume: snapshot.volume,
      timestamp: snapshot.timestamp,
      threshold,
      isProfitable,
      exchange
    };
  }

  private analyzeCrossExchangeOpportunities(
    binanceOrderBooks: Map<string, OrderBookSnapshot>,
    bybitOrderBooks: Map<string, BybitOrderBookSnapshot>
  ): CrossExchangeArbitrageOpportunity[] {
    const opportunities: CrossExchangeArbitrageOpportunity[] = [];

    // Find common symbols between exchanges
    const commonSymbols = Array.from(binanceOrderBooks.keys()).filter(symbol => 
      bybitOrderBooks.has(symbol)
    );

    for (const symbol of commonSymbols) {
      try {
        const binanceSnapshot = binanceOrderBooks.get(symbol)!;
        const bybitSnapshot = bybitOrderBooks.get(symbol)!;

        // Get best prices from each exchange
        const binanceBestAsk = binanceSnapshot.snapshot.asks[0]?.[0];
        const binanceBestBid = binanceSnapshot.snapshot.bids[0]?.[0];
        const bybitBestAsk = bybitSnapshot.snapshot.asks[0]?.[0];
        const bybitBestBid = bybitSnapshot.snapshot.bids[0]?.[0];

        if (!binanceBestAsk || !binanceBestBid || !bybitBestAsk || !bybitBestBid) {
          continue;
        }

        // Calculate cross-exchange spreads
        // Buy on Binance, sell on Bybit
        const spreadBinanceToBybyt = ((bybitBestBid - binanceBestAsk) / binanceBestAsk) * 100;
        
        // Buy on Bybit, sell on Binance  
        const spreadBybitToBinance = ((binanceBestBid - bybitBestAsk) / bybitBestAsk) * 100;

        // Find the best opportunity
        let bestSpread = 0;
        let direction: 'buy_binance_sell_bybit' | 'buy_bybit_sell_binance' | null = null;

        if (spreadBinanceToBybyt > bestSpread) {
          bestSpread = spreadBinanceToBybyt;
          direction = 'buy_binance_sell_bybit';
        }

        if (spreadBybitToBinance > bestSpread) {
          bestSpread = spreadBybitToBinance;
          direction = 'buy_bybit_sell_binance';
        }

        const isProfitable = bestSpread >= CONFIG.ARBITRAGE_THRESHOLD;

        opportunities.push({
          symbol,
          binancePrice: (binanceBestAsk + binanceBestBid) / 2,
          bybitPrice: (bybitBestAsk + bybitBestBid) / 2,
          spread: bestSpread,
          direction,
          isProfitable,
          timestamp: new Date().toISOString()
        });

        if (isProfitable) {
          logger.info(`🚨 Cross-exchange arbitrage opportunity: ${symbol} - ${bestSpread.toFixed(4)}% (${direction})`);
        }

      } catch (error) {
        ErrorHandler.handle(error, `ArbitrageEngine.analyzeCrossExchangeOpportunities.${symbol}`);
      }
    }

    return opportunities;
  }

  private analyzeCrossExchangeOpportunitiesWithKraken(
    binanceOrderBooks: Map<string, OrderBookSnapshot>,
    krakenOrderBooks: Map<string, KrakenOrderBookSnapshot>
  ): CrossExchangeArbitrageOpportunity[] {
    const opportunities: CrossExchangeArbitrageOpportunity[] = [];

    // Find common symbols between Binance and Kraken
    const commonSymbols = Array.from(binanceOrderBooks.keys()).filter(symbol => 
      krakenOrderBooks.has(symbol)
    );

    for (const symbol of commonSymbols) {
      try {
        const binanceSnapshot = binanceOrderBooks.get(symbol)!;
        const krakenSnapshot = krakenOrderBooks.get(symbol)!;

        // Get best prices from each exchange
        const binanceBestAsk = binanceSnapshot.snapshot.asks[0]?.[0];
        const binanceBestBid = binanceSnapshot.snapshot.bids[0]?.[0];
        const krakenBestAsk = krakenSnapshot.snapshot.asks[0]?.[0];
        const krakenBestBid = krakenSnapshot.snapshot.bids[0]?.[0];

        if (!binanceBestAsk || !binanceBestBid || !krakenBestAsk || !krakenBestBid) {
          continue;
        }

        // Calculate cross-exchange spreads
        // Buy on Binance, sell on Kraken
        const spreadBinanceToKraken = ((krakenBestBid - binanceBestAsk) / binanceBestAsk) * 100;
        
        // Buy on Kraken, sell on Binance  
        const spreadKrakenToBinance = ((binanceBestBid - krakenBestAsk) / krakenBestAsk) * 100;

        // Find the best opportunity
        let bestSpread = 0;
        let direction: 'buy_binance_sell_bybit' | 'buy_bybit_sell_binance' | null = null;

        if (spreadBinanceToKraken > bestSpread) {
          bestSpread = spreadBinanceToKraken;
          direction = 'buy_binance_sell_bybit'; // Using existing type
        }

        if (spreadKrakenToBinance > bestSpread) {
          bestSpread = spreadKrakenToBinance;
          direction = 'buy_bybit_sell_binance'; // Using existing type
        }

        const isProfitable = bestSpread >= CONFIG.ARBITRAGE_THRESHOLD;

        opportunities.push({
          symbol,
          binancePrice: (binanceBestAsk + binanceBestBid) / 2,
          bybitPrice: (krakenBestAsk + krakenBestBid) / 2, // Using bybit field for Kraken price
          spread: bestSpread,
          direction,
          isProfitable,
          timestamp: new Date().toISOString()
        });

        if (isProfitable) {
          logger.info(`🚨 Binance-Kraken arbitrage opportunity: ${symbol} - ${bestSpread.toFixed(4)}% (${direction})`);
        }

      } catch (error) {
        ErrorHandler.handle(error, `ArbitrageEngine.analyzeCrossExchangeOpportunitiesWithKraken.${symbol}`);
      }
    }

    return opportunities;
  }

  private analyzeCrossExchangeOpportunitiesKrakenBybit(
    krakenOrderBooks: Map<string, KrakenOrderBookSnapshot>,
    bybitOrderBooks: Map<string, BybitOrderBookSnapshot>
  ): CrossExchangeArbitrageOpportunity[] {
    const opportunities: CrossExchangeArbitrageOpportunity[] = [];

    // Find common symbols between Kraken and Bybit
    const commonSymbols = Array.from(krakenOrderBooks.keys()).filter(symbol => 
      bybitOrderBooks.has(symbol)
    );

    for (const symbol of commonSymbols) {
      try {
        const krakenSnapshot = krakenOrderBooks.get(symbol)!;
        const bybitSnapshot = bybitOrderBooks.get(symbol)!;

        // Get best prices from each exchange
        const krakenBestAsk = krakenSnapshot.snapshot.asks[0]?.[0];
        const krakenBestBid = krakenSnapshot.snapshot.bids[0]?.[0];
        const bybitBestAsk = bybitSnapshot.snapshot.asks[0]?.[0];
        const bybitBestBid = bybitSnapshot.snapshot.bids[0]?.[0];

        if (!krakenBestAsk || !krakenBestBid || !bybitBestAsk || !bybitBestBid) {
          continue;
        }

        // Calculate cross-exchange spreads
        // Buy on Kraken, sell on Bybit
        const spreadKrakenToBybit = ((bybitBestBid - krakenBestAsk) / krakenBestAsk) * 100;
        
        // Buy on Bybit, sell on Kraken  
        const spreadBybitToKraken = ((krakenBestBid - bybitBestAsk) / bybitBestAsk) * 100;

        // Find the best opportunity
        let bestSpread = 0;
        let direction: 'buy_binance_sell_bybit' | 'buy_bybit_sell_binance' | null = null;

        if (spreadKrakenToBybit > bestSpread) {
          bestSpread = spreadKrakenToBybit;
          direction = 'buy_binance_sell_bybit'; // Using existing type for Kraken->Bybit
        }

        if (spreadBybitToKraken > bestSpread) {
          bestSpread = spreadBybitToKraken;
          direction = 'buy_bybit_sell_binance'; // Using existing type for Bybit->Kraken
        }

        const isProfitable = bestSpread >= CONFIG.ARBITRAGE_THRESHOLD;

        opportunities.push({
          symbol,
          binancePrice: (krakenBestAsk + krakenBestBid) / 2, // Using binance field for Kraken price
          bybitPrice: (bybitBestAsk + bybitBestBid) / 2,
          spread: bestSpread,
          direction,
          isProfitable,
          timestamp: new Date().toISOString()
        });

        if (isProfitable) {
          logger.info(`🚨 Kraken-Bybit arbitrage opportunity: ${symbol} - ${bestSpread.toFixed(4)}% (${direction})`);
        }

      } catch (error) {
        ErrorHandler.handle(error, `ArbitrageEngine.analyzeCrossExchangeOpportunitiesKrakenBybit.${symbol}`);
      }
    }

    return opportunities;
  }

  private async generateAlerts(
    snapshot: OrderBookSnapshot, 
    opportunity: ArbitrageOpportunity
  ): Promise<number> {
    try {
      // Get active users (pro plan required for alerts)
      const activeUsers = await this.supabaseService.getActiveUsers();
      
      if (activeUsers.length === 0) {
        logger.debug(`No active users found for alerts`);
        return 0;
      }

      let alertsCreated = 0;

      // Generate alerts for each active user
              for (const user of activeUsers) {
          try {
            // Check alert limits (prevent spam) - removed PRO restriction for MVP
            const alertCount = await this.supabaseService.getUserAlertCount(user.id, 1); // last 1 hour
          
          if (alertCount >= 10) { // Max 10 alerts per hour
            logger.debug(`User ${user.id} has reached alert limit (${alertCount}/10)`);
            continue;
          }

          // Create alert
          await this.supabaseService.createAlert(
            user.id,
            snapshot.exchange_id,
            snapshot.asset_id,
            opportunity.spread,
            {
              symbol: snapshot.symbol,
              threshold: opportunity.threshold,
              volume: snapshot.volume,
              orderbook_snapshot: {
                best_bid: snapshot.snapshot.bids[0],
                best_ask: snapshot.snapshot.asks[0],
                lastUpdateId: snapshot.snapshot.lastUpdateId
              }
            }
          );

          alertsCreated++;
          logger.debug(`Created alert for user ${user.id}: ${snapshot.symbol} at ${opportunity.spread.toFixed(4)}%`);

        } catch (error) {
          ErrorHandler.handle(error, `ArbitrageEngine.generateAlerts.user.${user.id}`);
        }
      }

      return alertsCreated;

    } catch (error) {
      ErrorHandler.handle(error, `ArbitrageEngine.generateAlerts.${snapshot.symbol}`);
      return 0;
    }
  }

  // Get recent arbitrage opportunities
  async getRecentOpportunities(hours: number = 24): Promise<ArbitrageOpportunity[]> {
    try {
      const since = new Date(Date.now() - hours * 60 * 60 * 1000);
      
      // This is a simplified version - in production you'd query from database
      logger.info(`Getting recent arbitrage opportunities from last ${hours} hours`);
      
      // For now, return empty array - this would typically query the orderbooks table
      // with join to assets and exchanges to reconstruct opportunities
      return [];

    } catch (error) {
      ErrorHandler.handle(error, 'ArbitrageEngine.getRecentOpportunities');
      return [];
    }
  }

  // Calculate theoretical profit
  calculatePotentialProfit(
    opportunity: ArbitrageOpportunity, 
    investmentAmount: number = 1000
  ): {
    grossProfit: number;
    netProfit: number;
    fees: number;
    roi: number;
  } {
    try {
      const spreadDecimal = opportunity.spread / 100;
      const grossProfit = investmentAmount * spreadDecimal;
      
      // Estimate trading fees (typical 0.1% per trade, 2 trades = 0.2% total)
      const feeRate = 0.002;
      const fees = investmentAmount * feeRate;
      
      const netProfit = grossProfit - fees;
      const roi = (netProfit / investmentAmount) * 100;

      return {
        grossProfit,
        netProfit: Math.max(0, netProfit), // Can't have negative profit
        fees,
        roi
      };

    } catch (error) {
      ErrorHandler.handle(error, 'ArbitrageEngine.calculatePotentialProfit');
      return {
        grossProfit: 0,
        netProfit: 0,
        fees: 0,
        roi: 0
      };
    }
  }

  // Get arbitrage statistics
  async getArbitrageStats(): Promise<{
    totalOpportunities: number;
    avgSpread: number;
    maxSpread: number;
    profitableCount: number;
    lastUpdate: string | null;
  }> {
    try {
      // This would typically query aggregated data from the database
      // For now, return default values
      logger.info('Getting arbitrage statistics');

      return {
        totalOpportunities: 0,
        avgSpread: 0,
        maxSpread: 0,
        profitableCount: 0,
        lastUpdate: null
      };

    } catch (error) {
      ErrorHandler.handle(error, 'ArbitrageEngine.getArbitrageStats');
      return {
        totalOpportunities: 0,
        avgSpread: 0,
        maxSpread: 0,
        profitableCount: 0,
        lastUpdate: null
      };
    }
  }

  private analyzeCrossExchangeOpportunitiesWithOKX(
    binanceOrderBooks: Map<string, OrderBookSnapshot>,
    okxOrderBooks: Map<string, OKXOrderBookSnapshot>
  ): CrossExchangeArbitrageOpportunity[] {
    const opportunities: CrossExchangeArbitrageOpportunity[] = [];

    // Find common symbols between Binance and OKX
    const commonSymbols = Array.from(binanceOrderBooks.keys()).filter(symbol => 
      okxOrderBooks.has(symbol)
    );

    for (const symbol of commonSymbols) {
      try {
        const binanceSnapshot = binanceOrderBooks.get(symbol)!;
        const okxSnapshot = okxOrderBooks.get(symbol)!;

        // Get best prices from each exchange
        const binanceBestAsk = binanceSnapshot.snapshot.asks[0]?.[0];
        const binanceBestBid = binanceSnapshot.snapshot.bids[0]?.[0];
        const okxBestAsk = okxSnapshot.snapshot.asks[0]?.[0];
        const okxBestBid = okxSnapshot.snapshot.bids[0]?.[0];

        if (!binanceBestAsk || !binanceBestBid || !okxBestAsk || !okxBestBid) {
          continue;
        }

        // Calculate cross-exchange spreads
        // Buy on Binance, sell on OKX
        const spreadBinanceToOKX = ((okxBestBid - binanceBestAsk) / binanceBestAsk) * 100;
        
        // Buy on OKX, sell on Binance  
        const spreadOKXToBinance = ((binanceBestBid - okxBestAsk) / okxBestAsk) * 100;

        // Find the best opportunity
        let bestSpread = 0;
        let direction: 'buy_binance_sell_bybit' | 'buy_bybit_sell_binance' | null = null;

        if (spreadBinanceToOKX > bestSpread) {
          bestSpread = spreadBinanceToOKX;
          direction = 'buy_binance_sell_bybit'; // Using existing type
        }

        if (spreadOKXToBinance > bestSpread) {
          bestSpread = spreadOKXToBinance;
          direction = 'buy_bybit_sell_binance'; // Using existing type
        }

        const isProfitable = bestSpread >= CONFIG.ARBITRAGE_THRESHOLD;

        opportunities.push({
          symbol,
          binancePrice: (binanceBestAsk + binanceBestBid) / 2,
          bybitPrice: (okxBestAsk + okxBestBid) / 2, // Using bybit field for OKX price
          spread: bestSpread,
          direction,
          isProfitable,
          timestamp: new Date().toISOString()
        });

        if (isProfitable) {
          logger.info(`🚨 Binance-OKX arbitrage opportunity: ${symbol} - ${bestSpread.toFixed(4)}% (${direction})`);
        }

      } catch (error) {
        ErrorHandler.handle(error, `ArbitrageEngine.analyzeCrossExchangeOpportunitiesWithOKX.${symbol}`);
      }
    }

    return opportunities;
  }

  private analyzeCrossExchangeOpportunitiesOKXBybit(
    okxOrderBooks: Map<string, OKXOrderBookSnapshot>,
    bybitOrderBooks: Map<string, BybitOrderBookSnapshot>
  ): CrossExchangeArbitrageOpportunity[] {
    const opportunities: CrossExchangeArbitrageOpportunity[] = [];

    // Find common symbols between OKX and Bybit
    const commonSymbols = Array.from(okxOrderBooks.keys()).filter(symbol => 
      bybitOrderBooks.has(symbol)
    );

    for (const symbol of commonSymbols) {
      try {
        const okxSnapshot = okxOrderBooks.get(symbol)!;
        const bybitSnapshot = bybitOrderBooks.get(symbol)!;

        // Get best prices from each exchange
        const okxBestAsk = okxSnapshot.snapshot.asks[0]?.[0];
        const okxBestBid = okxSnapshot.snapshot.bids[0]?.[0];
        const bybitBestAsk = bybitSnapshot.snapshot.asks[0]?.[0];
        const bybitBestBid = bybitSnapshot.snapshot.bids[0]?.[0];

        if (!okxBestAsk || !okxBestBid || !bybitBestAsk || !bybitBestBid) {
          continue;
        }

        // Calculate cross-exchange spreads
        // Buy on OKX, sell on Bybit
        const spreadOKXToBybit = ((bybitBestBid - okxBestAsk) / okxBestAsk) * 100;
        
        // Buy on Bybit, sell on OKX  
        const spreadBybitToOKX = ((okxBestBid - bybitBestAsk) / bybitBestAsk) * 100;

        // Find the best opportunity
        let bestSpread = 0;
        let direction: 'buy_binance_sell_bybit' | 'buy_bybit_sell_binance' | null = null;

        if (spreadOKXToBybit > bestSpread) {
          bestSpread = spreadOKXToBybit;
          direction = 'buy_binance_sell_bybit'; // Using existing type for OKX->Bybit
        }

        if (spreadBybitToOKX > bestSpread) {
          bestSpread = spreadBybitToOKX;
          direction = 'buy_bybit_sell_binance'; // Using existing type for Bybit->OKX
        }

        const isProfitable = bestSpread >= CONFIG.ARBITRAGE_THRESHOLD;

        opportunities.push({
          symbol,
          binancePrice: (okxBestAsk + okxBestBid) / 2, // Using binance field for OKX price
          bybitPrice: (bybitBestAsk + bybitBestBid) / 2,
          spread: bestSpread,
          direction,
          isProfitable,
          timestamp: new Date().toISOString()
        });

        if (isProfitable) {
          logger.info(`🚨 OKX-Bybit arbitrage opportunity: ${symbol} - ${bestSpread.toFixed(4)}% (${direction})`);
        }

      } catch (error) {
        ErrorHandler.handle(error, `ArbitrageEngine.analyzeCrossExchangeOpportunitiesOKXBybit.${symbol}`);
      }
    }

    return opportunities;
  }

  private analyzeCrossExchangeOpportunitiesOKXKraken(
    okxOrderBooks: Map<string, OKXOrderBookSnapshot>,
    krakenOrderBooks: Map<string, KrakenOrderBookSnapshot>
  ): CrossExchangeArbitrageOpportunity[] {
    const opportunities: CrossExchangeArbitrageOpportunity[] = [];

    // Find common symbols between OKX and Kraken
    const commonSymbols = Array.from(okxOrderBooks.keys()).filter(symbol => 
      krakenOrderBooks.has(symbol)
    );

    for (const symbol of commonSymbols) {
      try {
        const okxSnapshot = okxOrderBooks.get(symbol)!;
        const krakenSnapshot = krakenOrderBooks.get(symbol)!;

        // Get best prices from each exchange
        const okxBestAsk = okxSnapshot.snapshot.asks[0]?.[0];
        const okxBestBid = okxSnapshot.snapshot.bids[0]?.[0];
        const krakenBestAsk = krakenSnapshot.snapshot.asks[0]?.[0];
        const krakenBestBid = krakenSnapshot.snapshot.bids[0]?.[0];

        if (!okxBestAsk || !okxBestBid || !krakenBestAsk || !krakenBestBid) {
          continue;
        }

        // Calculate cross-exchange spreads
        // Buy on OKX, sell on Kraken
        const spreadOKXToKraken = ((krakenBestBid - okxBestAsk) / okxBestAsk) * 100;
        
        // Buy on Kraken, sell on OKX  
        const spreadKrakenToOKX = ((okxBestBid - krakenBestAsk) / krakenBestAsk) * 100;

        // Find the best opportunity
        let bestSpread = 0;
        let direction: 'buy_binance_sell_bybit' | 'buy_bybit_sell_binance' | null = null;

        if (spreadOKXToKraken > bestSpread) {
          bestSpread = spreadOKXToKraken;
          direction = 'buy_binance_sell_bybit'; // Using existing type for OKX->Kraken
        }

        if (spreadKrakenToOKX > bestSpread) {
          bestSpread = spreadKrakenToOKX;
          direction = 'buy_bybit_sell_binance'; // Using existing type for Kraken->OKX
        }

        const isProfitable = bestSpread >= CONFIG.ARBITRAGE_THRESHOLD;

        opportunities.push({
          symbol,
          binancePrice: (okxBestAsk + okxBestBid) / 2, // Using binance field for OKX price
          bybitPrice: (krakenBestAsk + krakenBestBid) / 2, // Using bybit field for Kraken price
          spread: bestSpread,
          direction,
          isProfitable,
          timestamp: new Date().toISOString()
        });

        if (isProfitable) {
          logger.info(`🚨 OKX-Kraken arbitrage opportunity: ${symbol} - ${bestSpread.toFixed(4)}% (${direction})`);
        }

      } catch (error) {
        ErrorHandler.handle(error, `ArbitrageEngine.analyzeCrossExchangeOpportunitiesOKXKraken.${symbol}`);
      }
    }

    return opportunities;
  }
} 