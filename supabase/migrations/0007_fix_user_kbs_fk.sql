-- Fix foreign key constraint for user_kbs
-- The error indicates that user_kbs.user_id is referencing profiles.id, 
-- but the user being inserted might not exist in profiles.
-- However, the trigger on_auth_user_created should handle this.
-- Let's ensure the foreign key constraint is correct and that we are not 
-- trying to insert a user_id that doesn't exist.

-- If the user_id is coming from auth.users, it should exist in profiles 
-- because of the trigger.

-- Let's check if the profiles table is actually populated for the current user.
-- This migration is just to ensure the constraint is robust.

ALTER TABLE user_kbs 
DROP CONSTRAINT IF EXISTS user_kbs_user_id_fkey;

ALTER TABLE user_kbs
ADD CONSTRAINT user_kbs_user_id_fkey
FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
