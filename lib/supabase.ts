
import { createClient } from 'https://esm.sh/@supabase/supabase-js@^2.39.7';

// Estas variables se deben configurar en Vercel o GitHub Secrets
// Se añade un valor de fallback para evitar que la aplicación crashee antes de configurar las llaves reales.
const supabaseUrl = (window as any).env?.NEXT_PUBLIC_SUPABASE_URL || 
                    (window as any).process?.env?.NEXT_PUBLIC_SUPABASE_URL || 
                    'https://placeholder-url.supabase.co';

const supabaseAnonKey = (window as any).env?.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
                        (window as any).process?.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
                        'placeholder-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
