import type { APIRoute } from 'astro';
import { supabaseClient } from '../../db/supabase.client';
import type { CreateAlertCommand, AlertDTO } from '../../types';
import type { Json } from '../../db/database.types';
import { AlertService } from '../../lib/alert.service';
import { AuditService } from '../../lib/audit.service';
import { NotificationService } from '../../lib/notification.service';

// Krok 1: Definicja ścieżki i routing
// Endpoint POST /alerts - tworzenie nowych alertów arbitrage
export const POST: APIRoute = async ({ request }) => {
  try {
    // Krok 2: Walidacja żądania - sprawdzenie Content-Type
    const contentType = request.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return new Response(
        JSON.stringify({ 
          error: 'Bad Request', 
          message: 'Content-Type must be application/json' 
        }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Parsowanie body żądania
    let body: any;
    try {
      body = await request.json();
    } catch (error) {
      return new Response(
        JSON.stringify({ 
          error: 'Bad Request', 
          message: 'Invalid JSON format' 
        }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Walidacja wymaganych pól zgodnie z CreateAlertCommand
    const { assetId, exchangeId, spread, additional_info } = body as CreateAlertCommand;
    
    // Sprawdzenie obecności wymaganych pól
    if (!assetId || typeof assetId !== 'string') {
      return new Response(
        JSON.stringify({ 
          error: 'Bad Request', 
          message: 'assetId is required and must be a string' 
        }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    if (!exchangeId || typeof exchangeId !== 'string') {
      return new Response(
        JSON.stringify({ 
          error: 'Bad Request', 
          message: 'exchangeId is required and must be a string' 
        }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    if (typeof spread !== 'number' || spread <= 0) {
      return new Response(
        JSON.stringify({ 
          error: 'Bad Request', 
          message: 'spread is required and must be a number greater than 0' 
        }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Krok 3: Autoryzacja - weryfikacja tokena JWT
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ 
          error: 'Unauthorized', 
          message: 'Authorization header with Bearer token is required' 
        }),
        { 
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Weryfikacja tokena JWT przez Supabase Auth
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ 
          error: 'Unauthorized', 
          message: 'Invalid or expired token' 
        }),
        { 
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Krok 4: Logika biznesowa - walidacja assetów i rate limiting
    
    // Walidacja czy asset i exchange istnieją w bazie danych
    const isValidAssetAndExchange = await AlertService.validateAssetAndExchange(assetId, exchangeId);
    if (!isValidAssetAndExchange) {
      await AuditService.logError(
        'alerts', 
        'CREATE_VALIDATION', 
        new Error('Invalid assetId or exchangeId'), 
        user.id
      );
      
      return new Response(
        JSON.stringify({ 
          error: 'Bad Request', 
          message: 'Invalid assetId or exchangeId - asset or exchange does not exist' 
        }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Sprawdzenie rate limiting (1 alert na minutę dla tej samej pary)
    const rateLimitOk = await AlertService.checkRateLimit(user.id, assetId, exchangeId);
    if (!rateLimitOk) {
      await AuditService.logRateLimitExceeded(user.id, assetId, exchangeId);
      
      return new Response(
        JSON.stringify({ 
          error: 'Too Many Requests', 
          message: 'Rate limit exceeded - only 1 alert per minute allowed for the same asset-exchange pair' 
        }),
        { 
          status: 429,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Sprawdzenie ograniczeń freemium (3 alerty w ciągu 24 godzin)
    const freemiumLimitOk = await AlertService.checkFreemiumLimit(user.id);
    if (!freemiumLimitOk) {
      await AuditService.logFreemiumLimitExceeded(user.id);
      
      return new Response(
        JSON.stringify({ 
          error: 'Forbidden', 
          message: 'Freemium limit exceeded - maximum 3 alerts per 24 hours. Upgrade to premium for unlimited alerts.' 
        }),
        { 
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Tworzenie alertu w bazie danych
    const createdAlert = await AlertService.createAlert(user.id, { assetId, exchangeId, spread, additional_info });
    
    // Logowanie pomyślnej operacji
    await AuditService.logAlertCreated(createdAlert.id, user.id, {
      asset_id: assetId,
      exchange_id: exchangeId,
      spread: spread,
      additional_info: additional_info
    });

    // Krok 5: Uruchomienie asynchronicznych powiadomień w tle
    NotificationService.scheduleNotification(createdAlert);

    // Zwrócenie utworzonego alertu (status 201 Created)
    return new Response(
      JSON.stringify(createdAlert),
      { 
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    // Krok 6: Kompleksowa obsługa błędów z logowaniem
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    console.error('Critical error in POST /alerts:', {
      error: errorMessage,
      stack: errorStack,
      timestamp: new Date().toISOString()
    });

    // Logowanie błędu do systemu audytu
    try {
      // Pobranie userId z request context jeśli dostępne
      const authHeader = request.headers.get('authorization');
      let userId: string | undefined;
      
      if (authHeader?.startsWith('Bearer ')) {
        try {
          const token = authHeader.replace('Bearer ', '');
          const { data: { user } } = await supabaseClient.auth.getUser(token);
          userId = user?.id;
        } catch (authError) {
          // Ignoruj błędy autoryzacji przy logowaniu błędów
        }
      }

      await AuditService.logError(
        'alerts',
        'CREATE_SYSTEM_ERROR',
        error instanceof Error ? error : new Error(String(error)),
        userId
      );
    } catch (auditError) {
      console.error('Failed to log error to audit system:', auditError);
    }

    // Zwrócenie odpowiedzi błędu
    return new Response(
      JSON.stringify({ 
        error: 'Internal Server Error', 
        message: 'An unexpected error occurred while creating the alert. Please try again later.',
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}; 