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
    const type = searchParams.get('type'); // Optional type filter

    const sinceTime = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

    // Build query for heatmap data
    let query = supabaseClient
      .from('arbitrage_opportunities')
      .select(`
        spread_percentage,
        type,
        is_profitable,
        assets!inner(symbol),
        exchanges!exchange_id(name),
        exchange_from:exchanges!exchange_from_id(name),
        exchange_to:exchanges!exchange_to_id(name)
      `)
      .gte('timestamp', sinceTime)
      .order('spread_percentage', { ascending: false });

    // Apply type filter
    if (type) {
      query = query.eq('type', type);
    }

    const { data: opportunities, error } = await query;

    if (error) {
      console.error('Supabase error:', error);
      return new Response(JSON.stringify({ 
        error: 'Failed to fetch heatmap data',
        details: error.message 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Group data by asset-exchange pairs
    const heatmapData = new Map<string, {
      asset: string;
      assetName: string;
      exchange: string;
      exchangeFrom?: string;
      exchangeTo?: string;
      type: string;
      avgSpread: number;
      maxSpread: number;
      minSpread: number;
      profitableCount: number;
      totalCount: number;
      spreads: number[];
      lastOpportunity: string;
    }>();

    opportunities?.forEach(opp => {
      let key: string;
      let exchange: string;
      let exchangeFrom: string | undefined;
      let exchangeTo: string | undefined;

      if (opp.type === 'intra_exchange') {
        exchange = opp.exchanges?.name || 'Unknown';
        key = `${opp.assets.symbol}-${exchange}`;
      } else {
        exchangeFrom = opp.exchange_from?.name || 'Unknown';
        exchangeTo = opp.exchange_to?.name || 'Unknown';
        exchange = `${exchangeFrom} → ${exchangeTo}`;
        key = `${opp.assets.symbol}-${exchangeFrom}-${exchangeTo}`;
      }

      if (!heatmapData.has(key)) {
        heatmapData.set(key, {
          asset: opp.assets.symbol,
          assetName: opp.assets.symbol, // Use symbol as name
          exchange,
          exchangeFrom,
          exchangeTo,
          type: opp.type,
          avgSpread: 0,
          maxSpread: 0,
          minSpread: Infinity,
          profitableCount: 0,
          totalCount: 0,
          spreads: [],
          lastOpportunity: ''
        });
      }

      const group = heatmapData.get(key)!;
      group.spreads.push(opp.spread_percentage);
      group.totalCount++;
      if (opp.is_profitable) {
        group.profitableCount++;
      }
    });

    // Calculate final statistics and prepare data for heatmap
    const processedData = Array.from(heatmapData.values()).map(group => {
      const spreads = group.spreads;
      return {
        asset: group.asset,
        assetName: group.asset, // Use symbol as name
        exchange: group.exchange,
        exchangeFrom: group.exchangeFrom,
        exchangeTo: group.exchangeTo,
        type: group.type,
        avgSpread: spreads.reduce((a, b) => a + b, 0) / spreads.length,
        maxSpread: Math.max(...spreads),
        minSpread: Math.min(...spreads),
        profitableCount: group.profitableCount,
        totalCount: group.totalCount,
        profitablePercentage: (group.profitableCount / group.totalCount) * 100,
        intensity: Math.max(...spreads), // Use max spread for color intensity
        efficiency: (group.profitableCount / group.totalCount) * 100 // Success rate
      };
    }).sort((a, b) => b.maxSpread - a.maxSpread); // Sort by highest spread

    // Prepare data for different heatmap visualizations
    const matrices = {
      // Asset vs Exchange matrix (for intra-exchange)
      assetExchange: processedData
        .filter(item => item.type === 'intra_exchange')
        .reduce((acc, item) => {
          if (!acc[item.asset]) acc[item.asset] = {};
          acc[item.asset][item.exchange] = {
            avgSpread: item.avgSpread,
            maxSpread: item.maxSpread,
            profitablePercentage: item.profitablePercentage,
            totalCount: item.totalCount
          };
          return acc;
        }, {} as Record<string, Record<string, any>>),

      // Cross-exchange pairs matrix
      crossExchange: processedData
        .filter(item => item.type === 'cross_exchange')
        .reduce((acc, item) => {
          if (!acc[item.asset]) acc[item.asset] = {};
          const pairKey = `${item.exchangeFrom}-${item.exchangeTo}`;
          acc[item.asset][pairKey] = {
            avgSpread: item.avgSpread,
            maxSpread: item.maxSpread,
            profitablePercentage: item.profitablePercentage,
            totalCount: item.totalCount,
            exchangeFrom: item.exchangeFrom,
            exchangeTo: item.exchangeTo
          };
          return acc;
        }, {} as Record<string, Record<string, any>>)
    };

    // Get unique assets and exchanges for axes
    const assets = [...new Set(processedData.map(item => item.asset))].sort();
    const exchanges = [...new Set(processedData
      .filter(item => item.type === 'intra_exchange')
      .map(item => item.exchange))].sort();
    const crossExchangePairs = [...new Set(processedData
      .filter(item => item.type === 'cross_exchange')
      .map(item => `${item.exchangeFrom}-${item.exchangeTo}`))].sort();

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
      uniqueAssets: assets.length,
      uniqueExchanges: exchanges.length,
      uniqueCrossExchangePairs: crossExchangePairs.length
    };

    return new Response(JSON.stringify({
      data: processedData,
      matrices,
      axes: {
        assets,
        exchanges,
        crossExchangePairs
      },
      statistics,
      filters: {
        hours,
        type
      },
      metadata: {
        dataPoints: processedData.length,
        lastUpdate: opportunities?.[opportunities.length - 1]?.timestamp || null
      }
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=120' // Cache for 2 minutes
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
