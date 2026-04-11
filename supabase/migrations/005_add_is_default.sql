-- user_playlists에 기본 저장함 플래그 추가
ALTER TABLE user_playlists ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT FALSE;

-- 유저당 기본 저장함은 하나만 허용
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_playlists_default
  ON user_playlists (user_id)
  WHERE is_default = TRUE;
