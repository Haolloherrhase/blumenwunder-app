-- Migration: Add VAT and Payment Details
-- This adds VAT rate support to products/materials and detailed accounting to transactions

-- 1. Add VAT Rate to Products (Default 7%)
ALTER TABLE products ADD COLUMN vat_rate INTEGER DEFAULT 7;

-- 2. Add VAT Rate to Materials (Default 19%)
ALTER TABLE materials ADD COLUMN vat_rate INTEGER DEFAULT 19;

-- 3. Add VAT Detail columns to Transactions
ALTER TABLE transactions 
ADD COLUMN vat_rate INTEGER,
ADD COLUMN vat_amount DECIMAL(10,2);

-- Note: payment_method already exists in the schema from initial migration, 
-- but we will ensure it's used in the UI.

-- Update existing records to have defaults (if any)
UPDATE products SET vat_rate = 7 WHERE vat_rate IS NULL;
UPDATE materials SET vat_rate = 19 WHERE vat_rate IS NULL;
