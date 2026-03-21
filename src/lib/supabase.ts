import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://njsjpvjqrnjzignaafbn.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_XcKTe4KVhZKnv4IRdTNKSA_eQuuBI3K';

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.warn('Supabase environment variables are missing. Using fallback values for development.');
}

let supabase: any;

try {
  if (!supabaseUrl || !supabaseUrl.startsWith('https://')) {
    throw new Error('Invalid Supabase URL. Please check your environment variables.');
  }
  supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        'x-app-secret': 'girvi-pro-protected-access-2026'
      }
    }
  });
} catch (error) {
  console.error('Failed to initialize Supabase client:', error);
  // Create a mock client that throws on every call to help debug
  supabase = {
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.reject(new Error('Supabase not initialized correctly')),
          order: () => Promise.reject(new Error('Supabase not initialized correctly')),
        }),
        order: () => Promise.reject(new Error('Supabase not initialized correctly')),
      }),
      insert: () => Promise.reject(new Error('Supabase not initialized correctly')),
      update: () => Promise.reject(new Error('Supabase not initialized correctly')),
      delete: () => Promise.reject(new Error('Supabase not initialized correctly')),
    }),
    auth: {
      signInWithPassword: () => Promise.reject(new Error('Supabase not initialized correctly')),
      signOut: () => Promise.reject(new Error('Supabase not initialized correctly')),
    }
  };
}

export { supabase };
