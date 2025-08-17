import { supabaseClient } from '../db/supabase.client';
import type { CreateExchangeCommand, ExchangeDTO } from '../types';
import type { Json } from '../db/database.types';

/**
 * Exchange Service - obsługa operacji związanych z zarządzaniem giełdami
 */
export class ExchangeService {
  
  /**
   * Sprawdza czy exchange o podanej nazwie już istnieje w systemie
   * @param name - nazwa giełdy do sprawdzenia
   * @returns true jeśli nazwa jest unikalna, false jeśli już istnieje
   */
  static async isExchangeNameUnique(name: string): Promise<boolean> {
    try {
      const { data, error } = await supabaseClient
        .from('exchanges')
        .select('id')
        .eq('name', name.trim())
        .limit(1);

      if (error) {
        console.error('Error checking exchange name uniqueness:', error);
        throw new Error('Database error while checking exchange name uniqueness');
      }

      // Jeśli nie ma wyników, nazwa jest unikalna
      return data.length === 0;
    } catch (error) {
      console.error('Error in isExchangeNameUnique:', error);
      throw error;
    }
  }

  /**
   * Sprawdza czy API endpoint o podanym URL już istnieje w systemie
   * @param apiEndpoint - URL endpointu API do sprawdzenia
   * @returns true jeśli endpoint jest unikalny, false jeśli już istnieje
   */
  static async isApiEndpointUnique(apiEndpoint: string): Promise<boolean> {
    try {
      const { data, error } = await supabaseClient
        .from('exchanges')
        .select('id')
        .eq('api_endpoint', apiEndpoint.trim())
        .limit(1);

      if (error) {
        console.error('Error checking API endpoint uniqueness:', error);
        throw new Error('Database error while checking API endpoint uniqueness');
      }

      // Jeśli nie ma wyników, endpoint jest unikalny
      return data.length === 0;
    } catch (error) {
      console.error('Error in isApiEndpointUnique:', error);
      throw error;
    }
  }

  /**
   * Tworzy nową giełdę w systemie
   * @param exchangeData - dane giełdy zgodne z CreateExchangeCommand
   * @returns utworzona giełda jako ExchangeDTO
   */
  static async createExchange(exchangeData: CreateExchangeCommand): Promise<ExchangeDTO> {
    try {
      // Sprawdzenie unikalności nazwy
      const isNameUnique = await this.isExchangeNameUnique(exchangeData.name);
      if (!isNameUnique) {
        throw new Error('Exchange with this name already exists');
      }

      // Sprawdzenie unikalności API endpoint
      const isEndpointUnique = await this.isApiEndpointUnique(exchangeData.api_endpoint);
      if (!isEndpointUnique) {
        throw new Error('Exchange with this API endpoint already exists');
      }

      // Przygotowanie danych do wstawienia
      const exchangeToInsert = {
        name: exchangeData.name.trim(),
        api_endpoint: exchangeData.api_endpoint.trim(),
        integration_status: exchangeData.integration_status,
        metadata: exchangeData.metadata || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Wstawienie nowego rekordu do bazy danych
      const { data, error } = await supabaseClient
        .from('exchanges')
        .insert(exchangeToInsert)
        .select()
        .single();

      if (error) {
        console.error('Error creating exchange:', error);
        throw new Error('Database error while creating exchange');
      }

      if (!data) {
        throw new Error('No data returned after exchange creation');
      }

      // Mapowanie wyniku na ExchangeDTO
      const exchangeDTO: ExchangeDTO = {
        id: data.id,
        name: data.name,
        api_endpoint: data.api_endpoint,
        integration_status: data.integration_status as 'active' | 'inactive',
        metadata: data.metadata as Json | null,
        created_at: data.created_at,
        updated_at: data.updated_at
      };

      return exchangeDTO;

    } catch (error) {
      console.error('Error in createExchange:', error);
      throw error;
    }
  }

  /**
   * Pobiera exchange po ID
   * @param id - identyfikator giełdy
   * @returns exchange jako ExchangeDTO lub null jeśli nie znaleziono
   */
  static async getExchangeById(id: string): Promise<ExchangeDTO | null> {
    try {
      const { data, error } = await supabaseClient
        .from('exchanges')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') { // No rows returned
          return null;
        }
        console.error('Error getting exchange by ID:', error);
        throw new Error('Database error while fetching exchange');
      }

      if (!data) {
        return null;
      }

      // Mapowanie wyniku na ExchangeDTO
      const exchangeDTO: ExchangeDTO = {
        id: data.id,
        name: data.name,
        api_endpoint: data.api_endpoint,
        integration_status: data.integration_status as 'active' | 'inactive',
        metadata: data.metadata as Json | null,
        created_at: data.created_at,
        updated_at: data.updated_at
      };

      return exchangeDTO;

    } catch (error) {
      console.error('Error in getExchangeById:', error);
      throw error;
    }
  }

  /**
   * Pobiera listę wszystkich exchanges (dla celów administracyjnych)
   * @returns lista wszystkich exchanges jako ExchangeDTO[]
   */
  static async getAllExchanges(): Promise<ExchangeDTO[]> {
    try {
      const { data, error } = await supabaseClient
        .from('exchanges')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error getting all exchanges:', error);
        throw new Error('Database error while fetching exchanges');
      }

      if (!data || data.length === 0) {
        return [];
      }

      // Mapowanie wyników na ExchangeDTO[]
      const exchanges: ExchangeDTO[] = data.map(item => ({
        id: item.id,
        name: item.name,
        api_endpoint: item.api_endpoint,
        integration_status: item.integration_status as 'active' | 'inactive',
        metadata: item.metadata as Json | null,
        created_at: item.created_at,
        updated_at: item.updated_at
      }));

      return exchanges;

    } catch (error) {
      console.error('Error in getAllExchanges:', error);
      throw error;
    }
  }

  /**
   * Pobiera exchanges z paginacją i sortowaniem
   * @param params - parametry zapytania (page, limit, sort)
   * @returns obiekt z listą exchanges i całkowitą liczbą rekordów
   */
  static async getExchangesWithPagination(params: {
    page: number;
    limit: number;
    sort?: string;
  }): Promise<{ exchanges: ExchangeDTO[]; total: number }> {
    try {
      const { page, limit, sort } = params;
      
      // Obliczenie offsetu dla paginacji
      const offset = (page - 1) * limit;

      // Budowanie zapytania z sortowaniem
      let query = supabaseClient
        .from('exchanges')
        .select('*', { count: 'exact' });

      // Dodanie sortowania jeśli zostało podane
      if (sort) {
        const isDescending = sort.startsWith('-');
        const sortField = isDescending ? sort.substring(1) : sort;
        
        // Walidacja pola sortowania
        const validSortFields = ['name', 'api_endpoint', 'integration_status', 'created_at', 'updated_at'];
        if (!validSortFields.includes(sortField)) {
          throw new Error(`Invalid sort field: ${sortField}`);
        }

        query = query.order(sortField, { ascending: !isDescending });
      } else {
        // Domyślne sortowanie po dacie utworzenia (najnowsze pierwsze)
        query = query.order('created_at', { ascending: false });
      }

      // Dodanie paginacji
      query = query.range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) {
        console.error('Error getting exchanges with pagination:', error);
        throw new Error('Database error while fetching exchanges');
      }

      if (!data) {
        return { exchanges: [], total: 0 };
      }

      // Mapowanie wyników na ExchangeDTO[]
      const exchanges: ExchangeDTO[] = data.map(item => ({
        id: item.id,
        name: item.name,
        api_endpoint: item.api_endpoint,
        integration_status: item.integration_status as 'active' | 'inactive',
        metadata: item.metadata as Json | null,
        created_at: item.created_at,
        updated_at: item.updated_at
      }));

      return {
        exchanges,
        total: count || 0
      };

    } catch (error) {
      console.error('Error in getExchangesWithPagination:', error);
      throw error;
    }
  }
} 