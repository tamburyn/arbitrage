# API Endpoint Implementation Plan: GET /exchanges

## 1. Przegląd punktu końcowego
Ten endpoint służy do pobrania listy giełd. Umożliwia klientowi uzyskanie uporządkowanych danych z tabeli `exchanges` (zgodnie z definicją w @db-plan.md) przy wykorzystaniu mechanizmu paginacji oraz opcji sortowania.

## 2. Szczegóły żądania
- Metoda HTTP: GET
- Struktura URL: /exchanges
- Parametry (Query Parameters):
  - `page`: numer strony (opcjonalny, domyślnie 1)
  - `limit`: maksymalna liczba wyników na stronie (opcjonalny, domyślnie np. 10 lub 20)
  - `sort`: opcjonalny parametr sortowania (np. według nazwy, daty utworzenia itp.)
- Request Body: Nie dotyczy

## 3. Wykorzystywane typy
- DTO: `ExchangeDTO` zdefiniowany w `src/types.ts`, który zawiera następujące pola:
  - id: string
  - name: string
  - api_endpoint: string
  - integration_status: 'active' | 'inactive'
  - metadata: Json | null
  - created_at: string | null
  - updated_at: string | null

## 4. Szczegóły odpowiedzi
- Struktura odpowiedzi: Tablica obiektów typu `ExchangeDTO`
- Przykładowa odpowiedź JSON:
  ```json
  [
    {
      "id": "UUID",
      "name": "Exchange A",
      "api_endpoint": "https://api.exchangea.com",
      "integration_status": "active",
      "metadata": { ... },
      "created_at": "2023-10-01T12:00:00Z",
      "updated_at": "2023-10-10T12:00:00Z"
    },
    {
      "id": "UUID",
      "name": "Exchange B",
      "api_endpoint": "https://api.exchangeb.com",
      "integration_status": "inactive",
      "metadata": { ... },
      "created_at": "2023-09-15T12:00:00Z",
      "updated_at": "2023-09-20T12:00:00Z"
    }
  ]
  ```
- Kody statusu:
  - 200 OK – Pomyślne pobranie listy giełd
  - 500 Internal Server Error – Błąd po stronie serwera

## 5. Przepływ danych
1. Klient wysyła żądanie GET /exchanges wraz z opcjonalnymi parametrami query (`page`, `limit`, `sort`).
2. Warstwa routingu przekazuje żądanie do odpowiedniej usługi, np. `ExchangeService`.
3. `ExchangeService` weryfikuje i przetwarza parametry paginacji oraz sortowania.
4. Usługa wykonuje zapytanie do bazy danych (tabela `exchanges` z @db-plan.md) z uwzględnieniem limitów, offsetu oraz kryteriów sortowania.
5. Wynik zapytania (tablica obiektów) jest mapowany do formatu `ExchangeDTO`.
6. Endpoint zwraca odpowiedź z kodem 200 oraz listę giełd w formacie JSON.
7. W przypadku wystąpienia błędów (np. problem z bazą danych) zwracany jest kod 500.

## 6. Względy bezpieczeństwa
- Uwierzytelnienie: Endpoint jest ogólnie dostępny, jednak walidacja parametrów wejściowych jest niezbędna, by zapobiec atakom (np. SQL injection).
- Walidacja: Sprawdzenie poprawności parametrów query (page, limit, sort) przy użyciu odpowiednich walidatorów.
- Ochrona przed atakami: Stosowanie przygotowanych zapytań (prepared statements) oraz sanitizacja danych wejściowych.

## 7. Obsługa błędów
- 500 Internal Server Error: Zwracany w przypadku wystąpienia problemów po stronie serwera, takich jak błędy połączenia z bazą danych lub błędy w logice przetwarzania.
- Logowanie błędów: Wszelkie błędy powinny być rejestrowane (np. w tabeli `audit_logs` lub dedykowanym systemie monitoringu) w celu diagnozowania problemów.

## 8. Rozważania dotyczące wydajności
- Paginiacja: Umożliwienie paginacji redukuje obciążenie serwera przy dużej liczbie rekordów.
- Indeksacja: Tabela `exchanges` powinna posiadać indeksy na kolumnach używanych do sortowania i filtrowania.
- Cache: W miarę potrzeb można rozważyć wdrożenie mechanizmu cache do przechowywania wyników często powtarzanych zapytań.

## 9. Etapy wdrożenia
1. Skonfigurowanie routingu w aplikacji (Astro z React) dla obsługi żądania GET /exchanges.
2. Implementacja walidacji parametrów query (page, limit, sort) w middleware lub bezpośrednio w serwisie.
3. Utworzenie lub modyfikacja `ExchangeService` odpowiedzialnej za pobieranie danych z bazy danych (tabela `exchanges` z @db-plan.md) z uwzględnieniem paginacji i sortowania.
4. Mapowanie danych uzyskanych z bazy do struktury DTO `ExchangeDTO`.
5. Dodanie testów jednostkowych oraz integracyjnych w celu weryfikacji poprawności działania endpointu.
6. Implementacja mechanizmu logowania błędów oraz monitoringu.
7. Przeprowadzenie testów wydajnościowych i bezpieczeństwa.
8. Integracja zmian z mechanizmami CI/CD (Github Actions) oraz wdrożenie na środowisko produkcyjne (np. DigitalOcean). 