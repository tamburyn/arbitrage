import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

export const GET: APIRoute = async ({ url, locals }) => {
  try {
    // Use supabase client from locals (injected by middleware) or create new one
    const supabaseClient = locals.supabase || createClient(
      import.meta.env.SUPABASE_URL,
      import.meta.env.SUPABASE_KEY
    );
    
    // Parse query parameters
    const searchParams = new URL(url).searchParams;
    const hours = parseInt(searchParams.get('hours') || '24'); // Default last 24h
    const assetSymbol = searchParams.get('asset');
    const exchangeName = searchParams.get('exchange');
    const interval = parseInt(searchParams.get('interval') || '30'); // Default 30min intervals
    
    // Calculate time range
    const sinceTime = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

    // Build query with joins
    let query = supabaseClient
      .from('arbitrage_opportunities')
      .select(`
        timestamp,
        spread_percentage,
        volume,
        assets!inner(symbol),
        exchanges!exchange_id(name)
      `)
      .gte('timestamp', sinceTime)
      .eq('is_profitable', true)
      .order('timestamp', { ascending: true });

    // Apply filters
    if (assetSymbol) {
      query = query.eq('assets.symbol', assetSymbol.toUpperCase());
    }

    if (exchangeName) {
      query = query.eq('exchanges.name', exchangeName);
    }

    // Execute query
    const { data: historyData, error } = await query;

    if (error) {
      console.error('History query error:', error);
      return new Response(JSON.stringify({ 
        error: 'Failed to fetch spread history',
        details: error.message 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Group data by time intervals if requested
    const groupedData = historyData?.reduce((acc, item) => {
      // Round timestamp to interval
      const timestamp = new Date(item.timestamp);
      const intervalMs = interval * 60 * 1000; // Convert minutes to milliseconds
      const roundedTime = new Date(Math.floor(timestamp.getTime() / intervalMs) * intervalMs);
      const timeKey = roundedTime.toISOString();

      if (!acc[timeKey]) {
        acc[timeKey] = {
          timestamp: timeKey,
          spread_values: [],
          volume_values: [],
          asset_symbol: item.assets?.symbol || 'Unknown',
          exchange_name: item.exchanges?.name || 'Unknown'
        };
      }

      acc[timeKey].spread_values.push(parseFloat(item.spread_percentage || '0'));
      acc[timeKey].volume_values.push(parseFloat(item.volume || '0'));

      return acc;
    }, {} as Record<string, any>) || {};

    // Transform grouped data to final format
    const transformedData = Object.values(groupedData).map((group: any) => ({
      timestamp: group.timestamp,
      spread_percentage: group.spread_values.reduce((sum: number, val: number) => sum + val, 0) / group.spread_values.length, // Average
      volume: group.volume_values.reduce((sum: number, val: number) => sum + val, 0), // Sum
      asset_symbol: group.asset_symbol,
      exchange_name: group.exchange_name
    })).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    return new Response(JSON.stringify({
      data: transformedData,
      filters: {
        hours,
        asset: assetSymbol,
        exchange: exchangeName,
        interval
      },
      metadata: {
        total_points: transformedData.length,
        time_range: {
          start: sinceTime,
          end: new Date().toISOString()
        }
      }
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });

  } catch (error) {
    console.error('API error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
