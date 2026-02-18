-- Migration: Add category field to transactions for quick sales from Dashboard
-- Quick sales don't require a product_id, just a category + amount

-- 1. Add category column
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS category TEXT;

-- 2. Ensure product_id is nullable (quick sales have no product)
ALTER TABLE transactions ALTER COLUMN product_id DROP NOT NULL;

-- 3. Set quantity default to 1 for quick sales
ALTER TABLE transactions ALTER COLUMN quantity SET DEFAULT 1;
