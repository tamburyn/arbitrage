# Dokument wymagań produktu (PRD) - Crypto Arbitrage Dashboard

## 1. Przegląd produktu
Crypto Arbitrage Dashboard to responsywna aplikacja webowa (light-mode, język angielski) umożliwiająca monitorowanie rynków kryptowalut na wybranych giełdach scentralizowanych (Binance, Kraken, OKX, ByBit, Zonda). System w 30-sekundowych interwałach pobiera pełne orderbooki 10 najpopularniejszych aktywów z każdej giełdy, kalkuluje spready arbitrażowe z użyciem zunifikowanej waluty USDT oraz ocenia ich realną egzekwowalność na podstawie głębokości rynku.

Użytkownicy otrzymują:
1. Dashboard z tabelą okazji arbitrażowych, szczegółami głębokości, wolumenu, trust-score i estymowanym zyskiem.
2. Wizualizację spreadów i pełny podgląd orderbooków.
3. Filtrowanie po giełdach, aktywach, spreadzie i cenie.
4. Alerty e-mail i Telegram, gdy spread ≥ 2 % (domyślnie) lub według własnego progu.
5. Plan freemium z ograniczeniem do 3 alertów / 24 h oraz plan płatny aktywowany przez MetaMask.
6. Eksport danych historycznych (3 mies.) do CSV.
7. Panel administracyjny (edycja progów, monitoring jakości danych).

## 2. Problem użytkownika
1. Kryptoentuzjaści tracą szanse arbitrażowe z powodu braku narzędzi monitorujących wiele giełd jednocześnie i dostarczających szybkie powiadomienia.
2. Profesjonalni traderzy potrzebują dokładnych danych o głębokości i płynności spreadów, aby ocenić wykonalność transakcji; 
3. Rynek zmienia się szybko; brak jednego źródła prawdy prowadzi do ręcznego porównywania cen i spowolnienia reakcji.
4. Istniejące narzędzia rzadko oferują model freemium pozwalający przetestować wartość produktu przed zakupem subskrypcji.

## 3. Wymagania funkcjonalne
FR-01 Integracja z API giełd: Binance, Kraken, OKX, ByBit, Zonda.
FR-02 Pobieranie pełnych orderbooków top 10 aktywów każdej giełdy co 30 s.
FR-03 Backendowa kalkulacja spreadu arbitrażowego w USDT uwzględniająca głębokość i wolumen.
FR-04 Generowanie alertu, gdy spread ≥ konfigurowalny próg (domyślnie 2 %).
FR-05 Wysyłka alertu na e-mail i Telegram w ≤ 5 s od obliczenia.
FR-06 Dashboard front-end z tabelą okazji, wizualizacją oraz pełnym orderbookiem.
FR-07 Filtry po giełdzie, aktywie, spreadzie, cenie; personalna watchlist.
FR-08 Plan freemium: dostęp do danych + 3 historyczne alerty/24 h.
FR-09 Plan płatny: nielimitowane alerty i dane w czasie rzeczywistym, płatność Stripe.
FR-11 Eksport danych historycznych orderbooków (3 mies.) do pliku CSV.
FR-12 Panel admin: zmiana domyślnych progów, monitoring jakości danych.
FR-13 Logowanie i rejestracja użytkowników (e-mail + OAuth, opcjonalnie Stripe).
FR-14 Śledzenie zdarzeń użytkownika i KPI w PostHog.
FR-15 Retry & cache dla błędów API giełd; dostępność backendu 100 %.
FR-16 Kompatybilność mobilna (responsywność) i szybki czas ładowania dashboardu.
FR-17 Przechowywanie danych zgodnie z GDPR; kasowanie danych starszych niż 3 mies.

## 4. Granice produktu
1. Brak automatycznego wykonywania transakcji w MVP.
2. Brak publicznego API oraz trybu white-label.
3. Bezpieczeństwo i skalowanie poza podstawowym retry/cache rozwijane w późniejszych fazach.
4. Dane historyczne przechowywane maks. 3 mies.; brak przeglądarki poza CSV.
5. Dark-mode nieobjęty zakresem MVP.
6. Płatności obsługiwane wyłącznie przez Stripe.
7. Jedna rola admin z ograniczonym zakresem (edycja progów, podgląd metryk).

## 5. Historyjki użytkowników
| ID | Tytuł | Opis | Kryteria akceptacji |
| --- | --- | --- | --- |
| US-001 | Otrzymywanie alertu Telegram | Jako kryptoentuzjasta chcę natychmiastowe powiadomienie w Telegramie, gdy spread ≥ 2 %, abym mógł szybko zareagować. | 1. Użytkownik ma połączone konto Telegram. 2. Alert pojawia się w ≤ 5 s od obliczenia. 3. Treść zawiera spread %, wolumen, głębokość, estymowany zysk, trust-score. |
| US-002 | Przegląd pełnego orderbooka | Jako profesjonalny trader chcę widzieć pełną głębokość orderbooków obu giełd, aby ocenić wykonalność transakcji. | 1. Kliknięcie w okazję otwiera modal/orderbook. 2. Dane są aktualne (<30 s). 3. Widoczny sumaryczny wolumen i poziomy cenowe. |
| US-003 | Filtracja okazji | Jako użytkownik chcę filtrować tabelę po giełdzie, aktywie, spreadzie i cenie, aby skupić się na interesujących mnie rynkach. | 1. Filtry działają w czasie rzeczywistym. 2. Wyniki odpowiadają zastosowanym kryteriom. |
| US-004 | Historia alertów freemium | Jako nowy użytkownik freemium chcę zobaczyć 3 najlepsze historyczne alerty z ostatnich 24 h, aby ocenić wartość produktu. | 1. Widoczne dokładnie 3 alerty. 2. Dostęp bez płatnej subskrypcji. |
| US-005 | Uaktualnienie do planu płatnego | Jako użytkownik freemium chcę uaktualnić konto przez Stripe, aby odblokować alerty w czasie rzeczywistym. | 1. Transakcja krypto potwierdzona w sieci. 2. Konto zmienia status na "Pro". 3. Alerty przestają być limitowane. |
| US-006 | Eksport CSV | Jako analityk chcę wyeksportować dane orderbooków z ostatnich 3 mies. do CSV, aby móc je analizować offline. | 1. Użytkownik wybiera zakres dat. 2. Plik generuje się w <30 s. 3. Dane są kompletne i poprawnie sformatowane. |
| US-007 | Edycja progów admin | Jako administrator chcę zmienić domyślny próg spreadu, aby kontrolować liczbę wysyłanych alertów. | 1. Formularz umożliwia zmianę wartości i zapis. 2. Nowy próg stosowany w kolejnych cyklach. |
| US-008 | Monitorowanie jakości danych | Jako administrator chcę widzieć wskaźnik błędów API i retrysy, aby reagować na problemy z integracjami giełd. | 1. Dashboard admin pokazuje liczbę błędów i sukces rate. 2. Dane odświeżane co 5 min. |
| US-009 | Logowanie i rejestracja | Jako użytkownik chcę zarejestrować się i logować przez e-mail/OAuth, aby mieć bezpieczny dostęp do mojego konta i subskrypcji. | 1. Możliwa rejestracja i logowanie. 2. Hasła przechowywane zgodnie z wymogami bezpieczeństwa. 3. Sesja wygasa po 30 dniach bez aktywności. |
| US-010 | Uwierzytelnienie Stripe | Jako użytkownik Pro chcę połączyć Stripe do płatności, aby odnowić subskrypcję bez podawania danych karty. | 1. Portfel podpisuje transakcję. 2. System rozpoznaje potwierdzenie i aktualizuje datę ważności. |
| US-011 | Watchlist | Jako trader chcę dodać pary do własnej watchlisty, aby szybko je odnaleźć na dashboardzie. | 1. Dodanie/usunięcie pary aktualizuje listę natychmiast. 2. Watchlist przechowywana w profilu użytkownika. |
| US-012 | Ograniczenie spamu alertów | Jako użytkownik chcę, aby system nie wysyłał więcej niż 1 alert/min na tę samą parę, aby uniknąć spamu. | 1. Rate-limit działa zgodnie z ustawieniem. 2. W logach widoczna informacja o wstrzymanych alertach. |
| US-013 | Bezpieczne logowanie administratora | Jako administrator chcę uwierzytelniania dwuskładnikowego (MFA), aby chronić panel admin przed nieautoryzowanym dostępem. | 1. Po włączeniu MFA logowanie wymaga kodu TOTP. 2. Niepoprawny kod blokuje dostęp po 3 próbach. |

## 6. Metryki sukcesu
1. MAU ≥ X (cel ustalony po uruchomieniu) oraz 30-dniowa retencja ≥ 30 %.
2. Konwersja freemium → Pro ≥ 10 % w ciągu 30 dni.
3. Średni czas dostarczenia alertu ≤ 5 s od zakończenia cyklu 30 s.
4. Czas ładowania dashboardu ≤ 3 s przy danych 5 giełd × 100 coinów.
5. System uptime 100 % podczas okresu MVP.
6. Liczba wygenerowanych alertów/dzień oraz współczynnik kliknięć (CTR) w alertach ≥ określone progi (TBD).
7. Satysfakcja użytkownika (ankieta PostHog) ≥ 4/5.
8. Błędy API ≤ 0,1 % wszystkich zapytań (po retry). 