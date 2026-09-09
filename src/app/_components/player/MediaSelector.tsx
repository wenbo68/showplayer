// ~/app/_components/player/MediaSelector.tsx (replaces TvSelector.tsx)

'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  embedProviders,
  type Season,
  type Episode,
  type Media,
  type EmbedProvider,
} from '~/type';
import { PlayerNavButton } from './PlayerNavButton';
import { useSessionStorageState } from '~/app/_hooks/sessionStorageHooks';
import { useAutoScroll } from '~/app/_hooks/autoscrollHooks';
import { SelectorPanel } from './SelectorPanel';

// TV-specific props are optional
interface MediaUrlSelectorProps {
  selectedProvider: EmbedProvider;
  tmdbId?: number;
  mediaData?: Media & {
    seasons: (Season & {
      episodes: Episode[];
    })[];
  };
  selectedSeasonId?: string;
  selectedEpisodeId?: string;
}

export function MediaSelector({
  selectedProvider,
  tmdbId,
  mediaData,
  selectedSeasonId: seasonIdParam,
  selectedEpisodeId: episodeIdParam,
}: MediaUrlSelectorProps) {
  const pathname = usePathname();
  // For movie URLs like /movie/123/4, gets /movie/123
  // For TV URLs like /tv/123/1/1/4, gets /tv/123/1/1
  const basePath = pathname.substring(0, pathname.lastIndexOf('/'));

  // --- TV-Specific State and Logic ---
  const [selectedSeasonId, setSelectedSeasonId] = useState(seasonIdParam);
  const [isSeasonsExpanded, setIsSeasonsExpanded] = useSessionStorageState(
    'isSeasonsExpanded',
    false
  );
  const [isEpisodesExpanded, setIsEpisodesExpanded] = useSessionStorageState(
    'isEpisodesExpanded',
    false
  );

  useEffect(() => {
    setSelectedSeasonId(seasonIdParam);
  }, [seasonIdParam]);

  const selectedSeason = useMemo(
    () => mediaData?.seasons.find((s) => s.id === selectedSeasonId),
    [mediaData?.seasons, selectedSeasonId]
  );

  const seasonsContainerRef = useRef<HTMLDivElement>(null);
  const episodesContainerRef = useRef<HTMLDivElement>(null);
  useAutoScroll(seasonsContainerRef, selectedSeasonId);
  useAutoScroll(episodesContainerRef, episodeIdParam);

  return (
    <div className="flex flex-col gap-4 text-sm font-semibold">
      {/* Provider selector (always rendered) */}
      <div className="flex flex-col gap-2">
        <div className="flex gap-2 items-baseline">
          <span className="text-base font-semibold">Provider</span>
          <span className="text-xs">Options with popups are marked with !</span>
        </div>
        <div className="flex gap-1 flex-wrap">
          {embedProviders.map((selector) => (
            <PlayerNavButton
              key={selector}
              href={`${basePath}/${selector}`}
              isActive={selector === selectedProvider}
            >
              {selector}
            </PlayerNavButton>
          ))}
        </div>
      </div>

      {/* TV-specific panels */}
      {/* These panels will only render if the TV-related props are provided */}
      {mediaData && selectedSeason && episodeIdParam && tmdbId && (
        <>
          <SelectorPanel
            title="Season"
            isExpanded={isSeasonsExpanded}
            onToggleExpand={() => setIsSeasonsExpanded(!isSeasonsExpanded)}
            containerRef={seasonsContainerRef}
          >
            {mediaData.seasons.map((season) => (
              <PlayerNavButton
                key={season.id}
                onClick={() => setSelectedSeasonId(season.id)}
                isActive={season.id === selectedSeasonId}
              >
                {season.seasonNumber}
              </PlayerNavButton>
            ))}
          </SelectorPanel>

          <SelectorPanel
            title="Episode"
            isExpanded={isEpisodesExpanded}
            onToggleExpand={() => setIsEpisodesExpanded(!isEpisodesExpanded)}
            containerRef={episodesContainerRef}
          >
            {selectedSeason?.episodes.map((episode) => (
              <PlayerNavButton
                key={episode.id}
                href={`/tv/${tmdbId}/${selectedSeason.seasonNumber}/${episode.episodeNumber}`}
                isActive={episode.id === episodeIdParam}
              >
                {episode.episodeNumber}
              </PlayerNavButton>
            ))}
          </SelectorPanel>
        </>
      )}
    </div>
  );
}
