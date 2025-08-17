# API Endpoint Implementation Plan: GET /exchanges/{exchangeId}

## 1. Przegląd punktu końcowego
Endpoint GET /exchanges/{exchangeId} służy do pobierania szczegółowych informacji o giełdzie (exchange) z tabeli `exchanges` w bazie danych. Umożliwia klientowi uzyskanie danych na podstawie unikalnego identyfikatora danej giełdy.

## 2. Szczegóły żądania
- **Metoda HTTP:** GET
- **Struktura URL:** /exchanges/{exchangeId}
- **Parametry:**
  - **Wymagane:**
    - `exchangeId` (parametr ścieżki, oczekiwany jako prawidłowy UUID)
  - **Opcjonalne:** Brak
- **Request Body:** Brak (endpoint tylko do odczytu)

## 3. Wykorzystywane typy
- **DTO:** `ExchangeDTO` (zdefiniowany w `src/types.ts`)
- Nie są wymagane dodatkowe Command Modele, ponieważ endpoint realizuje tylko operację pobierania danych.

## 4. Szczegóły odpowiedzi
- **Sukces:**
  - Kod statusu: 200 OK
  - Treść odpowiedzi: Obiekt typu `ExchangeDTO`, przykładowa struktura:
    ```json
    {
      "id": "uuid",
      "name": "string",
      "api_endpoint": "string",
      "integration_status": "active/inactive",
      "metadata": {} or null,
      "created_at": "timestamp or null",
      "updated_at": "timestamp or null"
    }
    ```
- **Błędy:**
  - 404 Not Found – gdy nie istnieje giełda dla podanego `exchangeId`.
  - 500 Internal Server Error – w przypadku wystąpienia błędów po stronie serwera.

## 5. Przepływ danych
1. Żądanie trafia do API z wartością `exchangeId` przekazaną jako parametr ścieżki.
2. Warstwa routingu przekazuje żądanie do kontrolera dedykowanego dla endpointu.
3. Kontroler wykonuje następujące kroki:
   - Walidacja poprawności formatu `exchangeId` (weryfikacja UUID).
   - Wywołanie warstwy serwisowej odpowiedzialnej za komunikację z bazą danych.
4. Warstwa serwisowa:
   - Wykonuje zapytanie do bazy danych (tabela `exchanges`) w celu znalezienia rekordu o podanym identyfikatorze.
   - Mapuje wynik zapytania na strukturę `ExchangeDTO`.
5. Kontroler zwraca klientowi odpowiedź:
   - 200 OK z danymi, jeśli giełda została znaleziona.
   - 404 Not Found, jeśli rekord nie został odnaleziony.

## 6. Względy bezpieczeństwa
- **Uwierzytelnianie:** Endpoint powinien być zabezpieczony poprzez mechanizmy Supabase Auth lub podobny middleware, aby upewnić się, że tylko uprawnieni użytkownicy mogą uzyskać dostęp do danych.
- **Autoryzacja:** Choć dane o giełdzie mogą być ogólnodostępne, warto rozważyć dodatkowe sprawdzenie uprawnień w razie potrzeby.
- **Walidacja:** Sprawdzenie, czy `exchangeId` jest poprawnym UUID, aby zapobiec potencjalnym atakom (np. SQL Injection).
- **Bezpieczeństwo danych:** Upewnienie się, że odpowiednio przetwarzane są wszelkie dane wejściowe oraz stosowanie parametrów zapytań do bazy danych.

## 7. Obsługa błędów
- **404 Not Found:** Zwracane, gdy nie znaleziono rekordu o podanym `exchangeId`.
- **500 Internal Server Error:** Zwracane w przypadku nieoczekiwanych błędów serwera.
- **Logowanie błędów:** Wszelkie błędy powinny być rejestrowane w systemie logowania oraz, jeśli to stosowne, w tabeli `audit_logs`.

## 8. Rozważania dotyczące wydajności
- Zapewnienie indeksowania kolumny `id` w tabeli `exchanges` dla szybkiego wyszukiwania.
- Optymalizacja zapytań do bazy danych i monitorowanie wydajności endpointu, szczególnie w warunkach wysokiego obciążenia.
- Rozważenie wdrożenia mechanizmów cache'owania, jeśli zapotrzebowanie na dane z tego endpointu będzie bardzo wysokie.

## 9. Etapy wdrożenia
1. Utworzenie endpointu w warstwie routingu (np. w pliku z konfiguracją tras), wykorzystując ścieżkę `/exchanges/:exchangeId`.
2. Implementacja funkcji kontrolera, która:
   - Waliduje parametr `exchangeId`.
   - Wywołuje warstwę serwisową do pobrania danych z bazy.
3. Stworzenie lub rozbudowanie warstwy serwisowej, odpowiedzialnej za logikę pobierania danych z tabeli `exchanges`.
4. Mapowanie danych z rekordu bazy danych do obiektu `ExchangeDTO`.
5. Implementacja mechanizmu obsługi błędów:
   - Zwracanie 404 Not Found, jeśli rekord nie zostanie znaleziony.
   - Zwracanie 500 Internal Server Error dla nieoczekiwanych błędów, z odpowiednim logowaniem.
6. Implementacja środków zabezpieczających endpoint (middleware uwierzytelniające i autoryzujące dostęp do endpointu).
7. Pisanie testów jednostkowych oraz integracyjnych dla endpointu.
8. Przeprowadzenie przeglądu kodu (code review) oraz testów w środowisku staging.
9. Wdrożenie endpointu do środowiska produkcyjnego i monitorowanie logów oraz wydajności. 