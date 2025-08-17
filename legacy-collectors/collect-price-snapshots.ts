import { supabase } from '../database/supabase';
import { BinanceCollector } from '../collectors/binance-collector';
import { KrakenCollector } from '../collectors/kraken-collector';
import { BybitCollector } from '../collectors/bybit-collector';
import { OKXCollector } from '../collectors/okx-collector';
import { ZondaCollector } from '../collectors/zonda-collector';
import { BaseCollector } from '../collectors/base-collector';

// Trading pairs to monitor
const TRADING_PAIRS = [
  'BTC/USDT',
  'ETH/USDT',
  'SOL/USDT',
  'DOGE/USDT',
  'BCH/USDT',
  'UNI/USDT',
  'TRUMP/USDT',
  'POL/USDT',
  'ARB/USDT',
  'SUSHI/USDT',
  'AXS/USDT',
  'DASH/USDT',
  'MANA/USDT',
  'BAT/USDT'
];

class PriceSnapshotCollector {
  private collectors: Map<string, BaseCollector>;

  constructor() {
    this.collectors = new Map<string, BaseCollector>([
      ['Binance', new BinanceCollector()],
      ['Kraken', new KrakenCollector()],
      ['Bybit', new BybitCollector()],
      ['OKX', new OKXCollector()],
      ['Zonda', new ZondaCollector()]
    ]);
  }

  async initialize(): Promise<void> {
    console.log('Initializing collectors...');
    for (const [name, collector] of this.collectors.entries()) {
      try {
        await collector.initialize({});
        console.log(`${name} collector initialized`);
      } catch (error) {
        console.error(`Error initializing ${name} collector:`, error);
      }
    }
  }

  async collectPrices(): Promise<void> {
    console.log('Collecting price snapshots...');
    const timestamp = new Date();

    for (const pair of TRADING_PAIRS) {
      console.log(`\nCollecting prices for ${pair}...`);
      const [base, quote] = pair.split('/');
      
      const prices: Record<string, number | null> = {
        binance_price: null,
        kraken_price: null,
        bybit_price: null,
        okx_price: null,
        zonda_price: null
      };

      // Collect prices from each exchange
      for (const [exchangeName, collector] of this.collectors.entries()) {
        try {
          const priceData = await collector.fetchPrice(base, quote);
          const columnName = `${exchangeName.toLowerCase()}_price`;
          prices[columnName] = priceData.price;
        } catch (error) {
          console.error(`Error fetching ${pair} price from ${exchangeName}:`, error);
        }
      }

      // Store the snapshot
      try {
        const { error: insertError } = await supabase
          .from('price_snapshots')
          .insert({
            timestamp,
            symbol: pair,
            ...prices
          });

        if (insertError) {
          console.error(`Error storing price snapshot for ${pair}:`, insertError);
        } else {
          console.log(`Successfully stored price snapshot for ${pair}`);
        }
      } catch (error) {
        console.error(`Error inserting price snapshot for ${pair}:`, error);
      }
    }
  }

  async cleanup(): Promise<void> {
    console.log('Cleaning up collectors...');
    for (const [name, collector] of this.collectors.entries()) {
      try {
        await collector.cleanup();
        console.log(`${name} collector cleaned up`);
      } catch (error) {
        console.error(`Error cleaning up ${name} collector:`, error);
      }
    }
  }
}

async function main() {
  const collector = new PriceSnapshotCollector();
  
  try {
    await collector.initialize();
    await collector.collectPrices();
  } catch (error) {
    console.error('Error in price snapshot collection:', error);
  } finally {
    await collector.cleanup();
  }
}

main(); 