# API Endpoint Implementation Plan: POST /subscriptions/upgrade

## 1. Przegląd punktu końcowego
Endpoint POST /subscriptions/upgrade realizuje operację upgrade'u planu subskrypcyjnego użytkownika przy wykorzystaniu integracji ze Stripe. Umożliwia przejście z planu darmowego na plan płatny poprzez weryfikację danych płatniczych oraz autoryzację transakcji za pośrednictwem Stripe.

## 2. Szczegóły żądania
- **Metoda HTTP:** POST
- **Struktura URL:** /subscriptions/upgrade
- **Request Body:**
  ```json
  {
    "payment_method": "string",
    "stripe_token": "string"
  }
  ```
- **Parametry:**
  - `payment_method` (wymagany): Sposób płatności, określony jako string.
  - `stripe_token` (wymagany): Token Stripe uzyskany podczas autoryzacji płatności.
- **Authentication:** Wymagany token JWT przesyłany w nagłówku `Authorization`.

## 3. Wykorzystywane typy
- **Command Model:** `UpgradeSubscriptionCommand` (zdefiniowany w `src/types.ts`) – reprezentuje strukturę żądania upgrade'u subskrypcji.
- **DTO:** `SubscriptionDTO` (zdefiniowany w `src/types.ts`) – reprezentuje zaktualizowane informacje o subskrypcji.

## 4. Szczegóły odpowiedzi
- **200 OK:** Zwracany przy pomyślnym wykonaniu upgrade'u subskrypcji. Odpowiedź zawiera zaktualizowany obiekt subskrypcji zgodny z `SubscriptionDTO`.
- **Kody błędów:**
  - **400 Bad Request:** Dla nieprawidłowych danych wejściowych (np. brak wymaganych pól lub nieprawidłowy format danych).
  - **402 Payment Required:** W przypadku nieudanej autoryzacji płatności lub błędu w transakcji ze Stripe.

## 5. Przepływ danych
1. Klient wysyła żądanie POST /subscriptions/upgrade z nagłówkiem `Authorization: Bearer <token>` oraz odpowiednim JSON w ciele żądania.
2. Middleware autoryzacyjne weryfikuje token JWT.
3. Kontroler odbiera żądanie i waliduje dane wejściowe zgodnie z modelem `UpgradeSubscriptionCommand`.
4. Warstwa serwisowa:
   - Weryfikuje poprawność danych płatniczych.
   - Wysyła żądanie do API Stripe z użyciem `payment_method` oraz `stripe_token`.
   - Na podstawie odpowiedzi od Stripe, aktualizuje status subskrypcji użytkownika w bazie danych (zgodnie z `db-plan.md`).
5. Wynik aktualizacji jest mapowany do `SubscriptionDTO` i zwracany jako odpowiedź JSON.
6. W przypadku wystąpienia błędów, odpowiednie komunikaty są logowane, a kontroler zwraca odpowiedni kod błędu.

## 6. Względy bezpieczeństwa
- Wymagana jest autoryzacja przy użyciu tokena JWT.
- Bezpieczne przetwarzanie i przesyłanie danych płatności przy współpracy ze Stripe.
- Walidacja danych wejściowych aby zapobiec SQL Injection i innym atakom.
- Logowanie błędów oraz monitorowanie operacji płatniczych.

## 7. Obsługa błędów
- **400 Bad Request:** Zwracany dla nieprawidłowych lub niekompletnych danych wejściowych.
- **402 Payment Required:** Zwracany, gdy autoryzacja płatności się nie powiedzie lub wystąpi błąd transakcji.
- Wszystkie błędy powinny być logowane (np. do tabeli `audit_logs` lub systemu monitoringu) z odpowiednimi szczegółami.

## 8. Rozważania dotyczące wydajności
- Optymalizacja operacji aktualizacji danych subskrypcji w bazie danych.
- Minimalizacja opóźnień związanych z komunikacją z API Stripe.
- Rozważenie asynchronicznego przetwarzania transakcji, jeśli to konieczne.

## 9. Etapy wdrożenia
1. Utworzenie endpointu POST /subscriptions/upgrade w warstwie kontrolera.
2. Integracja middleware odpowiedzialnego za weryfikację tokena JWT.
3. Walidacja danych wejściowych przy użyciu modelu `UpgradeSubscriptionCommand`.
4. Implementacja logiki serwisowej:
   - Weryfikacja poprawności danych płatniczych.
   - Komunikacja z API Stripe w celu autoryzacji płatności.
   - Aktualizacja statusu subskrypcji w bazie danych.
5. Mapowanie wyników do `SubscriptionDTO` i zwrócenie odpowiedzi 200 OK.
6. Implementacja obsługi błędów oraz logowania (w tym błędów transakcyjnych).
7. Pisanie testów jednostkowych oraz integracyjnych.
8. Code review oraz wdrożenie na środowisko testowe.
9. Monitorowanie działania endpointu po wdrożeniu i optymalizacja, jeśli to konieczne. 