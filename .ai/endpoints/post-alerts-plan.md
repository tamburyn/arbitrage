# API Endpoint Implementation Plan: POST /alerts

## 1. Przegląd punktu końcowego
Endpoint POST /alerts umożliwia utworzenie nowego alertu na podstawie warunków arbitrażu. Endpoint implementuje kluczowe reguły biznesowe, takie jak:
- `spread` musi być większy od 0
- Ograniczenie częstości: maksymalnie jeden alert na minutę dla tej samej pary aktywów
- Ograniczenia freemium: maksymalnie 3 alerty w ciągu 24 godzin

## 2. Szczegóły żądania
- **Metoda HTTP:** POST
- **Struktura URL:** /alerts
- **Request Body:**
  ```json
  {
    "exchangeId": "UUID",
    "assetId": "UUID",
    "spread": number,
    "additional_info": { ... }
  }
  ```
- **Parametry:**
  - `exchangeId` (wymagany): Identyfikator giełdy (UUID)
  - `assetId` (wymagany): Identyfikator aktywa (UUID)
  - `spread` (wymagany): Liczba, która musi być większa od 0
  - `additional_info` (opcjonalny): Obiekt z dodatkowymi informacjami

## 3. Wykorzystywane typy
- **Command Model:** `CreateAlertCommand` (zdefiniowany w `src/types.ts`) – reprezentuje strukturę żądania utworzenia alertu.
- **DTO:** `AlertDTO` (zdefiniowany w `src/types.ts`) – reprezentuje strukturę utworzonego alertu zwracanego w odpowiedzi.

## 4. Szczegóły odpowiedzi
- **201 Created:** Zwracany przy pomyślnym utworzeniu alertu. Odpowiedź zawiera obiekt alertu zgodny z `AlertDTO`, w tym status powiadomienia.
- **Kody błędów:**
  - **400 Bad Request:** Dla nieprawidłowych danych wejściowych (np. brak wymaganych pól, `spread` <= 0).
  - **429 Too Many Requests:** Gdy naruszane są limity częstotliwości (więcej niż jeden alert na minutę dla tej samej pary lub przekroczenie 3 alertów w ciągu 24 godzin dla użytkowników freemium).
  - **403 Forbidden:** W przypadku naruszenia polityk lub prób tworzenia alertu przez nieuprawnionego użytkownika.

## 5. Przepływ danych
1. Klient wysyła żądanie POST /alerts z nagłówkiem `Authorization: Bearer <token>` oraz odpowiednim JSON w ciele żądania.
2. Middleware autoryzacyjne weryfikuje token JWT i potwierdza, że użytkownik ma uprawnienia do tworzenia alertów.
3. Kontroler odbiera żądanie, waliduje strukturę danych wg `CreateAlertCommand` oraz przekazuje dane do warstwy serwisowej.
4. Warstwa serwisowa:
   - Weryfikuje, że `spread` jest większy od 0.
   - Sprawdza, czy dla podanej pary (assetId) nie został utworzony alert w ciągu ostatniej minuty przez tego samego użytkownika.
   - Dla użytkowników freemium, weryfikuje, czy liczba alertów w ciągu ostatnich 24 godzin nie przekracza 3.
5. Jeśli walidacja przejdzie pomyślnie, alert jest zapisywany w bazie danych (według schematu z `db-plan.md`).
6. Utworzony alert jest mapowany do `AlertDTO` i zwracany jako odpowiedź JSON.
7. W przypadku wystąpienia błędów, odpowiedni komunikat błędu jest logowany, a kontroler zwraca odpowiedni kod stanu.

## 6. Względy bezpieczeństwa
- Wymagana jest autoryzacja przy użyciu JWT.
- Wdrożenie mechanizmu RLS w bazie danych, aby użytkownik mógł tworzyć alerty jedynie dla swojego konta.
- Walidacja danych wejściowych aby zapobiec SQL Injection oraz atakom poprzez nieprawidłowe dane.
- Ochrona przed nadużywaniem endpointu poprzez implementację rate limiting.

## 7. Obsługa błędów
- **400 Bad Request:** Zwracany dla nieprawidłowych lub niekompletnych danych wejściowych. Przykłady: brak wymaganych pól, `spread` nie jest większy od 0.
- **429 Too Many Requests:** Gdy naruszone są reguły dotyczące częstotliwości tworzenia alertów (więcej niż jeden alert na minutę lub przekroczenie limitu freemium).
- **403 Forbidden:** W przypadku, gdy użytkownik nie ma uprawnień do wykonania operacji lub narusza politykę aplikacji.
- Każdy błąd powinien być logowany (np. do tabeli `audit_logs` lub systemu monitoringu) z odpowiednimi szczegółami.

## 8. Rozważania dotyczące wydajności
- Użycie indeksów na kolumnach `user_id`, `timestamp` oraz `asset_id` w tabeli `alerts` usprawni weryfikację limitów oraz operacje zapytaniowe.
- Zapytania sprawdzające rate limiting powinny być zoptymalizowane pod kątem wydajności (przy użyciu agregacji lub odpowiednich indeksów).
- Rozważenie cache'owania wyników dla krótkoterminowych zapytań sprawdzających limit alertów.

## 9. Etapy wdrożenia
1. Utworzenie endpointu POST /alerts w warstwie kontrolera.
2. Integracja i konfiguracja middleware autoryzacji JWT.
3. Walidacja struktury danych wejściowych zgodnie z modelem `CreateAlertCommand`.
4. Implementacja logiki biznesowej w warstwie serwisowej:
   - Walidacja, że `spread` jest większy od 0.
   - Weryfikacja czy nie przekroczono limitu jednego alertu na minutę dla danej pary aktywów.
   - Weryfikacja limitu freemium: nie więcej niż 3 alerty w ciągu 24 godzin.
5. Integracja z bazą danych – zapis nowego alertu zgodnie z `db-plan.md`.
6. Mapowanie utworzonego alertu do `AlertDTO` i wysłanie odpowiedzi 201 Created.
7. Obsługa błędów i ich logowanie.
8. Pisanie testów jednostkowych oraz integracyjnych (scenariusze: prawidłowe żądanie, błędne dane, przekroczenie limitów, brak autoryzacji).
9. Przeprowadzenie code review oraz wdrożenie na środowisko testowe.
10. Monitorowanie działania endpointu i analiza logów po wdrożeniu produkcyjnym. 