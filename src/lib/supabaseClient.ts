import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = 
  process.env.NEXT_PUBLIC_SUPABASE_URL || 
  process.env.VITE_SUPABASE_URL || 
  'https://oxiubezpkxqxnhqvpmvf.supabase.co';

const supabaseAnonKey = 
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY || 
  'sb_publishable_AnCnhh5HWOnheVLelqjCRA_D5RAmRPl';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Retrieves the current Supabase Auth session.
 * Returns null if no user is authenticated.
 */
export async function ensureAdminSession() {
  if (!isSupabaseConfigured || !supabase) return null;
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  } catch (err) {
    console.warn('Supabase session retrieval warning:', err);
  }
  return null;
}

// Helper to normalize strings for exact matching:
// 1. Lowercase
// 2. Trim leading/trailing spaces
// 3. Replace multiple spaces with a single space
// 4. Remove accents
export function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}
