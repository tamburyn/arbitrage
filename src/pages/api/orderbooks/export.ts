/**
 * GET /api/orderbooks/export
 * 
 * Eksportuje dane orderbooków do pliku CSV w określonym zakresie dat.
 * Parametry query: from (ISO string), to (ISO string)
 */

import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../../db/database.types';
import type { OrderbookDTO, ExportOrderbooksQueryDTO } from '../../../types';

const supabaseUrl = import.meta.env.SUPABASE_URL;
const supabaseKey = import.meta.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient<Database>(supabaseUrl, supabaseKey);

/**
 * Waliduje format daty ISO 8601
 */
function isValidISODate(dateString: string): boolean {
  if (!dateString) return false;
  
  const date = new Date(dateString);
  
  // Sprawdź czy data jest prawidłowa
  if (isNaN(date.getTime())) return false;
  
  // Sprawdź czy string odpowiada formatowi ISO (z timezoną lub bez)
  const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
  const isoWithTimezoneRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?[+-]\d{2}:\d{2}$/;
  
  return isoRegex.test(dateString) || isoWithTimezoneRegex.test(dateString);
}

/**
 * Pobiera orderbooki z bazy danych w określonym zakresie dat
 */
async function getOrderbooksInDateRange(from: string, to: string): Promise<OrderbookDTO[]> {
  const { data, error } = await supabase
    .from('orderbooks')
    .select('*')
    .gte('timestamp', from)
    .lte('timestamp', to)
    .order('timestamp', { ascending: true });

  if (error) {
    console.error('Database error:', error);
    throw new Error('Failed to fetch orderbooks from database');
  }

  return data || [];
}

/**
 * Konwertuje dane orderbooków do formatu CSV
 */
function convertToCSV(orderbooks: OrderbookDTO[]): string {
  if (orderbooks.length === 0) {
    return 'id,exchange_id,asset_id,snapshot,spread,timestamp,volume,created_at\n';
  }

  // Nagłówki CSV
  const headers = [
    'id',
    'exchange_id', 
    'asset_id',
    'snapshot',
    'spread',
    'timestamp',
    'volume',
    'created_at'
  ];

  // Konwersja danych na CSV
  const csvRows = orderbooks.map(orderbook => {
    return [
      orderbook.id,
      orderbook.exchange_id,
      orderbook.asset_id,
      JSON.stringify(orderbook.snapshot).replace(/"/g, '""'), // Escape quotes
      orderbook.spread.toString(),
      orderbook.timestamp,
      orderbook.volume?.toString() || '',
      orderbook.created_at || ''
    ].join(',');
  });

  return [headers.join(','), ...csvRows].join('\n');
}

/**
 * Waliduje parametry zapytania
 */
function validateQueryParams(url: URL): { from: string; to: string } | { error: string } {
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');

  // Sprawdź czy parametry są obecne
  if (!from) {
    return { error: 'Missing required parameter: from' };
  }

  if (!to) {
    return { error: 'Missing required parameter: to' };
  }

  // Waliduj format dat
  if (!isValidISODate(from)) {
    return { error: 'Invalid date format for parameter "from". Expected ISO 8601 format.' };
  }

  if (!isValidISODate(to)) {
    return { error: 'Invalid date format for parameter "to". Expected ISO 8601 format.' };
  }

  // Sprawdź czy data "from" nie jest późniejsza niż "to"
  const fromDate = new Date(from);
  const toDate = new Date(to);
  
  if (fromDate > toDate) {
    return { error: 'Parameter "from" cannot be later than "to"' };
  }

  // Sprawdź czy zakres nie przekracza 3 miesięcy (zgodnie z PRD)
  const threeMonthsInMs = 3 * 30 * 24 * 60 * 60 * 1000; // przybliżona wartość
  if (toDate.getTime() - fromDate.getTime() > threeMonthsInMs) {
    return { error: 'Date range cannot exceed 3 months' };
  }

  return { from, to };
}

export const GET: APIRoute = async ({ request, url }) => {
  try {
    console.log(`[${new Date().toISOString()}] GET /api/orderbooks/export - Start`);

    // Walidacja parametrów
    const validation = validateQueryParams(url);
    
    if ('error' in validation) {
      console.log(`[${new Date().toISOString()}] Validation error:`, validation.error);
      return new Response(
        JSON.stringify({ 
          error: validation.error,
          message: 'Invalid request parameters'
        }), 
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const { from, to } = validation;
    
    console.log(`[${new Date().toISOString()}] Fetching orderbooks from ${from} to ${to}`);

    // Pobierz dane z bazy danych
    const orderbooks = await getOrderbooksInDateRange(from, to);
    
    console.log(`[${new Date().toISOString()}] Found ${orderbooks.length} orderbooks`);

    // Konwertuj do CSV
    const csvContent = convertToCSV(orderbooks);
    
    // Generuj nazwę pliku
    const fromDate = from.split('T')[0];
    const toDate = to.split('T')[0];
    const filename = `orderbooks_export_${fromDate}_to_${toDate}.csv`;

    console.log(`[${new Date().toISOString()}] Generated CSV file: ${filename}`);

    // Zwróć plik CSV
    return new Response(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache'
      }
    });

  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error in orderbooks export:`, error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: 'Failed to process orderbooks export request'
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};