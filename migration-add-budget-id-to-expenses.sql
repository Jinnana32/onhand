-- Add budget_id field to expenses table
-- This allows expenses to be linked to budgets, so they deduct from budget amount instead of cash

ALTER TABLE expenses
ADD COLUMN IF NOT EXISTS budget_id UUID REFERENCES budgets(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_expenses_budget_id ON expenses(budget_id);

