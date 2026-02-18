-- Migration: Add 'storno' to transaction_type enum
-- Storno transactions are negative-amount counter-bookings for cancelled sales

ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'storno';
