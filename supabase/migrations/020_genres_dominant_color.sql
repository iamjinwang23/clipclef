-- Migration 020: genres.dominant_color — 클라이언트 canvas 색 추출 캐시
-- 업로드 시 어드민이 저장. 상세 페이지가 저장된 값을 우선 사용, 없으면 런타임 폴백.

ALTER TABLE genres
  ADD COLUMN IF NOT EXISTS dominant_color TEXT;
