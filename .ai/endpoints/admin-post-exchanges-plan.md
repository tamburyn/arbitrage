# API Endpoint Implementation Plan: (Admin) POST /exchanges

## 1. Przegląd punktu końcowego
Endpoint (Admin) POST /exchanges umożliwia tworzenie nowej giełdy (exchange) w systemie. Dostęp do tego endpointu ma wyłącznie administrator, a operacja polega na dodaniu nowego rekordu do tabeli `exchanges` w bazie danych.

## 2. Szczegóły żądania
- **Metoda HTTP:** POST
- **Struktura URL:** /exchanges
- **Parametry:**
  - **Wymagane:** Nie dotyczy – wszystkie dane przekazywane są w ciele żądania
  - **Opcjonalne:** Brak
- **Request Body (JSON):**
  ```json
  {
    "name": "string",
    "api_endpoint": "string",
    "integration_status": "active|inactive",
    "metadata": { ... }
  }
  ```
  Klient musi wysłać poprawne dane w formacie zgodnym z modelem `CreateExchangeCommand`.

## 3. Wykorzystywane typy
- **DTO:** `ExchangeDTO` (zdefiniowany w `src/types.ts`), reprezentujący pełne dane giełdy.
- **Command Model:** `CreateExchangeCommand` – model wykorzystywany do przyjmowania danych przy tworzeniu nowej giełdy, oparty na `ExchangeDTO` z wykluczeniem pól takich jak `id`, `created_at` i `updated_at`.

## 4. Szczegóły odpowiedzi
- **Sukces:**
  - Kod statusu: 201 Created
  - Treść odpowiedzi: Obiekt typu `ExchangeDTO` reprezentujący nowo utworzoną giełdę.
  - Przykładowa struktura odpowiedzi:
    ```json
    {
      "id": "uuid",
      "name": "string",
      "api_endpoint": "string",
      "integration_status": "active|inactive",
      "metadata": { ... } or null,
      "created_at": "timestamp or null",
      "updated_at": "timestamp or null"
    }
    ```
- **Błędy:**
  - 400 Bad Request – w przypadku błędnych lub niekompletnych danych wejściowych.
  - 401 Unauthorized – gdy użytkownik nie posiada uprawnień administratora.
  - 500 Internal Server Error – dla nieoczekiwanych błędów po stronie serwera.

## 5. Przepływ danych
1. Klient wysyła żądanie POST /exchanges z wymaganym JSON w ciele żądania.
2. Warstwa routingu kieruje żądanie do kontrolera odpowiedzialnego za tworzenie nowych giełd.
3. Kontroler wykonuje następujące czynności:
   - Weryfikuje autentyczność użytkownika oraz sprawdza, czy użytkownik posiada uprawnienia administratora.
   - Waliduje dane wejściowe zgodnie z modelem `CreateExchangeCommand` (np. poprawność wartości `integration_status`).
   - Przekazuje dane do warstwy serwisowej.
4. Warstwa serwisowa:
   - Mapuje dane wejściowe na format akceptowany przez bazę danych.
   - Wykonuje operację INSERT w tabeli `exchanges`.
   - Zwraca nowo utworzony rekord jako obiekt `ExchangeDTO`.
5. Kontroler zwraca odpowiedź 201 Created z danymi nowo utworzonej giełdy.

## 6. Względy bezpieczeństwa
- **Uwierzytelnianie i autoryzacja:** Endpoint musi być zabezpieczony mechanizmem uwierzytelniania (np. Supabase Auth) oraz autoryzacji, aby tylko użytkownicy z rolą administratora mogli z niego korzystać.
- **Walidacja danych:** Dane wejściowe muszą być dokładnie walidowane, aby zapobiec przekazaniu błędnych lub złośliwych informacji (np. nieprawidłowy format `integration_status`).
- **Bezpieczeństwo bazy danych:** Stosowanie przygotowanych zapytań (parametryzacja) oraz odpowiednie mechanizmy kontroli uprawnień w bazie danych.

## 7. Obsługa błędów
- **400 Bad Request:** Zwracany, gdy dane wejściowe nie spełniają wymagań walidacyjnych (np. brak wymaganych pól lub nieprawidłowy format danych).
- **401 Unauthorized:** Zwracany, gdy użytkownik nie jest zalogowany lub nie posiada uprawnień administratora.
- **500 Internal Server Error:** Zwracany w przypadku nieoczekiwanych błędów podczas operacji na bazie danych lub wewnętrznych problemów serwera.
- **Logowanie błędów:** Wszystkie błędy powinny być logowane, a w razie potrzeby zapisywane także w tabeli `audit_logs`.

## 8. Rozważania dotyczące wydajności
- Operacja tworzenia nowego rekordu jest zazwyczaj szybka, jednak warto zwrócić uwagę na:
   - Optymalizację zapytań INSERT.
   - Monitorowanie obciążenia systemu w momencie dużej liczby operacji tworzenia.
   - Możliwość wdrożenia mechanizmu cache'owania, jeśli podobne dane są często odczytywane tuż po utworzeniu.

## 9. Etapy wdrożenia
1. Utworzenie lub aktualizacja routingu, aby obsłużyć endpoint POST /exchanges z wymuszeniem autoryzacji administratora.
2. Implementacja funkcji kontrolera:
   - Walidacja danych wejściowych według modelu `CreateExchangeCommand`.
   - Sprawdzenie uprawnień użytkownika.
   - Przekazanie danych do warstwy serwisowej.
3. Rozbudowa warstwy serwisowej o funkcję tworzenia nowego rekordu w tabeli `exchanges`.
4. Implementacja mapowania danych wejściowych na model bazy danych oraz generowanie odpowiedzi jako `ExchangeDTO`.
5. Realizacja mechanizmu obsługi błędów (400, 401, 500) wraz z odpowiednim logowaniem.
6. Pisanie testów jednostkowych oraz integracyjnych dla nowego endpointu.
7. Przeprowadzenie przeglądu kodu (code review) oraz testowanie w środowisku staging.
8. Wdrożenie endpointu do środowiska produkcyjnego i monitorowanie jego działania. 