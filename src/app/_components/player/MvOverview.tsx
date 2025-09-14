'use client';

import { useEffect, useState } from 'react';
import type { Episode, ListMedia, Media, Season } from '~/type';
import Overview from './Overview';

interface MvOverview {
  selectedMedia: ListMedia;
}

export function MvOverview({ selectedMedia }: MvOverview) {
  const [showOverview, setShowOverview] = useState(() => {
    if (typeof window === 'undefined') return 'media';
    return sessionStorage.getItem('showOverview');
  });

  useEffect(() => {
    sessionStorage.setItem('showOverview', String(showOverview));
  }, [showOverview]);

  return (
    <div className="flex flex-col gap-1">
      {/* selectors */}
      <div className="flex w-full justify-between items-end">
        {/* title */}
        <div
          className={`cursor-pointer ${
            showOverview === 'media' ? `text-blue-400` : `hover:text-blue-400`
          }`}
          onClick={() => {
            setShowOverview(showOverview === 'media' ? null : 'media');
          }}
        >
          <span className="text-xl font-bold">{selectedMedia.media.title}</span>
        </div>
      </div>

      {/* overview */}
      {showOverview && (
        <Overview selectedMedia={selectedMedia} showOverview={showOverview} />
      )}
    </div>
  );
}
