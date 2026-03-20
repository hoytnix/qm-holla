-- Add description column to agents table
ALTER TABLE agents ADD COLUMN IF NOT EXISTS description TEXT;
