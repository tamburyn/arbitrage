import type { APIRoute } from 'astro';
import type { AssetDTO } from '../../types';
import { AuditService } from '../../lib/audit.service';
import { AssetService } from '../../lib/asset.service';
import { rateLimiter, RATE_LIMITS, getClientId } from '../../lib/rate-limiter.service';

/**
 * GET /assets - Pobieranie listy aktywów
 * 
 * Endpoint umożliwiający pobranie aktywów z możliwością filtrowania,
 * sortowania i paginacji.
 */
export const GET: APIRoute = async ({ request, url }) => {
  try {
    // Krok 1: Rate limiting check
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

    // Krok 2: Parsowanie parametrów zapytania
    const searchParams = url.searchParams;
    
    const filter = searchParams.get('filter');
    const sort = searchParams.get('sort');
    const page = searchParams.get('page');
    const limit = searchParams.get('limit');

    // Krok 3: Walidacja parametrów
    const validationResult = validateAssetsParameters({
      filter,
      sort,
      page,
      limit
    });

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

    // Krok 5: Pobieranie danych z wykorzystaniem serwisu
    let assets: AssetDTO[];
    let total: number;

    try {
      const result = await AssetService.getAssets({
        filter: filter || undefined,
        sort: sort || undefined,
        page: pageNum,
        limit: limitNum
      });
      
      assets = result.assets;
      total = result.total;
    } catch (serviceError) {
      await AuditService.logError(
        'assets',
        'SERVICE_ERROR',
        serviceError as Error,
        'unknown'
      );

      return new Response(
        JSON.stringify({ 
          error: 'Internal Server Error', 
          message: 'Failed to retrieve assets' 
        }),
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Krok 6: Przygotowanie odpowiedzi z paginacją
    const response = {
      data: assets,
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
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': RATE_LIMITS.PUBLIC.maxRequests.toString(),
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
          'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString()
        }
      }
    );

  } catch (error) {
    await AuditService.logError(
      'assets',
      'UNEXPECTED_ERROR',
      error as Error,
      'unknown'
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
 * Walidacja parametrów zapytania dla endpointu GET /assets
 */
function validateAssetsParameters(params: {
  filter: string | null;
  sort: string | null;
  page: string | null;
  limit: string | null;
}): { isValid: boolean; error?: string } {
  const { filter, sort, page, limit } = params;

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
    const validSortFields = ['symbol', 'full_name', 'created_at', '-symbol', '-full_name', '-created_at'];
    if (!validSortFields.includes(sort)) {
      return { isValid: false, error: 'sort must be one of: symbol, full_name, created_at (prefix with - for descending)' };
    }
  }

  // Walidacja parametru filter
  if (filter !== null) {
    if (typeof filter !== 'string' || filter.trim().length === 0) {
      return { isValid: false, error: 'filter must be a non-empty string' };
    }
    if (filter.length > 100) {
      return { isValid: false, error: 'filter must be less than 100 characters' };
    }
  }

  return { isValid: true };
}

 