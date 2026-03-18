import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://njsjpvjqrnjzignaafbn.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_XcKTe4KVhZKnv4IRdTNKSA_eQuuBI3K';

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.warn('Supabase environment variables are missing. Using fallback values for development.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
