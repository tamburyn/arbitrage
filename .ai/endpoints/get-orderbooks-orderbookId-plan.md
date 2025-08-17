# API Endpoint Implementation Plan: GET /orderbooks/{orderbookId}

## 1. Przegląd punktu końcowego
Endpoint GET /orderbooks/{orderbookId} służy do pobierania pełnych informacji o konkretnym snapshot'cie orderbooku, w tym danych o zleceniach i wyliczonych metrykach. Umożliwia klientowi uzyskanie szczegółowych danych na podstawie unikalnego identyfikatora orderbooku.

## 2. Szczegóły żądania
- **Metoda HTTP:** GET
- **Struktura URL:** /orderbooks/{orderbookId}
- **Parametry:**
  - **Wymagane:**
    - `orderbookId` (parametr ścieżki, oczekiwany jako prawidłowy UUID)
  - **Opcjonalne:** Brak
- **Request Body:** Brak

## 3. Wykorzystywane typy
- **DTO:** `OrderbookDTO` (zdefiniowany w `src/types.ts`) – zawiera szczegółowe dane orderbooku, w tym informacje o zleceniach i wyliczone metryki.

## 4. Szczegóły odpowiedzi
- **Sukces:**
  - Kod statusu: 200 OK
  - Treść odpowiedzi: Obiekt typu `OrderbookDTO` z pełnymi szczegółami snapshotu orderbooku.
  - Przykładowa struktura odpowiedzi:
    ```json
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
    ```
- **Błędy:**
  - 404 Not Found – gdy nie istnieje snapshot orderbooku o podanym `orderbookId`.
  - 500 Internal Server Error – w przypadku nieoczekiwanych błędów serwera.

## 5. Przepływ danych
1. Klient wysyła żądanie GET /orderbooks/{orderbookId} z podanym `orderbookId` w ścieżce.
2. Warstwa routingu przekazuje żądanie do dedykowanego kontrolera.
3. Kontroler:
   - Waliduje format `orderbookId` (sprawdzenie, czy jest to poprawny UUID).
   - Przekazuje `orderbookId` do warstwy serwisowej.
4. Warstwa serwisowa:
   - Wykonuje zapytanie do bazy danych (tabela `orderbooks`) w celu pobrania pełnych danych orderbooku.
   - Mapuje wynik zapytania na strukturę `OrderbookDTO`.
5. Kontroler zwraca odpowiedź:
   - 200 OK z pełnymi danymi, jeśli rekord został znaleziony.
   - 404 Not Found, jeśli rekord nie istnieje.

## 6. Względy bezpieczeństwa
- **Walidacja:** Rygorystyczna weryfikacja parametru `orderbookId` w celu ochrony przed nieprawidłowymi danymi oraz atakami (np. SQL Injection).
- **Bezpieczeństwo danych:** Użycie przygotowanych zapytań do bazy danych.
- **Opcjonalnie:** Mechanizmy uwierzytelniania, jeśli dane orderbooku są wrażliwe.

## 7. Obsługa błędów
- **404 Not Found:** Zwracany, gdy nie znaleziono orderbooku o podanym `orderbookId`.
- **500 Internal Server Error:** Zwracany w przypadku nieoczekiwanych błędów serwera.
- **Logowanie błędów:** Wszystkie błędy powinny być logowane w celu diagnostycznym.

## 8. Rozważania dotyczące wydajności
- Upewnienie się, że kolumna `id` w tabeli `orderbooks` jest odpowiednio indeksowana dla szybkiego wyszukiwania.
- Optymalizacja zapytań dla minimalizacji czasu odpowiedzi przy pobieraniu szczegółowych danych.

## 9. Etapy wdrożenia
1. Dodanie trasy GET /orderbooks/{orderbookId} w warstwie routingu.
2. Implementacja kontrolera:
   - Walidacja parametru `orderbookId`.
   - Przekazanie `orderbookId` do warstwy serwisowej.
3. Rozbudowa warstwy serwisowej o funkcję pobierania pełnych danych orderbooku.
4. Mapowanie wyników zapytania na obiekt `OrderbookDTO`.
5. Implementacja mechanizmu obsługi błędów (404, 500) wraz z logowaniem.
6. Pisanie testów jednostkowych oraz integracyjnych.
7. Przeprowadzenie przeglądu kodu (code review) oraz testów w środowisku staging.
8. Wdrożenie endpointu do środowiska produkcyjnego i monitorowanie jego działania. 