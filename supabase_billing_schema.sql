-- SQL Schema for TEKART Billing Terminal Database Tables
-- Copy and run this script in your Supabase SQL Editor

-- 1. Create customers table
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    whatsapp_phone TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_name TEXT,
    customer_phone TEXT,
    customer_whatsapp TEXT,
    items JSONB DEFAULT '[]'::jsonb,
    subtotal NUMERIC(10,2) DEFAULT 0.00,
    discount NUMERIC(10,2) DEFAULT 0.00,
    gst NUMERIC(10,2) DEFAULT 0.00,
    rounding NUMERIC(10,2) DEFAULT 0.00,
    total NUMERIC(10,2) DEFAULT 0.00,
    payment_method TEXT NOT NULL,
    cashier_name TEXT NOT NULL,
    is_voided BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Create wholesale_purchases table
CREATE TABLE IF NOT EXISTS wholesale_purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wholesaler_name TEXT NOT NULL,
    items JSONB DEFAULT '[]'::jsonb,
    total NUMERIC(10,2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Create expenses table
CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category TEXT NOT NULL,
    amount NUMERIC(10,2) NOT NULL,
    description TEXT,
    date TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Create salaries table
CREATE TABLE IF NOT EXISTS salaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_name TEXT NOT NULL,
    amount NUMERIC(10,2) NOT NULL,
    month TEXT NOT NULL,
    date TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Create bank_ledger table
CREATE TABLE IF NOT EXISTS bank_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL, -- 'deposit' or 'withdrawal'
    amount NUMERIC(10,2) NOT NULL,
    reference TEXT,
    date TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security (RLS) on all new tables
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE wholesale_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE salaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_ledger ENABLE ROW LEVEL SECURITY;

-- Allow public access (select, insert, update, delete) for all tables
CREATE POLICY "Allow public all access on customers" ON customers FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all access on transactions" ON transactions FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all access on wholesale_purchases" ON wholesale_purchases FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all access on expenses" ON expenses FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all access on salaries" ON salaries FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all access on bank_ledger" ON bank_ledger FOR ALL TO public USING (true) WITH CHECK (true);
