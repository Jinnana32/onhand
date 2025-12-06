-- Add months_to_pay and start_date columns to liabilities table
-- months_to_pay: Number of months the liability should be paid (null = recurring forever)
-- start_date: Date when the payment period starts (defaults to created_at for existing records)

ALTER TABLE liabilities
ADD COLUMN IF NOT EXISTS months_to_pay INTEGER,
ADD COLUMN IF NOT EXISTS start_date DATE;

-- Set start_date to created_at for existing records
UPDATE liabilities
SET start_date = DATE(created_at)
WHERE start_date IS NULL;

-- Set default start_date for new records (will be set in application code)
-- For existing recurring liabilities, set months_to_pay to NULL (recurring forever)
-- For new liabilities, users will specify months_to_pay

