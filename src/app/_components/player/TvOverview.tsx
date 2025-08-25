'use client';

import { useEffect, useState } from 'react';
import {
  MdOutlineKeyboardArrowDown,
  MdOutlineKeyboardArrowLeft,
} from 'react-icons/md';
import type { Episode, Media, Season } from '~/type';

interface TvOverview {
  selectedMedia: Media;
  selectedSeason: Season;
  selectedEpisode: Episode;
}

export function TvOverview({
  selectedMedia,
  selectedSeason,
  selectedEpisode,
}: TvOverview) {
  const [showMediaOverview, setShowMediaOverview] = useState(() => {
    if (typeof window === 'undefined') return false;
    return sessionStorage.getItem('showMediaOverview') === 'true';
  });
  const [showSeasonOverview, setShowSeasonOverview] = useState(() => {
    if (typeof window === 'undefined') return false;
    return sessionStorage.getItem('showSeasonOverview') === 'true';
  });
  const [showEpisodeOverview, setShowEpisodeOverview] = useState(() => {
    if (typeof window === 'undefined') return false;
    return sessionStorage.getItem('showEpisodeOverview') === 'true';
  });

  useEffect(() => {
    sessionStorage.setItem('showMediaOverview', String(showMediaOverview));
  }, [showMediaOverview]);
  useEffect(() => {
    sessionStorage.setItem('showSeasonOverview', String(showSeasonOverview));
  }, [showSeasonOverview]);
  useEffect(() => {
    sessionStorage.setItem('showEpisodeOverview', String(showEpisodeOverview));
  }, [showEpisodeOverview]);

  const isAnyOverviewVisible =
    showMediaOverview || showSeasonOverview || showEpisodeOverview;

  return (
    <div className="flex flex-col gap-1">
      {/* selectors */}
      <div className="flex w-full justify-between items-end">
        {/* title */}
        <div
          className="flex cursor-pointer"
          onClick={() => {
            setShowMediaOverview(!showMediaOverview);
            setShowSeasonOverview(false);
            setShowEpisodeOverview(false);
          }}
        >
          <span className="text-2xl font-bold">{selectedMedia.title}</span>
          {showMediaOverview ? (
            <MdOutlineKeyboardArrowDown className="relative top-[8px] left-[1px]" />
          ) : (
            <MdOutlineKeyboardArrowLeft className="relative top-[8px] left-[1px]" />
          )}
        </div>
        <div className="flex gap-1">
          {/* season */}
          <div
            className="flex cursor-pointer"
            onClick={() => {
              setShowMediaOverview(false);
              setShowSeasonOverview(!showSeasonOverview);
              setShowEpisodeOverview(false);
            }}
          >
            <span className="text-xl font-bold">
              S{selectedSeason.seasonNumber}
            </span>
            {showSeasonOverview ? (
              <MdOutlineKeyboardArrowDown className="relative top-[6px] left-[1px]" />
            ) : (
              <MdOutlineKeyboardArrowLeft className="relative top-[6px] left-[1px]" />
            )}
          </div>
          {/* episode */}
          <div
            className="flex cursor-pointer"
            onClick={() => {
              setShowMediaOverview(false);
              setShowSeasonOverview(false);
              setShowEpisodeOverview(!showEpisodeOverview);
            }}
          >
            <span className="text-xl font-bold">
              E{selectedEpisode.episodeNumber}
            </span>
            {showEpisodeOverview ? (
              <MdOutlineKeyboardArrowDown className="relative top-[6px] left-[1px]" />
            ) : (
              <MdOutlineKeyboardArrowLeft className="relative top-[6px] left-[1px]" />
            )}
          </div>
        </div>
      </div>

      {/* overview */}
      {isAnyOverviewVisible && (
        <div className={`overflow-hidden text-gray-400 text-center`}>
          {/* Conditionally render the correct overview text */}
          {showMediaOverview && selectedMedia.description && (
            <p className="text-sm">{selectedMedia.description}</p>
          )}
          {showSeasonOverview && (
            <>
              {selectedSeason.title && (
                <p className="font-bold">{selectedSeason.title}</p>
              )}
              {selectedSeason.description && (
                <p className="text-sm">{selectedSeason.description}</p>
              )}
            </>
          )}
          {showEpisodeOverview && (
            <>
              {selectedEpisode.title && (
                <p className="font-bold">{selectedEpisode.title}</p>
              )}
              {selectedEpisode.description && (
                <p className="text-sm">{selectedEpisode.description}</p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
