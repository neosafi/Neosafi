-- ========================================================
-- RLS / POLICIES RECOMMENDED FOR PREMIUM SPIN & WIN
-- Purpose: allow browser anon client to insert/read config needed
-- ========================================================

-- Enable RLS on leads & system_config
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;

-- 1) Allow anon clients (using anon key) to INSERT leads (visitor tracking)
-- If you want to allow only inserts, keep SELECT/UPDATE/DELETE restricted.
CREATE POLICY "anon_can_insert_leads" 
ON leads
FOR INSERT
TO anon
WITH CHECK (true);

-- 2) Allow anon clients to SELECT system_config entries required by the wheel
CREATE POLICY "anon_can_read_system_config" 
ON system_config
FOR SELECT
TO anon
USING (key IN ('spin_limit', 'wheel_segments'));

-- 3) Allow anon clients to SELECT leads timestamp for spin limit checks
-- (only timestamp is used client-side; policy allows select regardless of columns)
CREATE POLICY "anon_can_select_leads_timestamp" 
ON leads
FOR SELECT
TO anon
USING (true);

-- 4) Allow anon clients to UPDATE only Pending rows for a given email
-- NOTE: Supabase anon JWT typically does NOT contain user email; this policy will be effective
-- only when using authenticated sessions. For anon-only flows, client updates should be done via RPC.
-- We keep UPDATE restricted for safety.


-- Alternative safer approach:
-- - Remove client-side UPDATE entirely and do it in an RPC protected by SECURITY DEFINER.
-- - Keep only INSERT + SELECT allowed for anon.

-- NOTE:
-- Your execute_spin RPC is SECURITY DEFINER already; RPC should work even when RLS is enabled
-- as long as it internally touches only tables that the definer has privileges for.

