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

export type M3U8FetchResult = {
  type: 'master' | 'media';
  url: string;
  headers: Record<string, string>;
};
