-- 1. Create Transaction Type Enum
CREATE TYPE transaction_type AS ENUM (
  'purchase',
  'sale',
  'sale_bouquet',
  'waste',
  'gift',
  'personal',
  'discount'
);

-- 2. Create Tables

-- Categories
CREATE TABLE categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Suppliers
CREATE TABLE suppliers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  contact TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Products
CREATE TABLE products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category_id UUID REFERENCES categories(id),
  avg_shelf_life_days INTEGER,
  is_bouquet BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Materials
CREATE TABLE materials (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bouquets (Prepared or Sold Bouquets)
CREATE TABLE bouquets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES products(id), -- Nullable if spontaneous bouquet
  created_by UUID REFERENCES auth.users(id),
  total_cost DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bouquet Items (Flowers in the bouquet)
CREATE TABLE bouquet_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  bouquet_id UUID REFERENCES bouquets(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL -- Price at time of creation
);

-- Bouquet Materials (Materials in the bouquet)
CREATE TABLE bouquet_materials (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  bouquet_id UUID REFERENCES bouquets(id) ON DELETE CASCADE,
  material_id UUID REFERENCES materials(id),
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL -- Price at time of creation
);

-- Inventory
CREATE TABLE inventory (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES products(id) UNIQUE,
  quantity INTEGER DEFAULT 0 NOT NULL,
  unit_purchase_price DECIMAL(10,2) DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Transactions
CREATE TABLE transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES products(id),
  user_id UUID REFERENCES auth.users(id),
  bouquet_id UUID REFERENCES bouquets(id),
  transaction_type transaction_type NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  payment_method TEXT,
  supplier_id UUID REFERENCES suppliers(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE bouquets ENABLE ROW LEVEL SECURITY;
ALTER TABLE bouquet_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE bouquet_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- 4. Create Policies (Full Access for Authenticated Users)

-- Categories
CREATE POLICY "Enable all for authenticated users" ON categories
FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Suppliers
CREATE POLICY "Enable all for authenticated users" ON suppliers
FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Products
CREATE POLICY "Enable all for authenticated users" ON products
FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Materials
CREATE POLICY "Enable all for authenticated users" ON materials
FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Bouquets
CREATE POLICY "Enable all for authenticated users" ON bouquets
FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Bouquet Items
CREATE POLICY "Enable all for authenticated users" ON bouquet_items
FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Bouquet Materials
CREATE POLICY "Enable all for authenticated users" ON bouquet_materials
FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Inventory
CREATE POLICY "Enable all for authenticated users" ON inventory
FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Transactions
CREATE POLICY "Enable all for authenticated users" ON transactions
FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 5. Initial Data

-- Categories
INSERT INTO categories (name) VALUES
  ('Schnittblumen'),
  ('Topfpflanzen'),
  ('Dekorationen');

-- Materials
INSERT INTO materials (name, unit_price) VALUES
  ('Kordel', 0.10),
  ('Folie', 0.20),
  ('Schleife', 0.15),
  ('Geschenkpapier', 0.30);
