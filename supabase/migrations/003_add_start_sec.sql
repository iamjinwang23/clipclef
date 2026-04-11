-- tracks 테이블에 start_sec 컬럼 추가
-- 타임스탬프 기반 seek를 위한 트랙 시작 시간 (초)

ALTER TABLE tracks ADD COLUMN IF NOT EXISTS start_sec INTEGER;
