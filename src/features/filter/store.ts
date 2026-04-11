// Design Ref: §2.2 — Zustand filter/sort state
import { create } from 'zustand';
import type { FilterState, SortOption } from '@/types';

interface FilterStore extends FilterState {
  query: string;
  channelId: string | null;
  setQuery: (query: string) => void;
  setChannelId: (id: string | null) => void;
  setGenre: (genre: string[]) => void;
  setMood: (mood: string[]) => void;
  setPlace: (place: string[]) => void;
  setEra: (era: string[]) => void;
  setSort: (sort: SortOption) => void;
  toggleGenre: (value: string) => void;
  toggleMood: (value: string) => void;
  togglePlace: (value: string) => void;
  toggleEra: (value: string) => void;
  reset: () => void;
  hasActiveFilters: () => boolean;
}

const initialState: FilterState = {
  genre: [],
  mood: [],
  place: [],
  era: [],
  sort: 'latest',
};

export const useFilterStore = create<FilterStore>((set, get) => ({
  ...initialState,
  query: '',
  channelId: null,

  setQuery: (query) => set({ query }),
  setChannelId: (channelId) => set({ channelId }),
  setGenre: (genre) => set({ genre }),
  setMood: (mood) => set({ mood }),
  setPlace: (place) => set({ place }),
  setEra: (era) => set({ era }),
  setSort: (sort) => set({ sort }),

  toggleGenre: (value) =>
    set((s) => ({
      genre: s.genre.includes(value)
        ? s.genre.filter((v) => v !== value)
        : [...s.genre, value],
    })),
  toggleMood: (value) =>
    set((s) => ({
      mood: s.mood.includes(value)
        ? s.mood.filter((v) => v !== value)
        : [...s.mood, value],
    })),
  togglePlace: (value) =>
    set((s) => ({
      place: s.place.includes(value)
        ? s.place.filter((v) => v !== value)
        : [...s.place, value],
    })),
  toggleEra: (value) =>
    set((s) => ({
      era: s.era.includes(value)
        ? s.era.filter((v) => v !== value)
        : [...s.era, value],
    })),

  reset: () => set({ ...initialState, query: '', channelId: null }),

  hasActiveFilters: () => {
    const { genre, mood, place, era, channelId, query } = get();
    return genre.length > 0 || mood.length > 0 || place.length > 0 || era.length > 0 || channelId !== null || query !== '';
  },
}));
