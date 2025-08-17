-- Seed script dla podstawowych danych systemu crypto arbitrage
-- Author: Database Setup
-- Date: 2024-12-30
-- Description: Dodaje podstawowe dane giełd i aktywów potrzebne do uruchomienia systemu crypto exchanges integration

-- =============================================================================
-- EXCHANGES - Dodanie Binance jako głównej giełdy
-- =============================================================================

INSERT INTO public.exchanges (name, api_endpoint, integration_status, metadata) 
VALUES (
  'Binance',
  'https://api.binance.com',
  'active',
  '{
    "api_version": "v3", 
    "rate_limit": 1200, 
    "supported_assets": ["BTC", "ETH", "BNB", "XRP", "ADA", "DOGE", "SOL", "DOT", "MATIC", "AVAX"],
    "websocket_url": "wss://stream.binance.com:9443/ws",
    "last_health_check": null,
    "error_count": 0
  }'::jsonb
) ON CONFLICT (name) DO UPDATE SET
  api_endpoint = EXCLUDED.api_endpoint,
  integration_status = EXCLUDED.integration_status,
  metadata = EXCLUDED.metadata,
  updated_at = now();

-- =============================================================================
-- ASSETS - Top 10 aktywów kryptowalut do monitorowania
-- =============================================================================

INSERT INTO public.assets (symbol, full_name, description) VALUES
('BTC', 'Bitcoin', 'Bitcoin - pierwsza i największa kryptowaluta według kapitalizacji rynkowej'),
('ETH', 'Ethereum', 'Ethereum - platforma smart contracts i druga największa kryptowaluta'),
('BNB', 'Binance Coin', 'Binance Coin - natywny token giełdy Binance'),
('XRP', 'Ripple', 'XRP - kryptowaluta stworzona przez Ripple Labs do płatności międzybankowych'),
('ADA', 'Cardano', 'Cardano - blockchain trzeciej generacji z naciskiem na sustainability'),
('DOGE', 'Dogecoin', 'Dogecoin - popularna memecoin oparta na meme Shiba Inu'),
('SOL', 'Solana', 'Solana - szybki blockchain z wysoką przepustowością transakcji'),
('DOT', 'Polkadot', 'Polkadot - protokół umożliwiający interoperacyjność między różnymi blockchainami'),
('MATIC', 'Polygon', 'Polygon - rozwiązanie Layer 2 dla Ethereum zwiększające skalowalność'),
('AVAX', 'Avalanche', 'Avalanche - platforma smart contracts konkurująca z Ethereum')
ON CONFLICT (symbol) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  description = EXCLUDED.description,
  updated_at = now();

-- =============================================================================
-- VERIFICATION QUERIES
-- =============================================================================

-- Sprawdź czy dane zostały dodane poprawnie
DO $$
DECLARE
    exchange_count INTEGER;
    asset_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO exchange_count FROM public.exchanges WHERE name = 'Binance';
    SELECT COUNT(*) INTO asset_count FROM public.assets WHERE symbol IN ('BTC', 'ETH', 'BNB', 'XRP', 'ADA', 'DOGE', 'SOL', 'DOT', 'MATIC', 'AVAX');
    
    RAISE NOTICE 'Seeding completed:';
    RAISE NOTICE '  - Exchanges: % (expected: 1)', exchange_count;
    RAISE NOTICE '  - Assets: % (expected: 10)', asset_count;
    
    IF exchange_count = 1 AND asset_count = 10 THEN
        RAISE NOTICE '✅ All seed data inserted successfully!';
    ELSE
        RAISE WARNING '⚠️  Some seed data may be missing. Please check the results.';
    END IF;
END $$;

-- =============================================================================
-- OPTIONAL: Test queries dla weryfikacji
-- =============================================================================

-- Uncomment poniższe zapytania aby sprawdzić dodane dane:

-- SELECT 'Exchanges:' as section;
-- SELECT name, api_endpoint, integration_status, metadata->'api_version' as api_version 
-- FROM public.exchanges 
-- WHERE name = 'Binance';

-- SELECT 'Assets:' as section;
-- SELECT symbol, full_name, description 
-- FROM public.assets 
-- WHERE symbol IN ('BTC', 'ETH', 'BNB', 'XRP', 'ADA', 'DOGE', 'SOL', 'DOT', 'MATIC', 'AVAX')
-- ORDER BY symbol; 