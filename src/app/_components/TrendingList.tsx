'use client';
import Link from 'next/link';
import { useState } from 'react';
import { api } from '~/trpc/react';

export default function TrendingList() {
  // fetch from client side cache
  const {
    data: tmdbData,
    status: tmdbStatus,
    error: tmdbError,
  } = api.media.tmdbTrendingWithDetails.useQuery();

  // create component states
  const [tmdbType, setTmdbType] = useState<string>('all');

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
        <span className="animate-pulse text-neutral-800 dark:text-neutral-100">
          Loading...
        </span>
      </div>
    );
  }

  // when error loading cache
  if (tmdbStatus === 'error') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <span className="text-neutral-500 dark:text-neutral-400">
          Error: {tmdbError.message}
        </span>
      </div>
    );
  }

  const filteredTmdb =
    tmdbType === 'all' ? tmdbData : tmdbData.filter((m) => m.type === tmdbType);

  return (
    <div className="p-4 sm:p-6">
      <div className="flex">
        <h2 className="text-2xl font-bold mb-4 text-center">Trending Media</h2>
        <div className="flex justify-center mb-6">
          <select
            value={tmdbType}
            onChange={handleTmdbTypeChange}
            className="border px-4 py-2 rounded"
          >
            <option value="all">all</option>
            {tmdbTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {filteredTmdb.map((media) => (
          <Link
            href={`${`/${media.type}/${media.tmdbId}${
              media.type === 'movie' ? `` : `/1/1`
            }`}`}
            key={media.mediaId}
            className="border rounded-lg overflow-hidden shadow-lg flex flex-col"
          >
            <div>
              <div className="flex-shrink-0">
                <img
                  src={
                    `https://image.tmdb.org/t/p/w500${media.imageUrl}` ||
                    '/no_image_available.webp'
                  }
                  alt={media.title}
                  className="w-full aspect-[2/3] object-cover"
                />
              </div>
              <div className="p-4 flex flex-col flex-grow">
                <h3 className="text-lg font-semibold mb-2">{media.title}</h3>
                <div
                  className="text-sm text-gray-600 prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: media.description ?? '' }}
                />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
