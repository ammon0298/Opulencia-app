
-- ==============================================================================
-- SCHEMA DE BASE DE DATOS - OPULENCIA PRO (SUPABASE / POSTGRESQL)
-- ==============================================================================

-- 1. Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Tabla de Usuarios (Administradores y Cobradores)
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL, -- Agrupador para multitenancy (varios negocios en una DB)
  username TEXT UNIQUE NOT NULL, -- Email o usuario único
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  dni TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  role TEXT CHECK (role IN ('ADMIN', 'COLLECTOR')),
  route_ids TEXT[], -- Array de UUIDs de rutas asignadas
  status TEXT CHECK (status IN ('Active', 'Inactive')) DEFAULT 'Active',
  
  -- Campos de Perfil y Geolocalización
  business_name TEXT,
  country TEXT,
  city TEXT,
  lat NUMERIC, -- Latitud GPS actual
  lng NUMERIC, -- Longitud GPS actual
  last_location_at TIMESTAMP WITH TIME ZONE, -- Último reporte GPS
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Tabla de Rutas
CREATE TABLE IF NOT EXISTS routes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Tabla de Clientes
CREATE TABLE IF NOT EXISTS clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL,
  route_id UUID REFERENCES routes(id) ON DELETE SET NULL,
  dni TEXT NOT NULL,
  name TEXT NOT NULL,
  alias TEXT,
  address TEXT,
  phone TEXT,
  visit_order INTEGER DEFAULT 0,
  status TEXT CHECK (status IN ('Active', 'Inactive')) DEFAULT 'Active',
  
  -- Campos de Ubicación y Contacto Detallado
  city TEXT,
  country TEXT,
  phone_code TEXT,
  lat NUMERIC, -- Latitud GPS Casa/Negocio
  lng NUMERIC, -- Longitud GPS Casa/Negocio
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Tabla de Créditos
CREATE TABLE IF NOT EXISTS credits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  
  capital NUMERIC NOT NULL,
  total_to_pay NUMERIC NOT NULL,
  installment_value NUMERIC NOT NULL,
  total_installments INTEGER NOT NULL,
  paid_installments INTEGER DEFAULT 0,
  total_paid NUMERIC DEFAULT 0,
  
  frequency TEXT CHECK (frequency IN ('Daily', 'Weekly', 'Monthly')),
  start_date DATE DEFAULT CURRENT_DATE,
  first_payment_date DATE,
  
  status TEXT CHECK (status IN ('Active', 'Completed', 'Lost')) DEFAULT 'Active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Tabla de Pagos (Recaudos)
CREATE TABLE IF NOT EXISTS payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL,
  credit_id UUID REFERENCES credits(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  payment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  note TEXT
);

-- 7. Tabla de Gastos
CREATE TABLE IF NOT EXISTS expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL,
  route_id UUID REFERENCES routes(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  category TEXT CHECK (category IN ('Operational', 'Personal')),
  concept TEXT,
  proof_image_url TEXT, -- Base64 o URL de Supabase Storage
  expense_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Tabla de Transacciones de Ruta (Caja Menor, Inyecciones, Retiros)
CREATE TABLE IF NOT EXISTS route_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL,
  route_id UUID REFERENCES routes(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  type TEXT CHECK (type IN ('INITIAL_BASE', 'INJECTION', 'WITHDRAWAL')),
  description TEXT,
  transaction_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================================================
-- ÍNDICES DE RENDIMIENTO
-- ==============================================================================

-- Búsquedas frecuentes por Business ID (Multitenancy)
CREATE INDEX IF NOT EXISTS idx_users_business ON users(business_id);
CREATE INDEX IF NOT EXISTS idx_routes_business ON routes(business_id);
CREATE INDEX IF NOT EXISTS idx_clients_business ON clients(business_id);
CREATE INDEX IF NOT EXISTS idx_credits_business ON credits(business_id);

-- Relaciones Clave
CREATE INDEX IF NOT EXISTS idx_clients_route ON clients(route_id);
CREATE INDEX IF NOT EXISTS idx_credits_client ON credits(client_id);
CREATE INDEX IF NOT EXISTS idx_payments_credit ON payments(credit_id);
CREATE INDEX IF NOT EXISTS idx_expenses_route ON expenses(route_id);
CREATE INDEX IF NOT EXISTS idx_rt_transactions_route ON route_transactions(route_id);

-- Búsquedas Geográficas y de Texto
CREATE INDEX IF NOT EXISTS idx_clients_location ON clients(city, country);
CREATE INDEX IF NOT EXISTS idx_clients_dni ON clients(dni);

-- ==============================================================================
-- SEGURIDAD (ROW LEVEL SECURITY - RLS)
-- Habilitar esto es opcional pero recomendado si se usa autenticación de Supabase
-- ==============================================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE route_transactions ENABLE ROW LEVEL SECURITY;

-- Política de ejemplo: Permitir acceso público (MODO DESARROLLO)
-- Para producción, configurar políticas basadas en `auth.uid()` y `business_id`
CREATE POLICY "Public Access for Development" ON users FOR ALL USING (true);
CREATE POLICY "Public Access for Development" ON clients FOR ALL USING (true);
CREATE POLICY "Public Access for Development" ON credits FOR ALL USING (true);
CREATE POLICY "Public Access for Development" ON payments FOR ALL USING (true);
CREATE POLICY "Public Access for Development" ON routes FOR ALL USING (true);
CREATE POLICY "Public Access for Development" ON expenses FOR ALL USING (true);
CREATE POLICY "Public Access for Development" ON route_transactions FOR ALL USING (true);
