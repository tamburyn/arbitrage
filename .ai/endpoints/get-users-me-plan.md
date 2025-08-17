# API Endpoint Implementation Plan: GET /users/me

## 1. Przegląd punktu końcowego
Ten endpoint pozwala na pobranie szczegółowych informacji o bieżącym, uwierzytelnionym użytkowniku. Punkt końcowy wykorzystuje mechanizm JWT do autentykacji i zgodnie z zasadami RLS zwraca tylko dane przypisane do konkretnego użytkownika.

## 2. Szczegóły żądania
- Metoda HTTP: GET
- Struktura URL: /users/me
- Parametry:
  - Wymagane: Brak dodatkowych parametrów (uwierzytelnienie poprzez nagłówek Authorization: Bearer <token> jest wymagane)
  - Opcjonalne: Brak
- Request Body: Nie dotyczy (GET nie posiada treści żądania)

## 3. Wykorzystywane typy
- DTO: `UserDTO` zdefiniowany w `src/types.ts`, który zawiera:
  - id: string
  - email: string
  - first_name: string
  - last_name: string
  - registration_date: string
  - role: 'admin' | 'user'
  - notification_settings: Json

## 4. Szczegóły odpowiedzi
- Struktura odpowiedzi: Obiekt w formacie `UserDTO`
- Przykładowa odpowiedź JSON:
  ```json
  {
    "id": "UUID",
    "email": "user@example.com",
    "first_name": "Jan",
    "last_name": "Kowalski",
    "registration_date": "2023-10-01T12:00:00Z",
    "role": "user",
    "notification_settings": { ... }
  }
  ```
- Kody statusu:
  - 200 OK – Pomyślny odczyt danych
  - 401 Unauthorized – Brak poprawnej autoryzacji lub nieważny token
  - 500 Internal Server Error – Błąd po stronie serwera

## 5. Przepływ danych
1. Klient wysyła żądanie GET /users/me z dołączonym nagłówkiem Authorization zawierającym token JWT.
2. Middleware uwierzytelniające weryfikuje token JWT, potwierdzając tożsamość użytkownika.
3. Po pomyślnej weryfikacji żądanie trafia do warstwy serwisowej (np. UserService), która na podstawie identyfikatora z tokena pobiera dane użytkownika z bazy danych (tabela `users`), wykorzystując zasady RLS.
4. Dane są mapowane do struktury `UserDTO`.
5. Endpoint zwraca odpowiedź z kodem 200 i danymi użytkownika w formacie JSON.
6. W przypadku błędów (np. nieprawidłowy token, brak danych) zwracane są odpowiednie kody statusu (401, 500).

## 6. Względy bezpieczeństwa
- Autoryzacja: Weryfikacja tokena JWT przy użyciu Supabase Auth oraz ochrona danych przez RLS w bazie danych.
- Walidacja: Sprawdzenie poprawności tokena oraz ewentualne logowanie prób nieautoryzowanego dostępu.
- Ochrona przed atakami: Zabezpieczenie endpointu przed atakami typu injection poprzez stosowanie parametrów i przygotowanych zapytań (prepared statements).

## 7. Obsługa błędów
- 401 Unauthorized: Zwracany, gdy token JWT jest nieważny lub nie został dostarczony.
- 404 Not Found: Potencjalnie, gdy dane użytkownika nie zostaną znalezione (choć scenariusz ten powinien być rzadki, gdyż token jest wydawany dla istniejącego konta).
- 500 Internal Server Error: W przypadku błędów po stronie serwera, np. problemów z bazą danych.
- Logowanie błędów: Implementacja logowania błędów (np. do tabeli audit_logs lub systemu monitoringu) w celu diagnozowania problemów.

## 8. Rozważania dotyczące wydajności
- Indeksacja: Tabela `users` posiada unikalny indeks na kolumnie `email`, co umożliwia szybkie zapytania.
- Cache: Opcjonalne wdrożenie mechanizmu cache na poziomie serwisu, jeśli przewidziane jest wysokie obciążenie.
- Optymalizacja zapytań: Użycie efektywnego ORM lub query buildera do minimalizacji obciążenia bazy.

## 9. Etapy wdrożenia
1. Konfiguracja routingu w aplikacji (w ramach Astro z React), aby obsługiwać żądanie GET /users/me.
2. Implementacja middleware do weryfikacji tokena JWT i autoryzacji użytkownika.
3. Utworzenie/modyfikacja warstwy serwisowej (UserService) odpowiedzialnej za pobieranie danych użytkownika z bazy danych.
4. Mapowanie danych z bazy do formatu `UserDTO`.
5. Implementacja mechanizmu logowania błędów i monitoringu (opcjonalnie do tabeli audit_logs lub za pomocą zewnętrznego systemu logowania).
6. Dodanie testów jednostkowych oraz integracyjnych, aby zweryfikować poprawność działania endpointu.
7. Przeprowadzenie testów bezpieczeństwa (np. testy penetracyjne) oraz testów obciążeniowych.
8. Finalne wdrożenie zmian z integracją z mechanizmami CI/CD (Github Actions) i wdrożenie na DigitalOcean. 