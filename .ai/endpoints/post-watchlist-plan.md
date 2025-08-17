# API Endpoint Implementation Plan: POST /watchlist

## 1. Przegląd punktu końcowego
Endpoint umożliwia uwierzytelnionym użytkownikom dodanie danego aktywa do swojej listy obserwowanych (watchlist). Kluczowym wymogiem jest przestrzeganie unikalności pary (userId, assetId), co gwarantuje, że dane aktywo nie zostanie dodane wielokrotnie dla jednego użytkownika.

## 2. Szczegóły żądania
- **Metoda HTTP:** POST
- **Ścieżka URL:** /watchlist
- **Parametry:**
  - Wymagane:
    - `assetId` (UUID): Identyfikator aktywa, które ma być dodane do watchlisty.
  - Opcjonalne: Brak
- **Request Body:**
  ```json
  {
    "assetId": "UUID"
  }
  ```

## 3. Wykorzystywane typy
- **DTO/Command Modele:**
  - `CreateWatchlistCommand` (definiowany w `src/types.ts`) – zawiera pole `assetId`.
  - `WatchlistDTO` – reprezentuje rekord w bazie danych dla pozycji na watchliście.
- **Zasoby bazy danych:**
  - Tabela `watchlist` z unikalnym indeksem na parze (`user_id`, `asset_id`).

## 4. Szczegóły odpowiedzi
- **Sukces:**
  - Kod statusu: 201 Created
  - Opcjonalna treść: Obiekt `WatchlistDTO` zawierający dane nowo utworzonego rekordu.
- **Błędy:**
  - 400 Bad Request – w przypadku nieprawidłowych danych wejściowych (np. brak lub nieprawidłowy format `assetId`).
  - 409 Conflict – jeśli rekord z daną kombinacją (`userId`, `assetId`) już istnieje.
  - 401 Unauthorized – w przypadku braku autoryzacji użytkownika.
  - 500 Internal Server Error – dla nieoczekiwanych błędów serwera.

## 5. Przepływ danych
1. Klient wysyła żądanie POST do `/watchlist` z treścią zawierającą `assetId`.
2. Middleware uwierzytelniający weryfikuje token użytkownika i wyodrębnia `userId`.
3. Walidacja danych wejściowych sprawdza, czy `assetId` jest obecny i ma poprawny format UUID.
4. Warstwa serwisowa wykonuje następujące kroki:
   - Sprawdza, czy rekord o kombinacji (`userId`, `assetId`) już istnieje w tabeli `watchlist`.
   - Jeśli rekord istnieje, zwraca błąd 409 Conflict.
   - W przeciwnym razie, wstawia nowy rekord do tabeli `watchlist` przy użyciu obecnego `userId` i podanego `assetId`.
5. Po pomyślnym dodaniu zwracany jest status 201 Created.

## 6. Względy bezpieczeństwa
- **Autoryzacja:** Endpoint zabezpieczony poprzez Supabase Auth, zapewniający dostęp tylko dla uwierzytelnionych użytkowników.
- **Row Level Security (RLS):** Tabela `watchlist` wykorzystuje RLS, aby użytkownicy mieli dostęp tylko do swoich danych.
- **Walidacja:** Dbałość o poprawny format `assetId` w celu zapobiegania atakom (np. injection).
- **Logowanie:** Możliwość logowania operacji do tabeli `audit_logs` dla celów audytu (opcjonalnie).

## 7. Obsługa błędów
- **400 Bad Request:** Zwracany, gdy `assetId` jest nieobecny lub posiada nieprawidłowy format.
- **409 Conflict:** Zwracany, gdy rekord dla danej kombinacji (`userId`, `assetId`) już istnieje.
- **401 Unauthorized:** Zwracany w przypadku, gdy użytkownik nie jest zalogowany.
- **500 Internal Server Error:** Zwracany przy nieoczekiwanych błędach systemowych; powinno być to sparowane z odpowiednim logowaniem błędów.

## 8. Rozważania dotyczące wydajności
- Wykorzystanie unikalnego indeksu na polach `user_id` i `asset_id` gwarantuje szybkie wyszukiwanie i weryfikację unikalności.
- Minimalne operacje na bazie danych (sprawdzenie istnienia + insert) sprzyjają wysokiej wydajności.
- Monitorowanie logów oraz optymalizacja połączeń z bazą danych (np. pooling) mogą dodatkowo poprawić wydajność.

## 9. Etapy wdrożenia
1. **Konfiguracja trasy:** Dodanie nowej trasy w konfiguracji API dla POST `/watchlist`.
2. **Uwierzytelnienie:** Implementacja lub weryfikacja istniejącego middleware autoryzującego, umożliwiającego ekstrakcję `userId` z tokena.
3. **Walidacja danych:** Implementacja mechanizmu walidacji wejściowych (w tym sprawdzenie formatu UUID dla `assetId`).
4. **Logika serwisowa:** Utworzenie lub rozszerzenie warstwy serwisowej odpowiedzialnej za:
   - Weryfikację istnienia rekordu w tabeli `watchlist` dla danego `userId` i `assetId`.
   - Wstawienie nowego rekordu, jeżeli nie występuje konflikt.
5. **Obsługa błędów:** Implementacja mechanizmów zwracania odpowiednich kodów błędów (400, 409, 401, 500) wraz z komunikatami błędów.
6. **Testowanie:**
   - Stworzenie testów jednostkowych i integracyjnych pokrywających scenariusze poprawne oraz błędne.
   - Przeprowadzenie testów RLS, aby potwierdzić, że użytkownicy mają dostęp tylko do swoich danych.
7. **Dokumentacja:** Aktualizacja dokumentacji API oraz informowanie zespołu developerskiego o nowym endpointzie.
8. **Wdrożenie:** Przeprowadzenie code review, testów w środowisku staging oraz ostateczne wdrożenie produkcyjne. 