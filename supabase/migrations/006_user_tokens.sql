-- YouTube OAuth 토큰 저장 테이블
CREATE TABLE IF NOT EXISTS user_tokens (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'google',
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: 본인 토큰만 접근 가능
ALTER TABLE user_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_tokens_own" ON user_tokens
  FOR ALL USING (auth.uid() = user_id);
