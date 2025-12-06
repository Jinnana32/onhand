# Credit Cards Table Schema

## New Table: `credit_cards`

Credit card accounts that can be referenced by liabilities.

```sql
CREATE TABLE credit_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- e.g., "BPI Gold", "RCBC Visa"
  bank TEXT NOT NULL, -- e.g., "BPI", "RCBC", "BDO"
  credit_limit DECIMAL(12, 2) NOT NULL,
  current_balance DECIMAL(12, 2) DEFAULT 0.00,
  due_date INTEGER NOT NULL, -- Day of month (1-31)
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

-- Update liabilities table to reference credit cards
ALTER TABLE liabilities 
ADD COLUMN IF NOT EXISTS credit_card_id UUID REFERENCES credit_cards(id) ON DELETE SET NULL;

CREATE INDEX idx_liabilities_credit_card_id ON liabilities(credit_card_id);
```

## Updated Liabilities Usage

When a liability is linked to a credit card:
- The credit card's `current_balance` should be updated when the liability's balance changes
- The liability can reference the credit card via `credit_card_id`
- Monthly bill amount is still tracked in the liability

