import type { InferSelectModel } from 'drizzle-orm';
import type {
  tmdbEpisode,
  tmdbMedia,
  tmdbSeason,
  tmdbSource,
  tmdbSubtitle,
} from './server/db/schema';

export type Media = InferSelectModel<typeof tmdbMedia>;
export type Season = InferSelectModel<typeof tmdbSeason>;
export type Episode = InferSelectModel<typeof tmdbEpisode>;
export type Source = InferSelectModel<typeof tmdbSource>;
export type Subtitle = InferSelectModel<typeof tmdbSubtitle>;

export type M3U8Result = {
  type: 'master' | 'media';
  url: string;
  headers: Record<string, string>;
};
export type PuppeteerResult = {
  provider: number;
  m3u8: M3U8Result;
  subtitle?: string;
};

export type ListMedia = {
  media: Media;
  origins: string[];
  genres: string[];
  // availabilityCount: number;
  // totalEpisodeCount: number;
  // latestEpisodeInfo: LatestEpisodeInfo;
};

export type LatestEpisodeInfo = {
  airDate: Date;
  seasonNumber: number;
  episodeNumber: number;
} | null; // It will be null for movies

export type FilterOptions = {
  genres: {
    id: number;
    name: string;
  }[];
  origins: {
    id: string;
    name: string;
  }[];
  releaseYears: number[];
  updatedYears: number[];
};

export type UserList = 'saved' | 'favorite' | 'later';
export type UserRole = 'user' | 'admin';
