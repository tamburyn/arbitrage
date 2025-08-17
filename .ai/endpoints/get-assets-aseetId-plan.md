# API Endpoint Implementation Plan: GET /assets/{assetId}

## 1. Przegląd punktu końcowego
Endpoint GET /assets/{assetId} służy do pobierania szczegółowych informacji o konkretnym aktywie (asset) w systemie. Umożliwia klientowi uzyskanie danych na podstawie unikalnego identyfikatora aktywa.

## 2. Szczegóły żądania
- **Metoda HTTP:** GET
- **Struktura URL:** /assets/{assetId}
- **Parametry:**
  - **Wymagane:**
    - `assetId` (parametr ścieżki, oczekiwany jako prawidłowy UUID)
  - **Opcjonalne:** Brak
- **Request Body:** Brak

## 3. Wykorzystywane typy
- **DTO:** `AssetDTO` (zdefiniowany w `src/types.ts`) reprezentujący dane aktywa.

## 4. Szczegóły odpowiedzi
- **Sukces:**
  - Kod statusu: 200 OK
  - Treść odpowiedzi: Obiekt typu `AssetDTO` zawierający szczegółowe informacje o aktywie.
  - Przykładowa struktura odpowiedzi:
    ```json
    {
      "id": "uuid",
      "symbol": "string",
      "full_name": "string",
      "description": "string",
      "created_at": "timestamp or null",
      "updated_at": "timestamp or null"
    }
    ```
- **Błędy:**
  - 404 Not Found – gdy nie istnieje aktywo odpowiadające podanemu `assetId`.
  - 500 Internal Server Error – w przypadku nieoczekiwanych błędów serwera.

## 5. Przepływ danych
1. Klient wysyła żądanie GET /assets/{assetId} z podanym `assetId` w ścieżce.
2. Warstwa routingu przekazuje żądanie do kontrolera dedykowanego dla tego endpointu.
3. Kontroler:
   - Waliduje format `assetId` (sprawdzenie, czy jest to poprawny UUID).
   - Przekazuje `assetId` do warstwy serwisowej.
4. Warstwa serwisowa:
   - Wykonuje zapytanie do bazy danych (tabela `assets`) w celu znalezienia aktywa o danym identyfikatorze.
   - Mapuje wynik zapytania na strukturę `AssetDTO`.
5. Kontroler zwraca odpowiedź:
   - 200 OK z danymi, jeśli aktywo zostało znalezione.
   - 404 Not Found, jeśli aktywo nie istnieje.

## 6. Względy bezpieczeństwa
- **Walidacja:** Weryfikacja parametru `assetId` w celu upewnienia się, że jest to poprawny UUID, co chroni przed potencjalnymi atakami np. SQL Injection.
- **Uwierzytelnianie:** Endpoint może być dostępny publicznie, ale w razie potrzeby można dodać mechanizmy uwierzytelniania.
- **Bezpieczeństwo danych:** Zapytania do bazy danych powinny być wykonywane przy użyciu przygotowanych zapytań (parametryzacja), aby zapewnić integralność systemu.

## 7. Obsługa błędów
- **404 Not Found:** Zwracany, gdy nie znaleziono aktywa odpowiadającego podanemu `assetId`.
- **500 Internal Server Error:** Zwracany w przypadku wystąpienia nieoczekiwanych błędów serwera.
- **Logowanie błędów:** Wszystkie błędy powinny być logowane, by umożliwić ich późniejszą analizę oraz diagnozę.

## 8. Rozważania dotyczące wydajności
- Zapewnienie, że kolumna `id` w tabeli `assets` jest odpowiednio indeksowana, co umożliwi szybkie wyszukiwanie.
- Minimalizacja obciążenia poprzez optymalizację pojedynczych zapytań oraz ewentualne wdrożenie mechanizmów cache'owania dla często odczytywanych danych.

## 9. Etapy wdrożenia
1. Dodanie trasy GET /assets/{assetId} w warstwie routingu.
2. Implementacja kontrolera:
   - Walidacja parametru `assetId`.
   - Przekazanie `assetId` do warstwy serwisowej.
3. Rozbudowa warstwy serwisowej o funkcję wyszukiwania aktywa w tabeli `assets` na podstawie `assetId`.
4. Mapowanie wyniku zapytania na obiekt `AssetDTO`.
5. Implementacja mechanizmu obsługi błędów (404, 500) wraz z logowaniem.
6. Pisanie testów jednostkowych oraz integracyjnych dla endpointu.
7. Przeprowadzenie przeglądu kodu (code review) oraz testowanie w środowisku staging.
8. Wdrożenie endpointu do środowiska produkcyjnego i monitorowanie jego działania. 