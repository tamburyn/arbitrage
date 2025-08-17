-- Migration: Create Crypto Arbitrage Dashboard Schema
-- Description: Creates the complete database schema for the crypto arbitrage dashboard
-- including all tables, indexes, RLS policies, and constraints
-- Date: 2024-12-30
-- Author: Database Schema Migration
-- Affected Tables: exchanges, assets, orderbooks, alerts, subscriptions, watchlist, settings, audit_logs
-- Special Considerations: 
--   - Orderbooks table should be partitioned by month for scalability
--   - RLS policies implemented for data security
--   - Comprehensive indexing for performance optimization

-- enable required extensions
create extension if not exists "uuid-ossp";

-- =============================================================================
-- TABLES CREATION
-- =============================================================================

-- -----------------------------------------------------------------------------
-- exchanges table
-- stores information about cryptocurrency exchanges
-- -----------------------------------------------------------------------------
create table public.exchanges (
    id uuid primary key default gen_random_uuid(),
    name varchar not null,
    api_endpoint text not null,
    integration_status varchar not null,
    metadata jsonb,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- enable rls for exchanges table
alter table public.exchanges enable row level security;

-- -----------------------------------------------------------------------------
-- assets table
-- stores information about cryptocurrency assets/tokens
-- -----------------------------------------------------------------------------
create table public.assets (
    id uuid primary key default gen_random_uuid(),
    symbol varchar not null,
    full_name varchar,
    description text,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- enable rls for assets table
alter table public.assets enable row level security;

-- -----------------------------------------------------------------------------
-- orderbooks table
-- stores orderbook snapshots from exchanges
-- note: this table should be partitioned by month for better performance
-- -----------------------------------------------------------------------------
create table public.orderbooks (
    id uuid primary key default gen_random_uuid(),
    exchange_id uuid not null references public.exchanges(id) on delete cascade,
    asset_id uuid not null references public.assets(id) on delete cascade,
    snapshot jsonb not null,
    timestamp timestamptz not null,
    volume numeric,
    spread numeric not null check (spread > 0),
    created_at timestamptz default now()
);

-- enable rls for orderbooks table
alter table public.orderbooks enable row level security;

-- -----------------------------------------------------------------------------
-- alerts table
-- stores alert notifications sent to users
-- -----------------------------------------------------------------------------
create table public.alerts (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    exchange_id uuid not null references public.exchanges(id),
    asset_id uuid not null references public.assets(id),
    timestamp timestamptz not null,
    spread numeric not null check (spread > 0),
    send_status varchar not null,
    additional_info jsonb,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- enable rls for alerts table
alter table public.alerts enable row level security;

-- -----------------------------------------------------------------------------
-- subscriptions table
-- stores user subscription information
-- -----------------------------------------------------------------------------
create table public.subscriptions (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    status varchar not null,
    start_date timestamptz not null,
    end_date timestamptz,
    payment_method varchar not null,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- enable rls for subscriptions table
alter table public.subscriptions enable row level security;

-- -----------------------------------------------------------------------------
-- watchlist table
-- stores user's watchlisted assets (many-to-many relationship)
-- -----------------------------------------------------------------------------
create table public.watchlist (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    asset_id uuid not null references public.assets(id) on delete cascade,
    added_date timestamptz not null default now(),
    created_at timestamptz default now()
);

-- enable rls for watchlist table
alter table public.watchlist enable row level security;

-- -----------------------------------------------------------------------------
-- settings table
-- stores user-specific configuration settings
-- -----------------------------------------------------------------------------
create table public.settings (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    notification_config jsonb not null,
    alert_preferences jsonb not null,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- enable rls for settings table
alter table public.settings enable row level security;

-- -----------------------------------------------------------------------------
-- audit_logs table
-- stores audit trail for compliance and debugging
-- -----------------------------------------------------------------------------
create table public.audit_logs (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id),
    operation varchar not null,
    entity varchar not null,
    entity_id uuid,
    timestamp timestamptz not null default now(),
    details jsonb,
    created_at timestamptz default now()
);

-- enable rls for audit_logs table
alter table public.audit_logs enable row level security;

-- =============================================================================
-- INDEXES CREATION
-- =============================================================================

-- exchanges indexes
create index idx_exchanges_name on public.exchanges(name);
create index idx_exchanges_integration_status on public.exchanges(integration_status);

-- assets indexes
create index idx_assets_symbol on public.assets(symbol);
create index idx_assets_full_name on public.assets(full_name);

-- orderbooks indexes (critical for performance)
create index idx_orderbooks_timestamp on public.orderbooks(timestamp);
create index idx_orderbooks_exchange_id on public.orderbooks(exchange_id);
create index idx_orderbooks_asset_id on public.orderbooks(asset_id);
create index idx_orderbooks_spread on public.orderbooks(spread);
create index idx_orderbooks_exchange_asset on public.orderbooks(exchange_id, asset_id);

-- alerts indexes (for rate limiting and user queries)
create index idx_alerts_user_id on public.alerts(user_id);
create index idx_alerts_timestamp on public.alerts(timestamp);
create index idx_alerts_user_timestamp on public.alerts(user_id, timestamp);
create index idx_alerts_send_status on public.alerts(send_status);

-- subscriptions indexes
create index idx_subscriptions_user_id on public.subscriptions(user_id);
create index idx_subscriptions_status on public.subscriptions(status);
create index idx_subscriptions_dates on public.subscriptions(start_date, end_date);

-- watchlist indexes with unique constraint to prevent duplicates
create unique index idx_watchlist_user_asset_unique on public.watchlist(user_id, asset_id);
create index idx_watchlist_user_id on public.watchlist(user_id);
create index idx_watchlist_asset_id on public.watchlist(asset_id);

-- settings indexes
create index idx_settings_user_id on public.settings(user_id);

-- audit_logs indexes
create index idx_audit_logs_user_id on public.audit_logs(user_id);
create index idx_audit_logs_timestamp on public.audit_logs(timestamp);
create index idx_audit_logs_operation on public.audit_logs(operation);
create index idx_audit_logs_entity on public.audit_logs(entity);

-- =============================================================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================================================

-- -----------------------------------------------------------------------------
-- exchanges table policies
-- exchanges are public data - all users can read, only authenticated users can manage
-- -----------------------------------------------------------------------------

-- policy for anonymous users to select exchanges
create policy "exchanges_select_anon" on public.exchanges
    for select
    to anon
    using (true);

-- policy for authenticated users to select exchanges
create policy "exchanges_select_auth" on public.exchanges
    for select
    to authenticated
    using (true);

-- policy for authenticated users to insert exchanges
create policy "exchanges_insert_auth" on public.exchanges
    for insert
    to authenticated
    with check (true);

-- policy for authenticated users to update exchanges
create policy "exchanges_update_auth" on public.exchanges
    for update
    to authenticated
    using (true)
    with check (true);

-- policy for authenticated users to delete exchanges
create policy "exchanges_delete_auth" on public.exchanges
    for delete
    to authenticated
    using (true);

-- -----------------------------------------------------------------------------
-- assets table policies
-- assets are public data - all users can read, only authenticated users can manage
-- -----------------------------------------------------------------------------

-- policy for anonymous users to select assets
create policy "assets_select_anon" on public.assets
    for select
    to anon
    using (true);

-- policy for authenticated users to select assets
create policy "assets_select_auth" on public.assets
    for select
    to authenticated
    using (true);

-- policy for authenticated users to insert assets
create policy "assets_insert_auth" on public.assets
    for insert
    to authenticated
    with check (true);

-- policy for authenticated users to update assets
create policy "assets_update_auth" on public.assets
    for update
    to authenticated
    using (true)
    with check (true);

-- policy for authenticated users to delete assets
create policy "assets_delete_auth" on public.assets
    for delete
    to authenticated
    using (true);

-- -----------------------------------------------------------------------------
-- orderbooks table policies
-- orderbooks are public data for transparency
-- -----------------------------------------------------------------------------

-- policy for anonymous users to select orderbooks
create policy "orderbooks_select_anon" on public.orderbooks
    for select
    to anon
    using (true);

-- policy for authenticated users to select orderbooks
create policy "orderbooks_select_auth" on public.orderbooks
    for select
    to authenticated
    using (true);

-- policy for authenticated users to insert orderbooks
create policy "orderbooks_insert_auth" on public.orderbooks
    for insert
    to authenticated
    with check (true);

-- policy for authenticated users to update orderbooks
create policy "orderbooks_update_auth" on public.orderbooks
    for update
    to authenticated
    using (true)
    with check (true);

-- policy for authenticated users to delete orderbooks
create policy "orderbooks_delete_auth" on public.orderbooks
    for delete
    to authenticated
    using (true);

-- -----------------------------------------------------------------------------
-- alerts table policies
-- users can only access their own alerts
-- -----------------------------------------------------------------------------

-- policy for authenticated users to select their own alerts
create policy "alerts_select_auth" on public.alerts
    for select
    to authenticated
    using (auth.uid() = user_id);

-- policy for authenticated users to insert their own alerts
create policy "alerts_insert_auth" on public.alerts
    for insert
    to authenticated
    with check (auth.uid() = user_id);

-- policy for authenticated users to update their own alerts
create policy "alerts_update_auth" on public.alerts
    for update
    to authenticated
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

-- policy for authenticated users to delete their own alerts
create policy "alerts_delete_auth" on public.alerts
    for delete
    to authenticated
    using (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- subscriptions table policies
-- users can only access their own subscriptions
-- -----------------------------------------------------------------------------

-- policy for authenticated users to select their own subscriptions
create policy "subscriptions_select_auth" on public.subscriptions
    for select
    to authenticated
    using (auth.uid() = user_id);

-- policy for authenticated users to insert their own subscriptions
create policy "subscriptions_insert_auth" on public.subscriptions
    for insert
    to authenticated
    with check (auth.uid() = user_id);

-- policy for authenticated users to update their own subscriptions
create policy "subscriptions_update_auth" on public.subscriptions
    for update
    to authenticated
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

-- policy for authenticated users to delete their own subscriptions
create policy "subscriptions_delete_auth" on public.subscriptions
    for delete
    to authenticated
    using (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- watchlist table policies
-- users can only access their own watchlist items
-- -----------------------------------------------------------------------------

-- policy for authenticated users to select their own watchlist
create policy "watchlist_select_auth" on public.watchlist
    for select
    to authenticated
    using (auth.uid() = user_id);

-- policy for authenticated users to insert their own watchlist items
create policy "watchlist_insert_auth" on public.watchlist
    for insert
    to authenticated
    with check (auth.uid() = user_id);

-- policy for authenticated users to update their own watchlist items
create policy "watchlist_update_auth" on public.watchlist
    for update
    to authenticated
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

-- policy for authenticated users to delete their own watchlist items
create policy "watchlist_delete_auth" on public.watchlist
    for delete
    to authenticated
    using (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- settings table policies
-- users can only access their own settings
-- -----------------------------------------------------------------------------

-- policy for authenticated users to select their own settings
create policy "settings_select_auth" on public.settings
    for select
    to authenticated
    using (auth.uid() = user_id);

-- policy for authenticated users to insert their own settings
create policy "settings_insert_auth" on public.settings
    for insert
    to authenticated
    with check (auth.uid() = user_id);

-- policy for authenticated users to update their own settings
create policy "settings_update_auth" on public.settings
    for update
    to authenticated
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

-- policy for authenticated users to delete their own settings
create policy "settings_delete_auth" on public.settings
    for delete
    to authenticated
    using (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- audit_logs table policies
-- users can only access their own audit logs, system can access all
-- -----------------------------------------------------------------------------

-- policy for authenticated users to select their own audit logs
create policy "audit_logs_select_auth" on public.audit_logs
    for select
    to authenticated
    using (auth.uid() = user_id or user_id is null);

-- policy for system to insert audit logs
create policy "audit_logs_insert_auth" on public.audit_logs
    for insert
    to authenticated
    with check (true);

-- audit logs are read-only for users, only system can update/delete
create policy "audit_logs_update_auth" on public.audit_logs
    for update
    to authenticated
    using (false)
    with check (false);

create policy "audit_logs_delete_auth" on public.audit_logs
    for delete
    to authenticated
    using (false);

-- =============================================================================
-- ADDITIONAL CONSTRAINTS AND TRIGGERS
-- =============================================================================

-- add check constraints for enum-like values
alter table public.exchanges 
    add constraint check_integration_status 
    check (integration_status in ('active', 'inactive', 'maintenance'));

alter table public.alerts 
    add constraint check_send_status 
    check (send_status in ('sent', 'pending', 'failed'));

alter table public.subscriptions 
    add constraint check_subscription_status 
    check (status in ('active', 'inactive', 'cancelled', 'expired'));

alter table public.subscriptions 
    add constraint check_subscription_dates 
    check (end_date is null or end_date > start_date);

-- add unique constraint to prevent duplicate user settings
alter table public.settings 
    add constraint unique_user_settings 
    unique (user_id);

-- create function to update updated_at timestamp
create or replace function update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

-- create triggers for updated_at columns
create trigger update_exchanges_updated_at
    before update on public.exchanges
    for each row execute function update_updated_at_column();

create trigger update_assets_updated_at
    before update on public.assets
    for each row execute function update_updated_at_column();

create trigger update_alerts_updated_at
    before update on public.alerts
    for each row execute function update_updated_at_column();

create trigger update_subscriptions_updated_at
    before update on public.subscriptions
    for each row execute function update_updated_at_column();

create trigger update_settings_updated_at
    before update on public.settings
    for each row execute function update_updated_at_column();

-- =============================================================================
-- COMMENTS ON TABLES AND COLUMNS
-- =============================================================================

comment on table public.exchanges is 'Stores cryptocurrency exchange information and API endpoints';
comment on table public.assets is 'Stores cryptocurrency asset/token information';
comment on table public.orderbooks is 'Stores orderbook snapshots from exchanges - should be partitioned by month';
comment on table public.alerts is 'Stores alert notifications sent to users';
comment on table public.subscriptions is 'Stores user subscription information';
comment on table public.watchlist is 'Many-to-many relationship between users and assets they are watching';
comment on table public.settings is 'Stores user-specific configuration settings';
comment on table public.audit_logs is 'Stores audit trail for compliance and debugging purposes';

comment on column public.orderbooks.snapshot is 'Full orderbook data stored as JSONB for flexibility';
comment on column public.orderbooks.spread is 'Calculated spread value - must be positive';
comment on column public.alerts.additional_info is 'Additional metadata about the alert in JSONB format';
comment on column public.settings.notification_config is 'User notification preferences in JSONB format';
comment on column public.settings.alert_preferences is 'User alert preferences in JSONB format';
comment on column public.audit_logs.details is 'Additional details about the audited operation in JSONB format'; 