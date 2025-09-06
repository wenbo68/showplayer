import { relations, sql } from 'drizzle-orm';
import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core';
import { type AdapterAccount } from 'next-auth/adapters';

/**
 * This is an example of how to use the multi-project schema feature of Drizzle ORM. Use the same
 * database instance for multiple projects.
 *
 * @see https://orm.drizzle.team/docs/goodies#multi-project-schema
 */
// export const pgTable = pgTableCreator((name) => `showplayer_${name}`);

export const tmdbTypeEnum = pgEnum('tmdb_type', ['movie', 'tv']);
export const m3u8TypeEnum = pgEnum('m3u8_type', ['master', 'media']);
export const userListEnum = pgEnum('list_type', ['saved', 'favorite', 'later']);
export const userRoleEnum = pgEnum('user_role', ['user', 'admin']);

export const tmdbOrigin = pgTable('tmdb_origin', {
  id: varchar('id', { length: 2 }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull().unique(),
});

export const tmdbOriginRelations = relations(tmdbOrigin, ({ many }) => ({
  mediaToOrigins: many(tmdbMediaToTmdbOrigin),
}));

export const tmdbMediaToTmdbOrigin = pgTable(
  'tmdb_media_to_tmdb_origin',
  {
    mediaId: varchar('media_id', { length: 255 })
      .notNull()
      .references(() => tmdbMedia.id, { onDelete: 'cascade' }),
    originId: varchar('origin_id', { length: 2 })
      .notNull()
      .references(() => tmdbOrigin.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.mediaId, t.originId] })]
);

// Define how the join table connects back to the other two tables
export const tmdbMediaToTmdbOriginRelations = relations(
  tmdbMediaToTmdbOrigin,
  ({ one }) => ({
    media: one(tmdbMedia, {
      fields: [tmdbMediaToTmdbOrigin.mediaId],
      references: [tmdbMedia.id],
    }),
    origin: one(tmdbOrigin, {
      fields: [tmdbMediaToTmdbOrigin.originId],
      references: [tmdbOrigin.id],
    }),
  })
);

export const tmdbGenre = pgTable('tmdb_genre', {
  id: integer('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull().unique(),
});

export const tmdbGenreRelations = relations(tmdbGenre, ({ many }) => ({
  tmdbMediaToTmdbGenre: many(tmdbMediaToTmdbGenre),
}));

export const tmdbMediaToTmdbGenre = pgTable(
  'tmdb_media_to_tmdb_genre',
  {
    mediaId: varchar('media_id', { length: 255 })
      .notNull()
      .references(() => tmdbMedia.id, { onDelete: 'cascade' }),
    genreId: integer('genre_id')
      .notNull()
      .references(() => tmdbGenre.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.mediaId, t.genreId] })]
);

export const mediaToGenresRelations = relations(
  tmdbMediaToTmdbGenre,
  ({ one }) => ({
    media: one(tmdbMedia, {
      fields: [tmdbMediaToTmdbGenre.mediaId],
      references: [tmdbMedia.id],
    }),
    genre: one(tmdbGenre, {
      fields: [tmdbMediaToTmdbGenre.genreId],
      references: [tmdbGenre.id],
    }),
  })
);

export const tmdbRecommendation = pgTable(
  'tmdb_recommendation',
  {
    // The ID of the media item the user is currently viewing
    sourceMediaId: varchar('source_media_id', { length: 255 })
      .notNull()
      .references(() => tmdbMedia.id, { onDelete: 'cascade' }),

    // The ID of a media item that is recommended for the source
    recommendedMediaId: varchar('recommended_media_id', { length: 255 })
      .notNull()
      .references(() => tmdbMedia.id, { onDelete: 'cascade' }),

    // The crucial new column for caching!
    createdAt: timestamp('created_at', {
      mode: 'date',
      withTimezone: true,
    }).default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => [primaryKey({ columns: [t.sourceMediaId, t.recommendedMediaId] })]
);

export const tmdbRecommendationRelations = relations(
  tmdbRecommendation,
  ({ one }) => ({
    // This relation links `sourceMediaId` to the original media item.
    sourceMedia: one(tmdbMedia, {
      fields: [tmdbRecommendation.sourceMediaId],
      references: [tmdbMedia.id],
      relationName: 'recommendations', // Unique name for this link
    }),

    // This relation links `recommendedMediaId` to the recommended media item.
    recommendedMedia: one(tmdbMedia, {
      fields: [tmdbRecommendation.recommendedMediaId],
      references: [tmdbMedia.id],
      relationName: 'recommended', // Unique name for this link
    }),
  })
);

// trending api doesn't return seasons, so we dont store them in media
export const tmdbMedia = pgTable('tmdb_media', {
  id: varchar({ length: 255 })
    .notNull()
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  tmdbId: integer('tmdb_id').unique().notNull(),
  type: tmdbTypeEnum('type').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  imageUrl: text('image_url'),
  backdropUrl: text('backdrop_url'),
  releaseDate: timestamp('release_date', {
    mode: 'date',
    withTimezone: true,
  }),
  createdAt: timestamp('created_at', {
    mode: 'date',
    withTimezone: true,
  }).default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp('updated_at', {
    mode: 'date',
    withTimezone: true,
  })
    .default(sql`CURRENT_TIMESTAMP`)
    .$onUpdate(() => new Date()),
});

export const tmdbMediaRelations = relations(tmdbMedia, ({ one, many }) => ({
  trending: one(tmdbTrending, {
    fields: [tmdbMedia.id],
    references: [tmdbTrending.mediaId],
  }),
  topRated: one(tmdbTopRated, {
    fields: [tmdbMedia.id],
    references: [tmdbTopRated.mediaId],
  }),
  sources: many(tmdbSource),
  seasons: many(tmdbSeason),
  genres: many(tmdbMediaToTmdbGenre),
  origins: many(tmdbMediaToTmdbOrigin),
  recommendations: many(tmdbRecommendation, {
    relationName: 'recommendations',
  }),
  recommended: many(tmdbRecommendation, {
    relationName: 'recommended',
  }),
  lists: many(userMediaList), // ✨ Add this line
}));

export const tmdbTrending = pgTable('tmdb_trending', {
  id: varchar({ length: 255 })
    .notNull()
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  mediaId: varchar({ length: 255 })
    .notNull()
    .references(() => tmdbMedia.id, { onDelete: 'cascade' })
    .unique(),
  rank: integer('rank').notNull(),
});

export const tmdbTrendingRelations = relations(tmdbTrending, ({ one }) => ({
  media: one(tmdbMedia, {
    fields: [tmdbTrending.mediaId],
    references: [tmdbMedia.id],
  }),
}));

// NEW: Add this table for the top-rated list
export const tmdbTopRated = pgTable('tmdb_top_rated', {
  id: varchar({ length: 255 })
    .notNull()
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  mediaId: varchar({ length: 255 })
    .notNull()
    .references(() => tmdbMedia.id, { onDelete: 'cascade' })
    .unique(),
  rank: integer('rank').notNull(),
  voteAverage: real('vote_average').notNull(),
  voteCount: integer('vote_count').notNull(),
});

export const tmdbTopRatedRelations = relations(tmdbTopRated, ({ one }) => ({
  // Creates a link to get the full media details
  media: one(tmdbMedia, {
    fields: [tmdbTopRated.mediaId],
    references: [tmdbMedia.id],
  }),
}));

export const tmdbSeason = pgTable(
  'tmdb_season',
  {
    id: varchar({ length: 255 })
      .notNull()
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    mediaId: varchar({ length: 255 })
      .notNull()
      .references(() => tmdbMedia.id, { onDelete: 'cascade' }),
    seasonNumber: integer('season_number').notNull(),
    title: text('title'),
    description: text('description'),
    imageUrl: text('image_url'),
  },
  (table) => [
    uniqueIndex('unq_media_season').on(table.mediaId, table.seasonNumber),
  ]
);

export const tmdbSeasonRelations = relations(tmdbSeason, ({ one, many }) => ({
  media: one(tmdbMedia, {
    fields: [tmdbSeason.mediaId],
    references: [tmdbMedia.id],
  }),
  episodes: many(tmdbEpisode),
}));

export const tmdbEpisode = pgTable(
  'tmdb_episode',
  {
    id: varchar({ length: 255 })
      .notNull()
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    seasonId: varchar({ length: 255 })
      .notNull()
      .references(() => tmdbSeason.id, { onDelete: 'cascade' }),
    episodeNumber: integer('episode_number').notNull(),
    episodeIndex: integer('episode_index').notNull(), // eg. the 4th episode of any season should have index 4
    title: text('title'),
    description: text('description'),
    airDate: timestamp('air_date', { mode: 'date', withTimezone: true }),
  },
  (table) => [
    uniqueIndex('unq_season_episode').on(table.seasonId, table.episodeNumber),
  ]
);

export const tmdbEpisodeRelations = relations(tmdbEpisode, ({ one, many }) => ({
  season: one(tmdbSeason, {
    fields: [tmdbEpisode.seasonId],
    references: [tmdbSeason.id],
  }),
  sources: many(tmdbSource),
}));

export const tmdbSource = pgTable(
  'tmdb_source',
  {
    id: varchar({ length: 255 })
      .notNull()
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    mediaId: varchar({ length: 255 }).references(() => tmdbMedia.id, {
      onDelete: 'cascade',
    }),
    episodeId: varchar({ length: 255 }).references(() => tmdbEpisode.id, {
      onDelete: 'cascade',
    }),

    // --- THIS IS THE CHANGE ---
    // Change the column type from varchar to integer.
    provider: integer('provider').notNull(),

    type: m3u8TypeEnum('type').notNull(),
    url: text().notNull(),
    headers: jsonb('headers'),
  },
  (t) => [
    // These definitions do not need to change. Drizzle will understand
    // they now apply to the new integer 'provider' column.
    uniqueIndex('unq_episode_provider').on(t.episodeId, t.provider),
    uniqueIndex('unq_movie_provider').on(t.mediaId, t.provider),
  ]
);

export const tmdbSourceRelations = relations(tmdbSource, ({ one, many }) => ({
  media: one(tmdbMedia, {
    fields: [tmdbSource.mediaId],
    references: [tmdbMedia.id],
  }),
  episode: one(tmdbEpisode, {
    fields: [tmdbSource.episodeId],
    references: [tmdbEpisode.id],
  }),
  subtitles: many(tmdbSubtitle),
}));

export const tmdbSubtitle = pgTable(
  'tmdb_subtitle',
  {
    id: varchar({ length: 255 })
      .notNull()
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    sourceId: varchar({ length: 255 })
      .notNull()
      .references(() => tmdbSource.id, {
        onDelete: 'cascade',
      }),
    language: varchar({ length: 255 }).notNull(),
    content: text().notNull(),
  },
  (table) => [
    uniqueIndex('unq_source_language').on(table.sourceId, table.language),
  ]
);

export const tmdbSubtitleRelations = relations(tmdbSubtitle, ({ one }) => ({
  source: one(tmdbSource, {
    fields: [tmdbSubtitle.sourceId],
    references: [tmdbSource.id],
  }),
}));

export const users = pgTable('user', {
  id: varchar({ length: 255 })
    .notNull()
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: varchar({ length: 255 }),
  email: varchar({ length: 255 }).notNull(),
  emailVerified: timestamp({
    mode: 'date',
    withTimezone: true,
  }).default(sql`CURRENT_TIMESTAMP`),
  image: varchar({ length: 255 }),
  role: userRoleEnum('role').default('user').notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  lists: many(userMediaList), // ✨ Add this line
}));

export const accounts = pgTable(
  'account',
  {
    userId: varchar({ length: 255 })
      .notNull()
      .references(() => users.id),
    type: varchar({ length: 255 }).$type<AdapterAccount['type']>().notNull(),
    provider: varchar({ length: 255 }).notNull(),
    providerAccountId: varchar({ length: 255 }).notNull(),
    refresh_token: text(),
    access_token: text(),
    expires_at: integer(),
    token_type: varchar({ length: 255 }),
    scope: varchar({ length: 255 }),
    id_token: text(),
    session_state: varchar({ length: 255 }),
  },
  (t) => [
    primaryKey({ columns: [t.provider, t.providerAccountId] }),
    index('account_user_id_idx').on(t.userId),
  ]
);

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
}));

export const sessions = pgTable(
  'session',
  {
    sessionToken: varchar({ length: 255 }).notNull().primaryKey(),
    userId: varchar({ length: 255 })
      .notNull()
      .references(() => users.id),
    expires: timestamp({ mode: 'date', withTimezone: true }).notNull(),
  },
  (t) => [index('t_user_id_idx').on(t.userId)]
);

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const verificationTokens = pgTable(
  'verification_token',
  {
    identifier: varchar({ length: 255 }).notNull(),
    token: varchar({ length: 255 }).notNull(),
    expires: timestamp({ mode: 'date', withTimezone: true }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.identifier, t.token] })]
);

// /src/server/db/schema.ts

export const userMediaList = pgTable(
  'user_media_list',
  {
    userId: varchar('user_id', { length: 255 })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    mediaId: varchar('media_id', { length: 255 })
      .notNull()
      .references(() => tmdbMedia.id, { onDelete: 'cascade' }),
    listType: userListEnum('list_type').notNull(),
    createdAt: timestamp('created_at', {
      mode: 'date',
      withTimezone: true,
    }).default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => [primaryKey({ columns: [t.userId, t.mediaId, t.listType] })]
);

// Define the relations for the new join table
export const userMediaListsRelations = relations(userMediaList, ({ one }) => ({
  user: one(users, {
    fields: [userMediaList.userId],
    references: [users.id],
  }),
  media: one(tmdbMedia, {
    fields: [userMediaList.mediaId],
    references: [tmdbMedia.id],
  }),
}));
