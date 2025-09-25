import type { InferSelectModel } from 'drizzle-orm';
import {
  tmdbTypeEnum,
  userListEnum,
  type SrcProvider,
  type tmdbEpisode,
  type tmdbMedia,
  type tmdbSeason,
  type tmdbSource,
  type tmdbSubtitle,
} from './server/db/schema';
import z from 'zod';
import { orderEnum, orderValues } from './constant';
// import type { SearchAndFilterInputSchema as RemoteSearchAndFilterInputSchema } from './server/api/routers/media';

export type Media = InferSelectModel<typeof tmdbMedia>;
export type Season = InferSelectModel<typeof tmdbSeason>;
export type Episode = InferSelectModel<typeof tmdbEpisode>;
export type Source = InferSelectModel<typeof tmdbSource>;
export type Subtitle = InferSelectModel<typeof tmdbSubtitle>;
export type SourceWithSubtitles = Source & { subtitles: Subtitle[] };

export type M3U8Result = {
  type: 'master' | 'media';
  url: string;
  headers: Record<string, string>;
};
export type PuppeteerResult = {
  provider: SrcProvider;
  m3u8: M3U8Result;
  subtitle?: string;
};

export type ListMedia = {
  media: Media;
  origins: string[];
  genres: string[];
};

export type LatestEpisodeInfo = {
  airDate: Date;
  seasonNumber: number;
  episodeNumber: number;
} | null; // It will be null for movies

export type FilterOptionsFromDb = {
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

export type FetchedMediaItem = {
  id: number;
  media_type: 'movie' | 'tv';
  [key: string]: any;
};

// --- Define the shape of the sort options ---
export type FilterOption = { label: string; trpcInput: string };
export type FilterGroupOption = { groupLabel: string; options: FilterOption[] };

export type Order = z.infer<typeof orderEnum>;

const FilterInputObject = (itemSchema: z.ZodType) =>
  z
    .object({
      values: z.array(itemSchema),
      operator: z.enum(['and', 'or']).default('and'), // Default to 'or' for current behavior
    })
    .optional();

export const SearchAndFilterInputSchema = z.object({
  title: z.string().optional(),
  format: z.array(z.enum(tmdbTypeEnum.enumValues)).optional(),
  genre: FilterInputObject(z.number()),
  origin: FilterInputObject(z.string()),
  releaseYear: z.array(z.number()).optional(),
  updatedYear: z.array(z.number()).optional(),
  minVoteAvg: z.number().min(0).optional(),
  minVoteCount: z.number().min(0).optional(),
  order: z.enum(orderValues).default('popularity-desc'), // ✨ Set a default!
  page: z.number().min(1).default(1),
  pageSize: z.number().min(1),
  list: z.array(z.enum(userListEnum.enumValues)).optional(),
  needTotalPages: z.boolean().default(true),
});

// ✨ 2. Export the inferred TypeScript type
export type SearchAndFilterInput = z.infer<typeof SearchAndFilterInputSchema>;

export type SrcProviderPlusEmbed = SrcProvider | 'E!' | 'F!' | 'L!' | 'J!';
export type PlayerType = 'hls' | 'iframe';
