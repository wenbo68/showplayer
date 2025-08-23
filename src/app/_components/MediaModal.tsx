// components/MediaModal.tsx
import Link from 'next/link';
import type { TrendingMedia } from '~/type';

const Badge = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <span
    className={`inline-block text-xs font-medium px-2.5 py-0.5 rounded-full ${className}`}
  >
    {children}
  </span>
);

export function MediaModal({
  media,
  onClose,
}: {
  media: TrendingMedia;
  onClose: () => void;
}) {
  const isReleased = media.releaseDate
    ? new Date(media.releaseDate) <= new Date()
    : false;

  return (
    // Backdrop
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4"
    >
      {/* Modal Content */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-3xl rounded-lg bg-white dark:bg-gray-800 shadow-xl flex flex-col max-h-[90vh]"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 z-10"
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

        {/* Scrollable Container */}
        <div className="flex flex-col md:flex-row overflow-y-auto">
          {/* Poster Image */}
          <div className="hidden md:inline md:w-1/3 flex-shrink-0">
            <img
              src={
                `https://image.tmdb.org/t/p/w500${media.imageUrl}` ||
                '/no_image_available.webp'
              }
              alt={media.title}
              className="w-full h-auto object-cover md:h-full rounded-t-lg md:rounded-l-lg md:rounded-t-none"
            />
          </div>

          {/* Details */}
          <div className="p-6 md:w-2/3 flex flex-col">
            <h2 className="text-3xl font-bold mb-2 text-gray-900 dark:text-gray-300">
              {media.title}
            </h2>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-4 text-sm text-gray-600 dark:text-gray-400">
              {media.releaseDate && (
                <span>
                  🗓️{' '}
                  {new Date(media.releaseDate).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'numeric',
                    day: 'numeric',
                  })}
                </span>
              )}

              {!isReleased ? (
                <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                  ⏳ Not Released
                </Badge>
              ) : media.type === 'movie' ? (
                media.availabilityCount > 0 ? (
                  <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                    ✅ Watchable
                  </Badge>
                ) : (
                  <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                    🚫 No Source
                  </Badge>
                )
              ) : (
                <Badge
                  className={
                    media.availabilityCount > 0
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                  }
                >
                  📺 {media.availabilityCount} Episodes
                </Badge>
              )}
            </div>

            <div
              className="text-base text-gray-700 dark:text-gray-400 mb-6 prose prose-sm max-w-none"
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
                className="inline-block w-full text-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors"
              >
                {media.type === 'movie' ? 'Watch Now' : 'View Episodes'}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
