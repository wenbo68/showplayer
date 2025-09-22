import { and, eq, or, sql } from 'drizzle-orm';
import { env } from '~/env';
import { tmdbMedia, tmdbSeason } from '../db/schema';
import { db } from '../db';
import { isLatinBased } from './utils';
import type { FetchedMediaItem } from '~/type';

const TMDB_API_HEADERS = {
  accept: 'application/json',
  Authorization: `Bearer ${env.TMDB_API_KEY}`,
};

type TmdbChangedItem = {
  id: number;
  adult: boolean;
};

type TmdbChangesApiResponse = {
  results: TmdbChangedItem[];
  page: number;
  total_pages: number;
  total_results: number;
};

type MediaTypeAndTmdbId = {
  type: 'movie' | 'tv';
  tmdbId: number;
};

type MediaTypeAndTmdbIdAndSeasonCount = {
  type: 'movie' | 'tv';
  tmdbId: number;
  seasonCount: number;
};

/**
 * Fetches all changed IDs for a specific media type (movie or tv)
 * by handling the pagination concurrently.
 * @param mediaType - The type of media to fetch ('movie' or 'tv').
 * @returns An array of objects containing the type and tmdbId.
 */

async function fetchChangedTmdbIds(
  mediaType: 'movie' | 'tv'
): Promise<MediaTypeAndTmdbId[]> {
  const baseUrl = `https://api.themoviedb.org/3/${mediaType}/changes`;

  // 1. Make the first request to get the total number of pages
  const initialResponse = await fetch(`${baseUrl}?page=1`, {
    headers: TMDB_API_HEADERS,
  });
  if (!initialResponse.ok) {
    throw new Error(`Failed to fetch initial page for ${mediaType} changes`);
  }
  const initialData: TmdbChangesApiResponse = await initialResponse.json();
  const totalPages = initialData.total_pages;
  let allResults = initialData.results;
  if (totalPages <= 1) {
    return allResults.map((item) => ({ type: mediaType, tmdbId: item.id }));
  }

  // --- REFACTORED BATCHING LOGIC ---

  // 2. Create a list of all the remaining page numbers we need to fetch
  const pagesToFetch: number[] = [];
  for (let page = 2; page <= totalPages; page++) {
    pagesToFetch.push(page);
  }

  const batchSize = 10;
  // 3. Loop through the page numbers in batches
  for (let i = 0; i < pagesToFetch.length; i += batchSize) {
    const pageBatch = pagesToFetch.slice(i, i + batchSize);

    // 4. Create fetch promises for the current batch
    const batchFetchPromises = pageBatch.map((page) =>
      fetch(`${baseUrl}?page=${page}`, { headers: TMDB_API_HEADERS })
    );

    // 5. Execute the current batch of 10 requests concurrently
    const responses = await Promise.all(batchFetchPromises);

    // 6. Process the results from the batch
    for (const res of responses) {
      if (res.ok) {
        const pageData: TmdbChangesApiResponse = await res.json();
        allResults = allResults.concat(pageData.results);
      } else {
        console.warn(
          `[fetchChangedIdsForType] Failed to fetch a page for ${mediaType}. Status: ${res.status}`
        );
      }
    }
    console.log(
      `[fetchChangedIdsForType] ${mediaType} progress: ${
        i + 1
      }/${totalPages} pages`
    );
  }

  // 7. Map the final combined results to the desired format
  return allResults.map((item) => ({ type: mediaType, tmdbId: item.id }));
}
/**
 * Fetches all changed movie and TV show IDs from all pages of the TMDB Changes API.
 * @returns A single array containing all changed movie and TV IDs.
 */
export async function fetchAllChangedTmdbIds(): Promise<MediaTypeAndTmdbId[]> {
  try {
    // Run the fetching for movies and TV shows in parallel
    const [changedMvIds, changedTvIds] = await Promise.all([
      fetchChangedTmdbIds('movie'),
      fetchChangedTmdbIds('tv'),
    ]);
    console.log(`[fetchAllChangedTmdbIds] changed mv: ${changedMvIds.length}`);
    console.log(`[fetchAllChangedTmdbIds] changed tv: ${changedTvIds.length}`);
    const combinedIds = [...changedMvIds, ...changedTvIds];
    return combinedIds;
  } catch (error) {
    console.error('[fetchAllChangedTmdbIds] An error occurred:', error);
    return []; // Return an empty array on failure
  }
}

/**
 * Takes an array of media identifiers and returns a filtered list of only those
 * that exist in the local database, along with their season count.
 * @param input - An array of objects with tmdbId and type.
 * @returns A promise that resolves to an array of existing media with their season count.
 */
export async function findExistingMediaFromFetched(
  input: MediaTypeAndTmdbId[]
): Promise<MediaTypeAndTmdbIdAndSeasonCount[]> {
  if (input.length === 0) {
    return [];
  }

  // 1. Create a composite WHERE clause to match pairs of (tmdbId, type).
  //    This generates a query like:
  //    WHERE (tmdbId = 123 AND type = 'tv') OR (tmdbId = 456 AND type = 'movie') ...
  const compositeWhereClause = or(
    ...input.map((id) =>
      and(eq(tmdbMedia.tmdbId, id.tmdbId), eq(tmdbMedia.type, id.type))
    )
  );

  if (!compositeWhereClause) {
    return []; // Should not happen if changedIds is not empty, but good for type safety
  }

  // 2. Execute a single query to find matching media and count their seasons.
  const existingMedia = await db
    .select({
      tmdbId: tmdbMedia.tmdbId,
      type: tmdbMedia.type,
      // We count the season IDs. A LEFT JOIN ensures this count is 0 for movies.
      seasonCount: sql<number>`count(${tmdbSeason.id})`.mapWith(Number),
    })
    .from(tmdbMedia)
    .leftJoin(tmdbSeason, eq(tmdbMedia.id, tmdbSeason.mediaId))
    .where(compositeWhereClause)
    .groupBy(tmdbMedia.id, tmdbMedia.tmdbId, tmdbMedia.type);

  return existingMedia;
}

export async function findNewMediaFromFetched(
  fetchOutput: FetchedMediaItem[]
): Promise<FetchedMediaItem[]> {
  if (fetchOutput.length === 0) {
    return [];
  }

  // 1. Create a unique list of the {tmdbId, type} pairs we need to check.
  const mediaToVerify = [
    ...new Map(
      fetchOutput.map((item) => [
        `${item.media_type}-${item.id}`, // Create a composite key to handle duplicates
        { tmdbId: item.id, type: item.media_type },
      ])
    ).values(),
  ];

  // 2. Build a composite WHERE clause to check for all pairs in a single query.
  //    e.g., WHERE (tmdbId = 123 AND type = 'tv') OR (tmdbId = 456 AND type = 'movie')
  const compositeWhereClause = or(
    ...mediaToVerify.map((item) =>
      and(eq(tmdbMedia.tmdbId, item.tmdbId), eq(tmdbMedia.type, item.type))
    )
  );
  if (!compositeWhereClause) return [];

  const existingMedia = await db
    .select({ tmdbId: tmdbMedia.tmdbId, type: tmdbMedia.type })
    .from(tmdbMedia)
    .where(compositeWhereClause);

  // 3. Create a Set of existing composite keys (e.g., "movie-123") for fast lookups.
  const existingMediaKeys = new Set(
    existingMedia.map((item) => `${item.type}-${item.tmdbId}`)
  );

  // 4. Filter the original list by checking against the composite key Set.
  const newMedia = fetchOutput.filter((item) => {
    const key = `${item.media_type}-${item.id}`;
    return !existingMediaKeys.has(key);
  });

  console.log(
    `[findNewMedia] ${fetchOutput.length} fetched => ${newMedia.length} new`
  );

  return newMedia;
}

// export async function fetchTmdbTopRatedViaApi(
//   limit: number,
//   type: 'movie' | 'tv'
// ) {
//   const collected = [];
//   const seenIds = new Set(); // Use a Set to track seen IDs
//   let page = 1;

//   while (collected.length < limit) {
//     const resp = await fetch(
//       `https://api.themoviedb.org/3/${type}/top_rated?language=en-US&page=${page}`,
//       {
//         headers: {
//           accept: 'application/json',
//           Authorization: `Bearer ${process.env.TMDB_API_KEY}`,
//         },
//       }
//     );
//     const { results } = await resp.json();

//     // Break the loop if the API has no more results to prevent an infinite loop
//     if (!results || results.length === 0) {
//       break;
//     }

//     // Iterate through the fetched results
//     for (const item of results) {
//       // Check if the item's ID has not been seen yet
//       if (!seenIds.has(item.id)) {
//         seenIds.add(item.id); // Add the new ID to the set
//         collected.push(item); // Add the unique item to our collection
//       }
//       // Stop once we have collected enough items
//       if (collected.length >= limit) {
//         break;
//       }
//     }
//     page += 1;
//   }

//   // Ensure the final array is exactly the length of the limit
//   return collected.slice(0, limit);
// }

export async function fetchTmdbListViaApi(
  listType: 'trending' | 'popular' | 'top_rated',
  limit: number,
  mediaType?: 'movie' | 'tv'
) {
  const collected = [];
  const seenIds = new Set(); // Use a Set to track seen IDs
  let page = 1;

  while (collected.length < limit) {
    const resp = await fetch(
      `https://api.themoviedb.org/3/${
        listType === 'trending'
          ? `trending/all/day`
          : `${mediaType}/${listType}`
      }?language=en-US&page=${page}`,
      {
        headers: {
          accept: 'application/json',
          Authorization: `Bearer ${process.env.TMDB_API_KEY}`,
        },
      }
    );
    const { results } = await resp.json();

    // Break the loop if the API has no more results
    if (!results || results.length === 0) {
      break;
    }

    // Iterate through the fetched results
    for (const item of results) {
      // 1. Get the correct title field based on the media type.
      const title =
        (mediaType ?? item.media_type) === 'movie' ? item.title : item.name;

      // 2. Check if the ID is new AND if the title is Latin-based.
      if (!seenIds.has(item.id) && isLatinBased(title)) {
        seenIds.add(item.id);
        collected.push(item);
      }
      // Stop once we have collected enough items
      if (collected.length >= limit) {
        break;
      }
    }
    page += 1;
  }

  // Ensure the final array is exactly the length of the limit
  const returnValue = collected.slice(0, limit);
  return returnValue.map((value) => {
    return {
      ...value,
      media_type: mediaType ?? value.media_type,
    };
  });
}

export async function fetchTmdbDetailViaApi(type: string, id: number) {
  const resp = await fetch(
    `https://api.themoviedb.org/3/${type}/${id}?language=en-US`,
    {
      headers: {
        accept: 'application/json',
        Authorization: `Bearer ${process.env.TMDB_API_KEY}`,
      },
    }
  );
  const data = await resp.json();
  return { ...data, media_type: type };
}

export async function fetchTmdbOriginsViaApi() {
  const resp = await fetch(
    `https://api.themoviedb.org/3/configuration/countries?language=en-US`,
    {
      headers: {
        accept: 'application/json',
        Authorization: `Bearer ${process.env.TMDB_API_KEY}`,
      },
    }
  );
  const data = await resp.json();
  return data;
}

export async function fetchTmdbMvGenresViaApi() {
  const resp = await fetch(
    `https://api.themoviedb.org/3/genre/movie/list?language=en`,
    {
      headers: {
        accept: 'application/json',
        Authorization: `Bearer ${process.env.TMDB_API_KEY}`,
      },
    }
  );
  const data = await resp.json();
  return data;
}

export async function fetchTmdbTvGenresViaApi() {
  const resp = await fetch(
    `https://api.themoviedb.org/3/genre/tv/list?language=en`,
    {
      headers: {
        accept: 'application/json',
        Authorization: `Bearer ${process.env.TMDB_API_KEY}`,
      },
    }
  );
  const data = await resp.json();
  return data;
}

export async function fetchTmdbSeasonDetailViaApi(
  id: number,
  seasonNumber: number
) {
  const resp = await fetch(
    `https://api.themoviedb.org/3/tv/${id}/season/${seasonNumber}?language=en-US`,
    {
      headers: {
        accept: 'application/json',
        Authorization: `Bearer ${process.env.TMDB_API_KEY}`,
      },
    }
  );
  const data = await resp.json();
  return data;
}
