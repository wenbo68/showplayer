// src/app/_components/MediaList.tsx
'use client';

import { useState } from 'react';
import type { ListMedia } from '~/type';
import { MediaPopup } from './MediaPopup';
import Link from 'next/link';
import { api } from '~/trpc/react';
import PreviewList from './PreviewList';
import FullList from './FullList';
import MediaList from './MediaList';

interface MediaListProps {
  viewMode: 'preview' | 'full';
  mediaType: 'trending' | 'top mv' | 'top tv';
}

export default function RankedList({ viewMode, mediaType }: MediaListProps) {
  // fetch from client side cache
  const {
    data: tmdbData,
    status: tmdbStatus,
    error: tmdbError,
  } = mediaType === 'top mv'
    ? api.media.tmdbTopRatedMv.useQuery()
    : mediaType === 'top tv'
    ? api.media.tmdbTopRatedTv.useQuery()
    : api.media.tmdbTrending.useQuery();

  // when loading cache
  if (tmdbStatus === 'pending') {
    return (
      <div className="flex h-64 items-center justify-center">
        <span className="animate-pulse">Loading...</span>
      </div>
    );
  }

  // when error loading cache
  if (tmdbStatus === 'error') {
    return (
      <div className="flex h-64 items-center justify-center">
        <span className="">Error: {tmdbError.message}</span>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-3">
      <div className="flex items-end justify-between">
        <h2 className="text-lg font-bold">
          {mediaType === 'top mv'
            ? `Top Movies`
            : mediaType === 'top tv'
            ? `Top Shows`
            : `Trending Now`}
        </h2>
        {viewMode === 'preview' && (
          <Link
            href={
              mediaType === 'top mv'
                ? `/top/movie`
                : mediaType === 'top tv'
                ? `/top/tv`
                : `/trending`
            }
            className="rounded-lg text-gray-500 text-xs font-semibold transition hover:text-blue-500"
          >
            View All
          </Link>
        )}
      </div>

      <MediaList viewMode={viewMode} mediaList={tmdbData} />
    </div>
  );
}
