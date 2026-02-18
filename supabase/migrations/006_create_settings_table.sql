-- Migration: Create settings table for store information
-- Used for receipts (store name, address)

CREATE TABLE IF NOT EXISTS settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) UNIQUE,
    store_name TEXT NOT NULL DEFAULT 'Blumenwunder',
    store_address TEXT DEFAULT '',
    starting_balance DECIMAL(10,2) DEFAULT 200.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Policy: users can manage their own settings
CREATE POLICY "Users manage own settings" ON settings
    FOR ALL TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
