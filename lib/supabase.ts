
import { createClient } from 'https://esm.sh/@supabase/supabase-js@^2.39.7';

/**
 * DATOS EXTRAÍDOS DE TUS CAPTURAS DE PANTALLA:
 * URL: https://ozrtpaefmdndsjodygig.supabase.co
 * Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (Anon Key)
 */

// Intentamos leer de Vercel, si no, usamos los valores de tus capturas como respaldo total.
const supabaseUrl = (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_SUPABASE_URL) 
  || 'https://ozrtpaefmdndsjodygig.supabase.co';

const supabaseAnonKey = (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY) 
  || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im96cnRwYWVmbWRuZHNqb2R5Z2lnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzcyNDc0NjQsImV4cCI6MjA1MjgyMzQ2NH0.9TMYdEqNl0VCqeWFHsJT7AZmq3bhFCvS5Ku_MAe7FP8';

// Limpieza de URL para evitar errores de fetch por espacios o slashes extra
const cleanUrl = supabaseUrl.trim().replace(/\/$/, "");

export const supabase = createClient(cleanUrl, supabaseAnonKey);
