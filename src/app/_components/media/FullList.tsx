'use client';

import type { ListMedia } from '~/type';
import { MediaBadge } from './MediaBadge';
import type { Dispatch, SetStateAction } from 'react';
import MediaButton from './MediaButton';

interface FullListProps {
  mediaList: ListMedia[];
  setSelectedMedia: Dispatch<SetStateAction<ListMedia | null>>;
}

export default function FullList({
  mediaList,
  setSelectedMedia,
}: FullListProps) {
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] lg:grid-cols-[repeat(auto-fit,minmax(170px,1fr))] justify-center gap-4">
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
