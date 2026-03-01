-- تحديث قاعدة البيانات لدعم المشتريات والمصاريف

-- 1. إنشاء جدول المشتريات
CREATE TABLE IF NOT EXISTS contract_purchases (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  item_name TEXT NOT NULL,
  quantity NUMERIC NOT NULL,
  purchase_price NUMERIC NOT NULL,
  purchase_date DATE NOT NULL,
  invoice_number TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 2. إنشاء جدول المصاريف
CREATE TABLE IF NOT EXISTS contract_expenses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
  expense_type TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  expense_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 3. إنشاء جدول سندات التسليم (Delivery Receipts)
CREATE TABLE IF NOT EXISTS delivery_receipts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
  receipt_number TEXT NOT NULL,
  delivery_date DATE NOT NULL,
  recipient_name TEXT NOT NULL,
  recipient_phone TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 4. تحديث جدول التسليمات ليرتبط بسند التسليم
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS delivery_receipt_id UUID REFERENCES delivery_receipts(id) ON DELETE CASCADE;

-- 5. تفعيل RLS (Row Level Security)
ALTER TABLE contract_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_receipts ENABLE ROW LEVEL SECURITY;

-- 6. إضافة سياسات الوصول (Policies)
CREATE POLICY "Users can view their own contract purchases"
  ON contract_purchases FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM contracts WHERE contracts.id = contract_purchases.contract_id AND contracts.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert their own contract purchases"
  ON contract_purchases FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM contracts WHERE contracts.id = contract_purchases.contract_id AND contracts.user_id = auth.uid()
  ));

CREATE POLICY "Users can update their own contract purchases"
  ON contract_purchases FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM contracts WHERE contracts.id = contract_purchases.contract_id AND contracts.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete their own contract purchases"
  ON contract_purchases FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM contracts WHERE contracts.id = contract_purchases.contract_id AND contracts.user_id = auth.uid()
  ));

CREATE POLICY "Users can view their own contract expenses"
  ON contract_expenses FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM contracts WHERE contracts.id = contract_expenses.contract_id AND contracts.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert their own contract expenses"
  ON contract_expenses FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM contracts WHERE contracts.id = contract_expenses.contract_id AND contracts.user_id = auth.uid()
  ));

CREATE POLICY "Users can update their own contract expenses"
  ON contract_expenses FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM contracts WHERE contracts.id = contract_expenses.contract_id AND contracts.user_id = auth.uid()
  ));

CREATE POLICY "Users can view their own delivery receipts"
  ON delivery_receipts FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM contracts WHERE contracts.id = delivery_receipts.contract_id AND contracts.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert their own delivery receipts"
  ON delivery_receipts FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM contracts WHERE contracts.id = delivery_receipts.contract_id AND contracts.user_id = auth.uid()
  ));

CREATE POLICY "Users can update their own delivery receipts"
  ON delivery_receipts FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM contracts WHERE contracts.id = delivery_receipts.contract_id AND contracts.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete their own delivery receipts"
  ON delivery_receipts FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM contracts WHERE contracts.id = delivery_receipts.contract_id AND contracts.user_id = auth.uid()
  ));
