import type { InferSelectModel } from 'drizzle-orm';
import type {
  tmdbEpisode,
  tmdbMedia,
  tmdbSeason,
  tmdbSource,
} from './server/db/schema';

export type Media = InferSelectModel<typeof tmdbMedia>;
export type Season = InferSelectModel<typeof tmdbSeason>;
export type Episode = InferSelectModel<typeof tmdbEpisode>;
export type Source = InferSelectModel<typeof tmdbSource>;

export type M3U8Result = {
  type: 'master' | 'media';
  url: string;
  headers: Record<string, string>;
};
export type PuppeteerResult = {
  provider: string;
  m3u8: M3U8Result;
  subtitle?: string;
};

export type TrendingMedia = {
  rank: number;
  mediaId: string;
  tmdbId: number;
  type: 'movie' | 'tv';
  title: string;
  description: string | null;
  imageUrl: string | null;
  releaseDate: Date | null;
  availabilityCount: number;
};
