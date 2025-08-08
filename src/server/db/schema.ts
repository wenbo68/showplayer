import { relations, sql } from 'drizzle-orm';
import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
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
export const anilistTypeEnum = pgEnum('anilist_type', [
  'TV',
  'TV_SHORT',
  'MOVIE',
  'SPECIAL',
  'OVA',
  'ONA',
]);
export const m3u8TypeEnum = pgEnum('m3u8_type', ['master', 'media']);

// all types have episodes
export const anilistMedia = pgTable('anilist_media', {
  id: varchar({ length: 255 })
    .notNull()
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  anilistId: integer('anilist_id').unique().notNull(),
  type: anilistTypeEnum('type').notNull(),
  title: text('title').notNull(),
  description: text('description').notNull().default('N/A'),
  imageUrl: text('image_url'),
  episodes: integer('episodes').notNull(),
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

export const anilistMediaRelations = relations(
  anilistMedia,
  ({ one, many }) => ({
    trending: one(anilistTrending, {
      fields: [anilistMedia.id],
      references: [anilistTrending.mediaId],
    }),
    episodes: many(anilistEpisode),
  })
);

export const anilistTrending = pgTable('anilist_trending', {
  id: varchar({ length: 255 })
    .notNull()
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  mediaId: varchar({ length: 255 })
    .notNull()
    .references(() => anilistMedia.id, { onDelete: 'cascade' })
    .unique(),
  rank: integer('rank').notNull(),
});

export const anilistTrendingRelations = relations(
  anilistTrending,
  ({ one }) => ({
    media: one(anilistMedia, {
      fields: [anilistTrending.mediaId],
      references: [anilistMedia.id],
    }),
  })
);

export const anilistEpisode = pgTable('anilist_episode', {
  id: varchar({ length: 255 })
    .notNull()
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  mediaId: varchar({ length: 255 })
    .notNull()
    .references(() => anilistMedia.id, { onDelete: 'cascade' }),
  episodeNumber: integer('episode_number').notNull(),
  title: text('title'),
  description: text('description'),
  imageUrl: text('image_url'),
});

export const anilistEpisodeRelations = relations(
  anilistEpisode,
  ({ one, many }) => ({
    media: one(anilistMedia, {
      fields: [anilistEpisode.mediaId],
      references: [anilistMedia.id],
    }),
    sources: many(anilistSource),
  })
);

export const anilistSource = pgTable('anilist_source', {
  id: varchar({ length: 255 })
    .notNull()
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  mediaId: varchar({ length: 255 }).references(() => anilistMedia.id, {
    onDelete: 'cascade',
  }),
  episodeId: varchar({ length: 255 }).references(() => anilistEpisode.id, {
    onDelete: 'cascade',
  }),
  provider: varchar({ length: 255 }),
  url: text().notNull(),
});

export const anilistSourceRelations = relations(anilistSource, ({ one }) => ({
  media: one(anilistMedia, {
    fields: [anilistSource.mediaId],
    references: [anilistMedia.id],
  }),
  episode: one(anilistEpisode, {
    fields: [anilistSource.episodeId],
    references: [anilistEpisode.id],
  }),
}));

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
  updateDate: timestamp('update_date', {
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
  sources: many(tmdbSource),
  seasons: many(tmdbSeason),
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

export const seasonRelations = relations(tmdbSeason, ({ one, many }) => ({
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
    title: text('title'),
    description: text('description'),
  },
  (table) => [
    uniqueIndex('unq_season_episode').on(table.seasonId, table.episodeNumber),
  ]
);

export const episodeRelations = relations(tmdbEpisode, ({ one, many }) => ({
  season: one(tmdbSeason, {
    fields: [tmdbEpisode.seasonId],
    references: [tmdbSeason.id],
  }),
  sources: many(tmdbSource),
}));

export const tmdbSource = pgTable('tmdb_source', {
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
  provider: varchar({ length: 255 }).notNull(),
  type: m3u8TypeEnum('type').notNull(),
  url: text().notNull(),
  headers: jsonb('headers'),
});

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

export const tmdbSubtitle = pgTable('tmdb_subtitle', {
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
});

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
});

export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
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
