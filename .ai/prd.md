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
| US-014 | Wykres spreadów w czasie rzeczywistym | Jako użytkownik chcę widzieć wykres liniowy pokazujący zmiany spreadów arbitrażowych w czasie, aby śledzić trendy i wzorce rynkowe. | 1. Wykres aktualizuje się co 30s wraz z nowymi danymi. 2. Możliwość wyboru zakresu czasowego (1h, 6h, 24h). 3. Hover pokazuje dokładne wartości spreadu i czas. 4. Różne kolory linii dla różnych par walutowych. |
| US-015 | Tabela okazji arbitrażowych | Jako użytkownik chcę widzieć tabelę z aktualnymi okazjami arbitrażowymi posortowaną według najwyższego spreadu, aby szybko identyfikować najlepsze możliwości. | 1. Tabela zawiera: parę, giełdy, spread %, wolumen, trust-score, estymowany zysk. 2. Domyślne sortowanie po spreadzie malejąco. 3. Możliwość sortowania po każdej kolumnie. 4. Podświetlenie nowych okazji (ostatnie 30s). |
| US-016 | Live ticker z cenami | Jako trader chcę widzieć live ticker z aktualnymi cenami bid/ask z różnych giełd, aby szybko porównać poziomy cenowe. | 1. Ticker przewija się automatycznie lub pozwala na przewijanie ręczne. 2. Różne kolory dla wzrostów/spadków cen. 3. Aktualizacja co 30s. 4. Kliknięcie w parę przenosi do szczegółów. |
| US-017 | Wskaźniki podsumowujące | Jako użytkownik chcę widzieć karty z kluczowymi wskaźnikami (średni spread, liczba aktywnych okazji, najlepszy spread), aby szybko ocenić stan rynku. | 1. 4 główne karty na górze dashboardu. 2. Wskaźniki aktualizują się w czasie rzeczywistym. 3. Porównanie z poprzednim okresem (strzałki wzrost/spadek). 4. Animacja przy zmianie wartości. |
| US-018 | Mapa ciepła spreadów | Jako analityk chcę widzieć mapę ciepła pokazującą spready między wszystkimi parami giełd, aby wizualnie identyfikować najgorętsze obszary arbitrażu. | 1. Macierz giełda x giełda z kolorami reprezentującymi spready. 2. Tooltip z dokładnymi wartościami przy hover. 3. Możliwość wyboru konkretnej pary walutowej. 4. Skala kolorów od zielonego (niski spread) do czerwonego (wysoki). |
| US-019 | Panel boczny z detalami | Jako użytkownik chcę kliknąć w okazję arbitrażową i zobaczyć panel boczny z pełnymi detalami, aby przeanalizować wykonalność bez opuszczania dashboardu. | 1. Panel slide-in z prawej strony. 2. Zawiera: pełny orderbook, historię spreadu, analitykę wolumenu. 3. Przycisk "Close" i możliwość zamknięcia klawiszem ESC. 4. Aktualizuje się w czasie rzeczywistym. |
| US-020 | Status połączeń z giełdami | Jako użytkownik chcę widzieć status połączeń z każdą giełdą, aby wiedzieć czy dane są aktualne i kompletne. | 1. Ikony statusu (zielone/czerwone/żółte) dla każdej giełdy. 2. Timestamp ostatniej aktualizacji. 3. Liczba nieudanych połączeń w ostatniej godzinie. 4. Tooltip z dodatkowymi informacjami o błędach. |
| US-021 | Szybki dostęp do ulubionych par | Jako trader chcę mieć sekcję z ulubionymi parami walutowymi na szczycie dashboardu, aby szybko monitorować najważniejsze dla mnie aktywa. | 1. Sekcja "Favorites" na górze tabeli głównej. 2. Dodawanie/usuwanie par przez ikonę gwiazdki. 3. Drag & drop do zmiany kolejności. 4. Maksymalnie 10 ulubionych par. |
| US-022 | Tryb pełnoekranowy | Jako trader chcę móc przełączyć dashboard w tryb pełnoekranowy, aby maksymalnie wykorzystać przestrzeń ekranu podczas sesji tradingowych. | 1. Przycisk fullscreen w prawym górnym rogu. 2. Ukrycie menu nawigacyjnego i stopki. 3. Możliwość wyjścia klawiszem ESC lub przyciskiem. 4. Zachowanie stanu filtrów i sortowania. |
| US-023 | Powiadomienia w dashboardzie | Jako użytkownik chcę widzieć powiadomienia toast o nowych okazjach arbitrażowych pojawiające się w dashboardzie, aby nie przegapić ważnych alertów. | 1. Toast notification w prawym górnym rogu. 2. Automatyczne znikanie po 5s lub ręczne zamknięcie. 3. Różne kolory według ważności spreadu. 4. Maksymalnie 3 toasty jednocześnie. |
| US-024 | Personalizacja układu | Jako power user chcę móc dostosować układ dashboardu (kolejność sekcji, widoczność elementów), aby zoptymalizować workflow pod swoje potrzeby. | 1. Tryb edycji z drag & drop sekcji. 2. Checkbox do pokazywania/ukrywania komponentów. 3. Zapisywanie preferencji w profilu użytkownika. 4. Przycisk "Reset to default" do przywrócenia domyślnego układu. |
| US-025 | Porównanie historyczne | Jako analityk chcę móc porównać bieżące spready z danymi historycznymi (24h/7d/30d temu), aby zrozumieć czy obecne okazje to norma czy anomalia. | 1. Dodatkowa kolumna w tabeli z porównaniem historycznym. 2. Oznaczenia kolorystyczne (powyżej/poniżej średniej). 3. Możliwość wyboru okresu porównania. 4. Tooltip z dokładnymi wartościami historycznymi. |
| US-026 | Responsywność mobilna | Jako użytkownik mobilny chcę mieć zoptymalizowaną wersję dashboardu na telefonie, aby monitorować okazje w ruchu. | 1. Responsive design działający na ekranach <768px. 2. Touch-friendly kontrolki i przyciski. 3. Skrócona tabela z najważniejszymi kolumnami. 4. Swipe gestures do nawigacji. |
| US-027 | Wsparcie dla tabletów | Jako użytkownik tabletu chcę mieć dostęp do wszystkich funkcji dashboardu z interfejsem dostosowanym do ekranu dotykowego. | 1. Optymalizacja dla ekranów 768px-1024px. 2. Większe przyciski i kontrolki dotykowe. 3. Adaptacyjny grid layout. 4. Gestures pinch-to-zoom dla wykresów. |
| US-028 | Szybkie ładowanie | Jako użytkownik chcę, aby dashboard ładował się w maksymalnie 3 sekundy, aby szybko rozpocząć monitorowanie. | 1. Initial load time ≤ 3s. 2. Lazy loading dla komponentów poniżej fold. 3. Optimized images i assets. 4. Loading skeletons podczas ładowania danych. |
| US-029 | Płynne animacje | Jako użytkownik chcę płynnych animacji i przejść bez lagów, aby komfortowo korzystać z aplikacji. | 1. 60 FPS dla wszystkich animacji. 2. Smooth transitions między stanami. 3. Debounced inputs i throttled updates. 4. Hardware acceleration dla kluczowych animacji. |
| US-030 | Dostępność | Jako użytkownik z niepełnosprawnością chcę mieć wsparcie dla czytników ekranu i nawigacji klawiaturą, aby równoprawnie korzystać z dashboardu. | 1. ARIA labels i semantic HTML. 2. Keyboard navigation support. 3. Screen reader compatibility. 4. High contrast mode support. |


## 6. Metryki sukcesu
1. MAU ≥ X (cel ustalony po uruchomieniu) oraz 30-dniowa retencja ≥ 30 %.
2. Konwersja freemium → Pro ≥ 10 % w ciągu 30 dni.
3. Średni czas dostarczenia alertu ≤ 5 s od zakończenia cyklu 30 s.
4. Czas ładowania dashboardu ≤ 3 s przy danych 5 giełd × 100 coinów.
5. System uptime 100 % podczas okresu MVP.
6. Liczba wygenerowanych alertów/dzień oraz współczynnik kliknięć (CTR) w alertach ≥ określone progi (TBD).
7. Satysfakcja użytkownika (ankieta PostHog) ≥ 4/5.
8. Błędy API ≤ 0,1 % wszystkich zapytań (po retry). 