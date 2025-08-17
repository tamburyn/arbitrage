import { supabaseClient } from '../db/supabase.client';
import type { AssetDTO } from '../types';
import { cacheService } from './cache.service';

/**
 * AssetService
 * 
 * Serwis odpowiedzialny za operacje na aktywach (assets).
 * Zapewnia warstwę abstrakcji między endpointami API a bazą danych.
 */
export class AssetService {
  /**
   * Pobiera listę aktywów z możliwością filtrowania, sortowania i paginacji
   * Implementuje cache'owanie dla często używanych zapytań
   */
  static async getAssets(params: {
    filter?: string;
    sort?: string;
    page: number;
    limit: number;
  }): Promise<{ assets: AssetDTO[]; total: number }> {
    const { filter, sort, page, limit } = params;
    
    // Generowanie klucza cache na podstawie parametrów
    const cacheKey = `assets:${JSON.stringify({ filter, sort, page, limit })}`;
    
    // Sprawdzenie cache
    const cachedResult = cacheService.get(cacheKey);
    if (cachedResult) {
      return cachedResult;
    }

    const offset = (page - 1) * limit;

    // Budowanie zapytania bazowego
    let query = supabaseClient
      .from('assets')
      .select('*', { count: 'exact' });

    // Zastosowanie filtra jeśli został podany
    if (filter) {
      query = query.or(`symbol.ilike.%${filter}%,full_name.ilike.%${filter}%`);
    }

    // Zastosowanie sortowania
    if (sort) {
      const isDescending = sort.startsWith('-');
      const sortField = isDescending ? sort.substring(1) : sort;
      query = query.order(sortField, { ascending: !isDescending });
    } else {
      // Domyślne sortowanie po symbol
      query = query.order('symbol', { ascending: true });
    }

    // Zastosowanie paginacji
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Database query failed: ${error.message}`);
    }

    // Mapowanie danych z bazy na AssetDTO
    const assets: AssetDTO[] = (data || []).map(row => ({
      id: row.id,
      symbol: row.symbol,
      full_name: row.full_name,
      description: row.description,
      created_at: row.created_at,
      updated_at: row.updated_at
    }));

    const result = {
      assets,
      total: count || 0
    };

    // Zapisanie wyniku w cache (3 minuty TTL dla list z filtrami, 10 minut dla prostych list)
    const ttl = filter ? 3 * 60 * 1000 : 10 * 60 * 1000;
    cacheService.set(cacheKey, result, ttl);

    return result;
  }

  /**
   * Pobiera pojedynczy aktyw po ID
   * Implementuje cache'owanie dla pojedynczych aktywów
   */
  static async getAssetById(id: string): Promise<AssetDTO | null> {
    const cacheKey = `asset:${id}`;
    
    // Sprawdzenie cache
    const cachedResult = cacheService.get(cacheKey);
    if (cachedResult !== null) {
      return cachedResult;
    }

    const { data, error } = await supabaseClient
      .from('assets')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Nie znaleziono rekordu - cache'ujemy null aby uniknąć ponownych zapytań
        cacheService.set(cacheKey, null, 2 * 60 * 1000); // 2 minuty dla null
        return null;
      }
      throw new Error(`Database query failed: ${error.message}`);
    }

    const asset: AssetDTO = {
      id: data.id,
      symbol: data.symbol,
      full_name: data.full_name,
      description: data.description,
      created_at: data.created_at,
      updated_at: data.updated_at
    };

    // Cache'owanie wyniku na 15 minut (dłużej niż listy, bo pojedyncze aktywy zmieniają się rzadziej)
    cacheService.set(cacheKey, asset, 15 * 60 * 1000);

    return asset;
  }

  /**
   * Sprawdza czy aktyw o podanym ID istnieje
   * Używa cache'owania dla optymalizacji walidacji
   */
  static async validateAsset(assetId: string): Promise<boolean> {
    const cacheKey = `asset:validate:${assetId}`;
    
    // Sprawdzenie cache
    const cachedResult = cacheService.get(cacheKey);
    if (cachedResult !== null) {
      return cachedResult;
    }

    try {
      const { data, error } = await supabaseClient
        .from('assets')
        .select('id')
        .eq('id', assetId)
        .single();

      const exists = !error && !!data;
      
      // Cache'owanie wyniku walidacji na 30 minut (długo, bo aktywy rzadko są usuwane)
      cacheService.set(cacheKey, exists, 30 * 60 * 1000);
      
      return exists;
    } catch {
      // Cache'owanie negatywnego wyniku na 5 minut
      cacheService.set(cacheKey, false, 5 * 60 * 1000);
      return false;
    }
  }

  /**
   * Wyszukuje aktywy według symbolu
   */
  static async searchAssetsBySymbol(symbol: string): Promise<AssetDTO[]> {
    const { data, error } = await supabaseClient
      .from('assets')
      .select('*')
      .ilike('symbol', `%${symbol}%`)
      .order('symbol', { ascending: true })
      .limit(10);

    if (error) {
      throw new Error(`Database query failed: ${error.message}`);
    }

    return (data || []).map(row => ({
      id: row.id,
      symbol: row.symbol,
      full_name: row.full_name,
      description: row.description,
      created_at: row.created_at,
      updated_at: row.updated_at
    }));
  }

  /**
   * Zwraca statystyki aktywów
   * Używa cache'owania dla statystyk (odświeżane rzadziej)
   */
  static async getAssetsStats(): Promise<{
    total: number;
    active: number;
    recent: number;
  }> {
    const cacheKey = 'assets:stats';
    
    // Sprawdzenie cache
    const cachedResult = cacheService.get(cacheKey);
    if (cachedResult) {
      return cachedResult;
    }

    // Całkowita liczba aktywów
    const { count: total, error: totalError } = await supabaseClient
      .from('assets')
      .select('*', { count: 'exact', head: true });

    if (totalError) {
      throw new Error(`Failed to get total assets count: ${totalError.message}`);
    }

    // Aktywy utworzone w ostatnim tygodniu
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const { count: recent, error: recentError } = await supabaseClient
      .from('assets')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', weekAgo.toISOString());

    if (recentError) {
      throw new Error(`Failed to get recent assets count: ${recentError.message}`);
    }

    const stats = {
      total: total || 0,
      active: total || 0, // W tym kontekście zakładamy, że wszystkie aktywy są aktywne
      recent: recent || 0
    };

    // Cache'owanie statystyk na 60 minut (statystyki zmieniają się najwolniej)
    cacheService.set(cacheKey, stats, 60 * 60 * 1000);

    return stats;
  }

  /**
   * Czyści cache związany z aktywami
   * Powinno być wywoływane po operacjach modyfikujących dane (CREATE, UPDATE, DELETE)
   */
  static clearCache(assetId?: string): void {
    if (assetId) {
      // Czyszczenie cache dla konkretnego aktywa
      cacheService.delete(`asset:${assetId}`);
      cacheService.delete(`asset:validate:${assetId}`);
    }
    
    // Czyszczenie cache statystyk (zawsze, bo mogą się zmienić)
    cacheService.delete('assets:stats');
    
    // Czyszczenie cache list aktywów (używamy wzorca)
    const stats = cacheService.getStats();
    stats.keys
      .filter(key => key.startsWith('assets:'))
      .forEach(key => cacheService.delete(key));
  }
} 