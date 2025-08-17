# API Endpoint Implementation Plan: GET /watchlist

## 1. Przegląd punktu końcowego
Endpoint GET /watchlist umożliwia pobranie listy pozycji na watchliście dla uwierzytelnionego użytkownika. Użytkownik otrzymuje listę aktywów, które dodał do swojego watchlistu, co pomaga w szybkim monitorowaniu interesujących go przykładów.

## 2. Szczegóły żądania
- **Metoda HTTP:** GET
- **Struktura URL:** /watchlist
- **Parametry zapytania:** Brak
- **Request Body:** Brak
- **Authentication:** Wymagany token JWT przesyłany w nagłówku `Authorization`

## 3. Wykorzystywane typy
- **DTO:** `WatchlistDTO` (zdefiniowany w `src/types.ts`) – reprezentuje pojedynczą pozycję na watchliście, w tym identyfikator, informacje o użytkowniku i aktywie oraz datę dodania.

## 4. Szczegóły odpowiedzi
- **200 OK:** Zwracana jest lista elementów watchlisty w formacie JSON, gdzie każdy element jest zgodny z `WatchlistDTO`.
- **Kody błędów:**
  - **401 Unauthorized:** Gdy użytkownik nie dostarczy prawidłowego tokena JWT.
  - **500 Internal Server Error:** W przypadku wystąpienia błędu po stronie serwera.

## 5. Przepływ danych
1. Klient wysyła żądanie GET /watchlist z nagłówkiem `Authorization: Bearer <token>`.
2. Middleware autoryzacyjne weryfikuje token JWT i zapewnia, że użytkownik jest uwierzytelniony.
3. Kontroler wywołuje odpowiednią metodę w warstwie serwisowej, która wykonuje zapytanie do bazy danych w tabeli watchlist (zgodnie z `db-plan.md`), filtrując wyniki na podstawie identyfikatora użytkownika.
4. Wyniki są mapowane na obiekty `WatchlistDTO` i zwracane w odpowiedzi JSON.

## 6. Względy bezpieczeństwa
- Wymagana autoryzacja przy użyciu tokena JWT.
- Zastosowanie RLS (Row Level Security) w bazie danych, aby zapewnić, że użytkownik widzi tylko swoje dane na watchliście.
- Walidacja parametrów (choć nie ma ciała żądania) w celu ochrony przed potencjalnymi nadużyciami.

## 7. Obsługa błędów
- **401 Unauthorized:** Zwracany, gdy token JWT nie jest dostarczony lub jest nieprawidłowy.
- **500 Internal Server Error:** Zwracany w przypadku wystąpienia nieoczekiwanych błędów w logice serwera lub przy operacjach bazy danych.
- Wszystkie błędy powinny być logowane (np. do tabeli `audit_logs` lub systemu monitoringu) z odpowiednimi szczegółami.

## 8. Rozważania dotyczące wydajności
- Zapytanie pobierające watchlistę powinno być zoptymalizowane, np. poprzez indeksację kolumny `user_id`.
- Rozważenie paginacji w przyszłości, jeśli liczba pozycji na watchliście będzie bardzo duża.

## 9. Etapy wdrożenia
1. Utworzenie endpointu GET /watchlist w warstwie kontrolera odpowiedzialnej za watchlistę.
2. Integracja middleware weryfikującego token JWT.
3. Implementacja metody w warstwie serwisowej pobierającej dane watchlisty z bazy danych.
4. Mapowanie wyników zapytania na obiekty `WatchlistDTO` i zwrócenie odpowiedzi JSON.
5. Pisanie testów jednostkowych oraz integracyjnych.
6. Code review oraz wdrożenie na środowisko testowe.
7. Monitorowanie działania endpointu i optymalizacja, jeśli zajdzie taka potrzeba. 