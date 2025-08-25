// components/episode-list.tsx
'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Season, Episode, Media, Source } from '~/type';
import { SourceSelector } from './SourceSelector';
import {
  MdOutlineKeyboardArrowDown,
  MdOutlineKeyboardArrowLeft,
} from 'react-icons/md';

interface TvSelector {
  tmdbId: number;
  mediaData: Media & {
    seasons: (Season & {
      episodes: (Episode & {
        sources: Source[];
      })[];
    })[];
  };
  episodeSources: Source[];
  selectedProvider?: string;
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
}: TvSelector) {
  const [selectedSeasonId, setSelectedSeasonId] = useState(seasonIdParam);
  const [isEpisodesExpanded, setIsEpisodesExpanded] = useState(() => {
    if (typeof window === 'undefined') return false;
    return sessionStorage.getItem('isEpisodesExpanded') === 'true';
  });
  const [isSeasonsExpanded, setIsSeasonsExpanded] = useState(() => {
    if (typeof window === 'undefined') return false;
    return sessionStorage.getItem('isSeasonsExpanded') === 'true';
  });

  useEffect(() => {
    setSelectedSeasonId(seasonIdParam);
  }, [seasonIdParam]);
  useEffect(() => {
    sessionStorage.setItem('isEpisodesExpanded', String(isEpisodesExpanded));
  }, [isEpisodesExpanded]);
  useEffect(() => {
    sessionStorage.setItem('isSeasonsExpanded', String(isSeasonsExpanded));
  }, [isSeasonsExpanded]);

  // useMemo caches the result, so it only re-calculates when dependencies change.
  const selectedSeason = useMemo(
    () => mediaData.seasons.find((s) => s.id === selectedSeasonId),
    [mediaData.seasons, selectedSeasonId]
  );

  // --- 1. Create refs for the scrollable containers ---
  const episodesContainerRef = useRef<HTMLDivElement>(null);
  const seasonsContainerRef = useRef<HTMLDivElement>(null);

  // --- 2. useEffect to scroll the active season into view ---
  useEffect(() => {
    const container = seasonsContainerRef.current;
    if (!container || isSeasonsExpanded) return;

    const activeSeason = container.querySelector<HTMLElement>(
      '[data-active="true"]'
    );
    if (activeSeason) {
      const containerWidth = container.offsetWidth;
      const elementLeft = activeSeason.offsetLeft;
      const newScrollPosition = elementLeft - containerWidth / 2;

      // Apply the scroll only to the horizontal container
      container.scrollTo({
        left: newScrollPosition,
        behavior: 'smooth',
      });
    }
  }, [selectedSeasonId, isSeasonsExpanded]); // Reruns when the selected season changes

  // --- 3. useEffect to scroll the active episode into view ---
  useEffect(() => {
    const container = episodesContainerRef.current;
    if (!container || isEpisodesExpanded) return;

    const activeEpisode = container.querySelector<HTMLElement>(
      '[data-active="true"]'
    );
    if (activeEpisode) {
      const containerWidth = container.offsetWidth;
      const elementLeft = activeEpisode.offsetLeft;
      const newScrollPosition = elementLeft - containerWidth / 2;

      // Apply the scroll only to the horizontal container
      container.scrollTo({
        left: newScrollPosition,
        behavior: 'smooth',
      });
    }
  }, [episodeIdParam, selectedSeason, isEpisodesExpanded]); // Reruns when the page/episode or season changes

  return (
    <div className="flex flex-col gap-2">
      {/* Sources */}
      <SourceSelector
        sources={episodeSources}
        selectedProvider={selectedProvider}
      />

      {/* Seasons */}
      <div className="flex flex-col gap-0">
        <div
          className="flex cursor-pointer"
          onClick={() => setIsSeasonsExpanded(!isSeasonsExpanded)}
        >
          <span className="font-semibold">Seasons</span>
          {isSeasonsExpanded ? (
            <MdOutlineKeyboardArrowDown className="relative top-[3px] left-[1px]" />
          ) : (
            <MdOutlineKeyboardArrowLeft className="relative top-[3px] left-[1px]" />
          )}
        </div>
        <div
          ref={seasonsContainerRef}
          className={`flex gap-2 ${
            isSeasonsExpanded ? 'flex-wrap' : 'overflow-x-auto scrollbar-hide'
          }`}
        >
          {mediaData.seasons.map((season) => (
            <button
              key={season.id}
              onClick={() => setSelectedSeasonId(season.id)}
              data-active={season.id === selectedSeasonId}
              className={`${
                season.id === selectedSeasonId
                  ? `bg-gray-800`
                  : `hover:bg-gray-800`
              } py-2 rounded w-10 text-center shrink-0 text-sm`}
            >
              {season.seasonNumber}
            </button>
          ))}
        </div>
      </div>

      {/* Episodes */}
      <div className="flex flex-col gap-0">
        <div
          className="flex cursor-pointer"
          onClick={() => setIsEpisodesExpanded(!isEpisodesExpanded)}
        >
          <span className="font-semibold">Episodes</span>
          {isEpisodesExpanded ? (
            <MdOutlineKeyboardArrowDown className="relative top-[3px] left-[1px]" />
          ) : (
            <MdOutlineKeyboardArrowLeft className="relative top-[3px] left-[1px]" />
          )}
        </div>
        <div
          ref={episodesContainerRef}
          className={`flex gap-2 ${
            isEpisodesExpanded ? 'flex-wrap' : 'overflow-x-auto scrollbar-hide'
          }`}
        >
          {selectedSeason?.episodes.map((episode) => (
            <Link
              key={episode.id}
              href={`/tv/${tmdbId}/${selectedSeason.seasonNumber}/${episode.episodeNumber}`}
              data-active={episode.id === episodeIdParam}
              className={`${
                episode.id === episodeIdParam
                  ? `bg-gray-800`
                  : `hover:bg-gray-800`
              } ${
                episode.sources.length === 0 ? `line-through text-gray-600` : ``
              } py-2 rounded w-10 text-center shrink-0 block text-sm`}
            >
              {episode.episodeNumber}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
