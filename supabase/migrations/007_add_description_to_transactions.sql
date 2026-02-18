-- Migration: Add description column to transactions
-- This column is used for more detailed sale information on the dashboard and receipts

ALTER TABLE transactions ADD COLUMN IF NOT EXISTS description TEXT;
