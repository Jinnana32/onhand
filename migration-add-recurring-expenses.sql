-- Add recurring expense support to expenses table
-- frequency: 'one_time' | 'monthly' | 'weekly'
-- due_date: Day of month (1-31) for recurring expenses
-- start_date: Date when recurring expense starts
-- is_active: Whether the expense is active

ALTER TABLE expenses
ADD COLUMN IF NOT EXISTS frequency TEXT DEFAULT 'one_time',
ADD COLUMN IF NOT EXISTS due_date INTEGER,
ADD COLUMN IF NOT EXISTS start_date DATE,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Set start_date to expense_date for existing expenses
UPDATE expenses
SET start_date = expense_date
WHERE start_date IS NULL;

-- Set is_active to true for existing expenses
UPDATE expenses
SET is_active = true
WHERE is_active IS NULL;

