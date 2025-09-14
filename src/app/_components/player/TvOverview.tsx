'use client';

import { useEffect, useState } from 'react';
import { IoIosArrowDown } from 'react-icons/io';
import type { Episode, ListMedia, Media, Season } from '~/type';
import Overview from './Overview';

interface TvOverview {
  selectedMedia: ListMedia;
  selectedSeason: Season;
  selectedEpisode: Episode;
}

export function TvOverview({
  selectedMedia,
  selectedSeason,
  selectedEpisode,
}: TvOverview) {
  const [showOverview, setShowOverview] = useState(() => {
    if (typeof window === 'undefined') return 'media';
    return sessionStorage.getItem('showOverview');
  });

  useEffect(() => {
    sessionStorage.setItem('showOverview', String(showOverview));
  }, [showOverview]);

  return (
    <div className="flex flex-col gap-3">
      {/* selectors */}
      <div className="flex w-full justify-between items-end gap-6">
        {/* media title */}
        <div
          className={`flex gap-2 cursor-pointer items-center justify-center ${
            showOverview === 'media' ? `text-blue-400` : `hover:text-blue-400`
          }`}
          onClick={() => {
            setShowOverview(showOverview === 'media' ? null : 'media');
          }}
        >
          <div className="text-xl font-bold">{selectedMedia.media.title}</div>
          {/* <div className="">
            <IoIosArrowDown size={20} />
          </div> */}
        </div>
        <div className="flex gap-2">
          {/* season */}
          <div
            className={`flex gap-1 cursor-pointer items-center ${
              showOverview === 'season'
                ? `text-blue-400`
                : `hover:text-blue-400`
            }`}
            onClick={() => {
              setShowOverview(showOverview === 'season' ? null : 'season');
            }}
          >
            <span className="text-xl font-bold">
              S{selectedSeason.seasonNumber}
            </span>
            <div className="">
              <IoIosArrowDown size={20} />
            </div>
          </div>
          {/* episode */}
          <div
            className={`flex gap-1 cursor-pointer items-center ${
              showOverview === 'episode'
                ? `text-blue-400`
                : `hover:text-blue-400`
            }`}
            onClick={() => {
              setShowOverview(showOverview === 'episode' ? null : 'episode');
            }}
          >
            <span className="text-xl font-bold">
              E{selectedEpisode.episodeNumber}
            </span>
            <div className="">
              <IoIosArrowDown size={20} />
            </div>
          </div>
        </div>
      </div>

      {/* overview */}
      {showOverview && (
        <Overview
          selectedMedia={selectedMedia}
          selectedSeason={selectedSeason}
          selectedEpisode={selectedEpisode}
          showOverview={showOverview}
        />
      )}
    </div>
  );
}
