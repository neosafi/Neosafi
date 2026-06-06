// --- SUPABASE CONFIGURATION (ONLY INIT) ---
// Remplacer ces valeurs par celles de votre projet Supabase (Settings > API)

const SUPABASE_URL = 'https://mmfvoyqtpciumsvrgpaf.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_jIi8Isll3dbVcYXqbsSAqw_P30_T-ho';

let supabaseClient;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || SUPABASE_URL.includes('VOTRE_SUPABASE_URL') || SUPABASE_ANON_KEY.includes('VOTRE_SUPABASE_ANON_KEY')) {
  console.warn('⚠️ Supabase config missing: update supabase-config.js');
  supabaseClient = {
    from: () => ({ select: () => ({ eq: () => ({ single: () => ({ data: null, error: true }) }) }), insert: () => ({ error: true }), update: () => ({ eq: () => ({ error: true }) }), delete: () => ({ neq: () => ({ error: true }) }), order: () => ({ ascending: () => ({ error: true }) }) }),
    rpc: () => ({ data: null, error: true }),
  };
} else {
  supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

// Scripts existants attendent un global `supabase`
window.supabase = supabaseClient;

