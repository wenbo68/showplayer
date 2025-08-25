'use client';

import { useEffect, useState } from 'react';
import {
  MdOutlineKeyboardArrowDown,
  MdOutlineKeyboardArrowLeft,
} from 'react-icons/md';
import type { Episode, Media, Season } from '~/type';

interface MvOverview {
  selectedMedia: Media;
}

export function MvOverview({ selectedMedia }: MvOverview) {
  const [showMediaOverview, setShowMediaOverview] = useState(() => {
    if (typeof window === 'undefined') return false;
    return sessionStorage.getItem('showMediaOverview') === 'true';
  });

  useEffect(() => {
    sessionStorage.setItem('showMediaOverview', String(showMediaOverview));
  }, [showMediaOverview]);

  return (
    <div className="flex flex-col gap-1">
      {/* selectors */}
      <div className="flex w-full justify-between items-end">
        {/* title */}
        <div
          className="flex cursor-pointer"
          onClick={() => {
            setShowMediaOverview(!showMediaOverview);
          }}
        >
          <span className="text-2xl font-bold">{selectedMedia.title}</span>
          {showMediaOverview ? (
            <MdOutlineKeyboardArrowDown className="relative top-[8px] left-[1px]" />
          ) : (
            <MdOutlineKeyboardArrowLeft className="relative top-[8px] left-[1px]" />
          )}
        </div>
      </div>

      {/* overview */}
      {showMediaOverview && selectedMedia.description && (
        <div className={`overflow-hidden text-gray-400 text-center`}>
          <p className="text-sm">{selectedMedia.description}</p>
        </div>
      )}
    </div>
  );
}
