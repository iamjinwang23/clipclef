-- Migration 010: Backfill uploaded_by for pre-migration playlists + add is_verified to profiles

-- 1. Backfill: all playlists without uploaded_by belong to the admin account
UPDATE playlists
SET uploaded_by = 'c8f9403e-1d8d-4ed5-a8fa-a70de035ff6f'
WHERE uploaded_by IS NULL;

-- 2. Add is_verified column to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT FALSE;

-- 3. Mark admin as verified
UPDATE profiles
SET is_verified = TRUE
WHERE id = 'c8f9403e-1d8d-4ed5-a8fa-a70de035ff6f';

-- 4. RLS: is_verified is public-readable (already covered by profiles_read_all)
--    No additional policy needed
