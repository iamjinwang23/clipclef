// Design Ref: §3.4 — TypeScript Types

export interface Playlist {
  id: string;
  youtube_id: string;
  title: string;
  channel_name: string;
  channel_id: string;
  thumbnail_url: string;
  description: string | null;
  editor_note: string | null;
  track_count: number;
  view_count: number;
  like_count: number;
  comment_count: number;
  genre: string[];
  mood: string[];
  place: string[];
  era: string[];
  is_active: boolean;
  is_ai: boolean;
  uploaded_by: string | null;
  created_at: string;
}

export interface CuratedCollection {
  id: string;
  title: string;
  description: string | null;
  position: number;
  is_active: boolean;
  banner_image_url: string | null;
  created_at: string;
  items?: Playlist[];
}

export interface Track {
  id: string;
  playlist_id: string;
  position: number;
  title: string;
  artist: string | null;
  start_sec: number | null;
  duration_sec: number | null;
  youtube_video_id: string | null;
}

export interface Comment {
  id: string;
  playlist_id: string;
  user_id: string;
  parent_id: string | null;
  content: string;
  created_at: string;
  profiles: { display_name: string | null; avatar_url: string | null; is_verified: boolean };
  replies?: Comment[];
}

export interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  is_verified: boolean;
  created_at: string;
}

/** genres 테이블 한 행 — 관리자가 썸네일·position 관리 */
export interface GenreRow {
  id: string;
  name: string;
  thumbnail_url: string | null;
  dominant_color: string | null;
  position: number;
  is_active: boolean;
  created_at: string;
}

export interface UserPlaylist {
  id: string;
  user_id: string;
  name: string;
  is_public: boolean;
  is_default: boolean;
  created_at: string;
}

export type SortOption = 'latest' | 'likes' | 'views';

export interface FilterState {
  genre: string[];
  mood: string[];
  place: string[];
  era: string[];
  sort: SortOption;
}

export const ERA_OPTIONS = [
  '1950s', '1960s', '1970s', '1980s', '1990s', '2000s', '2010s', '2020s',
] as const;

export const GENRE_OPTIONS = [
  'Pop', 'Hip-hop', 'Jazz', 'Classical', 'Lo-fi', 'K-pop', 'R&B', 'Electronic', 'Rock', 'Indie', 'Soul', '기타',
] as const;

export const MOOD_OPTIONS = [
  'Chill', 'Energetic', 'Sad', 'Happy', 'Focus', 'Romantic', 'Melancholic', 'Hype', '기타',
] as const;

export const PLACE_OPTIONS = [
  '카페', '드라이브', '운동', '공부', '파티', '수면', '여행', '산책', '기타',
] as const;

export type Era = typeof ERA_OPTIONS[number];
export type Genre = typeof GENRE_OPTIONS[number];
export type Mood = typeof MOOD_OPTIONS[number];
export type Place = typeof PLACE_OPTIONS[number];
