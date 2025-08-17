# API Endpoint Implementation Plan: GET /subscriptions/me

## 1. Przegląd punktu końcowego
Endpoint GET /subscriptions/me umożliwia pobranie aktualnych szczegółów subskrypcji zalogowanego użytkownika. Zapewnia dostęp do bieżących danych subskrypcyjnych, takich jak status, data rozpoczęcia i zakończenia, metoda płatności.

## 2. Szczegóły żądania
- **Metoda HTTP:** GET
- **Struktura URL:** /subscriptions/me
- **Parametry zapytania:** Brak
- **Request Body:** Brak

## 3. Wykorzystywane typy
- **DTO:** `SubscriptionDTO` (zdefiniowany w `src/types.ts`) – reprezentuje informacje o subskrypcji.

## 4. Szczegóły odpowiedzi
- **200 OK:** Zwracane przy pomyślnym pobraniu subskrypcji. Odpowiedź zawiera obiekt subskrypcji zgodny z `SubscriptionDTO`.
- **Kody błędów:**
  - **401 Unauthorized:** Gdy użytkownik nie jest uwierzytelniony.
  - **500 Internal Server Error:** W przypadku błędu po stronie serwera.

## 5. Przepływ danych
1. Klient wysyła żądanie GET /subscriptions/me z nagłówkiem `Authorization: Bearer <token>`.
2. Middleware autoryzacyjne weryfikuje token JWT.
3. Kontroler wywołuje metodę w warstwie serwisowej, która pobiera dane subskrypcji z bazy danych (zgodnie z `db-plan.md`) dla zalogowanego użytkownika.
4. Wynik jest mapowany do `SubscriptionDTO` i zwracany jako odpowiedź JSON.

## 6. Względy bezpieczeństwa
- Wymagana jest autoryzacja przy użyciu JWT.
- Zastosowanie RLS (Row Level Security) gwarantuje, że użytkownik pobiera tylko swoje dane subskrypcji.

## 7. Obsługa błędów
- **401 Unauthorized:** Zwracane, gdy brak prawidłowego tokena JWT lub użytkownik nie jest uwierzytelniony.
- **500 Internal Server Error:** Zwracane przy nieoczekiwanych błędach podczas pobierania danych.
- Błędy powinny być logowane (np. do tabeli `audit_logs` lub systemu monitorowania).

## 8. Rozważania dotyczące wydajności
- Pobranie pojedynczego rekordu minimalizuje obciążenie bazy danych.
- Indeksacja kolumny `user_id` w tabeli `subscriptions` przyspiesza operacje wyszukiwania.

## 9. Etapy wdrożenia
1. Utworzenie endpointu GET /subscriptions/me w warstwie kontrolera.
2. Integracja middleware odpowiedzialnego za weryfikację JWT.
3. Implementacja metody w warstwie serwisowej pobierającej dane subskrypcji z bazy.
4. Mapowanie danych z bazy do obiektu `SubscriptionDTO`.
5. Pisanie testów jednostkowych i integracyjnych.
6. Code review oraz wdrożenie na środowisko testowe.
7. Monitorowanie działania endpointu po wdrożeniu. 