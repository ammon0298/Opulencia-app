import { createClient } from '@supabase/supabase-js'

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL ?? '')
  .trim()
  .replace(/\/$/, '')

const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim()

// 👇 logs SOLO para debug (luego los quitas)
console.log('VITE_SUPABASE_URL:', supabaseUrl)
console.log('VITE_SUPABASE_ANON_KEY len:', supabaseAnonKey.length)
console.log('key tail:', supabaseAnonKey.slice(-12))

export const supabase = createClient(supabaseUrl, supabaseAnonKey)