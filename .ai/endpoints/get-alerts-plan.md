# API Endpoint Implementation Plan: GET /alerts

## 1. Przegląd punktu końcowego
Endpoint GET /alerts umożliwia pobranie listy alertów dla uwierzytelnionego użytkownika. Umożliwia filtrowanie wyników według statusu oraz zakresu dat, co pozwala użytkownikowi na precyzyjne określenie interesującego go okresu i stanu powiadomień.

## 2. Szczegóły żądania
- **Metoda HTTP:** GET
- **Struktura URL:** /alerts
- **Parametry zapytania:**
  - **status** (opcjonalny): Filtruje alerty według statusu (np. 'sent', 'pending', 'failed').
  - **start_date** (opcjonalny): Początkowa data zakresu filtrowania (format ISO 8601).
  - **end_date** (opcjonalny): Końcowa data zakresu filtrowania (format ISO 8601).
  - **page** (opcjonalny): Numer strony wyników dla paginacji.
  - **limit** (opcjonalny): Liczba wyników na stronę.
- **Request Body:** Brak

## 3. Wykorzystywane typy
- **DTO:** `AlertDTO` (zdefiniowany w `src/types.ts`), reprezentujący strukturę pojedynczego alertu.
- **Dodatkowe typy:** Typy związane z paginacją, jeśli są zaimplementowane w projekcie.

## 4. Szczegóły odpowiedzi
- **200 OK:** Zwraca listę alertów w formacie JSON, gdzie każdy element listy jest zgodny z `AlertDTO`.
- **Kody błędów:**
  - **401 Unauthorized:** Brak ważnego tokena JWT lub nieudana autoryzacja.
  - **400 Bad Request:** Nieprawidłowe parametry zapytania (np. błędny format daty).
  - **500 Internal Server Error:** Błąd po stronie serwera.

## 5. Przepływ danych
1. Klient wysyła żądanie GET /alerts z nagłówkiem `Authorization: Bearer <token>` oraz opcjonalnymi parametrami zapytania.
2. Middleware autoryzacyjne weryfikuje poprawność tokena JWT.
3. Kontroler odbiera żądanie i przekazuje parametry (status, start_date, end_date, page, limit) do warstwy serwisowej.
4. Warstwa serwisowa wykonuje zapytanie do bazy danych (tabela `alerts` zgodnie z db-plan.md) z zastosowaniem odpowiednich filtrów i paginacji.
5. Wyniki są mapowane do `AlertDTO` i zwracane jako odpowiedź JSON.
6. W przypadku błędów, odpowiednie logi są zapisywane, a kontroler zwraca odpowiedni kod błędu.

## 6. Względy bezpieczeństwa
- Wymagana jest autoryzacja przy użyciu JWT.
- Middleware zapewnia, że użytkownik pobiera jedynie swoje alerty (wsparcie dla RLS w bazie danych).
- Walidacja parametrów wejściowych, w tym sprawdzanie formatu daty oraz poprawności wartości parametrów.
- Ochrona przed potencjalnymi atakami takimi jak SQL Injection poprzez stosowanie parametrów zapytań.

## 7. Obsługa błędów
- **401 Unauthorized:** Zwracane, gdy użytkownik nie dostarczy prawidłowego tokena JWT.
- **400 Bad Request:** Zwracane w przypadku niepoprawnych lub niekompletnych parametrów zapytania.
- **500 Internal Server Error:** Zwracane przy nieoczekiwanych błędach w logice serwera lub zapytaniach do bazy danych.
- Wszystkie błędy powinny być logowane (np. do tabeli `audit_logs` lub innego systemu monitoringu) z odpowiednimi detalami.

## 8. Rozważania dotyczące wydajności
- Zastosowanie paginacji (parametry `page` i `limit`) ogranicza ilość danych przetwarzanych w jednym zapytaniu.
- Indeksacja pól `user_id` oraz `timestamp` w tabeli `alerts` poprawi wydajność zapytań filtrujących.
- Możliwość wykorzystania cache'owania dla często wykonywanych zapytań.

## 9. Etapy wdrożenia
1. Utworzenie endpointu GET /alerts w warstwie kontrolera.
2. Implementacja middleware do autoryzacji za pomocą JWT.
3. Walidacja i parsowanie parametrów zapytania (status, start_date, end_date, page, limit).
4. Rozbudowa warstwy serwisowej o metodę pobierania alertów z bazy danych z uwzględnieniem filtrów i paginacji.
5. Mapowanie wyników z bazy danych do obiektów `AlertDTO`.
6. Implementacja mechanizmu logowania błędów (np. zapis do tabeli `audit_logs`).
7. Przeprowadzenie testów jednostkowych oraz integracyjnych (scenariusze poprawne, niepoprawne parametry, brak autoryzacji, itp.).
8. Code Review i wdrożenie na środowisko testowe,
9. Monitorowanie działania endpointu po wdrożeniu produkcyjnym oraz analiza logów. 