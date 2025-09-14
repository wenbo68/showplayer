// ~/server/utils/playerUtils.ts

import { redirect } from 'next/navigation';
import type { SourceWithSubtitles } from '~/type';

/**
 * Handles the logic for redirecting to a valid provider if necessary.
 * @returns The selected source object, or performs a redirect.
 */
export function getSelectedSourceAndHandleRedirects(
  baseRedirectUrl: string,
  sources: SourceWithSubtitles[],
  provider?: number
) {
  // If no sources exist at all, there's nothing to select.
  if (sources.length === 0) {
    return null;
  }

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
      label: `${subtitle.language} (Provider ${source.provider})`,
      default: source.id === selectedSrcId,
    }))
  );
}
