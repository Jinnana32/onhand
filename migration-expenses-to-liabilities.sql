-- Migration Script: Move Expenses to Liabilities
-- This script helps migrate expenses that should have been liabilities
-- 
-- IMPORTANT: Review and modify this script before running!
-- You may want to:
-- 1. Add WHERE conditions to filter specific expenses
-- 2. Adjust category mappings
-- 3. Set appropriate values for current_balance and months_to_pay
--
-- Run this in your Supabase SQL Editor

-- Step 1: Preview what will be migrated (run this first to see what will be created)
-- Uncomment and run this to see a preview:
/*
SELECT 
  e.id as expense_id,
  e.description as name,
  e.amount,
  e.due_date,
  e.category,
  e.frequency,
  e.start_date,
  e.is_active,
  e.user_id,
  e.created_at
FROM expenses e
WHERE e.frequency IN ('monthly', 'weekly')  -- Only recurring expenses
  AND e.is_active = true
ORDER BY e.created_at DESC;
*/

-- Step 2: Insert expenses as liabilities
-- This will create liabilities from expenses
-- Modify the WHERE clause to select only the expenses you want to migrate
INSERT INTO liabilities (
  user_id,
  name,
  amount,
  due_date,
  category,
  source,
  current_balance,
  months_to_pay,
  start_date,
  is_active,
  created_at,
  updated_at
)
SELECT 
  e.user_id,
  e.description as name,
  e.amount,
  COALESCE(e.due_date, EXTRACT(DAY FROM e.expense_date::date)::integer) as due_date,
  -- Map expense categories to liability categories
  -- Check both category and description to better categorize recurring bills
  CASE 
    WHEN e.category ILIKE '%credit%' OR e.category ILIKE '%card%' 
         OR e.description ILIKE '%credit%' OR e.description ILIKE '%card%' THEN 'credit_card'
    WHEN e.category ILIKE '%loan%' OR e.description ILIKE '%loan%' THEN 'loan'
    WHEN e.category ILIKE '%installment%' OR e.description ILIKE '%installment%' THEN 'installment'
    WHEN e.category ILIKE '%bill%' 
         OR e.category ILIKE '%utility%' 
         OR e.category ILIKE '%water%' 
         OR e.category ILIKE '%electric%'
         OR e.description ILIKE '%bill%'
         OR e.description ILIKE '%utility%'
         OR e.description ILIKE '%water%'
         OR e.description ILIKE '%electric%'
         OR e.description ILIKE '%insurance%'
         OR e.description ILIKE '%subscription%'
         OR e.description ILIKE '%netflix%'
         OR e.description ILIKE '%spotify%'
         OR e.description ILIKE '%allowance%'
         OR e.description ILIKE '%milk%'
         OR e.description ILIKE '%gas%'
         OR e.description ILIKE '%tithes%'
         OR e.description ILIKE '%sunlife%' THEN 'recurring_bill'
    ELSE 'other'
  END as category,
  NULL as source,  -- You may want to extract source from description or set manually
  NULL as current_balance,  -- Set to NULL for recurring bills, or provide a value
  NULL as months_to_pay,  -- NULL means recurring forever
  COALESCE(e.start_date, e.expense_date::date) as start_date,
  e.is_active,
  e.created_at,
  NOW() as updated_at
FROM expenses e
WHERE e.frequency IN ('monthly', 'weekly')  -- Only recurring expenses
  AND e.is_active = true
  -- Add additional filters here to select specific expenses:
  -- AND e.id IN ('expense-id-1', 'expense-id-2')  -- Specific expense IDs
  -- AND e.created_at >= '2024-01-01'  -- Expenses created after a date
  -- AND e.description ILIKE '%bill%'  -- Expenses with specific keywords
;

-- Step 3: (Optional) Delete the migrated expenses
-- WARNING: Only run this after verifying the liabilities were created correctly!
-- Uncomment and modify the WHERE clause to match Step 2:
/*
DELETE FROM expenses
WHERE frequency IN ('monthly', 'weekly')
  AND is_active = true
  -- Add the same filters as in Step 2
  -- AND id IN ('expense-id-1', 'expense-id-2')
;
*/

-- Step 4: Fix categories for already-migrated liabilities
-- If you already ran the migration and got "other" category incorrectly,
-- run this UPDATE to fix the categories based on the liability name:
/*
UPDATE liabilities
SET category = 'recurring_bill'
WHERE category = 'other'
  AND (
    name ILIKE '%netflix%'
    OR name ILIKE '%spotify%'
    OR name ILIKE '%subscription%'
    OR name ILIKE '%insurance%'
    OR name ILIKE '%allowance%'
    OR name ILIKE '%milk%'
    OR name ILIKE '%gas%'
    OR name ILIKE '%tithes%'
    OR name ILIKE '%sunlife%'
    OR name ILIKE '%bill%'
    OR name ILIKE '%utility%'
    OR name ILIKE '%water%'
    OR name ILIKE '%electric%'
  );
*/

-- Step 5: Verify the migration
-- Run this to see the newly created liabilities:
/*
SELECT 
  l.id,
  l.name,
  l.amount,
  l.due_date,
  l.category,
  l.is_active,
  l.created_at
FROM liabilities l
WHERE l.created_at >= NOW() - INTERVAL '1 hour'  -- Adjust time as needed
ORDER BY l.created_at DESC;
*/

