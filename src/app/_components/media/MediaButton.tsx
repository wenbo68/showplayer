'use client';

import { useState, useEffect } from 'react'; // Import hooks
import type { ListMedia } from '~/type';
import { MediaBadge } from './MediaBadge';
import { useMediaPopup } from '~/app/_contexts/MediaPopupContext';
import { useIsMediaInUserList } from '~/app/_hooks/userMediaListHooks';

interface MediaButtonProps {
  pageMediaIds: string[];
  mediaDetail: ListMedia;
}

export default function MediaButton({
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

  return (
    <button
      onClick={() => openPopup(pageMediaIds, mediaDetail)}
      className="flex w-full flex-col items-center gap-2 overflow-hidden text-xs md:text-sm transition group cursor-pointer"
    >
      <div className="relative w-full">
        <img
          src={
            `https://image.tmdb.org/t/p/w500${media.imageUrl}` ||
            '/no_image_available.webp'
          }
          alt={media.title}
          className="aspect-[2/3] w-full rounded object-cover"
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
          {/** is in user list? indicator */}
          {/* 3. Check for hasMounted before rendering */}
          {/* {hasMounted && isInUserList && (
            <span
              className="h-[10px] w-[10px] rounded-full bg-pink-600 inline-block"
              aria-label="In your list"
            />
          )} */}
          {/** title */}
          <span className={`leading-normal min-h-[3em] line-clamp-2`}>
            {media.title}
          </span>
        </div>
        {/* Badge logic remains the same... */}
        {/* {!isReleased ? (
          <MediaBadge className="bg-yellow-900 text-yellow-200">
            Not Released
          </MediaBadge>
        ) : mediaDetail.availabilityCount > 0 ? (
          media.type === 'movie' ? (
            <MediaBadge className="bg-green-900 text-green-200">
              Available
            </MediaBadge>
          ) : (
            <MediaBadge className="bg-blue-900 text-blue-200">
              {mediaDetail.availabilityCount}/{mediaDetail.totalEpisodeCount}{' '}
              Episodes
            </MediaBadge>
          )
        ) : (
          <MediaBadge className="bg-gray-700 text-gray-400">
            Not Available
          </MediaBadge>
        )} */}
      </div>
    </button>
  );
}
