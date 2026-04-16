-- Plan FR-01: artists 테이블에 MusicBrainz ID 컬럼 추가
ALTER TABLE artists ADD COLUMN IF NOT EXISTS mbid text;
CREATE UNIQUE INDEX IF NOT EXISTS artists_mbid_idx
  ON artists (mbid) WHERE mbid IS NOT NULL;
