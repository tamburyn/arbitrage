import type { APIRoute } from 'astro';
import { supabaseClient } from '../../db/supabase.client';
import type { CreateExchangeCommand, ExchangeDTO } from '../../types';
import type { Json } from '../../db/database.types';
import { ExchangeService } from '../../lib/exchange.service';
import { AuditService } from '../../lib/audit.service';
import { 
  validateApiEndpointFormat, 
  validateExchangeName, 
  sanitizeExchangeData, 
  validateExchangeMetadata 
} from '../../lib/validation.service';
import { rateLimiter, RATE_LIMITS, getClientId } from '../../lib/rate-limiter.service';

/**
 * (Admin) POST /exchanges - Tworzenie nowej giełdy
 * 
 * Endpoint dostępny wyłącznie dla administratorów, umożliwiający 
 * dodanie nowego rekordu exchange do systemu.
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    // Krok 1: Walidacja żądania - sprawdzenie Content-Type
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

    // Krok 2: Walidacja danych wejściowych zgodnie z CreateExchangeCommand
    const { name, api_endpoint, integration_status, metadata } = body as CreateExchangeCommand;
    
    // Walidacja wymaganych pól
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'Bad Request', 
          message: 'name is required and must be a non-empty string' 
        }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    if (!api_endpoint || typeof api_endpoint !== 'string' || api_endpoint.trim().length === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'Bad Request', 
          message: 'api_endpoint is required and must be a non-empty string' 
        }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Walidacja api_endpoint jako URL
    try {
      new URL(api_endpoint);
    } catch {
      return new Response(
        JSON.stringify({ 
          error: 'Bad Request', 
          message: 'api_endpoint must be a valid URL' 
        }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Walidacja integration_status
    if (!integration_status || !['active', 'inactive'].includes(integration_status)) {
      return new Response(
        JSON.stringify({ 
          error: 'Bad Request', 
          message: 'integration_status is required and must be either "active" or "inactive"' 
        }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Zaawansowana walidacja nazwy exchange
    const nameValidation = validateExchangeName(name);
    if (!nameValidation.isValid) {
      return new Response(
        JSON.stringify({ 
          error: 'Bad Request', 
          message: nameValidation.error 
        }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Zaawansowana walidacja API endpoint
    const endpointValidation = validateApiEndpointFormat(api_endpoint);
    if (!endpointValidation.isValid) {
      return new Response(
        JSON.stringify({ 
          error: 'Bad Request', 
          message: endpointValidation.error 
        }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Zaawansowana walidacja metadata
    const metadataValidation = validateExchangeMetadata(metadata);
    if (!metadataValidation.isValid) {
      return new Response(
        JSON.stringify({ 
          error: 'Bad Request', 
          message: metadataValidation.error 
        }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Krok 3: Autoryzacja - weryfikacja tokena JWT i uprawnień administratora
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
      // Logowanie nieudanej próby autoryzacji
      await AuditService.logError(
        'exchanges', 
        'AUTH_FAILED', 
        new Error('Invalid or expired token'),
        'unknown'
      );

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

    // Weryfikacja uprawnień administratora - sprawdzenie w user_metadata
    const userRole = user.user_metadata?.role || user.app_metadata?.role;
    
    if (!userRole || userRole !== 'admin') {
      // Logowanie próby dostępu bez uprawnień administratora
      await AuditService.logError(
        'exchanges', 
        'ADMIN_ACCESS_DENIED', 
        new Error(`User ${user.id} attempted to access admin endpoint without admin role`),
        user.id
      );

      return new Response(
        JSON.stringify({ 
          error: 'Unauthorized', 
          message: 'Admin privileges required to access this endpoint' 
        }),
        { 
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Sanityzacja danych przed przetworzeniem
    const sanitizedData = sanitizeExchangeData({
      name,
      api_endpoint,
      integration_status,
      metadata
    });

    // Krok 4: Tworzenie exchange z wykorzystaniem ExchangeService
    let createdExchange: ExchangeDTO;
    try {
      createdExchange = await ExchangeService.createExchange(sanitizedData);
    } catch (serviceError: any) {
      // Logowanie błędu serwisu do audit
      await AuditService.logError(
        'exchanges', 
        'CREATE_SERVICE_ERROR', 
        serviceError, 
        user.id
      );

      // Obsługa błędów walidacji unikalności
      if (serviceError.message.includes('already exists')) {
        return new Response(
          JSON.stringify({ 
            error: 'Bad Request', 
            message: serviceError.message
          }),
          { 
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
      
      // Obsługa błędów bazy danych
      if (serviceError.message.includes('Database error')) {
        return new Response(
          JSON.stringify({ 
            error: 'Internal Server Error', 
            message: 'Database operation failed. Please try again later.'
          }),
          { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
      
      // Inne błędy serwisu - traktujemy jako błędy wewnętrzne
      console.error('Unexpected service error in POST /exchanges:', serviceError);
      return new Response(
        JSON.stringify({ 
          error: 'Internal Server Error', 
          message: 'An unexpected error occurred during exchange creation'
        }),
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Krok 5: Logowanie operacji w audit_logs
    try {
      await AuditService.logExchangeCreated(createdExchange.id, user.id, {
        name: createdExchange.name,
        api_endpoint: createdExchange.api_endpoint,
        integration_status: createdExchange.integration_status,
        metadata: createdExchange.metadata
      });
    } catch (auditError) {
      // Logowanie błędu audit, ale nie przerywamy procesu
      console.error('Failed to log exchange creation to audit:', auditError);
    }

    // Krok 6: Zwrócenie odpowiedzi 201 Created z ExchangeDTO
    return new Response(
      JSON.stringify(createdExchange),
      { 
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    // Obsługa nieoczekiwanych błędów
    console.error('Unexpected error in POST /exchanges:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal Server Error', 
        message: 'An unexpected error occurred while processing the request' 
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};

/**
 * GET /exchanges - Pobieranie listy giełd z paginacją i sortowaniem
 * 
 * Endpoint publiczny umożliwiający pobranie uporządkowanych danych z tabeli exchanges
 * przy wykorzystaniu mechanizmu paginacji oraz opcji sortowania.
 */
export const GET: APIRoute = async ({ request, url }) => {
  const startTime = Date.now();
  let userId: string | null = null;
  
  // Parsowanie parametrów zapytania (dostępne w całej funkcji)
  const searchParams = url.searchParams;
  const page = searchParams.get('page');
  const limit = searchParams.get('limit');
  const sort = searchParams.get('sort');
  
  try {
    // Krok 1: Rate limiting check (dla publicznych endpointów)
    const clientId = getClientId(request);
    const rateLimitResult = rateLimiter.checkLimit(clientId, RATE_LIMITS.PUBLIC);
    
    if (!rateLimitResult.isAllowed) {
      // Logowanie przekroczenia rate limit
      await AuditService.logRateLimitingEvent(
        'exchanges',
        'LIMIT_EXCEEDED',
        clientId,
        {
          current_requests: rateLimitResult.remaining + 1,
          max_requests: RATE_LIMITS.PUBLIC.maxRequests,
          reset_time: new Date(rateLimitResult.resetTime).toISOString(),
          endpoint: '/exchanges'
        }
      );

      return new Response(
        JSON.stringify({ 
          error: 'Too Many Requests',
          message: 'Rate limit exceeded. Please try again later.',
          retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)
        }),
        { 
          status: 429,
          headers: { 
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': RATE_LIMITS.PUBLIC.maxRequests.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString(),
            'Retry-After': Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString()
          }
        }
      );
    }

    // Krok 2: Walidacja parametrów query

    // Krok 3: Walidacja parametrów query
    const validationResult = validateExchangesQueryParameters({
      page,
      limit,
      sort
    });

    if (!validationResult.isValid) {
      // Logowanie błędu walidacji
      await AuditService.logValidationError(
        'exchanges',
        'GET',
        validationResult.error,
        userId,
        { page, limit, sort }
      );

      return new Response(
        JSON.stringify({ 
          error: 'Bad Request', 
          message: validationResult.error 
        }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Krok 4: Parsowanie parametrów paginacji z wartościami domyślnymi
    const pageNum = parseInt(page || '1', 10);
    const limitNum = parseInt(limit || '10', 10);

    // Krok 5: Pobieranie danych z wykorzystaniem ExchangeService
    let exchanges: ExchangeDTO[];
    let total: number;

    try {
      const result = await ExchangeService.getExchangesWithPagination({
        page: pageNum,
        limit: limitNum,
        sort: sort || undefined
      });
      
      exchanges = result.exchanges;
      total = result.total;
    } catch (serviceError) {
      // Logowanie błędu serwisu z kontekstem
      await AuditService.logExchangesRetrievalError(
        serviceError as Error,
        userId,
        { page: pageNum, limit: limitNum, sort: sort || undefined }
      );

      return new Response(
        JSON.stringify({ 
          error: 'Internal Server Error', 
          message: 'Failed to retrieve exchanges' 
        }),
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Krok 6: Przygotowanie odpowiedzi z paginacją
    const response = {
      data: exchanges,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: total,
        total_pages: Math.ceil(total / limitNum)
      }
    };

    // Logowanie pomyślnej operacji z metrykami wydajnościowymi
    const responseTimeMs = Date.now() - startTime;
    
    // Asynchroniczne logowanie (nie blokuje odpowiedzi)
    Promise.all([
      AuditService.logExchangesRetrieved(
        userId,
        { page: pageNum, limit: limitNum, sort: sort || undefined },
        exchanges.length,
        total,
        responseTimeMs
      ),
      AuditService.logPerformanceMetrics(
        'exchanges',
        'GET',
        {
          response_time_ms: responseTimeMs,
          items_processed: exchanges.length,
          memory_usage_mb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024)
        },
        userId
      )
    ]).catch(logError => {
      console.error('Failed to log audit entries:', logError);
    });

    return new Response(
      JSON.stringify(response),
      { 
        status: 200,
        headers: { 
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': RATE_LIMITS.PUBLIC.maxRequests.toString(),
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
          'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString(),
          'X-Response-Time': `${responseTimeMs}ms`
        }
      }
    );

  } catch (error) {
    // Logowanie nieoczekiwanego błędu systemowego z pełnym kontekstem
    const responseTimeMs = Date.now() - startTime;
    await AuditService.logSystemError(
      'exchanges',
      'GET',
      error as Error,
      {
        request_params: { page, limit, sort },
        response_time_ms: responseTimeMs,
        endpoint: '/exchanges',
        method: 'GET'
      },
      userId
    );

    return new Response(
      JSON.stringify({ 
        error: 'Internal Server Error', 
        message: 'An unexpected error occurred' 
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};

/**
 * Walidacja parametrów zapytania dla endpointu GET /exchanges
 */
function validateExchangesQueryParameters(params: {
  page: string | null;
  limit: string | null;
  sort: string | null;
}): { isValid: boolean; error?: string } {
  const { page, limit, sort } = params;

  // Walidacja parametru page
  if (page !== null) {
    const pageNum = parseInt(page, 10);
    if (isNaN(pageNum) || pageNum < 1) {
      return { isValid: false, error: 'page must be a positive integer' };
    }
  }

  // Walidacja parametru limit
  if (limit !== null) {
    const limitNum = parseInt(limit, 10);
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      return { isValid: false, error: 'limit must be a positive integer between 1 and 100' };
    }
  }

  // Walidacja parametru sort
  if (sort !== null) {
    const validSortFields = [
      'name', 'api_endpoint', 'integration_status', 'created_at', 'updated_at',
      '-name', '-api_endpoint', '-integration_status', '-created_at', '-updated_at'
    ];
    if (!validSortFields.includes(sort)) {
      return { 
        isValid: false, 
        error: 'sort must be one of: name, api_endpoint, integration_status, created_at, updated_at (prefix with - for descending)' 
      };
    }
  }

  return { isValid: true };
} 