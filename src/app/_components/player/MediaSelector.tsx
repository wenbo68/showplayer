// ~/app/_components/player/MediaSelector.tsx (replaces TvSelector.tsx)

'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import type {
  Season,
  Episode,
  Media,
  Source,
  SrcProviderPlusEmbed,
} from '~/type';
import { NavButton } from '../NavButton';
import { useSessionStorageState } from '~/app/_hooks/sessionStorageHooks';
import { useAutoScroll } from '~/app/_hooks/autoscrollHooks';
import { SelectorPanel } from './SelectorPanel';
import type { SrcProvider } from '~/server/db/schema';

// --- 1. UPDATE THE PROPS ---
// TV-specific props are now optional
interface MediaUrlSelectorProps {
  sources: Source[];
  selectedProvider: SrcProviderPlusEmbed;
  tmdbId?: number;
  mediaData?: Media & {
    seasons: (Season & {
      episodes: (Episode & {
        sources: Pick<Source, 'provider'>[];
      })[];
    })[];
  };
  selectedSeasonId?: string;
  selectedEpisodeId?: string;
}

export function MediaSelector({
  sources,
  selectedProvider,
  tmdbId,
  mediaData,
  selectedSeasonId: seasonIdParam,
  selectedEpisodeId: episodeIdParam,
}: MediaUrlSelectorProps) {
  // --- 2. MERGE LOGIC FROM SourceSelector ---
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

  const embedSelectors = ['E!', 'F!', 'J!', 'L!'];

  return (
    <div className="flex flex-col gap-4 text-sm font-semibold">
      {/* --- 3. MERGE JSX FROM SourceSelector --- */}
      {/* This part is now always rendered */}
      <div className="flex flex-col gap-2">
        <div className="flex gap-2 items-baseline">
          <span className="text-base font-semibold">Provider</span>
          <span className="text-xs">Options with popups are marked with !</span>
        </div>
        <div className="flex gap-1 flex-wrap">
          {sources.map((source) => (
            <NavButton
              key={source.id}
              href={`${basePath}/${source.provider}`}
              isActive={source.provider === selectedProvider}
            >
              {source.provider}
            </NavButton>
          ))}
          {embedSelectors.map((selector) => (
            <NavButton
              key={selector}
              href={`${basePath}/${selector}`}
              isActive={selector === selectedProvider}
            >
              {selector}
            </NavButton>
          ))}
        </div>
      </div>

      {/* --- 4. CONDITIONALLY RENDER TV-SPECIFIC PANELS --- */}
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
              <NavButton
                key={season.id}
                onClick={() => setSelectedSeasonId(season.id)}
                isActive={season.id === selectedSeasonId}
              >
                {season.seasonNumber}
              </NavButton>
            ))}
          </SelectorPanel>

          <SelectorPanel
            title="Episode"
            isExpanded={isEpisodesExpanded}
            onToggleExpand={() => setIsEpisodesExpanded(!isEpisodesExpanded)}
            containerRef={episodesContainerRef}
          >
            {selectedSeason?.episodes.map((episode) => (
              <NavButton
                key={episode.id}
                href={`/tv/${tmdbId}/${selectedSeason.seasonNumber}/${episode.episodeNumber}`}
                isActive={episode.id === episodeIdParam}
                // isDisabled={episode.sources.length === 0}
                // className={episode.sources.length === 0 ? 'line-through' : ''}
              >
                {`${episode.episodeNumber}${
                  episode.sources.length === 0 ? `!` : ``
                }`}
              </NavButton>
            ))}
          </SelectorPanel>
        </>
      )}
    </div>
  );
}
