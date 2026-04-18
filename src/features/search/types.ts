// Design Ref: §4.1 — useSearch return shape
import type { Playlist } from '@/types';

export type TagCategory = 'genre' | 'mood' | 'place' | 'era';

export interface SearchUser {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  is_verified: boolean;
}

export interface SearchChannel {
  channel_id: string;
  channel_name: string;
  thumbnail_url: string | null;
  count: number;
}

export interface SearchArtist {
  name: string;
  slug: string;
  image_url: string | null;
}

export interface SearchTag {
  label: string;
  category: TagCategory;
  count: number;
}

export interface SearchResult {
  videos: Playlist[];
  users: SearchUser[];
  channels: SearchChannel[];
  artists: SearchArtist[];
  tags: SearchTag[];
}

export interface SearchLimits {
  videos?: number;
  users?: number;
  channels?: number;
  artists?: number;
  includeTags?: boolean;
}

// Defaults per Design §4.1
export const DROPDOWN_LIMITS: Required<SearchLimits> = {
  videos: 5,
  users: 3,
  channels: 3,
  artists: 3,
  includeTags: false,
};

export const RESULTS_LIMITS: Required<SearchLimits> = {
  videos: 20,
  users: 5,
  channels: 5,
  artists: 5,
  includeTags: true,
};
