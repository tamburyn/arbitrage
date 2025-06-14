/**
 * GET /api/orderbooks/export
 * 
 * Eksportuje dane orderbooków do pliku CSV w określonym zakresie dat.
 * Parametry query: from (ISO string), to (ISO string)
 */

import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../../db/database.types';
import type { OrderbookDTO } from '../../../types';
import { validateQueryParams, convertToCSV, generateCSVFilename } from '../../../utils/orderbook-export';

const supabaseUrl = import.meta.env.SUPABASE_URL;
const supabaseKey = import.meta.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient<Database>(supabaseUrl, supabaseKey);

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

export const GET: APIRoute = async ({ request, url }) => {
  try {
    console.log(`[${new Date().toISOString()}] GET /api/orderbooks/export - Start`);

    // Walidacja parametrów
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');
    const validation = validateQueryParams(from, to);
    
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

    const { from: validFrom, to: validTo } = validation;
    
    console.log(`[${new Date().toISOString()}] Fetching orderbooks from ${validFrom} to ${validTo}`);

    // Pobierz dane z bazy danych
    const orderbooks = await getOrderbooksInDateRange(validFrom, validTo);
    
    console.log(`[${new Date().toISOString()}] Found ${orderbooks.length} orderbooks`);

    // Konwertuj do CSV
    const csvContent = convertToCSV(orderbooks);
    
    // Generuj nazwę pliku
    const filename = generateCSVFilename(validFrom, validTo);

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