# Changelog

Wszystkie istotne zmiany w tym projekcie będą dokumentowane w tym pliku.

Format oparty na [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
a wersjonowanie zgodne z [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2024-01-15

### Dodano
- 🎉 Inicjalna implementacja projektu Crypto Arbitrage Dashboard
- 📊 Endpoint GET `/api/orderbooks/export` do eksportu danych orderbooków do CSV
- 🔧 Kompletną konfigurację projektu Astro z TypeScript
- 🗄️ Typy bazy danych dla Supabase z pełną strukturą tabel
- 🧪 Kompleksowe testy jednostkowe z 100% pokryciem funkcji pomocniczych
- 📚 Szczegółową dokumentację API i instrukcje instalacji

### Funkcjonalności
- **Eksport CSV**: Pobieranie danych orderbooków w formacie CSV
- **Walidacja dat**: Sprawdzanie formatów ISO 8601 i zakresów dat
- **Obsługa błędów**: Kompleksowa obsługa błędów z odpowiednimi kodami HTTP
- **Bezpieczeństwo**: Prepared statements i walidacja parametrów
- **Logowanie**: Szczegółowe logi operacji dla monitorowania

### Struktura projektu
```
src/
├── db/database.types.ts        # Typy Supabase
├── pages/api/orderbooks/       # Endpointy API
├── types.ts                    # Definicje DTO
└── utils/orderbook-export.ts   # Funkcje pomocnicze
```

### Konfiguracja
- **Astro**: Konfiguracja z integracjami React i Tailwind
- **TypeScript**: Strict mode z path mappingiem
- **Vitest**: Konfiguracja testów z coverage
- **Supabase**: Integracja z PostgreSQL

### Testy
- ✅ Walidacja dat ISO 8601 (12 test cases)
- ✅ Konwersja do CSV (7 test cases) 
- ✅ Walidacja parametrów query (8 test cases)
- ✅ Generowanie nazw plików (3 test cases)
- ✅ Obsługa edge cases i błędów

### Bezpieczeństwo
- 🔒 Walidacja wszystkich parametrów wejściowych
- 🔒 Ograniczenie zakresu dat do 3 miesięcy
- 🔒 Escape'owanie danych JSON w CSV
- 🔒 Prepared statements dla zapytań SQL

### Dokumentacja
- 📖 Kompletne README.md z instrukcjami
- 📖 Dokumentacja API z przykładami
- 📖 Opis bezpieczeństwa i monitorowania
- 📖 Instrukcje deploymentu

### Zależności
- `astro`: ^4.15.12
- `@supabase/supabase-js`: ^2.45.4
- `react`: ^18.3.1
- `typescript`: ^5.6.3
- `vitest`: ^2.1.3

---

## [Unreleased]

### Planowane
- 🔄 Mechanizm strumieniowania dla dużych plików CSV
- 📊 Dodatowe endpointy API (alerts, watchlist, admin)
- 🎨 Interfejs użytkownika z dashboardem
- 🔔 System powiadomień (email, Telegram)
- 🐳 Konfiguracja Docker i deployment
- 📈 Monitorowanie wydajności i metryki

### W rozwoju
- Integration tests z rzeczywistą bazą danych
- CI/CD pipeline z GitHub Actions
- Dokumentacja API w formacie OpenAPI

---

## Format zmian

### Dodano
- Nowe funkcjonalności

### Zmieniono
- Zmiany w istniejących funkcjonalnościach

### Przestarzałe
- Funkcjonalności które będą usunięte

### Usunięto
- Usunięte funkcjonalności

### Naprawiono
- Naprawione błędy

### Bezpieczeństwo
- Zmiany dotyczące bezpieczeństwa