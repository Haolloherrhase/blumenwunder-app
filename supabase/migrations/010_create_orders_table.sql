-- Create the orders table
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    customer_name TEXT NOT NULL,
    customer_phone TEXT,
    description TEXT NOT NULL,
    total_price NUMERIC(10,2) NOT NULL,
    pickup_date DATE NOT NULL,
    pickup_time TEXT,
    status TEXT DEFAULT 'offen',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own orders" ON orders FOR ALL USING (auth.uid() = user_id);
