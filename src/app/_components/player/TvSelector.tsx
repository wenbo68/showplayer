'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { Season, Episode, Media, Source } from '~/type';
import { SourceSelector } from './SourceSelector';
import { IoGrid } from 'react-icons/io5';
import { NavButton } from '../NavButton';

interface TvSelectorProps {
  tmdbId: number;
  mediaData: Media & {
    seasons: (Season & {
      episodes: (Episode & {
        sources: Source[];
      })[];
    })[];
  };
  episodeSources: Source[];
  selectedProvider?: number;
  selectedSeasonId: string;
  selectedEpisodeId: string;
}

export function TvSelector({
  tmdbId,
  mediaData,
  episodeSources,
  selectedProvider,
  selectedSeasonId: seasonIdParam,
  selectedEpisodeId: episodeIdParam,
}: TvSelectorProps) {
  const [selectedSeasonId, setSelectedSeasonId] = useState(seasonIdParam);
  // Initialize state to a default value for server and initial client render.
  const [isEpisodesExpanded, setIsEpisodesExpanded] = useState(false);
  const [isSeasonsExpanded, setIsSeasonsExpanded] = useState(false);

  // This effect runs only on the client, after the initial render.
  // This safely syncs state with sessionStorage without causing a hydration mismatch.
  useEffect(() => {
    const episodesExpanded =
      sessionStorage.getItem('isEpisodesExpanded') === 'true';
    const seasonsExpanded =
      sessionStorage.getItem('isSeasonsExpanded') === 'true';
    setIsEpisodesExpanded(episodesExpanded);
    setIsSeasonsExpanded(seasonsExpanded);
  }, []); // Empty dependency array ensures it runs only once on mount.

  useEffect(() => {
    setSelectedSeasonId(seasonIdParam);
  }, [seasonIdParam]);
  useEffect(() => {
    // This effect now correctly saves subsequent state changes to sessionStorage.
    sessionStorage.setItem('isEpisodesExpanded', String(isEpisodesExpanded));
  }, [isEpisodesExpanded]);
  useEffect(() => {
    sessionStorage.setItem('isSeasonsExpanded', String(isSeasonsExpanded));
  }, [isSeasonsExpanded]);

  const selectedSeason = useMemo(
    () => mediaData.seasons.find((s) => s.id === selectedSeasonId),
    [mediaData.seasons, selectedSeasonId]
  );

  const episodesContainerRef = useRef<HTMLDivElement>(null);
  const seasonsContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = seasonsContainerRef.current;
    if (!container || isSeasonsExpanded) return;
    // Updated selector to use the new 'is-active' class
    const activeSeason = container.querySelector<HTMLElement>('.is-active');
    if (activeSeason) {
      const containerWidth = container.offsetWidth;
      const elementLeft = activeSeason.offsetLeft;
      const newScrollPosition = elementLeft - containerWidth / 2;
      container.scrollTo({ left: newScrollPosition, behavior: 'smooth' });
    }
  }, [selectedSeasonId, isSeasonsExpanded]);

  useEffect(() => {
    const container = episodesContainerRef.current;
    if (!container || isEpisodesExpanded) return;
    // Updated selector to use the new 'is-active' class
    const activeEpisode = container.querySelector<HTMLElement>('.is-active');
    if (activeEpisode) {
      const containerWidth = container.offsetWidth;
      const elementLeft = activeEpisode.offsetLeft;
      const newScrollPosition = elementLeft - containerWidth / 2;
      container.scrollTo({ left: newScrollPosition, behavior: 'smooth' });
    }
  }, [episodeIdParam, selectedSeason, isEpisodesExpanded]);

  return (
    <div className="flex flex-col gap-4 text-sm font-semibold">
      {/* Sources */}
      <SourceSelector
        sources={episodeSources}
        selectedProvider={selectedProvider}
      />

      {/* Seasons */}
      <div className="flex flex-col gap-2">
        <div
          className="flex cursor-pointer gap-2 group"
          onClick={() => setIsSeasonsExpanded(!isSeasonsExpanded)}
        >
          <span className="text-base">Season</span>
          <IoGrid
            size={15}
            className={`relative top-[4px] ${
              isSeasonsExpanded ? `text-blue-400` : `group-hover:text-blue-400`
            }`}
          />
        </div>
        <div
          ref={seasonsContainerRef}
          className={`flex gap-2 flex-wrap ${
            isSeasonsExpanded
              ? ''
              : 'max-h-[15vh] overflow-y-auto scrollbar-thin'
          }`}
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
        </div>
      </div>

      {/* Episodes */}
      <div className="flex flex-col gap-2">
        <div
          className="flex cursor-pointer gap-2 group"
          onClick={() => setIsEpisodesExpanded(!isEpisodesExpanded)}
        >
          <span className="text-base">Episode</span>
          <IoGrid
            size={15}
            className={`relative top-[4px] ${
              isEpisodesExpanded ? `text-blue-400` : `group-hover:text-blue-400`
            }`}
          />
        </div>
        <div
          ref={episodesContainerRef}
          className={`flex gap-2 flex-wrap ${
            isEpisodesExpanded
              ? ''
              : 'max-h-[15vh] overflow-y-auto scrollbar-thin'
          }`}
        >
          {selectedSeason?.episodes.map((episode) => (
            <NavButton
              key={episode.id}
              href={`/tv/${tmdbId}/${selectedSeason.seasonNumber}/${episode.episodeNumber}`}
              isActive={episode.id === episodeIdParam}
              isDisabled={episode.sources.length === 0}
              className={episode.sources.length === 0 ? `line-through` : ``}
            >
              {episode.episodeNumber}
            </NavButton>
          ))}
        </div>
      </div>
    </div>
  );
}
