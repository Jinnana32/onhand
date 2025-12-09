-- Migration: Add parent_income_id to income_sources table
-- This links generated one-time income to the original recurring income

ALTER TABLE income_sources
ADD COLUMN IF NOT EXISTS parent_income_id UUID REFERENCES income_sources(id) ON DELETE SET NULL;

-- Create an index for faster lookups
CREATE INDEX IF NOT EXISTS idx_income_sources_parent_income_id ON income_sources(parent_income_id);

-- Add RLS policy for the new column (already covered by existing policies, but ensuring it's clear)
-- The existing policies already cover this since it's just a reference field

