-- ========================================================
-- PREMIUM SPIN & WIN - DATABASE SETUP SCRIPT
-- Compatible with Supabase (PostgreSQL)
-- ========================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create Leads Table (Tracking players and results)
CREATE TABLE IF NOT EXISTS leads (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    email TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    ip TEXT,
    location TEXT,
    browser TEXT,
    os TEXT,
    device TEXT,
    result TEXT DEFAULT 'Pending',
    code TEXT,
    user_agent TEXT,
    language TEXT,
    screen TEXT,
    referrer TEXT
);

-- 3. Create System Configuration Table
CREATE TABLE IF NOT EXISTS system_config (
    key TEXT PRIMARY KEY,
    value JSONB
);

-- 4. Insert Default Configuration
INSERT INTO system_config (key, value) VALUES 
('spin_limit', '1'),
('wheel_segments', '[
    {"label": "100% OFF", "color": "#6366F1", "weight": 2, "icon": "🔥", "code": "ZQYB214RZC"},
    {"label": "FREE PRODUCT", "color": "#8B5CF6", "weight": 3, "icon": "🎁", "code": "FREEGIFT"},
    {"label": "FREE SPIN", "color": "#EC4899", "weight": 15, "icon": "🔄", "code": "RETRY"},
    {"label": "50% OFF", "color": "#1E293B", "weight": 5, "icon": "💸", "code": "U7LUI0MZ9Q"},
    {"label": "BETTER LUCK", "color": "#0F172A", "weight": 35, "icon": "😢", "code": "TRYAGAIN"},
    {"label": "BUNDLE", "color": "#10B981", "weight": 5, "icon": "📦", "code": "BUNDLE"},
    {"label": "25% OFF", "color": "#1E293B", "weight": 25, "icon": "🏷️", "code": "LBVFFODD9Z"},
    {"label": "MYSTERY", "color": "#4F46E5", "weight": 10, "icon": "💎", "code": "MYSTERY"}
]')
ON CONFLICT (key) DO NOTHING;

-- 5. RPC Function: execute_spin
-- This function handles the weighted random selection on the server for security.
CREATE OR REPLACE FUNCTION execute_spin(user_email TEXT)
RETURNS JSON AS $$
DECLARE
    segments_json JSONB;
    total_weight INT := 0;
    random_val INT;
    current_weight INT := 0;
    selected_segment RECORD;
    idx INT := 0;
BEGIN
    -- A. Retrieve segments from configuration
    SELECT value INTO segments_json FROM system_config WHERE key = 'wheel_segments';
    
    IF segments_json IS NULL THEN
        RETURN json_build_object('error', 'Configuration not found');
    END IF;

    -- B. Calculate total weight
    SELECT SUM((val->>'weight')::INT) INTO total_weight 
    FROM jsonb_array_elements(segments_json) AS val;
    
    -- C. Pick a random value
    random_val := floor(random() * total_weight);
    
    -- D. Find the selected segment based on weights
    FOR selected_segment IN 
        SELECT 
            (row_number() OVER () - 1) as row_idx,
            val->>'label' as label,
            (val->>'weight')::INT as weight,
            val->>'code' as code
        FROM jsonb_array_elements(segments_json) AS val
    LOOP
        current_weight := current_weight + selected_segment.weight;
        IF random_val < current_weight THEN
            RETURN json_build_object(
                'index', selected_segment.row_idx,
                'label', selected_segment.label,
                'code', selected_segment.code
            );
        END IF;
    END LOOP;
    
    RETURN json_build_object('error', 'Failed to calculate result');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Optional: Set up Row Level Security (RLS)
-- By default, for a public prototype, you can keep it simple.
-- If you want to restrict access to the leads table for the dashboard:
-- ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow public insert" ON leads FOR INSERT WITH CHECK (true);
-- CREATE POLICY "Allow admin select" ON leads FOR SELECT USING (auth.role() = 'authenticated');
