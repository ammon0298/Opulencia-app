
import { createClient } from 'https://esm.sh/@supabase/supabase-js@^2.39.7';

/**
 * Función para obtener variables de entorno de forma segura en el navegador.
 * Intenta leer de process.env (Vercel) o de la URL si se pasaran como parámetros.
 */
const getEnv = (key: string): string => {
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key] as string;
  }
  return '';
};

const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL');
const supabaseAnonKey = getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');

// Log de depuración para el desarrollador (solo en consola)
if (!supabaseUrl) {
  console.error("❌ ERROR: NEXT_PUBLIC_SUPABASE_URL no detectada.");
}

// Exportamos el cliente con una URL por defecto solo si no hay ninguna, 
// pero asegurándonos de que sea una URL válida para que el error sea claro.
export const supabase = createClient(
  supabaseUrl || 'https://qbrvvumkqbihihfyixpq.supabase.co', // Fallback a tu URL real detectada
  supabaseAnonKey || 'no-key-provided'
);
