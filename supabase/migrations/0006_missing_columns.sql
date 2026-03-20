-- Migration 0006: Add missing columns to projects and other tables
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS title TEXT,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Also add title to user_kbs if they want it
ALTER TABLE user_kbs
ADD COLUMN IF NOT EXISTS description TEXT;
