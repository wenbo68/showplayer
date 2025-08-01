'use client';
import { useState } from 'react';
import { api } from '~/trpc/react';

export default function TrendingList() {
  // fetch from client side cache
  const {
    data: tmdbData,
    status: tmdbStatus,
    error: tmdbError,
  } = api.media.tmdbTrending.useQuery();
  // const {
  //   data: anilistData,
  //   status: anilistStatus,
  //   error: anilistError,
  // } = api.media.anilistTrending.useQuery();

  // create component states
  // const [selectedType, setSelectedType] = useState<string>('all');
  const [tmdbType, setTmdbType] = useState<string>('all');
  // const [anilistType, setAnilistType] = useState<string>('all');

  // create component functions
  const handleTmdbTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setTmdbType(e.target.value);
  };
  // const handleAnilistTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
  //   setAnilistType(e.target.value);
  // };

  // Helper function to clean up the description
  // It replaces <br> tags with spaces for a cleaner look in a clamped paragraph
  // and removes other potential HTML tags.
  const createSanitizedSnippet = (htmlString: string) => {
    if (!htmlString) return '';
    // Replace <br> tags with a space, then strip any other tags
    const snippet = htmlString
      .replace(/<br\s*\/?>/gi, ' ')
      .replace(/<[^>]*>/g, '');
    return snippet;
  };

  // create component constants
  const tmdbTypes = ['movie', 'tv'];
  const anilistTypes = ['TV', 'TV_SHORT', 'MOVIE', 'SPECIAL', 'OVA', 'ONA'];

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

  // // when loading cache
  // if (anilistStatus === 'pending') {
  //   return (
  //     <div className="flex min-h-screen items-center justify-center">
  //       <span className="animate-pulse text-neutral-800 dark:text-neutral-100">
  //         Loading...
  //       </span>
  //     </div>
  //   );
  // }

  // // when error loading cache
  // if (anilistStatus === 'error') {
  //   return (
  //     <div className="flex min-h-screen items-center justify-center">
  //       <span className="text-neutral-500 dark:text-neutral-400">
  //         Error: {anilistError.message}
  //       </span>
  //     </div>
  //   );
  // }

  const filteredTmdb =
    tmdbType === 'all' ? tmdbData : tmdbData.filter((m) => m.type === tmdbType);

  // const filteredAnilist =
  //   anilistType === 'all'
  //     ? anilistData
  //     : anilistData.filter((m) => m.type === anilistType);

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
          <div
            key={media.mediaId} // Assuming 'id' is the unique key from your data
            className="border rounded-lg overflow-hidden shadow-lg flex flex-col"
          >
            <div className="flex-shrink-0">
              <img
                src={media.imageUrl || '/no_image_available.webp'}
                alt={media.title}
                className="w-full h-auto object-cover"
              />
            </div>
            <div className="p-4 flex flex-col flex-grow">
              <h3 className="text-lg font-semibold mb-2">{media.title}</h3>
              {/* Use the dangerouslySetInnerHTML prop */}
              <div
                className="text-sm text-gray-600 prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: media.description ?? '' }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* <div className="flex">
        <h2 className="text-2xl font-bold mt-8 mb-4 text-center">
          Trending Animes
        </h2>
        <div className="flex justify-center mb-6">
          <select
            value={anilistType}
            onChange={handleAnilistTypeChange}
            className="border px-4 py-2 rounded"
          >
            <option value="all">all</option>
            {anilistTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
      </div> */}

      {/* <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {filteredAnilist.map((media) => (
          <div
            key={media.mediaId} // Assuming 'id' is the unique key from your data
            className="border rounded-lg overflow-hidden shadow-lg flex flex-col"
          >
            <div className="aspect-[2/3] w-full overflow-hidden bg-gray-100">
              <img
                src={media.imageUrl || '/no_image_available.webp'}
                alt={media.title}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="p-4 flex flex-col flex-grow">
              <h3 className="text-lg font-semibold mb-2">{media.title}</h3>
              <div
                className="text-sm text-gray-600 prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: media.description }}
              />
            </div>
          </div>
        ))}
      </div> */}
    </div>
  );
}
