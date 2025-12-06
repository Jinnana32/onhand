-- Migration: Add source field to liabilities table
-- Run this in your Supabase SQL Editor if you already have the liabilities table

ALTER TABLE liabilities 
ADD COLUMN IF NOT EXISTS source TEXT;

