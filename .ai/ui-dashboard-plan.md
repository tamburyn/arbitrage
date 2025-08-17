# Plan implementacji widoku Dashboard

## 1. Przegląd
Dashboard jest centralnym widokiem aplikacji Crypto Arbitrage Dashboard. Jego głównym celem jest prezentacja w czasie rzeczywistym najważniejszych danych arbitrażowych pochodzących z wielu giełd kryptowalut. Widok łączy tabelę okazji, wykresy trendów, mapę ciepła spreadów oraz panel szczegółów, udostępniając użytkownikom narzędzia do szybkiej identyfikacji i analizy potencjalnych transakcji.

## 2. Routing widoku
- Ścieżka: `/dashboard`
- Ochrona trasy: wymaga uwierzytelnionej sesji Supabase; niezalogowanych przekierować na `/login`.

## 3. Struktura komponentów
```
DashboardPage
 ├── SummaryCards
 ├── FiltersSidebar
 ├── FavoritesSection
 ├── ConnectionStatusBar
 ├── OpportunityTable
 │    └── TableRow (✱ klikalny)
 ├── SpreadChart
 ├── HeatmapMatrix
 ├── SidePanelDetails (portal)
 └── NotificationsToasts (global)
```

## 4. Szczegóły komponentów
### 4.1 SummaryCards
- Opis: 4 karty KPI pokazujące średni spread, liczbę aktywnych okazji, najlepszy spread oraz zmianę do poprzedniego okresu.
- Elementy: `<Card>`, `<TrendArrow/>`, `<CountUp/>`.
- Interakcje: hover – tooltip z definicją metryki.
- Walidacja: brak (dane tylko do odczytu).
- Typy: `SummaryStatsVM`.
- Propsy: `{ data: SummaryStatsVM }`.

### 4.2 FiltersSideBar
- Opis: Zestaw filtrów (giełda, para, spread %, cena), live search oraz przycisk "Reset".
- Elementy: `<Select/>`, `<RangeSlider/>`, `<Input/>`, `<Button/>`.
- Interakcje: onChange filtrów → aktualizacja `filters` w stanie globalnym.
- Walidacja: spread 0-100 %, cena ≥ 0.
- Typy: `FilterState`.
- Propsy: `{ state: FilterState, onChange: (s:FilterState)=>void }`.

### 4.3 FavoritesSection
- Opis: Lista ulubionych par użytkownika.
- Elementy: `Badge`, ikona gwiazdki (toggle).
- Interakcje: click gwiazdki → add/remove z `favorites`.
- Walidacja: max 10 pozycji.
- Typy: `FavoritePair`.
- Propsy: `{ pairs: FavoritePair[], onToggle:(p:FavoritePair)=>void }`.

### 4.4 ConnectionStatusBar
- Opis: Pasek statusu z ikonami (zielony/żółty/czerwony) dla każdej giełdy.
- Elementy: `<StatusDot/>`, `<Tooltip/>`.
- Interakcje: hover → tooltip z timestampem i liczbą błędów.
- Walidacja: brak.
- Typy: `ExchangeStatusVM`.
- Propsy: `{ statuses: ExchangeStatusVM[] }`.

### 4.5 OpportunityTable
- Opis: Główna tabela okazji z sortowaniem i podświetleniem nowych wierszy (<30 s).
- Elementy: `<Table>`, `<TableHeader/>`, `<TableRow/>`, `<Pagination/>` (mobile trigger scroll).
- Interakcje: sort header click, row click → `onSelect(opportunity)`.
- Walidacja: poprawność danych liczbowych (> 0).
- Typy: `OpportunityVM[]`.
- Propsy: `{ rows: OpportunityVM[], onSelect:(o:OpportunityVM)=>void, sort:SortState, onSort:(s:SortState)=>void }`.

### 4.6 SpreadChart ✅ ZAIMPLEMENTOWANY
- Opis: Liniowy wykres historii spreadów z wyborem zakresu 1h/6h/24h.
- Elementy: `<LineChart/> (Recharts)`, `<TimeRangeSelector/>`, `<CustomTooltip/>`.
- Interakcje: change segment → refetch, hover → tooltip z detalami.
- Walidacja: poprawny zakres czasu.
- Typy: `SpreadHistoryPoint[]`, `TimeRange`.
- Propsy: `{ selectedAsset?: string, selectedExchange?: string, height?: number }`.
- Funkcjonalności: Threshold line, statystyki (avg/max/min), responsywny design.

### 4.1 SummaryCards ✅ ZAIMPLEMENTOWANY
- Opis: 4 karty KPI z animacjami pokazujące kluczowe metryki arbitrażu.
- Elementy: `<Card>`, `<CountUp/>`, ikony trendów.
- Interakcje: hover effects, animacje liczników.
- Walidacja: brak (dane tylko do odczytu).
- Typy: `SummaryCardVM`, `ArbitrageSummaryDTO`.
- Propsy: dane z kontekstu ArbitrageContext.
- Metryki: Active Opportunities, Average Spread, Best Opportunity, Total Volume.

### 4.5 OpportunityTable ✅ ZAIMPLEMENTOWANY
- Opis: Główna tabela okazji arbitrażowych z sortowaniem i filtrowaniem.
- Elementy: `<Table>`, `<SortableHeader/>`, `<Badge/>`, paginacja.
- Interakcje: sort headers, row click → select opportunity, new opportunity highlighting.
- Walidacja: poprawność danych liczbowych.
- Typy: `ArbitrageOpportunityVM[]`, `SortState`.
- Propsy: `{ onSelectOpportunity?: (opp: ArbitrageOpportunityVM) => void }`.
- Funkcjonalności: Time ago, profit badges, price formatting, type indicators.


### 4.7 SidePanelDetails
- Opis: Wysuwany panel z pełnym orderbookiem, historią spreadu i analityką wolumenu.
- Elementy: `<Drawer/>`, `<OrderbookTable/>`, `<VolumeChart/>`, `<ButtonClose/>`.
- Interakcje: ESC / Close → onClose.
- Walidacja: brak.
- Typy: `OrderbookEntry[]`, `OpportunityVM`.
- Propsy: `{ opportunity: OpportunityVM|null, onClose:()=>void }`.

### 4.9 NotificationsToasts
- Opis: Globalne toasty informujące o nowych okazjach (> próg) oraz błędach.
- Elementy: `<Toast/>` (limit 3).
- Interakcje: auto-hide 5 s, manual close.
- Walidacja: limit toasts.
- Typy: `ToastMessage`.
- Propsy: sterowane przez provider kontekstowy.

## 5. Typy
```ts
// DTO z backendu
export interface OpportunityDTO {
  id: string;
  pair: string; // BTC/USDT
  buyExchange: string;
  sellExchange: string;
  spreadPct: number;
  volume: number;
  depthUsd: number;
  trustScore: number;
  estProfitUsd: number;
  updatedAt: string; // ISO
}

export interface SummaryStatsDTO { avgSpread: number; activeCount: number; bestSpread: number; prevAvgSpread: number; }
export interface SpreadHistoryDTO { timestamp: string; spreadPct: number; pair: string; }
export interface HeatmapDTO { buy: string; sell: string; spreadPct: number; }
export interface ExchangeStatusDTO { exchange: string; status: "up"|"degraded"|"down"; lastUpdate: string; failCount: number; }

// ViewModels (frontend)
export type OpportunityVM = OpportunityDTO & { isNew: boolean };
export interface SummaryStatsVM { current: number; label:string; delta:number; isPositive:boolean; }
export interface FilterState { exchanges:string[]; pairs:string[]; spreadRange:[number,number]; priceRange:[number,number]; }
export interface SpreadHistoryPoint { time:Date; spreadPct:number; }
export interface HeatmapCellVM { buy:string; sell:string; spreadPct:number; colorClass:string; }
export interface ExchangeStatusVM extends ExchangeStatusDTO { color:"green"|"yellow"|"red"; }
export interface FavoritePair { pair:string; }
export interface ToastMessage { id:string; type:"info"|"error"|"success"; text:string; }
export type SortState = { column:string; direction:"asc"|"desc" };
export type TimeRange = "1h"|"6h"|"24h";
```

## 6. Zarządzanie stanem
- Kontekst `DashboardContext` przechowujący: `opportunities`, `summary`, `filters`, `favorites`, `selectedOpportunity`, `spreadHistory`, `heatmap`, `exchangeStatus`, `sortState`, `toasts`, `loading`, `error`.
- Custom hook `useDashboardData(intervalMs=30000)` pobiera wszystkie dane równolegle (SWRE – stale-while-revalidate) i aktualizuje kontekst.
- `useFilters()` do lokalnej logiki mergowania/validacji filtrów.

## 7. Integracja API
| Akcja | Endpoint | Metoda | Query | Odpowiedź |
|-------|----------|--------|-------|-----------|
| Pobierz okazje | `/api/opportunities` | GET | ?filters | OpportunityDTO[] |
| Pobierz KPI | `/api/summary` | GET | — | SummaryStatsDTO |
| Pobierz historię | `/api/spread-history` | GET | pair, range | SpreadHistoryDTO[] |
| Pobierz orderbook | `/api/orderbook` | GET | exchange, pair | OrderbookEntry[] |
| Pobierz heatmapę | `/api/heatmap` | GET | — | HeatmapDTO[] |
| Pobierz status | `/api/status` | GET | — | ExchangeStatusDTO[] |

SDK Supabase może być użyty do fetchu; fallback `fetch` + `abortController` dla 5 s timeout.

## 8. Interakcje użytkownika
1. Zmiana filtrów → filtrowanie tabeli i wykresów w locie.
2. Klik w nagłówek kolumny → sort.
3. Klik w wiersz tabeli → otwarcie `SidePanelDetails`.
4. Klik w gwiazdkę → dodanie/ usunięcie z ulubionych.
5. Hover na wykresie/heatmapie → tooltip z danymi.
6. Zmiana zakresu czasu → refetch historii.
7. Klik Fullscreen → włączenie trybu pełnoekranowego.
8. Toast pojawia się, gdy spread przekroczy próg lub wystąpi błąd fetchu.

## 9. Warunki i walidacja
- Spread % ∈ [0,100]; cena ≥ 0.
- Range slider musi mieć min ≤ max.
- Max 10 ulubionych par → przy próbie dodania 11. toast error.
- Przy sortowaniu muszą istnieć dane w kolumnie.
- Przy otwieraniu panelu wymagane `selectedOpportunity != null`.

## 10. Obsługa błędów
- Timeout 5 s → toast error + retry exponential back-off.
- API `status = down` → czerwony wskaźnik.
- Pusty response → placeholder "Brak danych".
- Websocket disconnect → auto-reconnect + toast.

## 11. Kroki implementacji
1. Utworzenie trasy `/dashboard` w Astro (`src/pages/dashboard.astro`).
2. Zaimplementowanie `DashboardContext` i `useDashboardData`.
3. Stworzenie szkieletu komponentów zgodnie z hierarchią.
4. Implementacja `SummaryCards` wraz z animacją `CountUp`.
5. Implementacja `FiltersBar` z obsługą stanu i walidacją.
6. Implementacja `OpportunityTable` (tailwind + HeadlessTable shadcn/ui) z sortowaniem i podświetleniem nowych.
7. Implementacja `SidePanelDetails` z portalem i orderbookiem.
8. Implementacja `SpreadChart` (Recharts) z wyborem zakresu.
9. Implementacja `HeatmapMatrix` (d3-heatmap) z legendą.
10. Dodanie `ConnectionStatusBar` i globalnych toastów.
11. Dodanie obsługi ulubionych + lokalne storage.
12. Testy jednostkowe hooków (Vitest) i komponentów (Testing Library).
13. Testy e2e scenariuszy kluczowych (Cypress).
14. Optymalizacja wydajności (lazy + intersection observer) i responsywność.
15. Code review, QA, merge do `main`. Deployment CI/CD. 