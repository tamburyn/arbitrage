import { supabaseClient } from '../db/supabase.client';
import type { Json } from '../db/database.types';

/**
 * Serwis obsługujący logowanie operacji do tabeli audit_logs
 */
export class AuditService {
  
  /**
   * Loguje operację do tabeli audit_logs
   */
  static async logOperation(
    entity: string,
    operation: string,
    entityId?: string,
    userId?: string,
    details?: Json
  ): Promise<void> {
    try {
      await supabaseClient
        .from('audit_logs')
        .insert({
          entity,
          operation,
          entity_id: entityId || null,
          user_id: userId || null,
          details: details || null,
          timestamp: new Date().toISOString()
        });
    } catch (error) {
      // Logowanie błędów audytu nie powinno wpływać na główny przepływ
      console.error('Failed to log audit entry:', error);
    }
  }

  /**
   * Loguje błąd operacji
   */
  static async logError(
    entity: string,
    operation: string,
    error: Error,
    userId?: string,
    entityId?: string
  ): Promise<void> {
    const errorDetails: Json = {
      error_message: error.message,
      error_stack: error.stack,
      timestamp: new Date().toISOString()
    };

    await this.logOperation(entity, `${operation}_ERROR`, entityId, userId, errorDetails);
  }

  /**
   * Loguje pomyślną operację tworzenia alertu
   */
  static async logAlertCreated(alertId: string, userId: string, alertData: Json): Promise<void> {
    await this.logOperation('alerts', 'CREATE_SUCCESS', alertId, userId, alertData);
  }

  /**
   * Loguje błąd rate limiting
   */
  static async logRateLimitExceeded(userId: string, assetId: string, exchangeId: string): Promise<void> {
    const details: Json = {
      asset_id: assetId,
      exchange_id: exchangeId,
      reason: 'rate_limit_exceeded'
    };
    
    await this.logOperation('alerts', 'CREATE_RATE_LIMITED', null, userId, details);
  }

  /**
   * Loguje błąd przekroczenia limitu freemium
   */
  static async logFreemiumLimitExceeded(userId: string): Promise<void> {
    const details: Json = {
      reason: 'freemium_limit_exceeded'
    };
    
    await this.logOperation('alerts', 'CREATE_FREEMIUM_LIMITED', null, userId, details);
  }

  /**
   * Loguje pomyślną operację tworzenia exchange
   */
  static async logExchangeCreated(exchangeId: string, userId: string, exchangeData: Json): Promise<void> {
    await this.logOperation('exchanges', 'CREATE_SUCCESS', exchangeId, userId, exchangeData);
  }

  /**
   * Loguje operację aktualizacji exchange
   */
  static async logExchangeUpdated(exchangeId: string, userId: string, updateData: Json): Promise<void> {
    await this.logOperation('exchanges', 'UPDATE_SUCCESS', exchangeId, userId, updateData);
  }

  /**
   * Loguje operację usunięcia exchange
   */
  static async logExchangeDeleted(exchangeId: string, userId: string, exchangeData?: Json): Promise<void> {
    await this.logOperation('exchanges', 'DELETE_SUCCESS', exchangeId, userId, exchangeData);
  }

  /**
   * Loguje pomyślne pobranie listy exchanges (GET /exchanges)
   */
  static async logExchangesRetrieved(
    userId: string | null, 
    requestParams: { page: number; limit: number; sort?: string },
    resultCount: number,
    totalCount: number,
    responseTimeMs: number
  ): Promise<void> {
    const details: Json = {
      request_params: requestParams,
      result_count: resultCount,
      total_count: totalCount,
      response_time_ms: responseTimeMs,
      client_type: userId ? 'authenticated' : 'anonymous'
    };
    
    await this.logOperation('exchanges', 'GET_SUCCESS', null, userId, details);
  }

  /**
   * Loguje błąd związany z pobieraniem listy exchanges
   */
  static async logExchangesRetrievalError(
    error: Error,
    userId: string | null,
    requestParams: { page: number; limit: number; sort?: string }
  ): Promise<void> {
    const errorDetails: Json = {
      error_message: error.message,
      error_stack: error.stack,
      request_params: requestParams,
      client_type: userId ? 'authenticated' : 'anonymous',
      timestamp: new Date().toISOString()
    };

    await this.logOperation('exchanges', 'GET_ERROR', null, userId, errorDetails);
  }

  /**
   * Loguje operację walidacji parametrów query
   */
  static async logValidationError(
    entity: string,
    operation: string,
    validationError: string,
    userId?: string,
    requestData?: Json
  ): Promise<void> {
    const details: Json = {
      validation_error: validationError,
      request_data: requestData || null,
      timestamp: new Date().toISOString()
    };

    await this.logOperation(entity, `${operation}_VALIDATION_ERROR`, null, userId, details);
  }

  /**
   * Loguje metryki wydajnościowe dla endpointów
   */
  static async logPerformanceMetrics(
    entity: string,
    operation: string,
    metrics: {
      response_time_ms: number;
      memory_usage_mb?: number;
      database_query_time_ms?: number;
      items_processed?: number;
    },
    userId?: string
  ): Promise<void> {
    const details: Json = {
      ...metrics,
      timestamp: new Date().toISOString()
    };

    await this.logOperation(entity, `${operation}_PERFORMANCE`, null, userId, details);
  }

  /**
   * Loguje operacje związane z rate limiting
   */
  static async logRateLimitingEvent(
    entity: string,
    event: 'LIMIT_EXCEEDED' | 'LIMIT_WARNING' | 'LIMIT_RESET',
    clientId: string,
    limitDetails: {
      current_requests: number;
      max_requests: number;
      reset_time?: string;
      endpoint?: string;
    }
  ): Promise<void> {
    const details: Json = {
      client_id: clientId,
      event_type: event,
      ...limitDetails,
      timestamp: new Date().toISOString()
    };

    await this.logOperation(entity, `RATE_LIMIT_${event}`, null, 'system', details);
  }

  /**
   * Loguje nieoczekiwane błędy systemowe
   */
  static async logSystemError(
    entity: string,
    operation: string,
    error: Error,
    context?: Json,
    userId?: string
  ): Promise<void> {
    const errorDetails: Json = {
      error_message: error.message,
      error_stack: error.stack,
      error_name: error.name,
      context: context || null,
      timestamp: new Date().toISOString(),
      node_version: process.version,
      memory_usage: {
        rss: process.memoryUsage().rss,
        heapTotal: process.memoryUsage().heapTotal,
        heapUsed: process.memoryUsage().heapUsed,
        external: process.memoryUsage().external
      }
    };

    await this.logOperation(entity, `SYSTEM_${operation}_ERROR`, null, userId, errorDetails);
  }
} 