# Schemat Bazy Danych - Crypto Arbitrage Dashboard

## 1. Lista tabel z kolumnami, typami danych i ograniczeniami

### 1.1. Tabela: users

This table is managed by Supabase Auth.

- **id**: UUID PRIMARY KEY DEFAULT gen_random_uuid()
- **email**: VARCHAR NOT NULL UNIQUE
- **hashed_password**: VARCHAR NOT NULL
- **first_name**: VARCHAR
- **last_name**: VARCHAR
- **registration_date**: TIMESTAMPTZ NOT NULL DEFAULT now()
- **role**: VARCHAR NOT NULL CHECK (role IN ('admin', 'user'))
- **notification_settings**: JSONB  -- (opcjonalne ustawienia powiadomień)

### 1.2. Tabela: exchanges
- **id**: UUID PRIMARY KEY DEFAULT gen_random_uuid()
- **name**: VARCHAR NOT NULL
- **api_endpoint**: TEXT NOT NULL
- **integration_status**: VARCHAR NOT NULL  -- (np. 'active', 'inactive')
- **metadata**: JSONB  -- (dodatkowe metadane)

### 1.3. Tabela: assets
- **id**: UUID PRIMARY KEY DEFAULT gen_random_uuid()
- **symbol**: VARCHAR NOT NULL
- **full_name**: VARCHAR
- **description**: TEXT

### 1.4. Tabela: orderbooks
- **id**: UUID PRIMARY KEY DEFAULT gen_random_uuid()
- **exchange_id**: UUID NOT NULL REFERENCES exchanges(id) ON DELETE CASCADE
- **asset_id**: UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE
- **snapshot**: JSONB NOT NULL  -- (pełny orderbook zapisany jako JSONB)
- **timestamp**: TIMESTAMPTZ NOT NULL
- **volume**: NUMERIC  -- (opcjonalna metryka)
- **spread**: NUMERIC NOT NULL CHECK (spread > 0)

  *Partycjonowanie:* Zaleca się partycjonowanie tej tabeli według miesiąca na podstawie kolumny `timestamp` (możliwa zmiana na partycjonowanie dzienne w razie potrzeby).

### 1.5. Tabela: alerts
- **id**: UUID PRIMARY KEY DEFAULT gen_random_uuid()
- **user_id**: UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE
- **exchange_id**: UUID NOT NULL REFERENCES exchanges(id)
- **asset_id**: UUID NOT NULL REFERENCES assets(id)
- **timestamp**: TIMESTAMPTZ NOT NULL
- **spread**: NUMERIC NOT NULL CHECK (spread > 0)
- **send_status**: VARCHAR NOT NULL  -- (np. 'sent', 'pending', 'failed')
- **additional_info**: JSONB  -- (dodatkowe informacje o alarmie)

### 1.6. Tabela: subscriptions
- **id**: UUID PRIMARY KEY DEFAULT gen_random_uuid()
- **user_id**: UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE
- **status**: VARCHAR NOT NULL  -- (np. 'active', 'inactive', 'cancelled')
- **start_date**: TIMESTAMPTZ NOT NULL
- **end_date**: TIMESTAMPTZ
- **payment_method**: VARCHAR NOT NULL

### 1.7. Tabela: watchlist
- **id**: UUID PRIMARY KEY DEFAULT gen_random_uuid()
- **user_id**: UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE
- **asset_id**: UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE
- **added_date**: TIMESTAMPTZ NOT NULL DEFAULT now()

  *Ograniczenie:* Unikalny indeks na parze (user_id, asset_id) zapobiega duplikatom.

### 1.8. Tabela: settings
- **id**: UUID PRIMARY KEY DEFAULT gen_random_uuid()
- **user_id**: UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE
- **notification_config**: JSONB NOT NULL  -- (konfiguracja powiadomień)
- **alert_preferences**: JSONB NOT NULL  -- (preferencje alertów)

### 1.9. Tabela: audit_logs
- **id**: UUID PRIMARY KEY DEFAULT gen_random_uuid()
- **user_id**: UUID REFERENCES users(id)
- **operation**: VARCHAR NOT NULL  -- (typ operacji, np. INSERT, UPDATE, DELETE)
- **entity**: VARCHAR NOT NULL  -- (nazwa tabeli lub encji)
- **entity_id**: UUID  -- (ID zmodyfikowanego rekordu)
- **timestamp**: TIMESTAMPTZ NOT NULL DEFAULT now()
- **details**: JSONB  -- (szczegóły operacji)

## 2. Relacje między tabelami

- `users` (1) ↔ (N) `alerts`, `subscriptions`, `watchlist`, `settings`, `audit_logs`
- `exchanges` (1) ↔ (N) `orderbooks`, `alerts`
- `assets` (1) ↔ (N) `orderbooks`, `alerts`
- Relacja wiele-do-wielu między `users` a `assets` jest realizowana przez tabelę `watchlist`.

## 3. Indeksy

- **Users:**
  - Unikalny indeks na kolumnie `email`.

- **Orderbooks:**
  - Indeks na kolumnie `timestamp`.
  - Indeks na kolumnie `exchange_id`.
  - Indeks na kolumnie `asset_id`.

- **Alerts:**
  - Indeks na kolumnie `user_id` oraz `timestamp` w celu optymalizacji zapytań i wsparcia mechanizmów rate-limiting.

- **Watchlist:**
  - Unikalny indeks kompozytowy na kolumnach `(user_id, asset_id)`.

- Dodatkowe indeksy na kolumnach kluczy obcych w razie potrzeby.

## 4. Zasady PostgreSQL (RLS)

Wdrożenie Row Level Security (RLS) dla tabel zawierających dane wrażliwe:

- **Users:** Użytkownicy mają dostęp tylko do swoich własnych danych.
- **Alerts:** Użytkownicy widzą tylko swoje alerty.
- **Subscriptions:** Użytkownicy mają dostęp tylko do swoich subskrypcji.

(Dodatkowe zasady RLS można rozszerzyć wraz z rozwojem produktu.)

## 5. Dodatkowe uwagi

- **Partycjonowanie:** Tabela `orderbooks` powinna być partycjonowana według przedziałów czasowych (preferencyjnie miesięcznie) dla lepszej skalowalności. W razie potrzeby można zmienić partycjonowanie na dzienne.

- **Rate-limiting:** Mechanizmy ograniczania liczby wysyłanych alertów (np. 1 alert na minutę dla tej samej pary) powinny być wdrożone na poziomie logiki aplikacyjnej, wspierane przez odpowiednie indeksy w bazie danych.

- **Audyt:** Tabela `audit_logs` służy do rejestrowania operacji modyfikujących dane, co jest kluczowe dla zgodności z RODO/GDPR.

- **Elastyczność:** Schemat został zaprojektowany z myślą o przyszłej rozbudowie (dodanie nowych ustawień użytkownika, rozszerzenie metryk itd.) oraz o normalizacji do 3NF, co minimalizuje redundancję danych. 