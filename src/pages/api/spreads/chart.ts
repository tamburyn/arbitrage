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
    const timeframe = searchParams.get('timeframe') || '6h'; // 1h, 6h, 24h, 7d
    const asset = searchParams.get('asset'); // Optional asset filter
    const exchange = searchParams.get('exchange'); // Optional exchange filter
    const type = searchParams.get('type'); // Optional type filter

    // Calculate time range
    let hours: number;
    let intervalMinutes: number;
    
    switch (timeframe) {
      case '1h':
        hours = 1;
        intervalMinutes = 5; // 5-minute intervals
        break;
      case '6h':
        hours = 6;
        intervalMinutes = 15; // 15-minute intervals
        break;
      case '24h':
        hours = 24;
        intervalMinutes = 60; // 1-hour intervals
        break;
      case '7d':
        hours = 168; // 7 days
        intervalMinutes = 360; // 6-hour intervals
        break;
      default:
        hours = 6;
        intervalMinutes = 15;
    }

    const sinceTime = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

    // Build query for time series data
    let query = supabaseService.client
      .from('arbitrage_opportunities')
      .select(`
        timestamp,
        spread_percentage,
        type,
        is_profitable,
        assets!inner(symbol),
        exchanges!exchange_id(name)
      `)
      .gte('timestamp', sinceTime)
      .order('timestamp', { ascending: true });

    // Apply filters
    if (asset) {
      query = query.eq('assets.symbol', asset.toUpperCase());
    }

    if (type) {
      query = query.eq('type', type);
    }

    const { data: opportunities, error } = await query;

    if (error) {
      console.error('Supabase error:', error);
      return new Response(JSON.stringify({ 
        error: 'Failed to fetch spread data',
        details: error.message 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Group data by time intervals
    const groupedData = new Map<string, {
      timestamp: string;
      avgSpread: number;
      maxSpread: number;
      minSpread: number;
      profitableCount: number;
      totalCount: number;
      spreads: number[];
    }>();

    opportunities?.forEach(opp => {
      const timestamp = new Date(opp.timestamp);
      // Round to nearest interval
      const roundedMinutes = Math.floor(timestamp.getMinutes() / intervalMinutes) * intervalMinutes;
      timestamp.setMinutes(roundedMinutes, 0, 0);
      const key = timestamp.toISOString();

      if (!groupedData.has(key)) {
        groupedData.set(key, {
          timestamp: key,
          avgSpread: 0,
          maxSpread: 0,
          minSpread: Infinity,
          profitableCount: 0,
          totalCount: 0,
          spreads: []
        });
      }

      const group = groupedData.get(key)!;
      group.spreads.push(opp.spread_percentage);
      group.totalCount++;
      if (opp.is_profitable) {
        group.profitableCount++;
      }
    });

    // Calculate final statistics for each time point
    const chartData = Array.from(groupedData.values()).map(group => {
      const spreads = group.spreads;
      return {
        timestamp: group.timestamp,
        avgSpread: spreads.reduce((a, b) => a + b, 0) / spreads.length,
        maxSpread: Math.max(...spreads),
        minSpread: Math.min(...spreads),
        profitableCount: group.profitableCount,
        totalCount: group.totalCount,
        profitablePercentage: (group.profitableCount / group.totalCount) * 100
      };
    }).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    // Calculate overall statistics
    const allSpreads = opportunities?.map(opp => opp.spread_percentage) || [];
    const totalProfitable = opportunities?.filter(opp => opp.is_profitable).length || 0;

    const statistics = {
      totalOpportunities: opportunities?.length || 0,
      totalProfitable,
      profitablePercentage: opportunities?.length ? (totalProfitable / opportunities.length) * 100 : 0,
      avgSpread: allSpreads.length ? allSpreads.reduce((a, b) => a + b, 0) / allSpreads.length : 0,
      maxSpread: allSpreads.length ? Math.max(...allSpreads) : 0,
      minSpread: allSpreads.length ? Math.min(...allSpreads) : 0,
      timeframe,
      hours
    };

    return new Response(JSON.stringify({
      data: chartData,
      statistics,
      filters: {
        timeframe,
        asset,
        exchange,
        type
      },
      metadata: {
        intervalMinutes,
        dataPoints: chartData.length,
        lastUpdate: opportunities?.[opportunities.length - 1]?.timestamp || null
      }
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=60' // Cache for 1 minute
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
