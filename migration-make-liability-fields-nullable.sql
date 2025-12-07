-- Make current_balance nullable for liabilities
-- This allows recurring bills (water, electricity) to not have a balance
-- Only credit cards, loans, and installments need current_balance

ALTER TABLE liabilities
ALTER COLUMN current_balance DROP NOT NULL;

-- Update existing records: set current_balance to NULL for categories that don't need it
-- (This is optional - you can keep existing values if you want)
-- UPDATE liabilities
-- SET current_balance = NULL
-- WHERE category IN ('recurring_bill', 'other') AND current_balance = 0;

-- Add recurring_bill category if it doesn't exist (PostgreSQL doesn't have ENUM, so this is just for reference)
-- The category is already supported in the application code

