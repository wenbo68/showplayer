'use client';

import Link from 'next/link';
import type { ListMedia } from '~/type';
import { MediaBadge } from './MediaBadge';
import { AddToUserListButton } from './AddToUserListButton';

export const tagClassMap = {
  // title: 'bg-rose-500/20 text-rose-300 ring-rose-500/30',
  format: 'bg-red-500/20 text-red-300 ring-red-500/30',
  origin: 'bg-orange-500/20 text-orange-300 ring-orange-500/30',
  genre: 'bg-amber-500/20 text-amber-300 ring-amber-500/30',
  released: 'bg-lime-500/20 text-lime-300 ring-lime-500/30',
  updated: 'bg-emerald-500/20 text-emerald-300 ring-emerald-500/30',
  avg: 'bg-sky-500/20 text-sky-300 ring-sky-500/30',
  count: 'bg-blue-500/20 text-blue-300 ring-blue-500/30',
  list: 'bg-indigo-500/20 text-indigo-300 ring-indigo-500/30',
};

interface MediaPopupProps {
  pageMediaIds: string[];
  mediaDetail: ListMedia;
  onClose: () => void;
}

export function MediaPopup({
  pageMediaIds,
  mediaDetail,
  onClose,
}: MediaPopupProps) {
  const media = mediaDetail.media;
  const isReleased = media.releaseDate
    ? new Date(media.releaseDate) <= new Date()
    : false;

  const releaseDate = media.releaseDate
    ? new Date(media.releaseDate).toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
      })
    : '';

  const updatedDate = media.updatedDate
    ? new Date(media.updatedDate).toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
      })
    : '';

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
    >
      {/* Modal Content */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-4xl rounded-lg bg-gray-800 max-h-[75vh] flex overflow-y-auto"
      >
        {/* Close Button
        <button
          onClick={onClose}
          className="absolute top-2 right-2 hover:text-gray-200 z-10"
        >
          <svg
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button> */}

        {/* Poster Image */}
        <div className="hidden sm:inline sm:w-1/3">
          <img
            src={
              `https://image.tmdb.org/t/p/w500${media.imageUrl}` ||
              '/no_image_available.webp'
            }
            alt={media.title}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Details */}
        <div className="p-6 sm:w-2/3 flex flex-col gap-5">
          <div className="flex flex-col gap-4">
            {/* Title */}
            <h2 className="text-3xl font-bold">{media.title}</h2>
            {/* Tags */}
            <div className="flex flex-col gap-2 text-xs font-medium">
              <div className="flex flex-wrap items-center gap-2">
                {/** media type */}
                <MediaBadge className={tagClassMap['format']}>
                  {media.type === 'movie' ? `Movie` : `TV`}
                </MediaBadge>
                {/* Origins */}
                {mediaDetail.origins.map((origin) => (
                  <MediaBadge key={origin} className={tagClassMap['origin']}>
                    {origin}
                  </MediaBadge>
                ))}
                {/* Genres */}
                {mediaDetail.genres.map((genre) => (
                  <MediaBadge key={genre} className={tagClassMap['genre']}>
                    {genre}
                  </MediaBadge>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {/** release date */}
                {media.releaseDate && (
                  <MediaBadge className={tagClassMap['released']}>
                    Released: {releaseDate}
                  </MediaBadge>
                )}
                {/** updated date */}
                {media.updatedDate && (
                  <MediaBadge className={tagClassMap['updated']}>
                    Updated: {updatedDate}
                  </MediaBadge>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {/** rating avg */}
                <MediaBadge className={tagClassMap['avg']}>
                  Rating Avg: {(media.voteAverage * 10).toFixed(2)}%
                </MediaBadge>
                {/** rating count */}
                <MediaBadge className={tagClassMap['count']}>
                  Rating Cnt: {media.voteCount}
                </MediaBadge>
              </div>
            </div>
          </div>

          <div className="text-base prose prose-sm max-w-none">
            {media.description ?? 'No description available.'}
          </div>

          <div className="mt-auto flex gap-3">
            {/** Add to list button */}
            <AddToUserListButton
              pageMediaIds={pageMediaIds}
              mediaId={media.id}
              listType="saved"
            />

            {/** Watch now button */}
            <Link
              href={`/${media.type}/${media.tmdbId}${
                media.type === 'movie' ? '' : '/1/1'
              }`}
              onClick={onClose} // <-- ADD THIS LINE
              className={`${
                !isReleased || media.availabilityCount <= 0
                  ? `bg-gray-700 hover:bg-gray-600`
                  : `bg-blue-600 hover:bg-blue-500 text-gray-300`
              } flex-grow flex items-center justify-center font-semibold rounded-lg`}
            >
              {!isReleased
                ? `Not Released`
                : media.availabilityCount <= 0
                ? `Not Available`
                : media.type === 'movie'
                ? `Watch Now`
                : `${media.availabilityCount}/${media.airedEpisodeCount} Episodes`}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
