-- playlists 테이블에 AI 콘텐츠 여부 컬럼 추가
ALTER TABLE playlists ADD COLUMN IF NOT EXISTS is_ai BOOLEAN DEFAULT FALSE;
