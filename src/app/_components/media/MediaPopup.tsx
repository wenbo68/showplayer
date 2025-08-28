// components/MediaModal.tsx
import Link from 'next/link';
import type { ListMedia } from '~/type';
import { MediaBadge } from './MediaBadge';

export function MediaPopup({
  mediaParam,
  onClose,
}: {
  mediaParam: ListMedia;
  onClose: () => void;
}) {
  const media = mediaParam.media;
  const isReleased = media.releaseDate
    ? new Date(media.releaseDate) <= new Date()
    : false;

  return (
    // Backdrop
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
    >
      {/* Modal Content */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-3xl rounded-lg bg-gray-800 max-h-[75vh] flex overflow-y-auto"
      >
        {/* Close Button */}
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
        </button>

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
          <div className="flex flex-col gap-2">
            {/* Title */}
            <h2 className="text-3xl font-bold">{media.title}</h2>
            {/* Tags */}
            <div className="flex flex-wrap items-center text-xs font-medium gap-2">
              {media.releaseDate && (
                <MediaBadge className="bg-gray-700">
                  {new Date(media.releaseDate).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'numeric',
                    day: 'numeric',
                  })}
                </MediaBadge>
              )}
              <MediaBadge className="bg-gray-700">
                {media.type === 'movie' ? `Movie` : `TV`}
              </MediaBadge>
              {/* Origins */}
              {mediaParam.origins.map((origins) => (
                <MediaBadge key={origins} className="bg-gray-700">
                  {origins}
                </MediaBadge>
              ))}
              {/* Genres */}
              {mediaParam.genres.map((genre) => (
                <MediaBadge key={genre} className="bg-gray-700">
                  {genre}
                </MediaBadge>
              ))}
            </div>
          </div>

          <div
            className="text-base prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{
              __html: media.description ?? 'No description available.',
            }}
          />

          {/* Action Button */}
          <div className="mt-auto">
            <Link
              href={`/${media.type}/${media.tmdbId}${
                media.type === 'movie' ? '' : '/1/1'
              }`}
              className={`${
                !isReleased || mediaParam.availabilityCount <= 0
                  ? `bg-gray-700 hover:bg-gray-600`
                  : `bg-blue-600 hover:bg-blue-500 text-gray-100`
              } inline-block w-full text-center px-6 py-3 font-semibold rounded-lg`}
            >
              {!isReleased
                ? `Not Released`
                : mediaParam.availabilityCount <= 0
                ? `Not Available`
                : media.type === 'movie'
                ? `Watch Now`
                : `${mediaParam.availabilityCount}/${mediaParam.totalEpisodeCount} Episodes`}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
