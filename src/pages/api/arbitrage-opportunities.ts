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
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100); // Max 100
    const type = searchParams.get('type'); // 'intra_exchange' | 'cross_exchange'
    const assetSymbol = searchParams.get('asset');
    const exchangeName = searchParams.get('exchange');
    const isProfitable = searchParams.get('profitable');
    const minSpread = searchParams.get('min_spread');
    const maxSpread = searchParams.get('max_spread');
    const hours = parseInt(searchParams.get('hours') || '24'); // Default last 24h

    // Calculate offset
    const offset = (page - 1) * limit;

    // Build query
    let query = supabaseClient
      .from('arbitrage_opportunities')
      .select(`
        *,
        assets!inner(symbol),
        exchanges!exchange_id(name),
        exchange_from:exchanges!exchange_from_id(name),
        exchange_to:exchanges!exchange_to_id(name)
      `)
      .order('timestamp', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (type) {
      query = query.eq('type', type);
    }

    if (isProfitable !== null) {
      query = query.eq('is_profitable', isProfitable === 'true');
    }

    if (minSpread) {
      query = query.gte('spread_percentage', parseFloat(minSpread));
    }

    if (maxSpread) {
      query = query.lte('spread_percentage', parseFloat(maxSpread));
    }

    // Filter by time range
    const sinceTime = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
    query = query.gte('timestamp', sinceTime);

    // Filter by asset symbol if provided
    if (assetSymbol) {
      query = query.eq('assets.symbol', assetSymbol.toUpperCase());
    }

    // Execute query
    const { data: opportunities, error, count } = await query;

    if (error) {
      console.error('Supabase error:', error);
      return new Response(JSON.stringify({ 
        error: 'Failed to fetch arbitrage opportunities',
        details: error.message 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get total count for pagination
    let totalQuery = supabaseClient
      .from('arbitrage_opportunities')
      .select('*', { count: 'exact', head: true })
      .gte('timestamp', sinceTime);

    if (type) totalQuery = totalQuery.eq('type', type);
    if (isProfitable !== null) totalQuery = totalQuery.eq('is_profitable', isProfitable === 'true');
    if (minSpread) totalQuery = totalQuery.gte('spread_percentage', parseFloat(minSpread));
    if (maxSpread) totalQuery = totalQuery.lte('spread_percentage', parseFloat(maxSpread));

    const { count: totalCount } = await totalQuery;

    // Transform data for frontend
    const transformedData = opportunities?.map(opp => ({
      id: opp.id,
      timestamp: opp.timestamp,
      type: opp.type,
      asset: {
        symbol: opp.assets.symbol,
        name: opp.assets.symbol // Use symbol as name for now
      },
      exchange: opp.exchanges?.name || null,
      exchangeFrom: opp.exchange_from?.name || null,
      exchangeTo: opp.exchange_to?.name || null,
      spreadPercentage: opp.spread_percentage,
      potentialProfitPercentage: opp.potential_profit_percentage,
      buyPrice: opp.buy_price,
      sellPrice: opp.sell_price,
      volume: opp.volume,
      thresholdUsed: opp.threshold_used,
      isProfitable: opp.is_profitable,
      additionalData: opp.additional_data
    })) || [];

    return new Response(JSON.stringify({
      data: transformedData,
      pagination: {
        page,
        limit,
        total: totalCount || 0,
        totalPages: Math.ceil((totalCount || 0) / limit),
        hasNext: offset + limit < (totalCount || 0),
        hasPrev: page > 1
      },
      filters: {
        type,
        assetSymbol,
        exchangeName,
        isProfitable,
        minSpread,
        maxSpread,
        hours
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
