# API Endpoint Implementation Plan: GET /assets

## 1. Przegląd punktu końcowego
Endpoint GET /assets ma na celu zwrócenie listy wszystkich aktywów (assets) dostępnych w systemie. Endpoint ten wspiera filtrowanie oraz paginację wyników przy użyciu parametrów zapytania.

## 2. Szczegóły żądania
- **Metoda HTTP:** GET
- **Struktura URL:** /assets
- **Parametry zapytania (Query Parameters):**
  - `filter` (opcjonalny) – służy do filtrowania wyników, np. według symbolu lub nazwy.
  - `sort` (opcjonalny) – określa kolejność sortowania wyników, np. "name" lub "-created_at".
  - `page` (opcjonalny) – numer strony dla paginacji.
  - `limit` (opcjonalny) – ilość wyników na stronę.
- **Request Body:** Brak

## 3. Wykorzystywane typy
- **DTO:** `AssetDTO` (zdefiniowany w `src/types.ts`) reprezentujący dane aktywów.
- (Opcjonalnie) Można rozważyć użycie dodatkowego wrappera dla paginacji, np. `PaginatedAssetsDTO`, jednak nie jest to wymagane przez aktualną specyfikację.

## 4. Szczegóły odpowiedzi
- **Sukces:**
  - Kod statusu: 200 OK
  - Treść odpowiedzi: Lista obiektów typu `AssetDTO` lub obiekt zawierający dane oraz informacje o paginacji.
  - Przykładowa struktura odpowiedzi (z wrapperem paginacyjnym):
    ```json
    {
      "data": [
        {
          "id": "uuid",
          "symbol": "string",
          "full_name": "string",
          "description": "string",
          "created_at": "timestamp or null",
          "updated_at": "timestamp or null"
        }
      ],
      "pagination": {
        "page": 1,
        "limit": 10,
        "total": 100
      }
    }
    ```
  - Alternatywnie, odpowiedź może być prostą tablicą obiektów `AssetDTO`.

## 5. Przepływ danych
1. Klient wysyła żądanie GET /assets z opcjonalnymi parametrami zapytania `filter`, `sort`, `page` i `limit`.
2. Warstwa routingu przekazuje żądanie do dedykowanego kontrolera.
3. Kontroler:
   - Odczytuje i weryfikuje parametry zapytania.
   - Przekazuje parametry do warstwy serwisowej.
4. Warstwa serwisowa:
   - Buduje zapytanie do bazy danych na podstawie przekazanych filtrów oraz parametrów paginacji.
   - Wykonuje zapytanie do tabeli `assets` i mapuje wynik na listę obiektów `AssetDTO` (ewentualnie wraz z metadanymi paginacji).
5. Kontroler zwraca odpowiedź 200 OK z wynikami.

## 6. Względy bezpieczeństwa
- **Uwierzytelnianie:** Endpoint może być publicznie dostępny, ale w razie potrzeby można dodać mechanizmy uwierzytelniania.
- **Walidacja:** Parametry zapytania należy walidować, aby upewnić się, że spełniają wymagany format (np. liczby dla `page` i `limit`).
- **Bezpieczeństwo danych:** Zapytania do bazy danych powinny być parametryzowane, aby zapobiec atakom typu SQL Injection.

## 7. Obsługa błędów
- **400 Bad Request:** Zwrot, gdy parametry zapytania mają nieprawidłowy format lub wartości.
- **500 Internal Server Error:** Zwrot w przypadku nieoczekiwanych błędów po stronie serwera.
- **Logowanie błędów:** Błędy powinny być logowane i monitorowane w systemie.

## 8. Rozważania dotyczące wydajności
- Używanie indeksów dla kolumn wykorzystywanych w filtrach i sortowaniu.
- Efektywna paginacja, aby unikać zwracania zbyt dużej liczby rekordów.
- Możliwość wdrożenia cache'owania dla popularnych zapytań.

## 9. Etapy wdrożenia
1. Dodanie trasy GET /assets w warstwie routingu.
2. Implementacja kontrolera: walidacja parametrów, przekazanie do warstwy serwisowej.
3. Rozbudowa logiki w warstwie serwisowej o dynamiczne budowanie zapytań z uwzględnieniem filtrów i paginacji.
4. Mapowanie wyników z bazy danych na obiekty `AssetDTO` (opcjonalnie z wrapperem dla paginacji).
5. Implementacja mechanizmu obsługi błędów (400, 500) wraz z logowaniem.
6. Pisanie testów jednostkowych oraz integracyjnych.
7. Przeprowadzenie przeglądu kodu (code review) oraz testowanie w środowisku staging.
8. Wdrożenie do środowiska produkcyjnego i monitorowanie wydajności. 