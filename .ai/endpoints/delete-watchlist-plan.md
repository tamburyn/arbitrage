# API Endpoint Implementation Plan: DELETE /watchlist/{watchlistId}

## 1. Przegląd punktu końcowego
Endpoint umożliwia usunięcie aktywa z listy obserwowanych użytkownika. Użytkownik może usunąć konkretny rekord watchlisty, identyfikowany przez parametr ścieżki `watchlistId`.

## 2. Szczegóły żądania
- **Metoda HTTP:** DELETE
- **Ścieżka URL:** /watchlist/{watchlistId}
- **Parametry ścieżkowe:**
  - `watchlistId` (UUID): Unikalny identyfikator rekordu watchlisty, który ma zostać usunięty.
- **Request Body:** Brak

## 3. Wykorzystywane typy
- **DTO/Command Modele:**
  - W tym endpointzie nie stosujemy specyficznego DTO/Command Modelu, ponieważ operacja polega na usunięciu rekordu na podstawie `watchlistId`.
- **Zasoby bazy danych:**
  - Tabela `watchlist`, która przechowuje rekordy listy obserwowanych użytkownika.

## 4. Szczegóły odpowiedzi
- **Sukces:**
  - Kod statusu: 200 OK
- **Błędy:**
  - 404 Not Found – gdy rekord o podanym `watchlistId` nie istnieje lub nie należy do danego użytkownika.
  - 401 Unauthorized – w przypadku braku autoryzacji (opcjonalnie, w zależności od implementacji middleware).
  - 500 Internal Server Error – dla nieoczekiwanych błędów serwera.

## 5. Przepływ danych
1. Klient wysyła żądanie DELETE do `/watchlist/{watchlistId}`.
2. Middleware uwierzytelniający weryfikuje token użytkownika i wyodrębnia `userId`.
3. Logika serwisowa weryfikuje, czy rekord o przekazanym `watchlistId` istnieje oraz czy należy do aktualnie zalogowanego użytkownika (poprzez mechanizmy RLS).
4. Jeśli rekord nie zostanie odnaleziony lub nie należy do użytkownika, zwracany jest status 404 Not Found.
5. W przypadku sukcesu, rekord jest usuwany z tabeli `watchlist`, a klient otrzymuje odpowiedź z kodem 200 OK.

## 6. Względy bezpieczeństwa
- **Autoryzacja:** Endpoint musi być zabezpieczony middlewarem autoryzacyjnym, który gwarantuje, że tylko zalogowani użytkownicy mogą usunąć rekordy ze swojej watchlisty.
- **Row Level Security (RLS):** Mechanizmy RLS w tabeli `watchlist` zapewniają, że użytkownicy mogą usuwać tylko swoje własne rekordy.
- **Walidacja:** Sprawdzenie formatu `watchlistId` oraz weryfikacja przynależności rekordu do żądanego użytkownika są kluczowe dla zapobiegania nieautoryzowanym operacjom.

## 7. Obsługa błędów
- **404 Not Found:** Zwracany, gdy rekord o podanym `watchlistId` nie istnieje lub nie należy do danego użytkownika.
- **401 Unauthorized:** Zwracany, gdy użytkownik nie jest zalogowany.
- **500 Internal Server Error:** Zwracany przy wystąpieniu nieoczekiwanych błędów systemowych, wraz z odpowiednim logowaniem błędów.

## 8. Rozważania dotyczące wydajności
- Operacja usuwania pojedynczego rekordu jest bardzo lekka, co gwarantuje wysoką wydajność.
- Indeksacja po `id` oraz stosowanie RLS ogranicza operację do konkretnego rekordu, co minimalizuje obciążenie bazy danych.

## 9. Etapy wdrożenia
1. **Konfiguracja trasy:** Dodanie nowej trasy DELETE `/watchlist/{watchlistId}` w konfiguracji API.
2. **Uwierzytelnienie:** Implementacja lub modyfikacja middleware autoryzacyjnego, które zapewni ekstrakcję `userId` z tokena.
3. **Logika serwisowa:** Utworzenie lub dostosowanie warstwy serwisowej odpowiedzialnej za:
   - Weryfikację istnienia rekordu w tabeli `watchlist` oraz potwierdzenie, że rekord należy do zalogowanego użytkownika.
   - Usunięcie rekordu, jeżeli warunki są spełnione.
4. **Obsługa błędów:** Implementacja mechanizmów zwracania odpowiednich kodów błędów (404, 401, 500) wraz z komunikatami błędów.
5. **Testowanie:**
   - Stworzenie testów jednostkowych i integracyjnych dla scenariusza usuwania rekordu oraz sytuacji, gdy rekord nie istnieje (404).
   - Testy RLS, aby potwierdzić, że użytkownicy mogą usuwać tylko swoje dane.
6. **Dokumentacja:** Aktualizacja dokumentacji API oraz informowanie zespołu deweloperskiego o nowym endpointzie.
7. **Wdrożenie:** Przeprowadzenie code review, testów w środowisku staging oraz ostateczne wdrożenie produkcyjne. 