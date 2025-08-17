# API Endpoint Implementation Plan: PUT /users/me

## 1. Przegląd punktu końcowego
Ten endpoint umożliwia aktualizację danych uwierzytelnionego użytkownika. Klient może zaktualizować takie pola jak `first_name`, `last_name` oraz `notification_settings` zgodnie z definicją tabeli `users` zdefiniowanej w @db-plan.md. Endpoint wykorzystuje mechanizm JWT do weryfikacji tożsamości oraz RLS, aby zapewnić, że użytkownik może modyfikować jedynie swoje dane.

## 2. Szczegóły żądania
- Metoda HTTP: PUT
- Struktura URL: /users/me
- Parametry:
  - Wymagane: Brak dodatkowych parametrów (uwierzytelnienie poprzez nagłówek Authorization: Bearer <token> jest obowiązkowe)
  - Opcjonalne: Brak
- Request Body: JSON zawierający następujące pola:
  - `first_name`: string
  - `last_name`: string
  - `notification_settings`: obiekt JSON (zgodny z typem JSONB w bazie danych)

Przykładowa treść żądania:
```json
{
  "first_name": "Jan",
  "last_name": "Nowak",
  "notification_settings": { "email": true, "sms": false }
}
```

## 3. Wykorzystywane typy
- Command Model: `UpdateUserCommand` zdefiniowany w `src/types.ts`, który zawiera opcjonalne pola:
  - first_name?: string
  - last_name?: string
  - notification_settings?: Json

- DTO: `UserDTO` (również z `src/types.ts`), który opisuje strukturę danych użytkownika w odpowiedzi.

## 4. Szczegóły odpowiedzi
- Struktura odpowiedzi: Zaktualizowany obiekt użytkownika w formacie `UserDTO`.
- Przykład odpowiedzi JSON:
```json
{
  "id": "UUID",
  "email": "user@example.com",
  "first_name": "Jan",
  "last_name": "Nowak",
  "registration_date": "2023-10-01T12:00:00Z",
  "role": "user",
  "notification_settings": { "email": true, "sms": false }
}
```
- Kody statusu:
  - 200 OK – Pomyślna aktualizacja danych
  - 400 Bad Request – Nieprawidłowe dane wejściowe
  - 401 Unauthorized – Nieautoryzowany dostęp (brak lub nieważny token)
  - 500 Internal Server Error – Błąd po stronie serwera

## 5. Przepływ danych
1. Klient wysyła żądanie PUT /users/me z dołączonym nagłówkiem Authorization zawierającym token JWT oraz poprawnie sformatowanym ciałem żądania.
2. Middleware odpowiedzialny za autentykację weryfikuje token JWT, potwierdzając tożsamość użytkownika.
3. Warstwa serwisowa (np. UserService) odbiera komendę aktualizacji (`UpdateUserCommand`), waliduje dane wejściowe oraz przetwarza logikę biznesową.
4. Usługa wykonuje zapytanie aktualizujące dane w tabeli `users` (zgodnie z definicją w @db-plan.md) dla identyfikatora użytkownika wyciągniętego z tokena.
5. Dana zmodyfikowana rekord jest mapowany do struktury `UserDTO` i zwracany w odpowiedzi.
6. W przypadku błędów (np. walidacja nieudana lub problem z bazą) zwracany jest odpowiedni kod statusu (400, 401 lub 500).

## 6. Względy bezpieczeństwa
- Autoryzacja: Weryfikacja tokena JWT przy użyciu Supabase Auth oraz mechanizmy RLS w bazie danych, aby użytkownik mógł modyfikować jedynie swoje dane.
- Walidacja: Dokładna weryfikacja struktury i poprawności danych wejściowych. Użycie walidatorów do sprawdzenia poprawności pól `first_name`, `last_name` i `notification_settings`.
- Ochrona przed atakami: Stosowanie przygotowanych zapytań (prepared statements) w celu zapobiegania atakom SQL injection.

## 7. Obsługa błędów
- 400 Bad Request: Zwracany, gdy dane wejściowe są niekompletne lub nieprawidłowe (np. niepoprawny format JSON, błędny typ danych).
- 401 Unauthorized: Zwracany, gdy token JWT jest nieważny lub nie został dołączony do żądania.
- 500 Internal Server Error: Błąd po stronie serwera, na przykład problemy z komunikacją z bazą danych.
- Logowanie błędów: Rejestracja błędów w systemie logowania (np. tabela `audit_logs` lub dedykowany system monitoringu) dla dalszej analizy.

## 8. Rozważania dotyczące wydajności
- Aktualizacja dotyczy pojedynczego rekordu użytkownika, co zmniejsza obciążenie bazy danych.
- Wykorzystanie przygotowanych zapytań oraz ORM lub query buildera w celu optymalizacji operacji aktualizacji.
- Opcjonalne wdrożenie mechanizmu cache, jeśli przewidziane jest wysokie obciążenie, choć dla operacji aktualizacji nie jest to krytyczne.

## 9. Etapy wdrożenia
1. Skonfigurowanie routingu w aplikacji (używając Astro z React) dla obsługi żądania PUT /users/me.
2. Implementacja middleware do weryfikacji tokena JWT oraz autoryzacji użytkownika.
3. Utworzenie lub modyfikacja metody w warstwie serwisowej (UserService) do obsługi aktualizacji danych użytkownika na podstawie `UpdateUserCommand`.
4. Walidacja danych wejściowych oraz mapowanie na odpowiedni model.
5. Wykonanie operacji aktualizacji w bazie danych (zgodnie z definicją tabeli `users` z @db-plan.md) i mapowanie wyniku do `UserDTO`.
6. Dodanie testów jednostkowych oraz integracyjnych w celu potwierdzenia poprawności działania endpointu.
7. Implementacja mechanizmu logowania błędów oraz monitoringu.
8. Przeprowadzenie testów bezpieczeństwa i wydajnościowych (np. testy penetracyjne, obciążeniowe).
9. Integracja zmian z mechanizmem CI/CD (Github Actions) oraz wdrożenie na środowisko produkcyjne (np. DigitalOcean). 