-- Migration 0005: Add custom instructions to projects
ALTER TABLE projects 
ADD COLUMN description TEXT,
ADD COLUMN custom_instructions TEXT;
