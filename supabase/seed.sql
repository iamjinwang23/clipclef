-- YouClef 시드 데이터
-- 실제 YouTube 플레이리스트 ID로 교체 후 관리자 페이지에서 등록하거나
-- 아래 INSERT로 직접 삽입 가능 (thumbnail_url은 실제 URL로 교체 필요)

INSERT INTO playlists (
  youtube_id, title, channel_name, channel_id,
  thumbnail_url, description, track_count, view_count,
  genre, mood, place, era, is_active
) VALUES
(
  'PLExample001',
  'Late Night Jazz Essentials',
  'Jazz Collective',
  'UCexample001',
  'https://i.ytimg.com/vi/example001/hqdefault.jpg',
  '도심의 밤을 물들이는 재즈 명곡 모음',
  24, 0,
  ARRAY['Jazz'],
  ARRAY['Chill', 'Melancholic'],
  ARRAY['카페'],
  ARRAY['1960s', '1970s'],
  true
),
(
  'PLExample002',
  'K-Pop Hits 2020s',
  'K-Wave Official',
  'UCexample002',
  'https://i.ytimg.com/vi/example002/hqdefault.jpg',
  '지금 가장 핫한 K-Pop 히트곡 모음',
  30, 0,
  ARRAY['K-pop'],
  ARRAY['Energetic', 'Happy'],
  ARRAY['파티', '운동'],
  ARRAY['2020s'],
  true
),
(
  'PLExample003',
  'Lo-fi Study Beats',
  'ChillHop Music',
  'UCexample003',
  'https://i.ytimg.com/vi/example003/hqdefault.jpg',
  '집중력을 높여주는 로파이 비트 컬렉션',
  18, 0,
  ARRAY['Lo-fi'],
  ARRAY['Focus', 'Chill'],
  ARRAY['공부', '카페'],
  ARRAY['2010s', '2020s'],
  true
),
(
  'PLExample004',
  '90s Hip-Hop Classics',
  'Old School Rap',
  'UCexample004',
  'https://i.ytimg.com/vi/example004/hqdefault.jpg',
  '황금기 힙합의 레전드 트랙들',
  20, 0,
  ARRAY['Hip-hop'],
  ARRAY['Hype', 'Energetic'],
  ARRAY['드라이브'],
  ARRAY['1990s'],
  true
),
(
  'PLExample005',
  'Classical Piano for Sleep',
  'Peaceful Piano',
  'UCexample005',
  'https://i.ytimg.com/vi/example005/hqdefault.jpg',
  '숙면을 도와주는 클래식 피아노 연주',
  15, 0,
  ARRAY['Classical'],
  ARRAY['Chill', 'Melancholic'],
  ARRAY['수면'],
  ARRAY['1980s', '1990s'],
  true
),
(
  'PLExample006',
  'Summer Road Trip Vibes',
  'Feel Good Music',
  'UCexample006',
  'https://i.ytimg.com/vi/example006/hqdefault.jpg',
  '드라이브하기 딱 좋은 팝 히트곡 모음',
  25, 0,
  ARRAY['Pop', 'Indie'],
  ARRAY['Happy', 'Energetic'],
  ARRAY['드라이브', '여행'],
  ARRAY['2000s', '2010s'],
  true
);
