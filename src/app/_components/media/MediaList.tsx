import type { ListMedia } from '~/type';
import Link from 'next/link';
import MediaButton from './MediaButton';

interface MediaListProps {
  pageMediaIds: string[];
  viewMode: 'preview' | 'full';
  mediaList: ListMedia[];
  label?: string;
  link?: string;
}

export default function MediaList({
  pageMediaIds,
  viewMode,
  mediaList,
  label,
  link,
}: MediaListProps) {
  return viewMode === 'preview' ? (
    // preview list
    <div className={`${label && link ? `w-full flex flex-col gap-4` : ``}`}>
      {label && link && (
        <div className="flex items-end justify-between">
          <span className="font-bold">{label}</span>
          <Link
            href={link}
            className="text-gray-500 text-xs font-semibold transition hover:text-blue-500"
          >
            View All
          </Link>
        </div>
      )}
      <div className="flex gap-4 overflow-x-auto scrollbar-hide">
        {mediaList.map((mediaDetail) => {
          return (
            <div
              key={mediaDetail.media.id}
              className="flex-shrink-0 w-[160px] lg:w-[200px]"
            >
              <MediaButton
                pageMediaIds={pageMediaIds}
                mediaDetail={mediaDetail}
              />
            </div>
          );
        })}
      </div>
    </div>
  ) : (
    // full list
    <div className="w-full grid grid-cols-[repeat(auto-fit,minmax(170px,170px))] lg:grid-cols-[repeat(auto-fit,minmax(194px,194px))] justify-center gap-4">
      {label && <span className="col-span-full font-bold">{label}</span>}
      {mediaList.map((mediaDetail) => {
        return (
          <MediaButton
            key={mediaDetail.media.id}
            pageMediaIds={pageMediaIds}
            mediaDetail={mediaDetail}
          />
        );
      })}
    </div>
  );
}
