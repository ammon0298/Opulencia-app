
-- Habilitar extensión pgcrypto para encriptación de contraseñas si no se usa Supabase Auth directo
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Tabla de Organizaciones / Zonas de Cobro
CREATE TABLE businesses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  country TEXT,
  city TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de Usuarios
CREATE TABLE users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES businesses(id),
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  dni TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  country TEXT,
  city TEXT,
  role TEXT CHECK (role IN ('ADMIN', 'COLLECTOR')),
  route_ids TEXT[], 
  status TEXT CHECK (status IN ('Active', 'Inactive')) DEFAULT 'Active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de Rutas
CREATE TABLE routes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES businesses(id),
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de Clientes
CREATE TABLE clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES businesses(id),
  route_id UUID REFERENCES routes(id),
  dni TEXT NOT NULL,
  name TEXT NOT NULL,
  alias TEXT,
  address TEXT,
  phone TEXT,
  visit_order INTEGER DEFAULT 0,
  status TEXT CHECK (status IN ('Active', 'Inactive')) DEFAULT 'Active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de Créditos
CREATE TABLE credits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES businesses(id),
  client_id UUID REFERENCES clients(id),
  capital NUMERIC NOT NULL,
  total_to_pay NUMERIC NOT NULL,
  installment_value NUMERIC NOT NULL,
  total_installments INTEGER NOT NULL,
  paid_installments INTEGER DEFAULT 0,
  total_paid NUMERIC DEFAULT 0,
  frequency TEXT CHECK (frequency IN ('Daily', 'Weekly', 'Monthly')),
  start_date DATE DEFAULT CURRENT_DATE,
  first_payment_date DATE, -- Campo fundamental agregado
  status TEXT CHECK (status IN ('Active', 'Completed', 'Lost')) DEFAULT 'Active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de Pagos
CREATE TABLE payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES businesses(id),
  credit_id UUID REFERENCES credits(id),
  amount NUMERIC NOT NULL,
  payment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  note TEXT
);

-- Tabla de Gastos
CREATE TABLE expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES businesses(id),
  route_id UUID REFERENCES routes(id),
  name TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  category TEXT CHECK (category IN ('Operational', 'Personal')),
  concept TEXT,
  proof_image_url TEXT,
  expense_date DATE DEFAULT CURRENT_DATE
);

-- Tabla de Transacciones de Capital (Rutas)
CREATE TABLE route_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES businesses(id),
  route_id UUID REFERENCES routes(id),
  amount NUMERIC NOT NULL,
  type TEXT CHECK (type IN ('INITIAL_BASE', 'INJECTION', 'WITHDRAWAL')),
  description TEXT,
  transaction_date DATE DEFAULT CURRENT_DATE
);

-- POLÍTICAS DE SEGURIDAD (RLS) - Ejemplo para Clientes
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view their own business clients" ON clients
  FOR SELECT USING (business_id = (SELECT business_id FROM users WHERE id = auth.uid()));

CREATE INDEX idx_clients_business ON clients(business_id);
CREATE INDEX idx_credits_client ON credits(client_id);
CREATE INDEX idx_payments_credit ON payments(credit_id);
