-- Add payment_type column to liabilities table
-- payment_type: 'straight' | 'installment' | null
-- This separates payment method (credit card) from payment type (straight vs installment)

ALTER TABLE liabilities
ADD COLUMN IF NOT EXISTS payment_type TEXT CHECK (payment_type IN ('straight', 'installment'));

-- Migrate existing data:
-- - credit_card category → payment_type = 'straight' (default, can be changed)
-- - installment category → category = 'credit_card', payment_type = 'installment'
-- - loan category → payment_type = 'installment'
-- - recurring_bill category → payment_type = 'straight'
-- - other category → payment_type = 'straight'

-- First, handle old 'installment' category (convert to credit_card with payment_type = 'installment')
UPDATE liabilities
SET payment_type = 'installment',
    category = 'credit_card'
WHERE category = 'installment';

-- Set payment_type for credit_card (default to straight)
UPDATE liabilities
SET payment_type = 'straight'
WHERE category = 'credit_card' AND payment_type IS NULL;

-- Set payment_type for loan (always installment)
UPDATE liabilities
SET payment_type = 'installment'
WHERE category = 'loan' AND payment_type IS NULL;

-- Set payment_type for recurring_bill (always straight)
UPDATE liabilities
SET payment_type = 'straight'
WHERE category = 'recurring_bill' AND payment_type IS NULL;

-- Set payment_type for other (default to straight)
UPDATE liabilities
SET payment_type = 'straight'
WHERE category = 'other' AND payment_type IS NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_liabilities_payment_type ON liabilities(payment_type);

