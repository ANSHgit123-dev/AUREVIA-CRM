import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isMockFallbackEnabled = import.meta.env.VITE_ENABLE_MOCK_FALLBACK === 'true';

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl !== 'https://your-project-id.supabase.co' &&
  supabaseAnonKey !== 'your-anon-key-here' &&
  supabaseAnonKey !== 'PASTE_MY_SB_PUBLISHABLE_KEY_HERE'
);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: window.localStorage,
      },
    })
  : null;

/**
 * Asserts Supabase client initialization. Throws explicit error if unconfigured.
 */
export function getRequiredSupabaseClient() {
  if (!supabase || !isSupabaseConfigured) {
    throw new Error(
      'Supabase client is not configured. Please verify VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
    );
  }
  return supabase;
}
