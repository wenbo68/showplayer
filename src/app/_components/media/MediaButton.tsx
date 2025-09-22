'use client';

import { useState, useEffect } from 'react'; // Import hooks
import type { ListMedia } from '~/type';
import { MediaBadge } from './MediaBadge';
import { useMediaPopup } from '~/app/_contexts/MediaPopupContext';
import { useIsMediaInUserList } from '~/app/_hooks/userMediaListHooks';
import Image from 'next/image';

interface MediaButtonProps {
  pageMediaIds: string[];
  mediaDetail: ListMedia;
  displayMode: 'grid' | 'carousel';
  isActive?: boolean;
}

export default function MediaButton({
  displayMode,
  isActive,
  pageMediaIds,
  mediaDetail,
}: MediaButtonProps) {
  const { openPopup } = useMediaPopup();
  const [hasMounted, setHasMounted] = useState(false); // 1. Add mounted state

  // 2. Set mounted to true only on the client
  useEffect(() => {
    setHasMounted(true);
  }, []);

  const media = mediaDetail.media;
  const isInUserList = useIsMediaInUserList(pageMediaIds, media.id, 'saved');

  return displayMode === 'grid' ? (
    <button
      onClick={() => openPopup(pageMediaIds, mediaDetail)}
      className="flex w-full flex-col items-center gap-2 overflow-hidden text-xs md:text-sm transition group cursor-pointer"
    >
      <div className="relative w-full aspect-[2/3]">
        <Image //must give either width+height or fill (sets image box to width and height of parent)
          src={
            `https://image.tmdb.org/t/p/w500${media.imageUrl}` ||
            'https://placehold.co/500x750/1a202c/ffffff?text=Image+Not+Found'
          }
          alt={media.title}
          fill
          className="rounded object-cover" //object-cover: make img fill img box completely + keep image aspect ratio (crop img if needed)
        />
      </div>
      <div className="flex flex-col w-full items-start text-left gap-1">
        <div
          className={`flex items-center gap-1.5 font-semibold transition-colors ${
            hasMounted && isInUserList
              ? `text-pink-400 group-hover:text-pink-300`
              : `group-hover:text-blue-400`
          }`}
        >
          {/** title */}
          <span className={`leading-normal min-h-[3em] line-clamp-2`}>
            {media.title}
          </span>
        </div>
      </div>
    </button>
  ) : (
    <button
      onClick={() => openPopup(pageMediaIds, mediaDetail)}
      className={`cursor-pointer group absolute inset-0 transition-opacity duration-300 ${
        isActive ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
    >
      <div className="flex w-full h-full">
        {/* Backdrop Image */}
        <div className="relative w-full aspect-[16/9]">
          <Image
            src={
              media.backdropUrl
                ? `https://image.tmdb.org/t/p/original${media.backdropUrl}`
                : 'https://placehold.co/780x439/1a202c/ffffff?text=Image+Not+Found'
            }
            alt={`${media.title}`}
            fill
            className="object-cover object-center"
          />
        </div>
      </div>

      {/* Top Gradient (20% height) */}
      <div className="absolute top-0 left-0 w-full h-[20%] bg-gradient-to-b from-gray-900 to-transparent" />
      {/* Bottom Gradient (20% height) */}
      <div className="absolute bottom-0 left-0 w-full h-[30%] bg-gradient-to-t from-gray-900 to-transparent" />
      {/* Content */}
      <div
        className={`px-2 py-1 absolute bottom-0 left-0 w-1/2 text-start text-gray-300 ${
          hasMounted && isInUserList
            ? `text-pink-400 group-hover:text-pink-300`
            : `group-hover:text-blue-400`
        }`}
      >
        <h2 className="text-sm md:text-base font-bold leading-normal">
          {media.title}
        </h2>
      </div>
    </button>
  );
}
