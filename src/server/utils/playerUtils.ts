// ~/server/utils/playerUtils.ts

import { redirect } from 'next/navigation';
import type { SourceWithSubtitles, SrcProviderPlusEmbed } from '~/type';
import type { MediaType, SrcProvider } from '../db/schema';
import { getProxiedSrcUrl } from './proxyUtils';

export function handleProvider(
  type: MediaType,
  allProxiableSourcesAndSubtitles: SourceWithSubtitles[],
  tmdbId: number,
  providerParam?: string,
  seasonNumber?: number,
  episodeNumber?: number
) {
  // 2. determine chosen provider
  // provider = undefined, if provider param is wrong
  const provider: SrcProviderPlusEmbed | undefined =
    providerParam === 'E'
      ? providerParam
      : providerParam === 'F'
      ? providerParam
      : providerParam === 'L'
      ? providerParam
      : providerParam === 'J'
      ? providerParam
      : providerParam === 'E!'
      ? providerParam
      : providerParam === 'F!'
      ? providerParam
      : providerParam === 'J!'
      ? providerParam
      : providerParam === 'L!'
      ? providerParam
      : undefined;

  // redirect until provider is present and correct
  // then get the selected proxiable src url and its subtitles
  // will return null if we are using embed
  const baseRedirectUrl = `/${type}/${tmdbId}${
    type === 'movie' ? `` : `/${seasonNumber}/${episodeNumber}`
  }`;
  const proxiableUrlAndSubtitles = getSelectedSourceAndHandleRedirects(
    baseRedirectUrl,
    allProxiableSourcesAndSubtitles,
    provider
  );

  // 3. for video player, get proxied url or embed url
  // subtitles will be empty arr if we are using embed
  const videoUrl = proxiableUrlAndSubtitles
    ? getProxiedSrcUrl(proxiableUrlAndSubtitles)
    : getEmbedUrl(
        type,
        provider!.charAt(0) as SrcProvider,
        tmdbId,
        seasonNumber,
        episodeNumber
      );
  const subtitles = aggregateSubtitles(
    allProxiableSourcesAndSubtitles,
    proxiableUrlAndSubtitles?.id
  );

  return {
    provider,
    videoUrl,
    subtitles,
    proxiableUrlAndSubtitles,
  };
}

const getEmbedUrl = (
  type: MediaType,
  provider: SrcProvider,
  tmdbId: number,
  season?: number,
  episode?: number
): string => {
  switch (provider) {
    case 'J': // Vidjoy
      return `https://vidjoy.pro/embed/${type}/${tmdbId}${
        type === `movie` ? `` : `/${season}/${episode}`
      }`;
    case 'E': // Videasy
      return `https://player.videasy.net/${type}/${tmdbId}${
        type === `movie` ? `` : `/${season}/${episode}`
      }`;
    case 'L': // Vidlink
      // Note: Vidlink uses the tmdbId
      return `https://vidlink.pro/${type}/${tmdbId}${
        type === `movie` ? `` : `/${season}/${episode}`
      }`;
    case 'F': // Vidfast
      return `https://vidfast.pro/${type}/${tmdbId}${
        type === `movie` ? `` : `/${season}/${episode}`
      }`;
    default:
      return '';
  }
};

/**
 * Handles the logic for redirecting to a valid provider if necessary.
 * @returns The selected source object, or performs a redirect.
 */
export function getSelectedSourceAndHandleRedirects(
  baseRedirectUrl: string,
  sources: SourceWithSubtitles[],
  provider?: SrcProviderPlusEmbed
) {
  // If there's no proxied src and there's no given provider (or wrong provider),
  // redirect to videasy embed
  if (sources.length === 0 && !provider) {
    return redirect(`${baseRedirectUrl}/E!`);
  }
  // now if we are using embed or if there's no src, return null
  if (provider?.endsWith('!') || sources.length === 0) {
    return null;
  }

  // if there is src, but there's no given provider (or wrong provider),
  // redirect to 1st available src
  const firstAvailableProvider = sources[0]!.provider;
  // If no provider is in the URL, redirect to the first available one.
  if (!provider) {
    return redirect(`${baseRedirectUrl}/${firstAvailableProvider}`);
  }
  // Find the selected source based on the provider in the URL.
  const selectedSrc = sources.find((s) => s.provider === provider);
  // If the provider in the URL is invalid, redirect to the first available one.
  if (!selectedSrc) {
    return redirect(`${baseRedirectUrl}/${firstAvailableProvider}`);
  }

  return selectedSrc;
}

/**
 * Aggregates all subtitles from all sources for the player.
 */
export function aggregateSubtitles(
  sources: SourceWithSubtitles[],
  selectedSrcId?: string
) {
  return sources.flatMap((source) =>
    source.subtitles.map((subtitle) => ({
      content: subtitle.content,
      lang: subtitle.language.slice(0, 2).toLowerCase(),
      label: `${subtitle.language.slice(0, 2).toLowerCase()} (${
        source.provider
      })`,
      default: source.id === selectedSrcId,
    }))
  );
}
