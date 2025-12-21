-- Add is_paid field to expenses table
-- is_paid: Whether the expense has been paid (default false for unpaid)
-- This allows tracking expenses that need to be paid but haven't been paid yet

ALTER TABLE expenses
ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT false;

-- Set existing expenses to paid (they were already deducted from cash)
UPDATE expenses
SET is_paid = true
WHERE is_paid IS NULL;

