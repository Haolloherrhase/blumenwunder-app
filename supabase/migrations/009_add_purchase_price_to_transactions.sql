-- Add purchase_price column to transactions table for profit calculation
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS purchase_price NUMERIC(10,2) DEFAULT NULL;
