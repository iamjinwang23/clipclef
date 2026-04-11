-- Design Ref: §3.2 — YouClef Initial Schema

-- profiles (auth.users 연동)
CREATE TABLE IF NOT EXISTS profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- playlists
CREATE TABLE IF NOT EXISTS playlists (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  youtube_id      TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  channel_name    TEXT NOT NULL,
  channel_id      TEXT NOT NULL DEFAULT '',
  thumbnail_url   TEXT NOT NULL DEFAULT '',
  description     TEXT,
  track_count     INTEGER DEFAULT 0,
  view_count      BIGINT DEFAULT 0,
  like_count      INTEGER DEFAULT 0,
  genre           TEXT[] DEFAULT '{}',
  mood            TEXT[] DEFAULT '{}',
  place           TEXT[] DEFAULT '{}',
  era             TEXT[] DEFAULT '{}',
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- tracks
CREATE TABLE IF NOT EXISTS tracks (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id       UUID NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  position          INTEGER NOT NULL,
  title             TEXT NOT NULL,
  artist            TEXT,
  duration_sec      INTEGER,
  youtube_video_id  TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- comments
CREATE TABLE IF NOT EXISTS comments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id UUID NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content     TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 500),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- likes
CREATE TABLE IF NOT EXISTS likes (
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  playlist_id UUID NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, playlist_id)
);

-- collections (북마크)
CREATE TABLE IF NOT EXISTS collections (
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  playlist_id UUID NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, playlist_id)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_playlists_genre  ON playlists USING GIN (genre);
CREATE INDEX IF NOT EXISTS idx_playlists_mood   ON playlists USING GIN (mood);
CREATE INDEX IF NOT EXISTS idx_playlists_place  ON playlists USING GIN (place);
CREATE INDEX IF NOT EXISTS idx_playlists_era    ON playlists USING GIN (era);
CREATE INDEX IF NOT EXISTS idx_tracks_playlist  ON tracks (playlist_id, position);
CREATE INDEX IF NOT EXISTS idx_comments_playlist ON comments (playlist_id, created_at DESC);

-- like_count 자동 동기화 함수
CREATE OR REPLACE FUNCTION update_like_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE playlists SET like_count = like_count + 1 WHERE id = NEW.playlist_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE playlists SET like_count = GREATEST(like_count - 1, 0) WHERE id = OLD.playlist_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trigger_like_count
  AFTER INSERT OR DELETE ON likes
  FOR EACH ROW EXECUTE FUNCTION update_like_count();

-- profiles 자동 생성 (소셜 로그인 시)
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- RLS 활성화
ALTER TABLE profiles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE playlists   ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracks      ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments    ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes       ENABLE ROW LEVEL SECURITY;
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;

-- RLS 정책
-- playlists: 모두 읽기 가능
CREATE POLICY "playlists_read_all"   ON playlists FOR SELECT USING (is_active = TRUE);
CREATE POLICY "playlists_admin_all"  ON playlists FOR ALL USING (TRUE) WITH CHECK (TRUE);

-- tracks: 모두 읽기 가능
CREATE POLICY "tracks_read_all"      ON tracks FOR SELECT USING (TRUE);
CREATE POLICY "tracks_admin_all"     ON tracks FOR ALL USING (TRUE) WITH CHECK (TRUE);

-- profiles: 본인만 읽기/수정, 댓글에서 참조용 공개
CREATE POLICY "profiles_read_all"    ON profiles FOR SELECT USING (TRUE);
CREATE POLICY "profiles_update_own"  ON profiles FOR UPDATE USING (auth.uid() = id);

-- comments: 모두 읽기, 로그인 사용자 쓰기, 본인만 삭제
CREATE POLICY "comments_read_all"    ON comments FOR SELECT USING (TRUE);
CREATE POLICY "comments_insert_auth" ON comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "comments_delete_own"  ON comments FOR DELETE USING (auth.uid() = user_id);

-- likes: 본인 데이터만
CREATE POLICY "likes_own"            ON likes FOR ALL USING (auth.uid() = user_id);

-- collections: 본인 데이터만
CREATE POLICY "collections_own"      ON collections FOR ALL USING (auth.uid() = user_id);
