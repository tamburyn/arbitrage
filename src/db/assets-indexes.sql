-- Database Indexes for Assets Table Optimization
-- Wykonaj te zapytania w bazie danych Supabase dla optymalnej wydajności endpoint GET /assets

-- 1. Indeks dla symbol (używany w filtrach i sortowaniu)
CREATE INDEX IF NOT EXISTS idx_assets_symbol ON assets(symbol);

-- 2. Indeks dla full_name (używany w filtrach i sortowaniu)  
CREATE INDEX IF NOT EXISTS idx_assets_full_name ON assets(full_name);

-- 3. Indeks dla created_at (używany w sortowaniu i statystykach)
CREATE INDEX IF NOT EXISTS idx_assets_created_at ON assets(created_at);

-- 4. Indeks dla updated_at (używany w sortowaniu)
CREATE INDEX IF NOT EXISTS idx_assets_updated_at ON assets(updated_at);

-- 5. Indeks kompozytowy dla często używanych kombinacji filtrów
-- Przydatny dla zapytań z filtrem i sortowaniem jednocześnie
CREATE INDEX IF NOT EXISTS idx_assets_symbol_created_at ON assets(symbol, created_at);

-- 6. Indeks tekstowy dla full-text search na symbol i full_name
-- Używa rozszerzenia pg_trgm dla lepszej wydajności wyszukiwania ILIKE
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_assets_symbol_trgm ON assets USING gin(symbol gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_assets_full_name_trgm ON assets USING gin(full_name gin_trgm_ops);

-- 7. Indeks dla podstawowych statystyk
-- Przydatny dla zapytań COUNT(*)
CREATE INDEX IF NOT EXISTS idx_assets_stats ON assets(created_at) WHERE created_at IS NOT NULL;

-- Wyjaśnienie indeksów:
-- 
-- idx_assets_symbol: Optymalizuje filtrowanie i sortowanie po symbolu
-- idx_assets_full_name: Optymalizuje filtrowanie i sortowanie po pełnej nazwie
-- idx_assets_created_at: Optymalizuje sortowanie po dacie utworzenia oraz statystyki
-- idx_assets_updated_at: Optymalizuje sortowanie po dacie aktualizacji
-- idx_assets_symbol_created_at: Kompozytowy indeks dla zapytań łączących filtr po symbolu i sortowanie po dacie
-- idx_assets_symbol_trgm & idx_assets_full_name_trgm: Indeksy trigram dla szybkiego wyszukiwania ILIKE (% wildcards)
-- idx_assets_stats: Warunowy indeks dla optymalizacji statystyk
--
-- Uwagi dotyczące wydajności:
-- - Indeksy trigram (gin) znacznie przyspieszają zapytania ILIKE z wzorcami %text%
-- - Kompozytowy indeks (symbol, created_at) jest optymalny dla zapytań z filtrem symbol + sortowanie created_at
-- - Warunowy indeks dla statystyk pomija rekordy z NULL created_at
-- - Wszystkie indeksy używają "IF NOT EXISTS" aby uniknąć błędów przy ponownym uruchomieniu

-- Monitorowanie wykorzystania indeksów:
-- SELECT schemaname, tablename, indexname, idx_tup_read, idx_tup_fetch 
-- FROM pg_stat_user_indexes 
-- WHERE tablename = 'assets' 
-- ORDER BY idx_tup_read DESC;

-- Sprawdzenie rozmiaru indeksów:
-- SELECT indexname, pg_size_pretty(pg_relation_size(indexname::regclass)) as size
-- FROM pg_indexes 
-- WHERE tablename = 'assets'; 