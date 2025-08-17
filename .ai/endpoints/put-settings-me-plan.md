# API Endpoint Implementation Plan: PUT /settings/me

## 1. Przegląd punktu końcowego
Endpoint służy do aktualizacji konfiguracji powiadomień i preferencji alertów dla uwierzytelnionego użytkownika. Zmiany te są zapisywane w tabeli `settings`.

## 2. Szczegóły żądania
- **Metoda HTTP:** PUT
- **Ścieżka URL:** /settings/me
- **Parametry:**
  - Wymagane: Brak
  - Opcjonalne: Brak
- **Request Body:**
  ```json
  {
    "notification_config": { ... },
    "alert_preferences": { ... }
  }
  ```

## 3. Wykorzystywane typy
- **DTO/Command Modele:**
  - `UpdateSettingsCommand` (zdefiniowany w `src/types.ts`) – zawiera pola `notification_config` oraz `alert_preferences`.
  - `SettingsDTO` – reprezentuje rekord w tabeli `settings` po aktualizacji.
- **Zasoby bazy danych:**
  - Tabela `settings` przechowująca konfiguracje i preferencje ustawień użytkownika.

## 4. Szczegóły odpowiedzi
- **Sukces:**
  - Kod statusu: 200 OK
  - Treść odpowiedzi: Obiekt `SettingsDTO` z uaktualnionymi ustawieniami użytkownika.
- **Błędy:**
  - 400 Bad Request – w przypadku niepoprawnych lub niekompletnych danych wejściowych.
  - 401 Unauthorized – gdy użytkownik nie jest uwierzytelniony (opcjonalnie, w zależności od implementacji middleware).
  - 500 Internal Server Error – dla nieoczekiwanych błędów serwera.

## 5. Przepływ danych
1. Klient wysyła żądanie PUT do `/settings/me` z JSON zawierającym nowe wartości dla `notification_config` i `alert_preferences`.
2. Middleware uwierzytelniający weryfikuje token użytkownika i wyodrębnia `userId`.
3. System walidacji sprawdza, czy oba pola (`notification_config` i `alert_preferences`) są obecne i poprawnie sformatowane (zgodne z typem Json).
4. Warstwa serwisowa aktualizuje rekord w tabeli `settings` odpowiadający `userId` nowymi wartościami.
5. Po pomyślnej aktualizacji zwracany jest obiekt `SettingsDTO` z kodem 200 OK.

## 6. Względy bezpieczeństwa
- **Autoryzacja:** Endpoint jest zabezpieczony middlewarem autoryzacyjnym (np. Supabase Auth), gwarantując dostęp tylko dla uwierzytelnionych użytkowników.
- **Row Level Security (RLS):** Mechanizmy RLS zapewniają, że użytkownik może aktualizować jedynie własne ustawienia.
- **Walidacja:** Dokładna weryfikacja struktury i formatu `notification_config` oraz `alert_preferences` w celu zapobiegania atakom (np. injection).

## 7. Obsługa błędów
- **400 Bad Request:** Zwracany, gdy dane wejściowe są niepełne lub posiadają nieprawidłowy format.
- **401 Unauthorized:** Zwracany, gdy token użytkownika jest nieobecny lub niepoprawny.
- **500 Internal Server Error:** Zwracany przy wystąpieniu nieoczekiwanych błędów systemowych, wsparty odpowiednim logowaniem.

## 8. Rozważania dotyczące wydajności
- Aktualizacja pojedynczego rekordu w tabeli `settings` jest operacją lekką, co zapewnia wysoką wydajność.
- Indeksacja po `user_id` oraz stosowanie RLS umożliwia operację na ograniczonym zbiorze danych.
- Ewentualne zastosowanie mechanizmów cache może być rozważone, jeżeli operacja aktualizacji będzie występować bardzo często.

## 9. Etapy wdrożenia
1. **Konfiguracja trasy:** Dodanie trasy PUT `/settings/me` w konfiguracji API.
2. **Uwierzytelnienie:** Upewnienie się, że middleware poprawnie weryfikuje token i wyodrębnia `userId`.
3. **Walidacja danych:** Implementacja mechanizmu walidacji pól `notification_config` i `alert_preferences`.
4. **Aktualizacja danych:** W warstwie serwisowej wykonanie operacji aktualizacji rekordu w tabeli `settings` na podstawie `userId`.
5. **Obsługa odpowiedzi:** Zwrócenie obiektu `SettingsDTO` z kodem 200 OK lub odpowiednich komunikatów błędów (400, 401, 500).
6. **Testowanie:** Przeprowadzenie testów jednostkowych i integracyjnych w celu potwierdzenia prawidłowej aktualizacji ustawień.
7. **Dokumentacja:** Aktualizacja dokumentacji API oraz przekazanie informacji zespołowi deweloperskiemu.
8. **Wdrożenie:** Code review, testy w środowisku staging oraz ostateczne wdrożenie do produkcji. 