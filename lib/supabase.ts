
import { createClient } from 'https://esm.sh/@supabase/supabase-js@^2.39.7';

/**
 * CONFIGURACIÓN PARA VITE + VERCEL
 * Importante: En Vite se usa import.meta.env y el prefijo VITE_
 */

// 1. Intentar obtener de las variables de entorno (usando process.env para evitar errores de tipo en ImportMeta)
// 2. Si no existen, usar los valores confirmados en tus capturas de pantalla
// Fix: Use process.env instead of import.meta.env to resolve "Property 'env' does not exist on type 'ImportMeta'"
const rawUrl = (process.env.VITE_SUPABASE_URL) || 'https://ozrtpaefmdndsjodygig.supabase.co';
const rawKey = (process.env.VITE_SUPABASE_ANON_KEY) || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im96cnRwYWVmbWRuZHNqb2R5Z2lnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzcyNDc0NjQsImV4cCI6MjA1MjgyMzQ2NH0.9TMYdEqNl0VCqeWFHsJT7AZmq3bhFCvS5Ku_MAe7FP8';

// Limpieza profunda de las credenciales (eliminar espacios, saltos de línea y slashes finales)
const supabaseUrl = rawUrl.trim().replace(/\/$/, "");
const supabaseAnonKey = rawKey.trim();

if (!supabaseUrl.startsWith('https')) {
    console.error("CRITICAL: Supabase URL is malformed or missing.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
