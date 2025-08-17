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
    const previousHours = parseInt(searchParams.get('previous_hours') || '24'); // For comparison
    const exchanges = searchParams.get('exchanges'); // Comma-separated exchange names
    const assets = searchParams.get('assets'); // Comma-separated asset symbols

    // Parse filter arrays
    const exchangeNames = exchanges ? exchanges.split(',').map(s => s.trim()).filter(Boolean) : [];
    const assetSymbols = assets ? assets.split(',').map(s => s.trim().toUpperCase()).filter(Boolean) : [];

    // Calculate time ranges
    const currentPeriodStart = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
    const previousPeriodStart = new Date(Date.now() - (hours + previousHours) * 60 * 60 * 1000).toISOString();
    const previousPeriodEnd = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

    // Get current period stats with same logic as arbitrage-opportunities API
    let currentQuery = supabaseClient
      .from('arbitrage_opportunities')
      .select(`
        spread_percentage, 
        volume, 
        is_profitable,
        assets!inner(symbol),
        exchanges!exchange_id(name)
      `, { count: 'exact' })
      .gte('timestamp', currentPeriodStart)
      .eq('is_profitable', true);

    // Apply filters
    if (assetSymbols.length > 0) {
      currentQuery = currentQuery.in('assets.symbol', assetSymbols);
    }
    if (exchangeNames.length > 0) {
      currentQuery = currentQuery.in('exchanges.name', exchangeNames);
    }

    const { data: currentStats, error: currentError, count } = await currentQuery;

    if (currentError) {
      console.error('Current stats error:', currentError);
      return new Response(JSON.stringify({ 
        error: 'Failed to fetch current period stats',
        details: currentError.message 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get previous period stats for comparison  
    let previousQuery = supabaseClient
      .from('arbitrage_opportunities')
      .select(`
        spread_percentage, 
        volume, 
        is_profitable,
        assets!inner(symbol),
        exchanges!exchange_id(name)
      `)
      .gte('timestamp', previousPeriodStart)
      .lt('timestamp', previousPeriodEnd)
      .eq('is_profitable', true);

    // Apply same filters to previous period
    if (assetSymbols.length > 0) {
      previousQuery = previousQuery.in('assets.symbol', assetSymbols);
    }
    if (exchangeNames.length > 0) {
      previousQuery = previousQuery.in('exchanges.name', exchangeNames);
    }

    const { data: previousStats, error: previousError } = await previousQuery;

    if (previousError) {
      console.error('Previous stats error:', previousError);
      // Continue without previous stats for comparison
    }

    // Calculate current period metrics
    const activeOpportunities = currentStats || [];
    const activeCount = count || 0; // Use actual count from Supabase query
    
    // Debug logging (remove in production)
    // console.log('Summary API Debug:', { currentPeriodStart, dataLength: activeOpportunities.length, actualCount: count });
    
    const totalVolume = activeOpportunities.reduce((sum, opp) => 
      sum + parseFloat(opp.volume || '0'), 0
    );
    
    const averageSpread = activeCount > 0 
      ? activeOpportunities.reduce((sum, opp) => 
          sum + parseFloat(opp.spread_percentage || '0'), 0
        ) / activeCount
      : 0;
    
    const bestSpread = activeCount > 0 
      ? Math.max(...activeOpportunities.map(opp => 
          parseFloat(opp.spread_percentage || '0')
        ))
      : 0;

    // Calculate previous period average for comparison
    const previousOpportunities = previousStats || [];
    const previousAverageSpread = previousOpportunities.length > 0 
      ? previousOpportunities.reduce((sum, opp) => 
          sum + parseFloat(opp.spread_percentage || '0'), 0
        ) / previousOpportunities.length
      : null;

    return new Response(JSON.stringify({
      active_opportunities_count: activeCount,
      average_spread: averageSpread,
      best_spread: bestSpread,
      total_volume: totalVolume,
      previous_period_avg_spread: previousAverageSpread,
      period_hours: hours,
      timestamp: new Date().toISOString()
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
