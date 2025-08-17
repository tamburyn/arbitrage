import type { APIRoute } from 'astro';
import { supabaseClient } from '../../db/supabase.client';
import type { OrderbookDTO } from '../../types';
import { AuditService } from '../../lib/audit.service';
import { OrderbookService } from '../../lib/orderbook.service';
import { rateLimiter, RATE_LIMITS, getClientId } from '../../lib/rate-limiter.service';

/**
 * GET /orderbooks - Pobieranie migawek orderbooków
 * 
 * Endpoint umożliwiający pobranie orderbooków z możliwością filtrowania
 * według exchangeId, assetId, zakresu dat oraz z obsługą paginacji i sortowania.
 */
export const GET: APIRoute = async ({ request, url }) => {
  console.log('🌐 API /orderbooks called with URL:', url.href);
  try {
    // Krok 1: Rate limiting check (temporarily disabled for development)
    // TODO: Re-enable rate limiting for production
    /*
    const clientId = getClientId(request);
    const rateLimitResult = rateLimiter.checkLimit(clientId, RATE_LIMITS.PUBLIC);
    
    if (!rateLimitResult.isAllowed) {
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
    */

    // Krok 2: Parsowanie parametrów zapytania
    const searchParams = url.searchParams;
    
    const exchangeId = searchParams.get('exchangeId');
    const assetId = searchParams.get('assetId');
    const exchanges = searchParams.get('exchanges'); // New: comma-separated exchange names
    const assets = searchParams.get('assets');       // New: comma-separated asset symbols
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const page = searchParams.get('page');
    const limit = searchParams.get('limit');
    const sort = searchParams.get('sort');

    // Krok 3: Walidacja parametrów
    console.log('🔍 Validation params:', { exchangeId, assetId, startDate, endDate, page, limit, sort });
    const validationResult = validateOrderbookParameters({
      exchangeId,
      assetId,
      startDate,
      endDate,
      page,
      limit,
      sort
    });
    console.log('✅ Validation result:', validationResult);

    if (!validationResult.isValid) {
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

    // Krok 5: Dodatkowa walidacja exchangeId i assetId jeśli są podane
    if (exchangeId && !(await OrderbookService.validateExchange(exchangeId))) {
      return new Response(
        JSON.stringify({ 
          error: 'Bad Request', 
          message: 'Invalid exchangeId - exchange does not exist' 
        }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    if (assetId && !(await OrderbookService.validateAsset(assetId))) {
      return new Response(
        JSON.stringify({ 
          error: 'Bad Request', 
          message: 'Invalid assetId - asset does not exist' 
        }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Krok 6: Pobieranie danych z wykorzystaniem serwisu
    let orderbooks: OrderbookDTO[];
    let total: number;

    try {
      // Parse comma-separated lists
      const exchangeNames = exchanges ? exchanges.split(',').map(s => s.trim()).filter(Boolean) : undefined;
      const assetSymbols = assets ? assets.split(',').map(s => s.trim().toUpperCase()).filter(Boolean) : undefined;
      
      const result = await OrderbookService.getOrderbooks({
        exchangeId: exchangeId || undefined,
        assetId: assetId || undefined,
        exchangeNames,
        assetSymbols,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        page: pageNum,
        limit: limitNum,
        sort: sort || undefined
      });
      
      orderbooks = result.orderbooks;
      total = result.total;
    } catch (serviceError) {
      await AuditService.logError(
        'orderbooks',
        'SERVICE_ERROR',
        serviceError as Error,
        'unknown'
      );

      return new Response(
        JSON.stringify({ 
          error: 'Internal Server Error', 
          message: 'Failed to retrieve orderbooks' 
        }),
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Krok 7: Przygotowanie odpowiedzi z paginacją
    const response = {
      data: orderbooks,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: total,
        total_pages: Math.ceil(total / limitNum)
      }
    };

    return new Response(
      JSON.stringify(response),
      { 
        status: 200,
        headers: { 
          'Content-Type': 'application/json'
        }
      }
    );

  } catch (error) {
    console.error('💥 Critical error in GET /orderbooks:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });

    await AuditService.logError(
      'orderbooks',
      'UNEXPECTED_ERROR',
      error as Error,
      'unknown'
    );

    return new Response(
      JSON.stringify({ 
        error: 'Internal Server Error', 
        message: `Debug: ${error instanceof Error ? error.message : String(error)}` 
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};

/**
 * Walidacja parametrów zapytania dla endpointu GET /orderbooks
 */
function validateOrderbookParameters(params: {
  exchangeId: string | null;
  assetId: string | null;
  startDate: string | null;
  endDate: string | null;
  page: string | null;
  limit: string | null;
  sort: string | null;
}): { isValid: boolean; error?: string } {
  const { exchangeId, assetId, startDate, endDate, page, limit, sort } = params;

  // Walidacja UUID dla exchangeId
  if (exchangeId && !isValidUUID(exchangeId)) {
    return { isValid: false, error: 'exchangeId must be a valid UUID' };
  }

  // Walidacja UUID dla assetId
  if (assetId && !isValidUUID(assetId)) {
    return { isValid: false, error: 'assetId must be a valid UUID' };
  }

  // Walidacja dat
  if (startDate && !isValidDate(startDate)) {
    return { isValid: false, error: 'start_date must be a valid ISO date string' };
  }

  if (endDate && !isValidDate(endDate)) {
    return { isValid: false, error: 'end_date must be a valid ISO date string' };
  }

  // Walidacja zakresów dat
  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (start > end) {
      return { isValid: false, error: 'start_date cannot be after end_date' };
    }
  }

  // Walidacja page
  if (page) {
    const pageNum = parseInt(page, 10);
    if (isNaN(pageNum) || pageNum < 1) {
      return { isValid: false, error: 'page must be a positive integer' };
    }
  }

  // Walidacja limit
  if (limit) {
    const limitNum = parseInt(limit, 10);
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      return { isValid: false, error: 'limit must be an integer between 1 and 100' };
    }
  }

  // Walidacja sort
  if (sort) {
    const validSortFields = ['timestamp', 'spread', 'volume', 'created_at'];
    const sortField = sort.startsWith('-') ? sort.substring(1) : sort;
    if (!validSortFields.includes(sortField)) {
      return { 
        isValid: false, 
        error: `sort field must be one of: ${validSortFields.join(', ')} (prefix with '-' for descending)` 
      };
    }
  }

  return { isValid: true };
}

/**
 * Sprawdza czy ciąg znaków jest prawidłowym UUID
 */
function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

/**
 * Sprawdza czy ciąg znaków jest prawidłową datą ISO
 */
function isValidDate(dateString: string): boolean {
  const date = new Date(dateString);
  return !isNaN(date.getTime()) && dateString === date.toISOString();
} 