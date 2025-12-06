-- Complete migration for liabilities table
-- Run this in your Supabase SQL Editor to add all missing columns

-- Add source column if it doesn't exist
ALTER TABLE liabilities 
ADD COLUMN IF NOT EXISTS source TEXT;

-- Add credit_card_id column if it doesn't exist
ALTER TABLE liabilities 
ADD COLUMN IF NOT EXISTS credit_card_id UUID REFERENCES credit_cards(id) ON DELETE SET NULL;

-- Create index for credit_card_id if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_liabilities_credit_card_id ON liabilities(credit_card_id);

