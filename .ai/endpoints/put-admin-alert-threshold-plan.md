# API Endpoint Implementation Plan: PUT /admin/alert-threshold

## 1. Przegląd punktu końcowego
Endpoint umożliwia aktualizację globalnego progu rozpięcia alertów. Pozwala administratorowi na zmianę wartości, która decyduje o tym, kiedy system powinien generować alerty w odniesieniu do spreadu. Zmiana tego progu wpływa na sposób monitorowania i wyzwalania alertów w systemie.

## 2. Szczegóły żądania
- **Metoda HTTP:** PUT
- **Ścieżka URL:** `/admin/alert-threshold`
- **Request JSON:**
  ```json
  {
    "threshold": number  // np. 2 dla 2%
  }
  ```
- **Request Body:** JSON zawierający pole `threshold`.

## 3. Wykorzystywane typy
- **Command Model:** `UpdateAlertThresholdCommand` (z pliku `src/types.ts`)
  - Właściwości:
    - `threshold` (number)

## 4. Szczegóły odpowiedzi
- **Sukces:**
  - HTTP 200 OK
  - Potwierdzenie, że globalny próg alertu został zaktualizowany. Odpowiedź może zawierać nową wartość progu lub komunikat potwierdzający operację.
- **Błędy:**
  - HTTP 400 Bad Request – w przypadku nieprawidłowej lub niekompletnej wartości `threshold`
  - HTTP 403 Forbidden – gdy użytkownik nie posiada uprawnień administratora

## 5. Przepływ danych
1. Klient wysyła żądanie PUT na endpoint `/admin/alert-threshold` z ciałem zawierającym wartość `threshold`.
2. Middleware autoryzacji weryfikuje, czy żądanie pochodzi od użytkownika z rolą admin.
3. Walidacja danych wejściowych:
   - Sprawdzenie, czy `threshold` jest liczbą.
   - Opcjonalna weryfikacja, czy `threshold` mieści się w dozwolonym zakresie.
4. Logika biznesowa przetwarza aktualizację:
   - Aktualizacja wartości globalnego progu w bazie danych lub konfiguracji aplikacji.
5. Zwrot odpowiedzi potwierdzającej operację (HTTP 200 OK).
6. Opcjonalnie: Rejestracja zmiany w logach audytu.

## 6. Względy bezpieczeństwa
- **Autoryzacja:** Endpoint dostępny wyłącznie dla użytkowników z rolą administratora.
- **Walidacja:** Dokładne sprawdzenie wejściowych danych (sprawdzenie typu i ewentualnych ograniczeń dla `threshold`) w celu zapobiegania nieprawidłowym aktualizacjom i atakom (np. SQL Injection).
- **Parametryzacja:** Wykorzystanie parametryzowanych zapytań lub ORM przy aktualizacji danych w bazie.
- **Logowanie:** Każda operacja zmiany progu powinna być rejestrowana, umożliwiając audyt i śledzenie zmian w systemie.

## 7. Obsługa błędów
- **403 Forbidden:** Zwrot, gdy żądanie pochodzi od użytkownika bez uprawnień administratora.
- **400 Bad Request:** Zwrot, gdy dane wejściowe są nieprawidłowe, np. brak pola `threshold` lub jego niewłaściwy typ.
- **500 Internal Server Error:** Opcjonalnie, dla nieprzewidzianych błędów serwera.

## 8. Rozważania dotyczące wydajności
- Operacja ta modyfikuje pojedynczą wartość globalną, więc obciążenie jest znikome.
- Upewnienie się, że operacja aktualizacji odbywa się za pomocą efektywnego, parametryzowanego zapytania i, jeśli to konieczne, obsługi cache dla globalnych ustawień.

## 9. Etapy wdrożenia
1. **Autoryzacja:** Implementacja lub weryfikacja middleware, aby zapewnić, że dostęp do endpointu mają jedynie administratorzy.
2. **Definicja endpointu:** Utworzenie endpointu PUT `/admin/alert-threshold` w wybranym frameworku backendowym (np. Express, Koa itp.).
3. **Walidacja danych:** Integracja biblioteki walidacyjnej (np. Joi lub express-validator) do sprawdzania poprawności pola `threshold`.
4. **Logika biznesowa:** Implementacja serwisu odpowiedzialnego za aktualizację globalnego progu alertu, w tym wykonanie bezpiecznej aktualizacji w bazie danych lub konfiguracji aplikacji.
5. **Logowanie i audyt:** Dodanie mechanizmów logowania zmiany wartości progu oraz, opcjonalnie, rejestracja operacji w logach audytu.
6. **Testowanie:**
   - Testy jednostkowe walidacji oraz mechanizmów autoryzacji.
   - Testy integracyjne sprawdzające poprawność przepływu danych oraz operacji aktualizacji.
   - Testy bezpieczeństwa, upewniające się, że tylko administratorzy mogą wykonać operację oraz że dane wejściowe są odpowiednio walidowane.
7. **Monitorowanie:** Ustanowienie systemu monitorowania błędów i wydajności dla operacji aktualizacji.
8. **Przegląd i optymalizacja:** Analiza wdrożenia, przegląd logów oraz optymalizacja zapytań w razie potrzeby. 