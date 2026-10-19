// Supabase is optional for local preview. Add the two VITE_ values to .env to enable real auth and database calls.
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

// Do not place a service-role key in a frontend project. The anon key is designed for client use with RLS.
export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true }
    })
  : null;

export const isSupabaseConfigured = Boolean(supabase);
