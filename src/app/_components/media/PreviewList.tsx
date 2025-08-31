'use client';

import type { ListMedia } from '~/type';
import { MediaBadge } from './MediaBadge';
import type { Dispatch, SetStateAction } from 'react';
import MediaButton from './MediaButton';

interface PreviewListProps {
  mediaList: ListMedia[];
  setSelectedMedia: Dispatch<SetStateAction<ListMedia | null>>;
}

export default function PreviewList({
  mediaList,
  setSelectedMedia,
}: PreviewListProps) {
  return (
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
  );
}
