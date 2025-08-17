-- Migration: Add arbitrage opportunities table
-- Description: Creates arbitrage_opportunities table to store ALL detected arbitrage opportunities
-- This separates arbitrage detection from user alerts
-- Date: 2024-12-30
-- Author: Database Migration
-- Affected Tables: arbitrage_opportunities
-- Special Considerations: 
--   - Indexes optimized for time-series queries
--   - Check constraints for data integrity
--   - Supports both intra and cross-exchange arbitrage

-- =============================================================================
-- CREATE ARBITRAGE OPPORTUNITIES TABLE
-- =============================================================================

-- arbitrage_opportunities table
-- stores all detected arbitrage opportunities regardless of user alerts
create table public.arbitrage_opportunities (
    id uuid primary key default gen_random_uuid(),
    
    -- basic info
    timestamp timestamptz not null default now(),
    type varchar not null check (type in ('intra_exchange', 'cross_exchange')),
    
    -- assets and exchanges involved
    asset_id uuid not null references public.assets(id) on delete cascade,
    exchange_id uuid references public.exchanges(id) on delete set null, -- for intra-exchange
    exchange_from_id uuid references public.exchanges(id) on delete set null, -- for cross-exchange
    exchange_to_id uuid references public.exchanges(id) on delete set null, -- for cross-exchange
    
    -- arbitrage metrics
    spread_percentage numeric not null check (spread_percentage > 0),
    potential_profit_percentage numeric,
    volume numeric,
    
    -- price details
    buy_price numeric,
    sell_price numeric,
    
    -- additional context
    threshold_used numeric not null,
    is_profitable boolean not null default false,
    additional_data jsonb, -- for storing orderbook snapshots, etc.
    
    -- audit
    created_at timestamptz not null default now()
);

-- enable rls for arbitrage_opportunities table
alter table public.arbitrage_opportunities enable row level security;

-- =============================================================================
-- INDEXES FOR PERFORMANCE
-- =============================================================================

-- time-based indexes for performance
create index idx_arbitrage_opportunities_timestamp on public.arbitrage_opportunities(timestamp desc);
create index idx_arbitrage_opportunities_asset_id on public.arbitrage_opportunities(asset_id);
create index idx_arbitrage_opportunities_profitable on public.arbitrage_opportunities(is_profitable, timestamp desc);
create index idx_arbitrage_opportunities_type on public.arbitrage_opportunities(type);
create index idx_arbitrage_opportunities_spread on public.arbitrage_opportunities(spread_percentage desc);

-- composite indexes for common queries
create index idx_arbitrage_opportunities_asset_profitable on public.arbitrage_opportunities(asset_id, is_profitable, timestamp desc);
create index idx_arbitrage_opportunities_exchange_profitable on public.arbitrage_opportunities(exchange_id, is_profitable, timestamp desc) where exchange_id is not null;

-- =============================================================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================================================

-- arbitrage opportunities are public data for transparency
-- policy for anonymous users to select arbitrage opportunities
create policy "arbitrage_opportunities_select_anon" on public.arbitrage_opportunities
    for select
    to anon
    using (true);

-- policy for authenticated users to select arbitrage opportunities
create policy "arbitrage_opportunities_select_auth" on public.arbitrage_opportunities
    for select
    to authenticated
    using (true);

-- policy for authenticated users to insert arbitrage opportunities
create policy "arbitrage_opportunities_insert_auth" on public.arbitrage_opportunities
    for insert
    to authenticated
    with check (true);

-- policy for authenticated users to update arbitrage opportunities
create policy "arbitrage_opportunities_update_auth" on public.arbitrage_opportunities
    for update
    to authenticated
    using (true)
    with check (true);

-- policy for authenticated users to delete arbitrage opportunities
create policy "arbitrage_opportunities_delete_auth" on public.arbitrage_opportunities
    for delete
    to authenticated
    using (true);

-- =============================================================================
-- COMMENTS AND DOCUMENTATION
-- =============================================================================

comment on table public.arbitrage_opportunities is 'Stores all detected arbitrage opportunities regardless of user alerts';
comment on column public.arbitrage_opportunities.type is 'Type of arbitrage: intra_exchange (spread within one exchange) or cross_exchange (between exchanges)';
comment on column public.arbitrage_opportunities.spread_percentage is 'The arbitrage spread as a percentage';
comment on column public.arbitrage_opportunities.is_profitable is 'Whether this opportunity meets the profitability threshold';
comment on column public.arbitrage_opportunities.additional_data is 'Additional metadata about the opportunity in JSONB format';
