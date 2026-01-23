
import { createClient } from 'https://esm.sh/@supabase/supabase-js@^2.39.7';

// Estas variables se configuran en el panel de Vercel / GitHub Secrets
const supabaseUrl = (window as any).env?.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = (window as any).env?.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
