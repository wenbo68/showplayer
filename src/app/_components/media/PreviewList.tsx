'use client';

import type { ListMedia } from '~/type';
import { MediaBadge } from './MediaBadge';
import type { Dispatch, SetStateAction } from 'react';
import MediaButton from './MediaButton';
import Link from 'next/link';

interface PreviewListProps {
  mediaList: ListMedia[];
  setSelectedMedia: Dispatch<SetStateAction<ListMedia | null>>;
  label?: string;
  link?: string;
}

export default function PreviewList({
  mediaList,
  setSelectedMedia,
  label,
  link,
}: PreviewListProps) {
  return (
    <div className={`${label && link ? `w-full flex flex-col gap-3` : ``}`}>
      {label && link && (
        <div className="flex items-end justify-between">
          <span className="font-bold">{label}</span>
          <Link
            href={link}
            className="rounded-lg text-gray-500 text-xs font-semibold transition hover:text-blue-500"
          >
            View All
          </Link>
        </div>
      )}
      <div className="flex gap-4 overflow-x-auto scrollbar-hide">
        {mediaList.map((mediaDetail) => {
          return (
            <div
              key={mediaDetail.media.id}
              className="flex-shrink-0 w-[160px] lg:w-[200px]"
            >
              <MediaButton
                mediaDetail={mediaDetail}
                setSelectedMedia={setSelectedMedia}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
