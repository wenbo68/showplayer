// src/app/_components/MediaList.tsx
'use client';

import { useState } from 'react';
import type { ListMedia } from '~/type';
import { MediaPopup } from './MediaPopup';
import Link from 'next/link';
import { api } from '~/trpc/react';
import PreviewList from './PreviewList';
import FullList from './FullList';

interface MediaListProps {
  viewMode: 'preview' | 'full';
  mediaList: ListMedia[];
}

export default function MediaList({ viewMode, mediaList }: MediaListProps) {
  // create component states
  const [selectedMedia, setSelectedMedia] = useState<ListMedia | null>(null);

  // Take only the top 20 items for the preview row
  const previewItems = mediaList.slice(0, 20);

  return (
    <>
      {viewMode === 'preview' ? (
        <PreviewList
          mediaList={previewItems}
          setSelectedMedia={setSelectedMedia}
        />
      ) : (
        <FullList mediaList={mediaList} setSelectedMedia={setSelectedMedia} />
      )}
      {/* Conditionally render the modal */}
      {selectedMedia && (
        <MediaPopup
          mediaParam={selectedMedia}
          onClose={() => setSelectedMedia(null)}
        />
      )}
    </>
  );
}
