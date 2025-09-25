import type { ListMedia } from '~/type';
import Link from 'next/link';
import MediaButton from './MediaButton';
import Head from 'next/head';

interface MediaListProps {
  pageMediaIds: string[];
  viewMode: 'preview' | 'full';
  displayMode?: 'grid' | 'list';
  mediaList: ListMedia[];
  label?: string;
  link?: string;
}

export default function MediaList({
  pageMediaIds,
  viewMode,
  displayMode,
  mediaList,
  label,
  link,
}: MediaListProps) {
  return (
    <>
      {/* 2. Add the Head component */}
      <Head>
        {/* 3. Map over your media list and create a preload link for each backdrop */}
        {mediaList.map((mediaDetail) =>
          mediaDetail.media.backdropUrl ? (
            <link
              key={`preload-${mediaDetail.media.id}`}
              rel="preload"
              as="image"
              href={`https://image.tmdb.org/t/p/w500${mediaDetail.media.backdropUrl}`}
            />
          ) : null
        )}
      </Head>
      {viewMode === 'preview' ? (
        // preview list
        <div className={`${label && link ? `w-full flex flex-col gap-4` : ``}`}>
          {label && link && (
            <div className="flex items-end justify-between">
              <span className="text-gray-300 font-bold">{label}</span>
              <Link
                href={link}
                className="text-gray-500 text-xs font-semibold transition hover:text-blue-500"
              >
                View All
              </Link>
            </div>
          )}
          <div className="w-full grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3 md:gap-4 lg:gap-5 xl:gap-6">
            {mediaList.map((mediaDetail) => {
              return (
                <MediaButton
                  key={mediaDetail.media.id}
                  pageMediaIds={pageMediaIds}
                  mediaDetail={mediaDetail}
                  displayMode="grid"
                />
              );
            })}
          </div>
        </div>
      ) : (
        // full list
        <div className="w-full grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3 md:gap-4 lg:gap-5 xl:gap-6">
          {label && <span className="col-span-full font-bold">{label}</span>}
          {mediaList.map((mediaDetail) => {
            return (
              <MediaButton
                key={mediaDetail.media.id}
                pageMediaIds={pageMediaIds}
                mediaDetail={mediaDetail}
                displayMode="grid"
              />
            );
          })}
        </div>
      )}
    </>
  );
}
