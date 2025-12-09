-- Migration: Add is_received field to income_sources table
-- Run this in your Supabase SQL Editor

-- Add is_received column (nullable, defaults to false for one_time payments)
ALTER TABLE income_sources
ADD COLUMN IF NOT EXISTS is_received BOOLEAN DEFAULT false;

-- For existing one-time payments that have a payment_date, set is_received to true
UPDATE income_sources
SET is_received = true
WHERE frequency = 'one_time' AND payment_date IS NOT NULL;

-- For recurring payments (monthly/weekly), set is_received to false
UPDATE income_sources
SET is_received = false
WHERE frequency IN ('monthly', 'weekly');

-- Add a check constraint to ensure is_received is only true for one_time payments
-- Note: This constraint might be too strict if you want to allow future flexibility
-- You can remove this if needed
-- ALTER TABLE income_sources
-- ADD CONSTRAINT income_sources_is_received_check
-- CHECK (
--   (frequency = 'one_time' AND is_received IN (true, false)) OR
--   (frequency IN ('monthly', 'weekly') AND is_received = false)
-- );

