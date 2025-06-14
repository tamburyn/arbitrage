# Crypto Arbitrage Dashboard

Responsywna aplikacja webowa do monitorowania rynków kryptowalut na wybranych giełdach scentralizowanych (Binance, Kraken, OKX, ByBit, Zonda). System pobiera pełne orderbooki, kalkuluje spready arbitrażowe i dostarcza powiadomienia o okazjach handlowych.

## 🚀 Tech Stack

- **Frontend**: Astro 5 z React 19 i TypeScript 5
- **Backend**: Supabase (PostgreSQL + BaaS)
- **Styling**: Tailwind CSS 4 + Shadcn/ui
- **Testing**: Vitest
- **Hosting**: DigitalOcean z Docker
- **CI/CD**: GitHub Actions

## 📋 Wymagania

- Node.js >= 18.0.0
- npm lub yarn
- Konto Supabase
- PostgreSQL (przez Supabase)

## 🛠️ Instalacja

### 1. Klonowanie repozytorium
```bash
git clone <repository-url>
cd crypto-arbitrage-dashboard
```

### 2. Instalacja zależności
```bash
npm install
```

### 3. Konfiguracja środowiska
```bash
cp .env.example .env
```

Wypełnij plik `.env` swoimi danymi:
```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
NODE_ENV=development
```

### 4. Uruchomienie serwera deweloperskiego
```bash
npm run dev
```

Aplikacja będzie dostępna pod adresem: http://localhost:4321

## 📊 API Endpoints

### GET /api/orderbooks/export

Eksportuje dane orderbooków do pliku CSV w określonym zakresie dat.

#### Parametry zapytania:
- `from` (wymagany): Data rozpoczęcia w formacie ISO 8601 (np. `2024-01-15T10:30:00Z`)
- `to` (wymagany): Data zakończenia w formacie ISO 8601 (np. `2024-02-15T10:30:00Z`)

#### Przykłady użycia:

**Podstawowe zapytanie:**
```bash
curl "http://localhost:4321/api/orderbooks/export?from=2024-01-15T00:00:00Z&to=2024-01-16T00:00:00Z"
```

**Z pomocą JavaScript:**
```javascript
const response = await fetch('/api/orderbooks/export?from=2024-01-15T00:00:00Z&to=2024-01-16T00:00:00Z');
const blob = await response.blob();
const url = window.URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'orderbooks_export.csv';
a.click();
```

#### Odpowiedzi:

**200 OK - Sukces:**
```
Content-Type: text/csv
Content-Disposition: attachment; filename="orderbooks_export_2024-01-15_to_2024-01-16.csv"

id,exchange_id,asset_id,snapshot,spread,timestamp,volume,created_at
1,binance,BTC,"{""bids"":[[50000,1]],""asks"":[[50100,1]]}",100,2024-01-15T10:30:00Z,1000,2024-01-15T10:30:00Z
```

**400 Bad Request - Błędne parametry:**
```json
{
  "error": "Invalid date format for parameter 'from'. Expected ISO 8601 format.",
  "message": "Invalid request parameters"
}
```

**500 Internal Server Error - Błąd serwera:**
```json
{
  "error": "Internal server error",
  "message": "Failed to process orderbooks export request"
}
```

#### Ograniczenia:
- Zakres dat nie może przekroczyć 3 miesięcy
- Parametr `from` nie może być późniejszy niż `to`
- Daty muszą być w formacie ISO 8601

## 🧪 Testowanie

### Uruchomienie testów
```bash
# Uruchom wszystkie testy
npm test

# Uruchom testy w trybie watch
npm run test:watch

# Uruchom testy z pokryciem
npm run test:coverage

# Uruchom testy z interfejsem UI
npm run test:ui
```

### Struktura testów
```
src/
├── utils/
│   ├── orderbook-export.ts          # Funkcje pomocnicze
│   └── orderbook-export.test.ts     # Testy jednostkowe
└── pages/
    └── api/
        └── orderbooks/
            └── export.ts             # Endpoint API
```

## 🏗️ Struktura projektu

```
crypto-arbitrage-dashboard/
├── src/
│   ├── components/                   # Komponenty React
│   ├── db/
│   │   └── database.types.ts        # Typy Supabase
│   ├── pages/
│   │   ├── api/
│   │   │   └── orderbooks/
│   │   │       └── export.ts        # API endpoints
│   │   └── index.astro              # Strona główna
│   ├── types.ts                     # Definicje typów DTO
│   └── utils/
│       ├── orderbook-export.ts      # Funkcje pomocnicze
│       └── orderbook-export.test.ts # Testy
├── astro.config.mjs                 # Konfiguracja Astro
├── package.json                     # Zależności i skrypty
├── tsconfig.json                    # Konfiguracja TypeScript
├── vitest.config.ts                 # Konfiguracja testów
└── README.md                        # Dokumentacja
```

## 🔒 Bezpieczeństwo

### Walidacja danych wejściowych
- Wszystkie parametry są walidowane przed przetworzeniem
- Daty muszą być w formacie ISO 8601
- Ograniczenie zakresu dat do 3 miesięcy

### Ochrona przed atakami
- Parametry zapytań SQL są przygotowane (prepared statements)
- Escape'owanie danych JSON w CSV
- Kontrola typów TypeScript

### Zmienne środowiskowe
- Klucze API przechowywane w zmiennych środowiskowych
- Brak commitowania plików `.env`

## 📈 Monitorowanie

### Logowanie
Endpoint loguje:
- Czas rozpoczęcia i zakończenia operacji
- Liczbę znalezionych rekordów
- Błędy z pełnymi szczegółami
- Nazwy generowanych plików

### Przykład logów:
```
[2024-01-15T10:30:00.000Z] GET /api/orderbooks/export - Start
[2024-01-15T10:30:00.100Z] Fetching orderbooks from 2024-01-15T00:00:00Z to 2024-01-16T00:00:00Z
[2024-01-15T10:30:00.250Z] Found 150 orderbooks
[2024-01-15T10:30:00.300Z] Generated CSV file: orderbooks_export_2024-01-15_to_2024-01-16.csv
```

## 🚀 Deployment

### Budowanie aplikacji
```bash
npm run build
```

### Preview buildu
```bash
npm run preview
```

### Docker (w przygotowaniu)
```bash
docker build -t crypto-arbitrage-dashboard .
docker run -p 4321:4321 crypto-arbitrage-dashboard
```

## 🤝 Contributing

1. Fork projektu
2. Utwórz branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push branch (`git push origin feature/amazing-feature`)
5. Otwórz Pull Request

## 📄 Licencja

Ten projekt jest licencjonowany pod licencją MIT - sprawdź plik [LICENSE](LICENSE) po szczegóły.

## 🙋‍♂️ Wsparcie

W przypadku problemów lub pytań:
- Otwórz issue na GitHubie
- Sprawdź dokumentację Astro: https://docs.astro.build/
- Sprawdź dokumentację Supabase: https://supabase.com/docs