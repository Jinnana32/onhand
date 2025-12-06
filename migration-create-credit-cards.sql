-- Migration: Create credit_cards table and update liabilities
-- Run this in your Supabase SQL Editor

-- Create credit_cards table
CREATE TABLE IF NOT EXISTS credit_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  bank TEXT NOT NULL,
  credit_limit DECIMAL(12, 2) NOT NULL,
  current_balance DECIMAL(12, 2) DEFAULT 0.00,
  due_date INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE credit_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own credit cards"
  ON credit_cards FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own credit cards"
  ON credit_cards FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own credit cards"
  ON credit_cards FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own credit cards"
  ON credit_cards FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX idx_credit_cards_user_id ON credit_cards(user_id);

-- Add source column to liabilities table (if not already added)
ALTER TABLE liabilities 
ADD COLUMN IF NOT EXISTS source TEXT;

-- Add credit_card_id to liabilities table
ALTER TABLE liabilities 
ADD COLUMN IF NOT EXISTS credit_card_id UUID REFERENCES credit_cards(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_liabilities_credit_card_id ON liabilities(credit_card_id);

-- Add trigger for updated_at
CREATE TRIGGER update_credit_cards_updated_at BEFORE UPDATE ON credit_cards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

