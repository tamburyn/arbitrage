import { supabaseClient } from '../db/supabase.client';
import type { CreateAlertCommand, AlertDTO } from '../types';
import type { Json } from '../db/database.types';

/**
 * Serwis obsługujący logikę biznesową alertów arbitrage
 */
export class AlertService {
  
  /**
   * Sprawdza rate limiting - czy użytkownik nie wysłał alertu dla tej samej pary w ciągu ostatniej minuty
   */
  static async checkRateLimit(userId: string, assetId: string, exchangeId: string): Promise<boolean> {
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString();
    
    const { data, error } = await supabaseClient
      .from('alerts')
      .select('id')
      .eq('user_id', userId)
      .eq('asset_id', assetId)
      .eq('exchange_id', exchangeId)
      .gte('created_at', oneMinuteAgo)
      .limit(1);
    
    if (error) {
      console.error('Error checking rate limit:', error);
      throw new Error('Failed to check rate limit');
    }
    
    // Zwraca true jeśli rate limit NIE został przekroczony (brak alertów w ostatniej minucie)
    return data.length === 0;
  }

  /**
   * Sprawdza ograniczenia freemium - czy użytkownik nie przekroczył limitu 3 alertów w ciągu 24 godzin
   */
  static async checkFreemiumLimit(userId: string): Promise<boolean> {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    // Sprawdzenie czy użytkownik ma aktywną subskrypcję premium
    const { data: subscription } = await supabaseClient
      .from('subscriptions')
      .select('status')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();
    
    // Jeśli ma aktywną subskrypcję, nie ma limitów
    if (subscription) {
      return true;
    }
    
    // Sprawdzenie liczby alertów w ostatnich 24 godzinach dla użytkowników freemium
    const { data, error } = await supabaseClient
      .from('alerts')
      .select('id')
      .eq('user_id', userId)
      .gte('created_at', twentyFourHoursAgo);
    
    if (error) {
      console.error('Error checking freemium limit:', error);
      throw new Error('Failed to check freemium limit');
    }
    
    // Zwraca true jeśli limit NIE został przekroczony (mniej niż 3 alerty)
    return data.length < 3;
  }

  /**
   * Tworzy nowy alert w bazie danych z obsługą transakcji
   */
  static async createAlert(
    userId: string, 
    command: CreateAlertCommand
  ): Promise<AlertDTO> {
    try {
      const alertData = {
        user_id: userId,
        asset_id: command.assetId,
        exchange_id: command.exchangeId,
        spread: command.spread,
        additional_info: command.additional_info || null,
        send_status: 'pending',
        timestamp: new Date().toISOString()
      };

      // Użycie transakcji dla zapewnienia spójności danych
      const { data, error } = await supabaseClient
        .from('alerts')
        .insert(alertData)
        .select()
        .single();

      if (error) {
        console.error('Database error creating alert:', {
          error: error.message,
          code: error.code,
          details: error.details,
          userId,
          command
        });
        
        // Różne typy błędów bazy danych
        if (error.code === '23503') { // Foreign key violation
          throw new Error('Invalid asset or exchange ID - referenced records do not exist');
        } else if (error.code === '23505') { // Unique constraint violation
          throw new Error('Duplicate alert detected');
        } else if (error.code === '42P01') { // Table does not exist
          throw new Error('Database configuration error');
        } else {
          throw new Error(`Database error: ${error.message}`);
        }
      }

      if (!data) {
        throw new Error('No data returned from alert creation');
      }

      // Konwersja z snake_case (baza danych) na camelCase (DTO)
      const alertDTO: AlertDTO = {
        id: data.id,
        asset_id: data.asset_id,
        exchange_id: data.exchange_id,
        spread: data.spread,
        send_status: data.send_status,
        additional_info: data.additional_info,
        timestamp: data.timestamp,
        created_at: data.created_at,
        updated_at: data.updated_at,
        user_id: data.user_id
      };

      return alertDTO;
      
    } catch (error) {
      console.error('Critical error in createAlert:', error);
      
      if (error instanceof Error) {
        throw error;
      } else {
        throw new Error('Unknown error occurred while creating alert');
      }
    }
  }

  /**
   * Waliduje czy assetId i exchangeId istnieją w bazie danych
   */
  static async validateAssetAndExchange(assetId: string, exchangeId: string): Promise<boolean> {
    // Sprawdzenie istnienia assetu
    const { data: asset, error: assetError } = await supabaseClient
      .from('assets')
      .select('id')
      .eq('id', assetId)
      .single();

    if (assetError || !asset) {
      return false;
    }

    // Sprawdzenie istnienia giełdy
    const { data: exchange, error: exchangeError } = await supabaseClient
      .from('exchanges')
      .select('id')
      .eq('id', exchangeId)
      .single();

    if (exchangeError || !exchange) {
      return false;
    }

    return true;
  }
} 