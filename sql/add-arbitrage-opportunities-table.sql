-- Add arbitrage_opportunities table to store ALL detected arbitrage opportunities
-- This separates arbitrage detection from user alerts

-- Create arbitrage_opportunities table
CREATE TABLE IF NOT EXISTS arbitrage_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Basic info
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  type VARCHAR NOT NULL CHECK (type IN ('intra_exchange', 'cross_exchange')),
  
  -- Assets and exchanges involved
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  exchange_id UUID REFERENCES exchanges(id) ON DELETE SET NULL, -- For intra-exchange
  exchange_from_id UUID REFERENCES exchanges(id) ON DELETE SET NULL, -- For cross-exchange
  exchange_to_id UUID REFERENCES exchanges(id) ON DELETE SET NULL, -- For cross-exchange
  
  -- Arbitrage metrics
  spread_percentage NUMERIC NOT NULL CHECK (spread_percentage > 0),
  potential_profit_percentage NUMERIC,
  volume NUMERIC,
  
  -- Price details
  buy_price NUMERIC,
  sell_price NUMERIC,
  
  -- Additional context
  threshold_used NUMERIC NOT NULL,
  is_profitable BOOLEAN NOT NULL DEFAULT false,
  additional_data JSONB, -- For storing orderbook snapshots, etc.
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_arbitrage_opportunities_timestamp ON arbitrage_opportunities(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_arbitrage_opportunities_asset_id ON arbitrage_opportunities(asset_id);
CREATE INDEX IF NOT EXISTS idx_arbitrage_opportunities_profitable ON arbitrage_opportunities(is_profitable, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_arbitrage_opportunities_type ON arbitrage_opportunities(type);
CREATE INDEX IF NOT EXISTS idx_arbitrage_opportunities_spread ON arbitrage_opportunities(spread_percentage DESC);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_arbitrage_opportunities_asset_profitable ON arbitrage_opportunities(asset_id, is_profitable, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_arbitrage_opportunities_exchange_profitable ON arbitrage_opportunities(exchange_id, is_profitable, timestamp DESC) WHERE exchange_id IS NOT NULL;

COMMENT ON TABLE arbitrage_opportunities IS 'Stores all detected arbitrage opportunities regardless of user alerts';
COMMENT ON COLUMN arbitrage_opportunities.type IS 'Type of arbitrage: intra_exchange (spread within one exchange) or cross_exchange (between exchanges)';
COMMENT ON COLUMN arbitrage_opportunities.spread_percentage IS 'The arbitrage spread as a percentage';
COMMENT ON COLUMN arbitrage_opportunities.is_profitable IS 'Whether this opportunity meets the profitability threshold';

