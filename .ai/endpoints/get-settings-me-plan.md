# API Endpoint Implementation Plan: GET /settings/me

## 1. Przegląd punktu końcowego
Endpoint umożliwia pobranie ustawień powiadomień i preferencji alertów dla uwierzytelnionego użytkownika. Umożliwia to użytkownikowi wgląd w swoje ustawienia zapisane w tabeli `settings`.

## 2. Szczegóły żądania
- **Metoda HTTP:** GET
- **Ścieżka URL:** /settings/me
- **Parametry:**
  - Wymagane: Brak
  - Opcjonalne: Brak
- **Request Body:** Brak

## 3. Wykorzystywane typy
- **DTO/Command Modele:**
  - `SettingsDTO` (zdefiniowany w `src/types.ts`), który zawiera:
    - `id` (UUID)
    - `user_id` (UUID)
    - `notification_config` (Json)
    - `alert_preferences` (Json)
    - `created_at` oraz `updated_at`

## 4. Szczegóły odpowiedzi
- **Sukces:**
  - Kod statusu: 200 OK
  - Treść odpowiedzi: Obiekt `SettingsDTO` zawierający ustawienia powiadomień i alertów dla użytkownika.
- **Błędy (opcjonalnie):**
  - 401 Unauthorized – gdy użytkownik nie jest uwierzytelniony.
  - 500 Internal Server Error – dla nieoczekiwanych błędów serwera.

## 5. Przepływ danych
1. Klient wysyła żądanie GET do `/settings/me`.
2. Middleware uwierzytelniający weryfikuje token użytkownika i wyodrębnia `userId`.
3. Warstwa serwisowa wykonuje zapytanie do tabeli `settings`, pobierając rekord, który odpowiada `userId`.
4. Jeśli rekord został znaleziony, zwracany jest obiekt `SettingsDTO` z ustawieniami użytkownika.

## 6. Względy bezpieczeństwa
- **Autoryzacja:** Endpoint jest zabezpieczony przy pomocy middleware autoryzacyjnego (np. Supabase Auth), który zapewnia, że dostęp mają tylko uwierzytelnieni użytkownicy.
- **Row Level Security (RLS):** Tabela `settings` musi mieć wdrożone mechanizmy RLS, aby użytkownik mógł pobierać tylko swoje dane.
- **Walidacja:** Brak danych wejściowych wymagających walidacji, poza standardowym sprawdzeniem poprawności tokena.

## 7. Obsługa błędów
- **401 Unauthorized:** Zwracany, gdy żądanie pochodzi od nieuwierzytelnionego użytkownika.
- **500 Internal Server Error:** Zwracany przy wystąpieniu nieoczekiwanych błędów systemowych. Dodatkowe logowanie błędów może być stosowane w celu szybkiej diagnostyki.

## 8. Rozważania dotyczące wydajności
- Operacja polegająca na pobraniu jednego rekordu z tabeli `settings` jest bardzo lekką operacją, co zapewnia wysoką wydajność.
- Ewentualne zastosowanie cache dla ustawień może być rozważone, jednak przy niskiej częstotliwości zmian zwykle nie jest konieczne.

## 9. Etapy wdrożenia
1. **Konfiguracja trasy:** Dodanie trasy GET `/settings/me` w konfiguracji API.
2. **Uwierzytelnienie:** Implementacja lub potwierdzenie działania istniejącego middleware, który weryfikuje token i ustawia `userId`.
3. **Pobieranie danych:** W warstwie serwisowej, wykonanie zapytania do bazy danych w celu pobrania rekordu z tabeli `settings` odpowiadającego `userId`.
4. **Obsługa odpowiedzi:** Zwrócenie obiektu `SettingsDTO` z kodem 200 OK, lub odpowiedni błąd (np. 401, 500).
5. **Testowanie:** Przeprowadzenie testów jednostkowych i integracyjnych w celu potwierdzenia, że endpoint prawidłowo zwraca ustawienia tylko dla uwierzytelnionego użytkownika.
6. **Dokumentacja:** Aktualizacja dokumentacji API oraz poinformowanie zespołu deweloperskiego o nowym endpointzie.
7. **Wdrożenie:** Code review, testy w środowisku staging oraz ostateczne wdrożenie do produkcji. 