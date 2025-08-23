'use client';
import { useState } from 'react';
import { api } from '~/trpc/react';
import type { TrendingMedia } from '~/type';
import { MediaModal } from './MediaModal';

// Helper component for a clean badge
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

export default function TrendingList() {
  // fetch from client side cache
  const {
    data: tmdbData,
    status: tmdbStatus,
    error: tmdbError,
  } = api.media.tmdbTrendingWithDetails.useQuery();

  // create component states
  const [tmdbType, setTmdbType] = useState<string>('all');
  const [selectedMedia, setSelectedMedia] = useState<TrendingMedia | null>(
    null
  );

  // create component functions
  const handleTmdbTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setTmdbType(e.target.value);
  };

  // create component constants
  const tmdbTypes = ['movie', 'tv'];

  // when loading cache
  if (tmdbStatus === 'pending') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <span className="animate-pulse text-gray-800 dark:text-gray-300">
          Loading...
        </span>
      </div>
    );
  }

  // when error loading cache
  if (tmdbStatus === 'error') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <span className="text-gray-500 dark:text-gray-400">
          Error: {tmdbError.message}
        </span>
      </div>
    );
  }

  const filteredTmdb =
    tmdbType === 'all' ? tmdbData : tmdbData.filter((m) => m.type === tmdbType);

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-300">
          Trending Media
        </h2>
        {/* dropdown to select media type */}
        <div className="flex items-center">
          <select
            value={tmdbType}
            onChange={handleTmdbTypeChange}
            className="border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-300 px-4 py-2 rounded"
          >
            <option value="all">All</option>
            {tmdbTypes.map((type) => (
              <option key={type} value={type}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {filteredTmdb.map((media) => {
          // Create a flag to check if the media has been released
          const isReleased = media.releaseDate
            ? new Date(media.releaseDate) <= new Date()
            : false;

          return (
            <button
              key={media.mediaId}
              onClick={() => setSelectedMedia(media)}
              className="border-gray-300 dark:border-gray-700 overflow-hidden flex flex-col group text-left transition"
            >
              <div className="relative">
                <img
                  src={
                    `https://image.tmdb.org/t/p/w500${media.imageUrl}` ||
                    '/no_image_available.webp'
                  }
                  alt={media.title}
                  className="w-full aspect-[2/3] object-cover rounded-lg"
                />
              </div>
              <div className="p-4 flex flex-col flex-grow">
                <h3 className="text-lg font-semibold mb-2 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors text-gray-900 dark:text-gray-300">
                  {media.title}
                </h3>

                {/* Kept metadata on the card for scannability */}
                <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  {/* {media.releaseDate && (
                    <span>
                      🗓️{' '}
                      {new Date(media.releaseDate).toLocaleDateString(
                        undefined,
                        { year: 'numeric', month: 'numeric', day: 'numeric' }
                      )}
                    </span>
                  )} */}
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
                      <Badge className="bg-gray-300 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                        🚫 No Source
                      </Badge>
                    )
                  ) : (
                    <Badge
                      className={
                        media.availabilityCount > 0
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                          : 'bg-gray-300 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                      }
                    >
                      📺 {media.availabilityCount} Episodes
                    </Badge>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Conditionally render the modal outside the grid */}
      {selectedMedia && (
        <MediaModal
          media={selectedMedia}
          onClose={() => setSelectedMedia(null)}
        />
      )}
    </div>
  );
}
