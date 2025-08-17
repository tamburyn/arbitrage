/*
 * DTO and Command Models for the Arbitrage API
 * 
 * Każdy DTO/Command Model odnosi się bezpośrednio lub pośrednio do definicji encji w bazie danych.
 * Używamy typów zdefiniowanych w 'src/db/database.types.ts' (np. Json) dla zachowania spójności.
 */

import type { Json } from './db/database.types';

// 1. Users
// DTO zwracany przez GET /users/me
export interface UserDTO {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  registration_date: string; // timestamp
  role: 'admin' | 'user';
  notification_settings: Json;
}

// Command Model dla PUT /users/me
export interface UpdateUserCommand {
  first_name?: string;
  last_name?: string;
  notification_settings?: Json;
}

// 2. Exchanges
// DTO dla danych giełdy, odpowiada modelowi 'exchanges' z bazy danych
export interface ExchangeDTO {
  id: string;
  name: string;
  api_endpoint: string;
  integration_status: 'active' | 'inactive';
  metadata: Json | null;
  created_at: string | null;
  updated_at: string | null;
}

// Command Model dla POST /exchanges (tworzenie nowej giełdy)
// Bazuje na ExchangeDTO, z wykluczeniem identyfikatorów i znaczników czasu
export type CreateExchangeCommand = Omit<ExchangeDTO, 'id' | 'created_at' | 'updated_at'>;

// 3. Assets
// DTO dla aktywów, odpowiada modelowi 'assets'
export interface AssetDTO {
  id: string;
  symbol: string;
  full_name: string | null;
  description: string | null;
  created_at: string | null;
  updated_at: string | null;
}

// 4. Orderbooks
// DTO dla orderbooków, odpowiada modelowi 'orderbooks'
export interface OrderbookDTO {
  id: string;
  asset_id: string;
  exchange_id: string;
  snapshot: Json;
  spread: number;
  timestamp: string;
  volume: number | null;
  created_at: string | null;
  // Opcjonalne pola dodane przez joiny dla ułatwienia w UI
  exchange_name?: string;
  asset_symbol?: string;
}

// DTO dla zapytań eksportu orderbooków (GET /orderbooks/export)
export interface ExportOrderbooksQueryDTO {
  from: string; // ISO date string
  to: string;   // ISO date string
}

// 5. Alerts
// DTO dla alertów, odpowiada modelowi 'alerts'
export interface AlertDTO {
  id: string;
  asset_id: string;
  exchange_id: string;
  spread: number;
  send_status: string;
  additional_info: Json | null;
  timestamp: string;
  created_at: string | null;
  updated_at: string | null;
  user_id: string;
}

// Command Model dla POST /alerts (tworzenie nowego alertu)
// Używamy notacji camelCase dla pól w komendzie
export interface CreateAlertCommand {
  assetId: string;
  exchangeId: string;
  spread: number;
  additional_info?: Json | null;
}

// 6. Subscriptions
// DTO dla subskrypcji, odpowiada modelowi 'subscriptions'
export interface SubscriptionDTO {
  id: string;
  user_id: string;
  payment_method: string;
  start_date: string;
  end_date: string | null;
  status: string;
  created_at: string | null;
  updated_at: string | null;
}

// Command Model dla POST /subscriptions/upgrade
export interface UpgradeSubscriptionCommand {
  payment_method: string;
  stripe_token: string;
}

// 7. Watchlist
// DTO dla pozycji na watchliście, odpowiada modelowi 'watchlist'
export interface WatchlistDTO {
  id: string;
  user_id: string;
  asset_id: string;
  created_at: string | null;
  added_date: string;
}

// Command Model dla POST /watchlist (dodanie aktywa do watchlisty)
export interface CreateWatchlistCommand {
  assetId: string;
}

// 8. Settings
// DTO dla ustawień użytkownika, odpowiada modelowi 'settings'
export interface SettingsDTO {
  id: string;
  user_id: string;
  notification_config: Json;
  alert_preferences: Json;
  created_at: string | null;
  updated_at: string | null;
}

// Command Model dla PUT /settings/me
export interface UpdateSettingsCommand {
  notification_config: Json;
  alert_preferences: Json;
}

// 9. Audit Logs
// DTO dla logów audytu, odpowiada modelowi 'audit_logs'
export interface AuditLogDTO {
  id: string;
  entity: string;
  entity_id: string | null;
  details: Json | null;
  operation: string;
  timestamp: string;
  created_at: string | null;
  user_id: string | null;
}

// 10. Admin - Update Alert Threshold
// Command Model dla PUT /admin/alert-threshold
export interface UpdateAlertThresholdCommand {
  threshold: number;
}

// 11. Admin - Metrics
// DTO dla metryk systemowych (GET /admin/metrics)
export interface AdminMetricsDTO {
  error_rate: number;
  success_rate: number;
  // Opcjonalnie można dodać inne metryki
}

// 12. Arbitrage Opportunities
// DTO dla okazji arbitrażowych, odpowiada modelowi 'arbitrage_opportunities'
export interface ArbitrageOpportunityDTO {
  id: string;
  timestamp: string;
  type: 'intra_exchange' | 'inter_exchange';
  asset_id: string;
  exchange_id: string;
  exchange_from_id: string | null;
  exchange_to_id: string | null;
  spread_percentage: string; // decimal as string
  potential_profit_percentage: string; // decimal as string
  volume: string; // decimal as string
  buy_price: string; // decimal as string
  sell_price: string; // decimal as string
  threshold_used: string; // decimal as string
  is_profitable: boolean;
  additional_data: Json;
  created_at: string;
}

// ViewModel dla komponentów frontend (przekształcone z DTO)
export interface ArbitrageOpportunityVM extends Omit<ArbitrageOpportunityDTO, 'spread_percentage' | 'potential_profit_percentage' | 'volume' | 'buy_price' | 'sell_price' | 'threshold_used'> {
  spread_percentage: number;
  potential_profit_percentage: number;
  volume: number;
  buy_price: number;
  sell_price: number;
  threshold_used: number;
  isNew: boolean; // czy okazja jest nowa (<30s)
  symbol?: string; // z additional_data
  exchange_name?: string; // z additional_data lub join
  price_difference: number; // sell_price - buy_price
  formatted_volume: string; // np. "$6,783.30"
}

// DTO dla podsumowania KPI arbitrażu
export interface ArbitrageSummaryDTO {
  active_opportunities_count: number;
  average_spread: number;
  best_spread: number;
  total_volume: number;
  previous_period_avg_spread?: number; // dla porównania trendu
}

// ViewModel dla SummaryCards
export interface SummaryCardVM {
  id: string;
  label: string;
  current: number;
  previous?: number;
  delta?: number;
  isPositive?: boolean;
  formatType: 'number' | 'percentage' | 'currency';
  icon?: string;
}

// DTO dla historii spreadów
export interface SpreadHistoryDTO {
  timestamp: string;
  spread_percentage: number;
  asset_symbol: string;
  exchange_name: string;
  volume: number;
}

// ViewModel dla SpreadChart
export interface SpreadHistoryPoint {
  time: Date;
  spread_percentage: number;
  volume: number;
  asset_symbol: string;
  exchange_name: string;
  buy_price: number;
  sell_price: number;
  potential_profit_percentage: number;
}

// Typy dla filtrowania i sortowania
export interface ArbitrageFilters {
  exchanges: string[];
  assets: string[];
  types: ('intra_exchange' | 'inter_exchange')[];
  spread_range: [number, number];
  volume_range: [number, number];
  only_profitable: boolean;
}

export interface SortState {
  column: keyof ArbitrageOpportunityVM;
  direction: 'asc' | 'desc';
}

export type TimeRange = '1h' | '6h' | '24h';

// Context state type
export interface ArbitrageContextState {
  opportunities: ArbitrageOpportunityVM[];
  summary: ArbitrageSummaryDTO | null;
  spreadHistory: SpreadHistoryPoint[];
  filters: ArbitrageFilters;
  sortState: SortState;
  selectedTimeRange: TimeRange;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  showFavouritesOnly: boolean;
  userFavourites: { exchanges: string[]; assets: string[] };
  isAuthenticated: boolean;
} 