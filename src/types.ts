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