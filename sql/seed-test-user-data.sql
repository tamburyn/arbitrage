-- Seed test user data for arbitrage system testing
-- This creates subscription data that links to your existing Supabase Auth user

-- Insert test subscription for your Supabase Auth user
-- Replace the user_id with your actual auth.users.id from Supabase Dashboard
INSERT INTO subscriptions (
  id,
  user_id,
  status,
  start_date,
  end_date,
  payment_method,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  '749c8297-46b2-4910-88f6-09c8ca73a432', -- Your actual user ID from auth.users
  'active',
  now() - interval '1 month',
  now() + interval '6 months',
  'test',
  now(),
  now()
) ON CONFLICT (id) DO UPDATE SET
  status = EXCLUDED.status,
  end_date = EXCLUDED.end_date,
  updated_at = now();

-- Optional: Add some watchlist entries for testing
INSERT INTO watchlist (
  id,
  user_id,
  asset_id,
  added_date,
  created_at
) SELECT 
  gen_random_uuid(),
  '749c8297-46b2-4910-88f6-09c8ca73a432',
  assets.id,
  now(),
  now()
FROM assets 
WHERE symbol IN ('BTC', 'ETH', 'BNB')
ON CONFLICT DO NOTHING;

-- Verify the data
SELECT 
  s.id,
  s.user_id,
  s.status,
  s.start_date,
  s.end_date
FROM subscriptions s
WHERE s.user_id = '749c8297-46b2-4910-88f6-09c8ca73a432';

