-- Migration 012: profiles.display_name UNIQUE 제약 추가
-- 실행 전: Supabase SQL Editor에서 중복 닉네임 확인
-- SELECT display_name, COUNT(*) FROM profiles
--   WHERE display_name IS NOT NULL
--   GROUP BY display_name HAVING COUNT(*) > 1;

ALTER TABLE profiles
  ADD CONSTRAINT profiles_display_name_unique UNIQUE (display_name);
