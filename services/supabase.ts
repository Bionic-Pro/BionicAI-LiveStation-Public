import { createClient } from '@supabase/supabase-js';

// Hardcoded credentials as requested for AI Studio environment
const supabaseUrl = 'https://gtuiwprkotdaaratukus.supabase.co';
const supabaseAnonKey = 'sb_publishable_6I7EMmJHozCZAtehLAK3tg_nJNsouB1';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase URL or Key missing.');
}

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
);