'use client';
import { useState } from 'react';
import { api } from '~/trpc/react';
import type { TrendingMedia } from '~/type';
import { MediaPopup } from './MediaPopup';
import { MediaBadge } from './MediaBadge';

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
        <span className="animate-pulse">Loading...</span>
      </div>
    );
  }

  // when error loading cache
  if (tmdbStatus === 'error') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <span className="">Error: {tmdbError.message}</span>
      </div>
    );
  }

  const filteredTmdb =
    tmdbType === 'all' ? tmdbData : tmdbData.filter((m) => m.type === tmdbType);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">Trending Media</h2>
        {/* dropdown to select media type */}
        <div className="flex items-center">
          <select
            value={tmdbType}
            onChange={handleTmdbTypeChange}
            className="bg-gray-800 py-2 rounded"
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

      <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] lg:grid-cols-[repeat(auto-fit,minmax(200px,1fr))] justify-center gap-4 lg:gap-6">
        {filteredTmdb.map((media) => {
          // Create a flag to check if the media has been released
          const isReleased = media.releaseDate
            ? new Date(media.releaseDate) <= new Date()
            : false;

          return (
            <button
              key={media.mediaId}
              onClick={() => setSelectedMedia(media)}
              className="text-sm overflow-hidden flex flex-col group items-center transition gap-2"
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
              <div className="flex flex-col items-center gap-1">
                <span className="font-semibold group-hover:text-blue-400 transition-colors">
                  {media.title}
                </span>
                {!isReleased ? (
                  <MediaBadge className="bg-yellow-900 text-yellow-300">
                    Not Released
                  </MediaBadge>
                ) : media.availabilityCount > 0 ? (
                  media.type === 'movie' ? (
                    <MediaBadge className="bg-green-900 text-green-300">
                      Available
                    </MediaBadge>
                  ) : (
                    <MediaBadge className="bg-blue-900 text-blue-300">
                      {media.availabilityCount} Episodes
                    </MediaBadge>
                  )
                ) : (
                  <MediaBadge className="bg-gray-700 text-gray-400">
                    Not Available
                  </MediaBadge>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Conditionally render the modal outside the grid */}
      {selectedMedia && (
        <MediaPopup
          media={selectedMedia}
          onClose={() => setSelectedMedia(null)}
        />
      )}
    </div>
  );
}
