import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../db/database.types';
import type { OrderBookSnapshot } from '../binance/types';
import { logger } from '../../utils/logger';
import { ErrorHandler } from '../../utils/error-handler';

export class SupabaseService {
  private client;

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing required environment variables: SUPABASE_URL, SUPABASE_SERVICE_KEY');
    }

    this.client = createClient<Database>(supabaseUrl, supabaseServiceKey);
    logger.info('SupabaseService initialized');
  }

  async ensureExchangeExists(name: string): Promise<string> {
    try {
      // Sprawdź czy giełda już istnieje
      const { data, error } = await this.client
        .from('exchanges')
        .select('id')
        .eq('name', name)
        .single();

      if (data) {
        logger.debug(`Exchange ${name} already exists with ID: ${data.id}`);
        return data.id;
      }

      // Stwórz nową giełdę z poprawnymi wartościami enum
      const { data: newExchange, error: insertError } = await this.client
        .from('exchanges')
        .insert({
          name,
          api_endpoint: process.env.BINANCE_BASE_URL || 'https://api.binance.com',
          integration_status: 'active',  // Zgodne z constraint check
          metadata: { 
            last_updated: new Date().toISOString(),
            api_version: 'v3',
            supported_pairs: [],
            rate_limit: 1200,
            websocket_url: 'wss://stream.binance.com:9443/ws'
          }
        })
        .select('id')
        .single();

      if (insertError) {
        throw new Error(`Failed to create exchange: ${insertError.message}`);
      }

      logger.info(`Created new exchange: ${name} with ID: ${newExchange.id}`);
      return newExchange.id;

    } catch (error) {
      ErrorHandler.handle(error, 'SupabaseService.ensureExchangeExists');
      throw error;
    }
  }

  async ensureAssetExists(symbol: string, fullName?: string): Promise<string> {
    try {
      // Sprawdź czy asset już istnieje
      const { data, error } = await this.client
        .from('assets')
        .select('id')
        .eq('symbol', symbol)
        .single();

      if (data) {
        logger.debug(`Asset ${symbol} already exists with ID: ${data.id}`);
        return data.id;
      }

      // Stwórz nowy asset
      const { data: newAsset, error: insertError } = await this.client
        .from('assets')
        .insert({
          symbol,
          full_name: fullName || symbol,
          description: `${symbol} cryptocurrency`
        })
        .select('id')
        .single();

      if (insertError) {
        throw new Error(`Failed to create asset: ${insertError.message}`);
      }

      logger.info(`Created new asset: ${symbol} with ID: ${newAsset.id}`);
      return newAsset.id;

    } catch (error) {
      ErrorHandler.handle(error, 'SupabaseService.ensureAssetExists');
      throw error;
    }
  }

  async saveOrderBook(snapshot: OrderBookSnapshot): Promise<void> {
    try {
      const { error } = await this.client
        .from('orderbooks')
        .insert({
          exchange_id: snapshot.exchange_id,
          asset_id: snapshot.asset_id,
          snapshot: snapshot.snapshot,  // JSONB - zgodne z schematem
          timestamp: snapshot.timestamp,
          volume: snapshot.volume,
          spread: snapshot.spread
          // created_at - automatyczne
          // id - automatyczne UUID
        });

      if (error) {
        throw new Error(`Failed to save orderbook: ${error.message}`);
      }

      logger.debug(`Saved orderbook for ${snapshot.symbol}: spread ${snapshot.spread.toFixed(4)}%`);

    } catch (error) {
      ErrorHandler.handle(error, 'SupabaseService.saveOrderBook');
      throw error;
    }
  }

  async getActiveUsers(): Promise<Array<{ id: string; email: string }>> {
    try {
      const { data, error } = await this.client
        .from('subscriptions')
        .select(`
          user_id,
          status
        `)
        .eq('status', 'active')
        .gte('end_date', new Date().toISOString());

      if (error) {
        throw new Error(`Failed to get active users: ${error.message}`);
      }

      if (!data || data.length === 0) {
        logger.debug('No active users found with valid subscriptions');
        return [];
      }

      // Return users with active subscriptions
      // Note: email is fetched from auth.users but we only need user_id for alerts
      return data.map(sub => ({ 
        id: sub.user_id, 
        email: `user-${sub.user_id}@test.com` // Placeholder email
      }));

    } catch (error) {
      ErrorHandler.handle(error, 'SupabaseService.getActiveUsers');
      return [];
    }
  }

  async createAlert(
    userId: string,
    exchangeId: string,
    assetId: string,
    spread: number,
    additionalInfo: any
  ): Promise<void> {
    try {
      const { error } = await this.client
        .from('alerts')
        .insert({
          user_id: userId,
          exchange_id: exchangeId,
          asset_id: assetId,
          timestamp: new Date().toISOString(),
          spread,
          send_status: 'pending',  // Zgodne z constraint check
          additional_info: additionalInfo
        });

      if (error) {
        throw new Error(`Failed to create alert: ${error.message}`);
      }

      logger.info(`Created alert for user ${userId}: spread ${spread.toFixed(4)}%`);

    } catch (error) {
      ErrorHandler.handle(error, 'SupabaseService.createAlert');
      throw error;
    }
  }

  async saveArbitrageOpportunity(
    type: 'intra_exchange' | 'cross_exchange',
    assetId: string,
    spreadPercentage: number,
    thresholdUsed: number,
    isProfitable: boolean,
    exchangeId?: string,
    exchangeFromId?: string,
    exchangeToId?: string,
    buyPrice?: number,
    sellPrice?: number,
    volume?: number,
    additionalData?: any
  ): Promise<void> {
    try {
      const { error } = await this.client
        .from('arbitrage_opportunities')
        .insert({
          type,
          asset_id: assetId,
          exchange_id: exchangeId,
          exchange_from_id: exchangeFromId,
          exchange_to_id: exchangeToId,
          spread_percentage: spreadPercentage,
          potential_profit_percentage: spreadPercentage,
          buy_price: buyPrice,
          sell_price: sellPrice,
          volume,
          threshold_used: thresholdUsed,
          is_profitable: isProfitable,
          additional_data: additionalData,
          timestamp: new Date().toISOString()
        });

      if (error) {
        throw new Error(`Failed to save arbitrage opportunity: ${error.message}`);
      }

      logger.debug(`Saved arbitrage opportunity: ${type}, spread=${spreadPercentage.toFixed(4)}%, profitable=${isProfitable}`);

    } catch (error) {
      ErrorHandler.handle(error, 'SupabaseService.saveArbitrageOpportunity');
      throw error;
    }
  }

  async getUserAlertCount(userId: string, hours: number = 24): Promise<number> {
    try {
      const since = new Date(Date.now() - hours * 60 * 60 * 1000);
      
      const { count, error } = await this.client
        .from('alerts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('timestamp', since.toISOString());

      if (error) {
        throw new Error(`Failed to get alert count: ${error.message}`);
      }

      return count || 0;

    } catch (error) {
      ErrorHandler.handle(error, 'SupabaseService.getUserAlertCount');
      return 0;
    }
  }

  async isUserPro(userId: string): Promise<boolean> {
    try {
      const { data, error } = await this.client
        .from('subscriptions')
        .select('status, end_date')
        .eq('user_id', userId)
        .eq('status', 'active')
        .gte('end_date', new Date().toISOString())
        .single();

      return !!data && !error;

    } catch (error) {
      // Nie logujemy jako błąd - to normalna operacja sprawdzająca
      return false;
    }
  }

  // Health check metoda
  async testConnection(): Promise<boolean> {
    try {
      const { data, error } = await this.client
        .from('exchanges')
        .select('id')
        .limit(1);

      return !error;

    } catch (error) {
      ErrorHandler.handle(error, 'SupabaseService.testConnection');
      return false;
    }
  }

  // Pobierz statystyki orderbooków
  async getOrderbookStats(): Promise<{
    totalCount: number;
    lastUpdate: string | null;
    uniqueAssets: number;
    uniqueExchanges: number;
  }> {
    try {
      // Pobranie całkowitej liczby orderbooków
      const { count: totalCount } = await this.client
        .from('orderbooks')
        .select('*', { count: 'exact', head: true });

      // Pobranie ostatniej aktualizacji
      const { data: lastOrderbook } = await this.client
        .from('orderbooks')
        .select('timestamp')
        .order('timestamp', { ascending: false })
        .limit(1)
        .single();

      // Pobranie liczby unikalnych assetów
      const { data: assetsData } = await this.client
        .from('orderbooks')
        .select('asset_id')
        .limit(1000); // Limit dla bezpieczeństwa

      const uniqueAssets = new Set(assetsData?.map(item => item.asset_id)).size;

      // Pobranie liczby unikalnych giełd
      const { data: exchangesData } = await this.client
        .from('orderbooks')
        .select('exchange_id')
        .limit(1000);

      const uniqueExchanges = new Set(exchangesData?.map(item => item.exchange_id)).size;

      return {
        totalCount: totalCount || 0,
        lastUpdate: lastOrderbook?.timestamp || null,
        uniqueAssets,
        uniqueExchanges
      };

    } catch (error) {
      ErrorHandler.handle(error, 'SupabaseService.getOrderbookStats');
      return {
        totalCount: 0,
        lastUpdate: null,
        uniqueAssets: 0,
        uniqueExchanges: 0
      };
    }
  }

  async getArbitrageOpportunityStats(): Promise<{
    totalOpportunities: number;
    profitableCount: number;
    avgSpread: number;
    maxSpread: number;
    lastUpdate: string | null;
  }> {
    try {
      // Get total count
      const { count: totalCount, error: countError } = await this.client
        .from('arbitrage_opportunities')
        .select('*', { count: 'exact', head: true });

      if (countError) {
        throw new Error(`Failed to get arbitrage opportunity count: ${countError.message}`);
      }

      // Get profitable count
      const { count: profitableCount, error: profitableError } = await this.client
        .from('arbitrage_opportunities')
        .select('*', { count: 'exact', head: true })
        .eq('is_profitable', true);

      if (profitableError) {
        throw new Error(`Failed to get profitable count: ${profitableError.message}`);
      }

      // Get spread statistics and last update
      const { data: spreadData, error: spreadError } = await this.client
        .from('arbitrage_opportunities')
        .select('spread_percentage, timestamp')
        .order('timestamp', { ascending: false })
        .limit(1000); // Last 1000 opportunities for accurate avg

      if (spreadError) {
        throw new Error(`Failed to get spread statistics: ${spreadError.message}`);
      }

      const spreads = spreadData?.map(item => item.spread_percentage) || [];
      const avgSpread = spreads.length > 0 ? spreads.reduce((a, b) => a + b, 0) / spreads.length : 0;
      const maxSpread = spreads.length > 0 ? Math.max(...spreads) : 0;
      const lastUpdate = spreadData?.[0]?.timestamp || null;

      return {
        totalOpportunities: totalCount || 0,
        profitableCount: profitableCount || 0,
        avgSpread,
        maxSpread,
        lastUpdate
      };

    } catch (error) {
      ErrorHandler.handle(error, 'SupabaseService.getArbitrageOpportunityStats');
      return {
        totalOpportunities: 0,
        profitableCount: 0,
        avgSpread: 0,
        maxSpread: 0,
        lastUpdate: null
      };
    }
  }
} 