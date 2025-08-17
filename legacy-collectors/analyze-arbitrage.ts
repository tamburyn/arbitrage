import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseKey);

export async function analyzeArbitrage() {
  try {
    console.log('Starting arbitrage analysis...');

    // Get a reference timestamp (latest in our data)
    const { data: latestData, error: latestError } = await supabase
      .from('price_data')
      .select('timestamp')
      .order('timestamp', { ascending: false })
      .limit(1);

    if (latestError) throw latestError;
    
    const latestTimestamp = latestData?.[0]?.timestamp;
    console.log('Latest timestamp:', latestTimestamp);

    // Get all prices within a 5-minute window of the latest timestamp
    const { data: priceData, error: priceError } = await supabase
      .from('price_data')
      .select(`
        *,
        market_pairs!inner(
          id,
          coin_id,
          market_id,
          base_currency,
          quote_currency,
          coins (
            symbol
          ),
          markets!inner(
            name
          )
        )
      `)
      .gte('timestamp', new Date(new Date(latestTimestamp).getTime() - 5 * 60 * 1000).toISOString()) // 5 minutes before
      .lte('timestamp', latestTimestamp)
      .order('timestamp', { ascending: false });

    if (priceError) throw priceError;

    console.log(`Found ${priceData?.length || 0} price entries in 5-minute window`);

    // Group by coin AND trading pair
    const pricesByPair = priceData?.reduce((acc, entry) => {
      const pairKey = `${entry.market_pairs.base_currency}/${entry.market_pairs.quote_currency}`;
      if (!acc[pairKey]) acc[pairKey] = [];
      acc[pairKey].push(entry);
      return acc;
    }, {} as Record<string, any[]>);

    // Debug grouped data
    console.log('\nPrices by trading pair:');
    for (const [pairKey, entries] of Object.entries(pricesByPair)) {
      console.log(`\nPair ${pairKey}:`);
      (entries as any[]).forEach(entry => {
        console.log(`  ${entry.market_pairs.markets.name}: $${entry.price} (${new Date(entry.timestamp).toISOString()})`);
      });
    }

    // Find arbitrage opportunities
    const opportunities = [];
    for (const [pairKey, entries] of Object.entries(pricesByPair)) {
      if ((entries as any[]).length < 2) continue;

      // Additional validation
      const entriesArray = entries as any[];
      const baseCurrency = entriesArray[0].market_pairs.base_currency;
      const quoteCurrency = entriesArray[0].market_pairs.quote_currency;
      
      // Ensure all entries in this group have the same trading pair
      const validEntries = entriesArray.filter(entry => 
        entry.market_pairs.base_currency === baseCurrency &&
        entry.market_pairs.quote_currency === quoteCurrency
      );

      if (validEntries.length < 2) continue;

      for (let i = 0; i < validEntries.length; i++) {
        for (let j = i + 1; j < validEntries.length; j++) {
          const ex1 = validEntries[i];
          const ex2 = validEntries[j];

          // Skip if prices are suspiciously different
          if (ex1.price / ex2.price > 100 || ex2.price / ex1.price > 100) {
            console.log(`Skipping suspicious price comparison for ${pairKey}:`, {
              market1: `${ex1.market_pairs.markets.name}: $${ex1.price}`,
              market2: `${ex2.market_pairs.markets.name}: $${ex2.price}`
            });
            continue;
          }

          const spread = ((ex1.price - ex2.price) / ex2.price) * 100;

          if (Math.abs(spread) > 0.5) {
            const buyExchange = spread > 0 ? ex2 : ex1;
            const sellExchange = spread > 0 ? ex1 : ex2;

            // Calculate volume using 10%
            const volumeConstraint = calculateVolumeConstraint(buyExchange, sellExchange);
            const estimatedProfit = volumeConstraint * (Math.abs(spread) / 100);

            console.log(`\nPotential arbitrage opportunity for ${pairKey}:`);
            console.log(`${buyExchange.market_pairs.markets.name}: $${buyExchange.price} (Buy)`);
            console.log(`${sellExchange.market_pairs.markets.name}: $${sellExchange.price} (Sell)`);
            console.log(`Spread: ${spread.toFixed(2)}%`);
            console.log(`Volume: $${volumeConstraint.toFixed(2)}`);
            console.log(`Estimated Profit: $${estimatedProfit.toFixed(2)}`);

            const opportunity = {
              buy_market_pair_id: buyExchange.market_pair_id,
              sell_market_pair_id: sellExchange.market_pair_id,
              coin_id: ex1.market_pairs.coin_id,
              timestamp: ex1.timestamp,
              buy_price: buyExchange.price,
              sell_price: sellExchange.price,
              spread_percentage: Math.abs(spread),
              volume_constraint: volumeConstraint,
              estimated_profit_usd: estimatedProfit,
              status: 'identified' as const
            };

            opportunities.push(opportunity);
          }
        }
      }
    }

    console.log('\nAnalysis complete!');
    console.log(`Found ${opportunities.length} opportunities`);
    
    if (opportunities.length > 0) {
      console.log('\nTop opportunities by spread:');
      opportunities
        .sort((a, b) => b.spread_percentage - a.spread_percentage)
        .slice(0, 5)
        .forEach(async (opp) => {
          // Get market pair details for this opportunity
          const { data: marketPairData } = await supabase
            .from('market_pairs')
            .select(`
              base_currency,
              quote_currency,
              coins (
                symbol
              ),
              markets (
                name
              )
            `)
            .eq('id', opp.buy_market_pair_id)
            .single();
          
          if (marketPairData) {
            console.log(`\n${marketPairData.base_currency}/${marketPairData.quote_currency}:`);
            console.log(`  Buy at $${opp.buy_price}`);
            console.log(`  Sell at $${opp.sell_price}`);
            console.log(`  Spread: ${opp.spread_percentage.toFixed(2)}%`);
            console.log(`  Volume constraint: $${opp.volume_constraint.toFixed(2)}`);
            console.log(`  Estimated profit: $${opp.estimated_profit_usd.toFixed(2)}`);
          }
        });

      // Save opportunities to database
      console.log('\nSaving opportunities to database...');
      const { error: insertError } = await supabase
        .from('arbitrage_opportunities')
        .insert(opportunities);

      if (insertError) {
        console.error('Error saving opportunities:', insertError);
      } else {
        console.log('Successfully saved opportunities to database!');
      }
    }

  } catch (error) {
    console.error('Error during analysis:', error);
    throw error; // Re-throw the error to be handled by the caller
  }
}

function groupByTimestampAndCoin(priceData: any[]) {
  return priceData.reduce((acc, entry) => {
    const ts = entry.timestamp;
    const coinId = entry.market_pairs.coin_id;
    
    acc[ts] = acc[ts] || {};
    acc[ts][coinId] = acc[ts][coinId] || [];
    acc[ts][coinId].push(entry);
    
    return acc;
  }, {});
}

// Helper functions to calculate available liquidity
function calculateBuyLiquidity(exchange: any): number {
  // If we have order book data
  if (exchange.asks && exchange.asks.length > 0) {
    // Calculate total available buy liquidity
    return exchange.asks.reduce((sum: number, [price, amount]: number[]) => {
      return sum + (amount * price);
    }, 0);
  }
  
  // Fallback to bid/ask spread if available
  if (exchange.ask && exchange.ask_size) {
    return exchange.ask_size * exchange.ask;
  }
  
  // Use full 24h volume as maximum potential
  return exchange.volume_24h || 0;
}

function calculateSellLiquidity(exchange: any): number {
  // If we have order book data
  if (exchange.bids && exchange.bids.length > 0) {
    // Calculate total available sell liquidity
    return exchange.bids.reduce((sum: number, [price, amount]: number[]) => {
      return sum + (amount * price);
    }, 0);
  }
  
  // Fallback to bid/ask spread if available
  if (exchange.bid && exchange.bid_size) {
    return exchange.bid_size * exchange.bid;
  }
  
  // Use full 24h volume as maximum potential
  return exchange.volume_24h || 0;
}

// Calculate the maximum possible volume for the arbitrage
function calculateVolumeConstraint(buyExchange: any, sellExchange: any): number {
  const dailyVolume = Math.min(buyExchange.volume_24h || 0, sellExchange.volume_24h || 0);
  const buyLiquidity = calculateBuyLiquidity(buyExchange);
  const sellLiquidity = calculateSellLiquidity(sellExchange);
  
  // Use the minimum of available liquidity (no percentage limitation)
  return Math.min(dailyVolume, buyLiquidity, sellLiquidity);
}

// Only run directly if this is the main module
if (require.main === module) {
  analyzeArbitrage();
} 