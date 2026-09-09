// ~/server/utils/playerUtils.ts

import { redirect } from 'next/navigation';
import {
  DEFAULT_EMBED_PROVIDER,
  embedProviders,
  type EmbedProvider,
} from '~/type';
import type { MediaType } from '../db/schema';

/**
 * Resolves the embed provider from the URL segment and builds the player URL.
 * Redirects to the default provider when the segment is missing or invalid.
 */
export function handleProvider(
  type: MediaType,
  tmdbId: number,
  providerParam?: string,
  seasonNumber?: number,
  episodeNumber?: number
) {
  const provider = parseProvider(providerParam);

  if (!provider) {
    const baseRedirectUrl = `/${type}/${tmdbId}${
      type === 'movie' ? `` : `/${seasonNumber}/${episodeNumber}`
    }`;
    redirect(`${baseRedirectUrl}/${DEFAULT_EMBED_PROVIDER}`);
  }

  const videoUrl = getEmbedUrl(
    type,
    provider,
    tmdbId,
    seasonNumber,
    episodeNumber
  );

  return { provider, videoUrl };
}

function parseProvider(param?: string): EmbedProvider | undefined {
  if (!param) return undefined;
  // Accept both "E!" and legacy "E" segments.
  const normalized = param.endsWith('!') ? param : `${param}!`;
  return embedProviders.find((p) => p === normalized);
}

const getEmbedUrl = (
  type: MediaType,
  provider: EmbedProvider,
  tmdbId: number,
  season?: number,
  episode?: number
): string => {
  const suffix = type === 'movie' ? `` : `/${season}/${episode}`;
  switch (provider) {
    case 'J!': // Vidjoy
      return `https://vidjoy.pro/embed/${type}/${tmdbId}${suffix}`;
    case 'E!': // Videasy
      return `https://player.videasy.net/${type}/${tmdbId}${suffix}`;
    case 'L!': // Vidlink
      return `https://vidlink.pro/${type}/${tmdbId}${suffix}`;
    case 'F!': // Vidfast
      return `https://vidfast.pro/${type}/${tmdbId}${suffix}`;
  }
};
