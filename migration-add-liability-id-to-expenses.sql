-- Add liability_id to expenses table to link expenses to liabilities
-- This allows tracking when a liability has been paid

ALTER TABLE expenses
ADD COLUMN IF NOT EXISTS liability_id UUID REFERENCES liabilities(id) ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_expenses_liability_id ON expenses(liability_id);

-- Add index on expense_date for filtering by month
CREATE INDEX IF NOT EXISTS idx_expenses_expense_date ON expenses(expense_date);

