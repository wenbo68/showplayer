import type { InferSelectModel } from 'drizzle-orm';
import {
  tmdbTypeEnum,
  userListEnum,
  type tmdbEpisode,
  type tmdbMedia,
  type tmdbSeason,
} from './server/db/schema';
import z from 'zod';
import { orderEnum, orderValues } from './constant';
// import type { SearchAndFilterInputSchema as RemoteSearchAndFilterInputSchema } from './server/api/routers/media';

export type Media = InferSelectModel<typeof tmdbMedia>;
export type Season = InferSelectModel<typeof tmdbSeason>;
export type Episode = InferSelectModel<typeof tmdbEpisode>;

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
export type FilterOption = { label: string; urlInput: string };
export type FilterGroupOption = { groupLabel: string; options: FilterOption[] };

export type Order = z.infer<typeof orderEnum>;

const FilterInputObject = (itemSchema: z.ZodType) =>
  z
    .object({
      values: z.array(itemSchema),
      operator: z.enum(['and', 'or']).default('and'), // Default to 'or' for current behavior
    })
    .optional();

// Define the availability options
export const availabilityEnum = [
  'no',
  '0', // >= 0%
  '25', // >= 25%
  '50', // >= 50%
  '75', // >= 75%
  '100', // 100%
] as const;

export const SearchAndFilterInputSchema = z.object({
  title: z.string().optional(),
  format: z.array(z.enum(tmdbTypeEnum.enumValues)).optional(),
  genre: FilterInputObject(z.number()),
  origin: FilterInputObject(z.string()),
  releaseYear: z.array(z.number()).optional(),
  updatedYear: z.array(z.number()).optional(),
  minVoteAvg: z.number().min(0).optional(),
  minVoteCount: z.number().min(0).optional(),
  minAvail: z.enum(availabilityEnum).optional(),
  list: z.array(z.enum(userListEnum.enumValues)).optional(),
  order: z.enum(orderValues).default('popularity-desc'), // ✨ Set a default!
  page: z.number().min(1).default(1),
  pageSize: z.number().min(1),
  needTotalPages: z.boolean().default(true),
});

// ✨ 2. Export the inferred TypeScript type
export type SearchAndFilterInput = z.infer<typeof SearchAndFilterInputSchema>;

// Third-party embed players. The trailing "!" in the URL segment marks options
// that open popups (kept for backward-compatible links).
export const embedProviders = ['E!', 'F!', 'J!', 'L!'] as const;
export type EmbedProvider = (typeof embedProviders)[number];
export const DEFAULT_EMBED_PROVIDER: EmbedProvider = 'E!';
