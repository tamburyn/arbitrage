import { supabaseClient } from '../db/supabase.client';
import type { OrderbookDTO } from '../types';
import type { Json } from '../db/database.types';
import { cacheService } from './cache.service';
import { AuditService } from './audit.service';

/**
 * Serwis odpowiedzialny za operacje na orderbookach
 * Implementuje logikę biznesową zgodną z planem API endpoint /orderbooks
 */
export class OrderbookService {
  
  /**
   * Pobiera orderbooki z bazy danych z opcjonalnymi filtrami, paginacją i sortowaniem
   */
  static async getOrderbooks(filters: {
    exchangeId?: string;
    assetId?: string;
    exchangeNames?: string[]; // New: filter by exchange names
    assetSymbols?: string[];  // New: filter by asset symbols
    startDate?: string;
    endDate?: string;
    page: number;
    limit: number;
    sort?: string;
  }): Promise<{ orderbooks: OrderbookDTO[]; total: number }> {
    const { exchangeId, assetId, exchangeNames, assetSymbols, startDate, endDate, page, limit, sort } = filters;
    const offset = (page - 1) * limit;

    // Zapytanie z joinami do exchanges i assets
    let query = supabaseClient
      .from('orderbooks')
      .select(`
        id,
        asset_id,
        exchange_id,
        snapshot,
        spread,
        timestamp,
        volume,
        created_at,
        exchanges!inner(name),
        assets!inner(symbol)
      `, { count: 'exact' });

    // Filtrowanie
    if (exchangeId) {
      query = query.eq('exchange_id', exchangeId);
    }

    if (assetId) {
      query = query.eq('asset_id', assetId);
    }

    // New: Filter by exchange names
    if (exchangeNames && exchangeNames.length > 0) {
      query = query.in('exchanges.name', exchangeNames);
    }

    // New: Filter by asset symbols  
    if (assetSymbols && assetSymbols.length > 0) {
      query = query.in('assets.symbol', assetSymbols);
    }

    if (startDate) {
      query = query.gte('timestamp', startDate);
    }

    if (endDate) {
      query = query.lte('timestamp', endDate);
    }

    // Sortowanie
    if (sort) {
      const isDescending = sort.startsWith('-');
      const sortField = isDescending ? sort.substring(1) : sort;
      query = query.order(sortField, { ascending: !isDescending });
    } else {
      // Domyślne sortowanie po timestamp malejąco
      query = query.order('timestamp', { ascending: false });
    }

    // Paginacja
    query = query.range(offset, offset + limit - 1);

    const { data, count, error } = await query;

    if (error) {
      throw new Error(`Database query failed: ${error.message}`);
    }

    // Mapowanie wyników na OrderbookDTO z dodatkowymi danymi
    const orderbooks: OrderbookDTO[] = data?.map(item => ({
      id: item.id,
      asset_id: item.asset_id,
      exchange_id: item.exchange_id,
      snapshot: item.snapshot,
      spread: item.spread,
      timestamp: item.timestamp,
      volume: item.volume,
      created_at: item.created_at,
      // Dodaj nazwy exchange i asset dla ułatwienia
      exchange_name: (item.exchanges as any)?.name || 'Unknown',
      asset_symbol: (item.assets as any)?.symbol || 'Unknown'
    })) || [];

    return {
      orderbooks,
      total: count || 0
    };
  }

  /**
   * Waliduje czy exchange istnieje w bazie danych (z cache'owaniem)
   */
  static async validateExchange(exchangeId: string): Promise<boolean> {
    const cacheKey = `exchange_exists_${exchangeId}`;
    
    // Sprawdź cache
    const cached = cacheService.get(cacheKey);
    if (cached !== null) {
      return cached;
    }

    try {
      const { data, error } = await supabaseClient
        .from('exchanges')
        .select('id')
        .eq('id', exchangeId)
        .single();

      const exists = !error && !!data;
      
      // Cache wynik na 5 minut
      cacheService.set(cacheKey, exists, 5 * 60 * 1000);
      
      return exists;
    } catch (err) {
      // Log błędu walidacji
      await AuditService.logError(
        'exchanges',
        'VALIDATION_ERROR',
        err as Error,
        'system'
      );
      return false;
    }
  }

  /**
   * Waliduje czy asset istnieje w bazie danych (z cache'owaniem)
   */
  static async validateAsset(assetId: string): Promise<boolean> {
    const cacheKey = `asset_exists_${assetId}`;
    
    // Sprawdź cache
    const cached = cacheService.get(cacheKey);
    if (cached !== null) {
      return cached;
    }

    try {
      const { data, error } = await supabaseClient
        .from('assets')
        .select('id')
        .eq('id', assetId)
        .single();

      const exists = !error && !!data;
      
      // Cache wynik na 5 minut
      cacheService.set(cacheKey, exists, 5 * 60 * 1000);
      
      return exists;
    } catch (err) {
      // Log błędu walidacji
      await AuditService.logError(
        'assets',
        'VALIDATION_ERROR',
        err as Error,
        'system'
      );
      return false;
    }
  }

  /**
   * Waliduje czy para asset-exchange istnieje (czy są orderbooki dla tej pary)
   */
  static async validateAssetExchangePair(assetId: string, exchangeId: string): Promise<boolean> {
    try {
      const { data, error } = await supabaseClient
        .from('orderbooks')
        .select('id')
        .eq('asset_id', assetId)
        .eq('exchange_id', exchangeId)
        .limit(1);

      if (error) {
        return false;
      }

      return (data && data.length > 0);
    } catch {
      return false;
    }
  }

  /**
   * Pobiera statystyki orderbooków dla metryki wydajności
   */
  static async getOrderbookStats(): Promise<{
    totalCount: number;
    lastUpdate: string | null;
    uniqueAssets: number;
    uniqueExchanges: number;
  }> {
    try {
      // Pobranie całkowitej liczby orderbooków
      const { count: totalCount } = await supabaseClient
        .from('orderbooks')
        .select('*', { count: 'exact', head: true });

      // Pobranie ostatniej aktualizacji
      const { data: lastOrderbook } = await supabaseClient
        .from('orderbooks')
        .select('timestamp')
        .order('timestamp', { ascending: false })
        .limit(1)
        .single();

      // Pobranie unikalnych assetów (używając agregacji)
      const { count: uniqueAssets } = await supabaseClient
        .from('orderbooks')
        .select('asset_id', { count: 'exact', head: true })
        .not('asset_id', 'is', null);

      // Pobranie unikalnych giełd (używając agregacji)
      const { count: uniqueExchanges } = await supabaseClient
        .from('orderbooks')
        .select('exchange_id', { count: 'exact', head: true })
        .not('exchange_id', 'is', null);

      return {
        totalCount: totalCount || 0,
        lastUpdate: lastOrderbook?.timestamp || null,
        uniqueAssets: uniqueAssets || 0,
        uniqueExchanges: uniqueExchanges || 0
      };
    } catch {
      return {
        totalCount: 0,
        lastUpdate: null,
        uniqueAssets: 0,
        uniqueExchanges: 0
      };
    }
  }
} 