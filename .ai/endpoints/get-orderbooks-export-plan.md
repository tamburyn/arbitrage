# API Endpoint Implementation Plan: GET /orderbooks/export

## 1. Przegląd punktu końcowego
Endpoint GET /orderbooks/export służy do eksportowania danych orderbooków do pliku CSV w obrębie określonego zakresu dat. Pozwala to na pobranie danych historycznych w wygodnym formacie do dalszej analizy lub raportowania.

## 2. Szczegóły żądania
- **Metoda HTTP:** GET
- **Struktura URL:** /orderbooks/export
- **Parametry zapytania (Query Parameters):**
  - `from` (wymagany) – dolna granica zakresu dat w formacie ISO.
  - `to` (wymagany) – górna granica zakresu dat w formacie ISO.
- **Request Body:** Brak

## 3. Wykorzystywane typy
- **Źródłowe dane:** Dane orderbooków pobierane przy użyciu typu `OrderbookDTO` (zdefiniowanego w `src/types.ts`).
- **Format odpowiedzi:** CSV, generowany na podstawie danych orderbooków.

## 4. Szczegóły odpowiedzi
- **Sukces:**
  - Kod statusu: 200 OK
  - Treść odpowiedzi: Plik CSV do pobrania. Plik będzie zawierał nagłówki kolumn odpowiadające właściwościom orderbooków, np.: id, exchange_id, asset_id, snapshot, spread, timestamp, volume, created_at.
- **Błędy:**
  - 400 Bad Request – gdy parametry zapytania `from` lub `to` są nieprawidłowe (np. niepoprawny format daty).

## 5. Przepływ danych
1. Klient wysyła żądanie GET /orderbooks/export z parametrami `from` oraz `to` w zapytaniu.
2. Warstwa routingu przekazuje żądanie do kontrolera eksportu.
3. Kontroler:
   - Waliduje parametry `from` i `to` (sprawdzając, czy są w formacie ISO).
   - Przekazuje parametry do warstwy serwisowej.
4. Warstwa serwisowa:
   - Buduje zapytanie do bazy danych, pobierając orderbooki mieszczące się w podanym zakresie dat.
   - Mapuje wyniki na strukturę możliwą do konwersji na CSV.
   - Generuje plik CSV, w którym dane są zapisane wraz z odpowiednimi nagłówkami.
5. Plik CSV jest zwracany jako odpowiedź z kodem 200 OK.

## 6. Względy bezpieczeństwa
- **Walidacja:** Parametry `from` i `to` muszą być walidowane pod kątem poprawności formatu ISO, aby zapobiec potencjalnym nadużyciom.
- **Bezpieczeństwo danych:** Zapytania do bazy danych są wykonywane przy użyciu przygotowanych zapytań w celu zabezpieczenia przed SQL Injection.
- **Cache'owanie:** W przypadku dużych zestawów danych rozważyć mechanizm strumieniowania lub cache'owanie wyników eksportu, aby nie przeciążać serwera.

## 7. Obsługa błędów
- **400 Bad Request:** Zwracany, gdy którykolwiek z parametrów `from` lub `to` jest nieprawidłowy.
- **Logowanie błędów:** Błędy powinny być logowane w celu diagnozy oraz wdrożenia poprawek.

## 8. Rozważania dotyczące wydajności
- Eksport danych w określonym zakresie dat może generować duże ilości danych. Rozważyć mechanizm strumieniowania pliku CSV zamiast ładowania całości w pamięci.
- Upewnić się, że kolumna `timestamp` w tabeli orderbooks jest indeksowana dla usprawnienia zapytań.

## 9. Etapy wdrożenia
1. Dodanie trasy GET /orderbooks/export w warstwie routingu.
2. Implementacja kontrolera eksportu:
   - Walidacja parametrów `from` i `to`.
   - Przekazanie parametrów do warstwy serwisowej.
3. Rozbudowa warstwy serwisowej o funkcję pobierania odpowiednich orderbooków oraz generowania pliku CSV.
4. Implementacja mechanizmu generowania i strumieniowania pliku CSV.
5. Implementacja mechanizmu obsługi błędów (400) wraz z logowaniem.
6. Pisanie testów jednostkowych oraz integracyjnych dla endpointu eksportu.
7. Przeprowadzenie przeglądu kodu (code review) oraz testów w środowisku staging.
8. Wdrożenie endpointu do środowiska produkcyjnego i monitorowanie jego wydajności. 