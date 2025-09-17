'use client';

import { useEffect, useState } from 'react';
import { IoIosArrowDown } from 'react-icons/io';
import type { Episode, ListMedia, Season } from '~/type';
import Overview from './Overview';

interface OverviewSelectorProps {
  selectedMedia: ListMedia;
  // Make season and episode optional
  selectedSeason?: Season;
  selectedEpisode?: Episode;
}

export function OverviewSelector({
  selectedMedia,
  selectedSeason,
  selectedEpisode,
}: OverviewSelectorProps) {
  const [showOverview, setShowOverview] = useState<string | null>(() => {
    if (typeof window === 'undefined') return 'media';
    return sessionStorage.getItem('showOverview') ?? 'media';
  });

  // Handle the null case explicitly to avoid storing the string "null".
  useEffect(() => {
    if (showOverview === null) {
      sessionStorage.removeItem('showOverview');
    } else {
      // Since showOverview is now guaranteed to be a string, we don't need String()
      sessionStorage.setItem('showOverview', showOverview);
    }
  }, [showOverview]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex w-full justify-between items-end gap-6">
        {/* Title (always shown) */}
        <div
          className={`flex gap-2 cursor-pointer items-center justify-center ${
            showOverview === 'media' ? `text-blue-400` : `hover:text-blue-400`
          }`}
          onClick={() =>
            setShowOverview(showOverview === 'media' ? null : 'media')
          }
        >
          <div className="text-xl font-bold">{selectedMedia.media.title}</div>
        </div>

        {/* Season and Episode (conditionally shown for TV) */}
        {selectedSeason && selectedEpisode && (
          <div className="flex gap-2">
            <div
              className={`flex gap-1 cursor-pointer items-center ${
                showOverview === 'season'
                  ? `text-blue-400`
                  : `hover:text-blue-400`
              }`}
              onClick={() =>
                setShowOverview(showOverview === 'season' ? null : 'season')
              }
            >
              <span className="text-xl font-bold">
                S{selectedSeason.seasonNumber}
              </span>
              <div>
                <IoIosArrowDown size={20} />
              </div>
            </div>
            <div
              className={`flex gap-1 cursor-pointer items-center ${
                showOverview === 'episode'
                  ? `text-blue-400`
                  : `hover:text-blue-400`
              }`}
              onClick={() =>
                setShowOverview(showOverview === 'episode' ? null : 'episode')
              }
            >
              <span className="text-xl font-bold">
                E{selectedEpisode.episodeNumber}
              </span>
              <div>
                <IoIosArrowDown size={20} />
              </div>
            </div>
          </div>
        )}
      </div>

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
