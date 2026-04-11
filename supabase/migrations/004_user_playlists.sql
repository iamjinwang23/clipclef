-- 유저가 직접 만드는 재생목록
CREATE TABLE user_playlists (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name        TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 100),
  is_public   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 재생목록에 담긴 큐레이션 플리 항목
CREATE TABLE user_playlist_items (
  user_playlist_id UUID NOT NULL REFERENCES user_playlists(id) ON DELETE CASCADE,
  playlist_id      UUID NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  position         INTEGER NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_playlist_id, playlist_id)
);

CREATE INDEX idx_user_playlists_user ON user_playlists (user_id, created_at DESC);
CREATE INDEX idx_user_playlist_items_list ON user_playlist_items (user_playlist_id, position);

-- RLS
ALTER TABLE user_playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_playlist_items ENABLE ROW LEVEL SECURITY;

-- user_playlists: 공개면 모두 읽기, 본인만 쓰기
CREATE POLICY "user_playlists_read" ON user_playlists
  FOR SELECT USING (is_public = TRUE OR auth.uid() = user_id);
CREATE POLICY "user_playlists_insert" ON user_playlists
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_playlists_update" ON user_playlists
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "user_playlists_delete" ON user_playlists
  FOR DELETE USING (auth.uid() = user_id);

-- user_playlist_items: 리스트가 공개면 읽기, 리스트 소유자만 쓰기
CREATE POLICY "user_playlist_items_read" ON user_playlist_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_playlists
      WHERE id = user_playlist_id
        AND (is_public = TRUE OR auth.uid() = user_id)
    )
  );
CREATE POLICY "user_playlist_items_write" ON user_playlist_items
  FOR ALL USING (
    auth.uid() = (SELECT user_id FROM user_playlists WHERE id = user_playlist_id)
  );
