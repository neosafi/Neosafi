// --- SUPABASE CONFIGURATION ---
// Replace these values with your Supabase project credentials (Settings > API)
const SUPABASE_URL = 'https://mmfvoyqtpciumsvrgpaf.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_jIi8Isll3dbVcYXqbsSAqw_P30_T-ho';

// --- Configuration Check & Initialization ---
let supabaseClient;

if (SUPABASE_URL === 'VOTRE_SUPABASE_URL' || SUPABASE_ANON_KEY === 'VOTRE_SUPABASE_ANON_KEY') {
    console.warn("⚠️ SUPABASE CONFIGURATION MISSING: Please update supabase-config.js with your real project credentials.");
    // Provide a dummy object with clear error messages
    const notConfiguredError = { error: { message: "Supabase not configured. Please update supabase-config.js with your real URL and API Key." } };
    supabaseClient = {
        from: () => ({ 
            select: () => ({ eq: () => ({ single: () => ({ data: null, error: true }) }) }), 
            insert: () => ({ error: true }), 
            update: () => ({ eq: () => ({ error: true }) }), 
            delete: () => ({ neq: () => ({ error: true }) }), 
            order: () => ({ ascending: () => ({ error: true }) }) 
        }),
        rpc: () => ({ data: null, error: true }),
        auth: { 
            getSession: () => ({ data: { session: null } }), 
            signInWithPassword: () => notConfiguredError,
            signInWithOtp: () => notConfiguredError,
            verifyOtp: () => notConfiguredError,
            signOut: () => {} 
        }
    };
} else {
    try {
        supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    } catch (e) {
        console.error("Supabase Initialization Error:", e);
        const initError = { error: { message: "Supabase Initialization Error. Check your console." } };
        supabaseClient = { 
            auth: { 
                getSession: () => ({ data: { session: null } }),
                signInWithOtp: () => initError,
                verifyOtp: () => initError
            } 
        }; 
    }
}

// For compatibility with existing scripts that expect 'supabase'
const supabaseInstance = supabaseClient;
// However, since script.js and panel.js use 'supabase', let's redefine it carefully
// or just use a different variable and update the scripts.
// The most surgical way is to change the name of the constant in this file 
// and then use it in script.js and panel.js.
// But to keep it simple and working with the existing global:
window.supabase = supabaseClient;

/**
 * DATABASE STRUCTURE (To be executed in the Supabase SQL Editor):
 * 
 * -- Table: Leads (Tracks player activity and results)
 * create table leads (
 *   id uuid default uuid_generate_v4() primary key,
 *   email text,
 *   timestamp timestamptz default now(),
 *   ip text,
 *   location text,
 *   browser text,
 *   os text,
 *   device text,
 *   result text,
 *   code text,
 *   user_agent text,
 *   language text,
 *   screen text,
 *   referrer text
 * );
 * 
 * -- Table: System Config (Stores wheel segments and limits)
 * create table system_config (
 *   key text primary key,
 *   value jsonb
 * );
 * 
 * -- Default Configuration
 * insert into system_config (key, value) values 
 * ('spin_limit', '1'),
 * ('wheel_segments', '[
 *   {"label": "100% OFF", "color": "#6366F1", "weight": 2, "icon": "🔥", "code": "ZQYB214RZC"},
 *   {"label": "FREE PRODUCT", "color": "#8B5CF6", "weight": 3, "icon": "🎁", "code": "FREEGIFT"},
 *   {"label": "FREE SPIN", "color": "#EC4899", "weight": 15, "icon": "🔄", "code": "RETRY"},
 *   {"label": "50% OFF", "color": "#1E293B", "weight": 5, "icon": "💸", "code": "U7LUI0MZ9Q"},
 *   {"label": "BETTER LUCK", "color": "#0F172A", "weight": 35, "icon": "😢", "code": "TRYAGAIN"},
 *   {"label": "BUNDLE", "color": "#10B981", "weight": 5, "icon": "📦", "code": "BUNDLE"},
 *   {"label": "25% OFF", "color": "#1E293B", "weight": 25, "icon": "🏷️", "code": "LBVFFODD9Z"},
 *   {"label": "MYSTERY", "color": "#4F46E5", "weight": 10, "icon": "💎", "code": "MYSTERY"}
 * ]');
 * 
 * -- RPC Function: execute_spin
 * -- This ensures the spin result is calculated server-side for security.
 * create or replace function execute_spin(user_email text)
 * returns json as $$
 * declare
 *   segments jsonb;
 *   total_weight int := 0;
 *   random_val int;
 *   current_weight int := 0;
 *   seg record;
 *   idx int := 0;
 * begin
 *   -- Get segments from config
 *   select value into segments from system_config where key = 'wheel_segments';
 *   
 *   -- Calculate total weight
 *   for seg in select * from jsonb_to_recordset(segments) as x(label text, weight int) loop
 *     total_weight := total_weight + seg.weight;
 *   end loop;
 *   
 *   -- Pick a random value
 *   random_val := floor(random() * total_weight);
 *   
 *   -- Find the selected segment
 *   for seg in select *, row_number() over () - 1 as row_idx from jsonb_to_recordset(segments) as x(label text, weight int, code text) loop
 *     current_weight := current_weight + seg.weight;
 *     if random_val < current_weight then
 *       return json_build_object(
 *         'index', seg.row_idx,
 *         'label', seg.label,
 *         'code', seg.code
 *       );
 *     end if;
 *   end loop;
 *   
 *   return json_build_object('error', 'Failed to determine result');
 * end;
 * $$ language plpgsql security definer;
 */