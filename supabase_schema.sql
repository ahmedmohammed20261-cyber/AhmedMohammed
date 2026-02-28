-- Supabase SQL Schema for Contractor Supply Management App

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Suppliers Table
CREATE TABLE suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- 2. Contracts Table
CREATE TYPE contract_status AS ENUM ('new', 'in_progress', 'completed', 'paid');

CREATE TABLE contracts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contract_number VARCHAR(100) NOT NULL,
    governorate VARCHAR(100) NOT NULL,
    branch VARCHAR(100) NOT NULL,
    contract_date DATE NOT NULL,
    currency VARCHAR(3) DEFAULT 'SAR',
    status contract_status DEFAULT 'new',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- 3. Contract Items Table
CREATE TABLE contract_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
    item_name VARCHAR(255) NOT NULL,
    quantity NUMERIC(10, 2) NOT NULL,
    sale_price NUMERIC(12, 2) NOT NULL,
    purchase_price NUMERIC(12, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Deliveries Table
CREATE TABLE deliveries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contract_item_id UUID REFERENCES contract_items(id) ON DELETE CASCADE,
    quantity_delivered NUMERIC(10, 2) NOT NULL,
    delivery_date DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Payments Table
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
    amount NUMERIC(12, 2) NOT NULL,
    payment_date DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Attachments Table
CREATE TABLE attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    file_type VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;

-- Policies for Suppliers
CREATE POLICY "Users can view their own suppliers" ON suppliers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own suppliers" ON suppliers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own suppliers" ON suppliers FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own suppliers" ON suppliers FOR DELETE USING (auth.uid() = user_id);

-- Policies for Contracts
CREATE POLICY "Users can view their own contracts" ON contracts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own contracts" ON contracts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own contracts" ON contracts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own contracts" ON contracts FOR DELETE USING (auth.uid() = user_id);

-- Policies for Contract Items
CREATE POLICY "Users can view items of their contracts" ON contract_items FOR SELECT USING (
    EXISTS (SELECT 1 FROM contracts WHERE contracts.id = contract_items.contract_id AND contracts.user_id = auth.uid())
);
CREATE POLICY "Users can insert items to their contracts" ON contract_items FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM contracts WHERE contracts.id = contract_items.contract_id AND contracts.user_id = auth.uid())
);
CREATE POLICY "Users can update items of their contracts" ON contract_items FOR UPDATE USING (
    EXISTS (SELECT 1 FROM contracts WHERE contracts.id = contract_items.contract_id AND contracts.user_id = auth.uid())
);
CREATE POLICY "Users can delete items of their contracts" ON contract_items FOR DELETE USING (
    EXISTS (SELECT 1 FROM contracts WHERE contracts.id = contract_items.contract_id AND contracts.user_id = auth.uid())
);

-- Policies for Deliveries
CREATE POLICY "Users can view deliveries of their contract items" ON deliveries FOR SELECT USING (
    EXISTS (SELECT 1 FROM contract_items JOIN contracts ON contract_items.contract_id = contracts.id WHERE contract_items.id = deliveries.contract_item_id AND contracts.user_id = auth.uid())
);
CREATE POLICY "Users can insert deliveries to their contract items" ON deliveries FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM contract_items JOIN contracts ON contract_items.contract_id = contracts.id WHERE contract_items.id = deliveries.contract_item_id AND contracts.user_id = auth.uid())
);
CREATE POLICY "Users can update deliveries of their contract items" ON deliveries FOR UPDATE USING (
    EXISTS (SELECT 1 FROM contract_items JOIN contracts ON contract_items.contract_id = contracts.id WHERE contract_items.id = deliveries.contract_item_id AND contracts.user_id = auth.uid())
);
CREATE POLICY "Users can delete deliveries of their contract items" ON deliveries FOR DELETE USING (
    EXISTS (SELECT 1 FROM contract_items JOIN contracts ON contract_items.contract_id = contracts.id WHERE contract_items.id = deliveries.contract_item_id AND contracts.user_id = auth.uid())
);

-- Policies for Payments
CREATE POLICY "Users can view payments of their contracts" ON payments FOR SELECT USING (
    EXISTS (SELECT 1 FROM contracts WHERE contracts.id = payments.contract_id AND contracts.user_id = auth.uid())
);
CREATE POLICY "Users can insert payments to their contracts" ON payments FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM contracts WHERE contracts.id = payments.contract_id AND contracts.user_id = auth.uid())
);
CREATE POLICY "Users can update payments of their contracts" ON payments FOR UPDATE USING (
    EXISTS (SELECT 1 FROM contracts WHERE contracts.id = payments.contract_id AND contracts.user_id = auth.uid())
);
CREATE POLICY "Users can delete payments of their contracts" ON payments FOR DELETE USING (
    EXISTS (SELECT 1 FROM contracts WHERE contracts.id = payments.contract_id AND contracts.user_id = auth.uid())
);

-- Policies for Attachments
CREATE POLICY "Users can view attachments of their contracts" ON attachments FOR SELECT USING (
    EXISTS (SELECT 1 FROM contracts WHERE contracts.id = attachments.contract_id AND contracts.user_id = auth.uid())
);
CREATE POLICY "Users can insert attachments to their contracts" ON attachments FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM contracts WHERE contracts.id = attachments.contract_id AND contracts.user_id = auth.uid())
);
CREATE POLICY "Users can update attachments of their contracts" ON attachments FOR UPDATE USING (
    EXISTS (SELECT 1 FROM contracts WHERE contracts.id = attachments.contract_id AND contracts.user_id = auth.uid())
);
CREATE POLICY "Users can delete attachments of their contracts" ON attachments FOR DELETE USING (
    EXISTS (SELECT 1 FROM contracts WHERE contracts.id = attachments.contract_id AND contracts.user_id = auth.uid())
);

-- Storage bucket for attachments
-- You need to create a bucket named 'attachments' in Supabase Storage dashboard manually or via API.
