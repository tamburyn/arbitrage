# API Endpoint Implementation Plan: GET /orderbooks

## 1. Przegląd punktu końcowego
Endpoint GET /orderbooks ma na celu pobranie migawki (snapshot) orderbooków dla giełd, z możliwością filtrowania wyników na podstawie: exchangeId, assetId oraz zakresu dat (start_date, end_date). Endpoint wspiera także paginację oraz sortowanie wyników.

## 2. Szczegóły żądania
- **Metoda HTTP:** GET
- **Struktura URL:** /orderbooks
- **Parametry zapytania (Query Parameters):**
  - `exchangeId` (opcjonalny) – filtr orderbooków według identyfikatora giełdy.
  - `assetId` (opcjonalny) – filtr orderbooków według identyfikatora aktywa.
  - `start_date` (opcjonalny) – dolna granica zakresu dat (format ISO).
  - `end_date` (opcjonalny) – górna granica zakresu dat (format ISO).
  - `page` (opcjonalny) – numer strony dla paginacji.
  - `limit` (opcjonalny) – liczba wyników na stronę.
  - `sort` (opcjonalny) – kolejność sortowania wyników, np. "-timestamp" dla sortowania malejącego.
- **Request Body:** Brak

## 3. Wykorzystywane typy
- **DTO:** `OrderbookDTO` (zdefiniowany w `src/types.ts`) reprezentujący dane orderbooku.
- (Opcjonalnie) Można zastosować wrapper dla paginacji, np. `PaginatedOrderbooksDTO`.

## 4. Szczegóły odpowiedzi
- **Sukces:**
  - Kod statusu: 200 OK
  - Treść odpowiedzi: Lista obiektów typu `OrderbookDTO` lub obiekt zawierający dane wraz z informacjami paginacyjnymi.
  - Przykładowa struktura odpowiedzi (z wrapperem paginacyjnym):
    ```json
    {
      "data": [
        {
          "id": "uuid",
          "exchange_id": "uuid",
          "asset_id": "uuid",
          "snapshot": { ... },
          "spread": 0.01,
          "timestamp": "ISO timestamp",
          "volume": 123.45,
          "created_at": "timestamp or null"
        }
      ],
      "pagination": {
        "page": 1,
        "limit": 10,
        "total": 50
      }
    }
    ```
- **Błędy:**
  - 400 Bad Request – w przypadku nieprawidłowych parametrów zapytania.

## 5. Przepływ danych
1. Klient wysyła żądanie GET /orderbooks wraz z opcjonalnymi parametrami zapytania.
2. Warstwa routingu przekazuje żądanie do odpowiedniego kontrolera.
3. Kontroler:
   - Waliduje przekazane parametry (np. format daty, liczby dla page/limit).
   - Przekazuje parametry do warstwy serwisowej.
4. Warstwa serwisowa:
   - Buduje zapytanie do bazy danych uwzględniające filtry, paginację i sortowanie.
   - Pobiera dane z tabeli `orderbooks` i mapuje wyniki na obiekty `OrderbookDTO` (ewentualnie w paginowanej strukturze).
5. Kontroler zwraca odpowiedź 200 OK z wynikami.

## 6. Względy bezpieczeństwa
- **Walidacja:** Upewnienie się, że przekazane parametry (np. daty, liczby) są w poprawnym formacie.
- **Bezpieczeństwo danych:** Użycie przygotowanych zapytań do bazy danych w celu zapobiegania SQL Injection.
- **Opcjonalnie:** Mechanizm uwierzytelniania, jeśli dane orderbooków mają charakter wrażliwy.

## 7. Obsługa błędów
- **400 Bad Request:** Zwrot w przypadku nieprawidłowych parametrów zapytania.
- **Logowanie błędów:** Błędy powinny być logowane dla celów diagnostycznych.

## 8. Rozważania dotyczące wydajności
- Wykorzystanie indeksów dla kolumn używanych przy filtrowaniu i sortowaniu (np. timestamp).
- Optymalizacja zapytań oraz mechanizmu paginacji, aby nie pobierać nadmiernej liczby rekordów.

## 9. Etapy wdrożenia
1. Dodanie trasy GET /orderbooks w warstwie routingu.
2. Implementacja kontrolera: walidacja parametrów i przekazanie ich do warstwy serwisowej.
3. Rozbudowa logiki w warstwie serwisowej o dynamiczne budowanie zapytań z uwzględnieniem filtrów, paginacji i sortowania.
4. Mapowanie wyników zapytania na obiekty `OrderbookDTO` (lub paginowaną strukturę).
5. Implementacja mechanizmu obsługi błędów (400) wraz z logowaniem.
6. Pisanie testów jednostkowych i integracyjnych.
7. Przeprowadzenie przeglądu kodu (code review) oraz testów w środowisku staging.
8. Wdrożenie do produkcji i monitorowanie wydajności. 