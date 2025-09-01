'use client';

import type { ListMedia } from '~/type';
import { MediaBadge } from './MediaBadge';
import type { Dispatch, SetStateAction } from 'react';
import MediaButton from './MediaButton';

interface FullListProps {
  mediaList: ListMedia[];
  setSelectedMedia: Dispatch<SetStateAction<ListMedia | null>>;
  label?: string;
}

export default function FullList({
  mediaList,
  setSelectedMedia,
  label,
}: FullListProps) {
  return (
    <div className="w-full grid grid-cols-[repeat(auto-fit,minmax(160px,160px))] lg:grid-cols-[repeat(auto-fit,minmax(200px,200px))] justify-center gap-4">
      {label && <span className="col-span-full font-bold">{label}</span>}
      {mediaList.map((mediaDetail) => {
        return (
          <MediaButton
            key={mediaDetail.media.id}
            mediaDetail={mediaDetail}
            setSelectedMedia={setSelectedMedia}
          />
        );
      })}
    </div>
  );
}
