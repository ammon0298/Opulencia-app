
import { createClient } from 'https://esm.sh/@supabase/supabase-js@^2.39.7';

/**
 * Acceso directo a las variables de entorno inyectadas por el sistema.
 * Es crucial que los nombres en Vercel coincidan exactamente con estos.
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Si las variables no existen, avisamos en consola para depuración
if (!supabaseUrl || supabaseUrl.includes('placeholder')) {
  console.warn("⚠️ ERROR DE CONFIGURACIÓN: La URL de Supabase no se ha detectado correctamente. Verifique las variables de entorno en Vercel.");
}

export const supabase = createClient(
  supabaseUrl || 'https://invalid-url-check-env-vars.supabase.co', 
  supabaseAnonKey || 'no-key-found'
);
