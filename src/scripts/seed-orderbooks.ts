import { supabaseClient } from '../db/supabase.client';

// Sample data for seeding orderbooks table
const sampleOrderbooks = [
  {
    asset_id: '550e8400-e29b-41d4-a716-446655440001', // BTC
    exchange_id: '550e8400-e29b-41d4-a716-446655440002', // Binance
    snapshot: {
      asks: [
        [50150.25, 0.5],
        [50155.50, 1.2],
        [50160.75, 0.8]
      ],
      bids: [
        [50125.75, 0.7],
        [50120.50, 1.1],
        [50115.25, 0.9]
      ]
    },
    spread: 0.049,
    timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    volume: 125000
  },
  {
    asset_id: '550e8400-e29b-41d4-a716-446655440003', // ETH
    exchange_id: '550e8400-e29b-41d4-a716-446655440004', // Coinbase
    snapshot: {
      asks: [
        [3025.50, 2.5],
        [3030.75, 3.2],
        [3035.00, 1.8]
      ],
      bids: [
        [3020.25, 2.1],
        [3015.00, 2.8],
        [3010.75, 1.9]
      ]
    },
    spread: 0.174,
    timestamp: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
    volume: 85000
  },
  {
    asset_id: '550e8400-e29b-41d4-a716-446655440005', // ADA
    exchange_id: '550e8400-e29b-41d4-a716-446655440006', // Kraken
    snapshot: {
      asks: [
        [0.485, 1000],
        [0.487, 1500],
        [0.489, 800]
      ],
      bids: [
        [0.482, 1200],
        [0.480, 1800],
        [0.478, 900]
      ]
    },
    spread: 0.622,
    timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    volume: 250000
  }
];

// Sample assets
const sampleAssets = [
  { id: '550e8400-e29b-41d4-a716-446655440001', symbol: 'BTC', full_name: 'Bitcoin' },
  { id: '550e8400-e29b-41d4-a716-446655440003', symbol: 'ETH', full_name: 'Ethereum' },
  { id: '550e8400-e29b-41d4-a716-446655440005', symbol: 'ADA', full_name: 'Cardano' }
];

// Sample exchanges
const sampleExchanges = [
  { id: '550e8400-e29b-41d4-a716-446655440002', name: 'Binance', api_endpoint: 'https://api.binance.com', integration_status: 'active' },
  { id: '550e8400-e29b-41d4-a716-446655440004', name: 'Coinbase', api_endpoint: 'https://api.coinbase.com', integration_status: 'active' },
  { id: '550e8400-e29b-41d4-a716-446655440006', name: 'Kraken', api_endpoint: 'https://api.kraken.com', integration_status: 'active' }
];

async function seedDatabase() {
  try {
    console.log('Starting database seeding...');

    // Insert sample assets
    console.log('Inserting assets...');
    const { error: assetsError } = await supabaseClient
      .from('assets')
      .upsert(sampleAssets, { onConflict: 'id' });

    if (assetsError) {
      console.error('Error inserting assets:', assetsError);
    } else {
      console.log('Assets inserted successfully');
    }

    // Insert sample exchanges
    console.log('Inserting exchanges...');
    const { error: exchangesError } = await supabaseClient
      .from('exchanges')
      .upsert(sampleExchanges, { onConflict: 'id' });

    if (exchangesError) {
      console.error('Error inserting exchanges:', exchangesError);
    } else {
      console.log('Exchanges inserted successfully');
    }

    // Insert sample orderbooks
    console.log('Inserting orderbooks...');
    const { error: orderbooksError } = await supabaseClient
      .from('orderbooks')
      .insert(sampleOrderbooks);

    if (orderbooksError) {
      console.error('Error inserting orderbooks:', orderbooksError);
    } else {
      console.log('Orderbooks inserted successfully');
    }

    console.log('Database seeding completed!');
  } catch (error) {
    console.error('Error during seeding:', error);
  }
}

// Run the seeding function
if (import.meta.url === `file://${process.argv[1]}`) {
  seedDatabase();
}

export { seedDatabase }; 