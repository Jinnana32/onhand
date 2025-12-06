-- Migration: Add category field to income_sources table
-- Run this in your Supabase SQL Editor if you already have the income_sources table

ALTER TABLE income_sources 
ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'other';

-- Update existing records to have a default category
UPDATE income_sources 
SET category = 'other' 
WHERE category IS NULL;

-- Add check constraint to ensure valid category values
ALTER TABLE income_sources
ADD CONSTRAINT income_sources_category_check 
CHECK (category IN ('salary', 'project', 'other'));

