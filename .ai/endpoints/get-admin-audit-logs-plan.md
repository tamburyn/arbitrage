# API Endpoint Implementation Plan: GET /admin/audit-logs

## 1. Przegląd punktu końcowego
Endpoint służy do pobierania logów audytu z bazy danych. Umożliwia filtrowanie logów na podstawie:
- ID użytkownika (`userId`),
- nazwy encji (`entity`),
- zakresu dat (`start_date` oraz `end_date`).

Dostęp do punktu końcowego wymaga uprawnień administratora, co gwarantuje, że tylko autoryzowani użytkownicy mogą odczytywać dane audytu.

## 2. Szczegóły żądania
- **Metoda HTTP:** GET
- **Ścieżka URL:** `/admin/audit-logs`
- **Parametry zapytania:**
  - **Opcjonalne:**
    - `userId` (string, UUID): filtruje logi dla konkretnego użytkownika
    - `entity` (string): filtruje logi według danej encji lub tabeli
    - `start_date` (string, ISO date): określa początek zakresu czasowego
    - `end_date` (string, ISO date): określa koniec zakresu czasowego
    - `page` (number): numer strony używany do paginacji (domyślnie 1)
    - `limit` (number): liczba rekordów na stronę (domyślna wartość ustalana przez system)
- **Request Body:** Brak

## 3. Wykorzystywane typy
- **DTO:**
  - `AuditLogDTO` (z pliku `src/types.ts`), zawierający pola:
    - `id`, `entity`, `entity_id`, `details`, `operation`, `timestamp`, `created_at`, `user_id`
- **Command Modele:** Brak, ponieważ operacja GET nie wymaga treści żądania

## 4. Szczegóły odpowiedzi
- **Sukces:**
  - HTTP 200 OK
  - Treść odpowiedzi:
    - Lista obiektów zgodnych z modelem `AuditLogDTO`
    - Opcjonalnie: metadane paginacji (np. `currentPage`, `totalPages`, `totalRecords`)
- **Błędy:**
  - HTTP 400 Bad Request – nieprawidłowe parametry (np. zły format daty, niepoprawny UUID, błędne wartości paginacji)
  - HTTP 403 Forbidden – brak uprawnień administratora
  - HTTP 500 Internal Server Error – błędy serwera lub nieoczekiwane wyjątki

## 5. Przepływ danych
1. Klient wysyła zapytanie GET na endpoint `/admin/audit-logs` z opcjonalnymi parametrami.
2. Middleware autoryzacji weryfikuje, czy użytkownik posiada rolę admina.
3. Walidacja parametrów:
   - Sprawdzenie poprawności UUID dla `userId`.
   - Weryfikacja formatu ISO dla pól `start_date` i `end_date`.
   - Sprawdzenie, czy `page` i `limit` są liczbami.
4. Budowanie parametryzowanego zapytania do tabeli `audit_logs` z uwzględnieniem podanych filtrów.
5. Wykonanie zapytania do bazy danych (przy użyciu ORM lub bezpiecznych, parametryzowanych zapytań SQL).
6. Mapowanie wyników do struktury `AuditLogDTO`.
7. Zwrócenie wyniku serverem w odpowiedzi HTTP 200 OK.

## 6. Względy bezpieczeństwa
- **Autoryzacja:** Endpoint musi być dostępny wyłącznie dla użytkowników z rolą admin.
- **Walidacja:** Wszystkie wejściowe dane muszą być walidowane pod kątem poprawności (UUID, format daty, liczby dla paginacji), aby zapobiec SQL Injection i innym atakom.
- **Parametryzacja zapytań:** Użycie parametryzowanych zapytań lub ORM w celu bezpiecznego komunikowania się z bazą danych.
- **Logowanie błędów:** Wszelkie błędy autoryzacji lub walidacji powinny być odpowiednio logowane.

## 7. Obsługa błędów
- **403 Forbidden:** Zwracane, gdy użytkownik nie posiada uprawnień admina.
- **400 Bad Request:** W przypadku nieprawidłowych parametrów, takich jak niewłaściwy format daty, błędny UUID lub niepoprawne wartości `page`/`limit`.
- **500 Internal Server Error:** W przypadku niespodziewanych błędów serwera lub problemów z bazą danych.

## 8. Rozważania dotyczące wydajności
- **Paginacja:** Wykorzystanie parametrów `page` i `limit` do ograniczenia liczby zwracanych rekordów, co jest kluczowe przy dużej liczbie logów.
- **Indeksy w bazie:** Upewnienie się, że tabela `audit_logs` posiada indeksy na kolumnach `timestamp`, `user_id` oraz `entity` dla szybszego filtrowania.
- **Optymalizacja zapytań:** Konstrukcja dynamicznych, parametryzowanych zapytań w celu uniknięcia pełnych skanów tabeli.
- **Ewentualne cachowanie:** Rozważenie cachowania wyników dla najczęściej wykonywanych zapytań w przyszłych iteracjach.

## 9. Etapy wdrożenia
1. **Autoryzacja:** Implementacja middleware weryfikującego, czy użytkownik posiada rolę admina.
2. **Definicja endpointu:** Utworzenie wskazanego endpointu GET `/admin/audit-logs` w wybranym frameworku (np. Express, Koa, itp.).
3. **Walidacja parametrów:** Integracja bibliotek walidacyjnych (np. Joi lub express-validator) do walidacji parametrów zapytania.
4. **Budowanie zapytania:** Implementacja logiki budowania zapytania do bazy danych z wykorzystaniem parametrów filtrujących oraz paginacji.
5. **Mapowanie danych:** Konwersja wyników zapytania do struktury `AuditLogDTO`.
6. **Testowanie:**
   - Testy jednostkowe walidacji parametrów i autoryzacji.
   - Testy integracyjne przepływu danych między endpointem a bazą danych.
   - Testy bezpieczeństwa (sprawdzenie, że tylko admin może korzystać z endpointu).
7. **Monitorowanie:** Implementacja mechanizmów logowania i monitoringu, aby wychwycić i analizować błędy oraz problemy wydajnościowe.
8. **Przegląd i optymalizacja:** Przeprowadzenie przeglądu wdrożenia, testów obciążeniowych i optymalizacji zapytań do bazy, w razie potrzeby. 