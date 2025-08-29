import type { ListMedia } from '~/type';
import { MediaBadge } from './MediaBadge';
import type { Dispatch, SetStateAction } from 'react';

interface MediaButtonProps {
  mediaDetail: ListMedia;
  setSelectedMedia: Dispatch<SetStateAction<ListMedia | null>>;
}

export default function MediaButton({
  mediaDetail,
  setSelectedMedia,
}: MediaButtonProps) {
  const media = mediaDetail.media;
  const isReleased = media.releaseDate
    ? new Date(media.releaseDate) <= new Date()
    : false;

  return (
    <button
      key={media.id}
      onClick={() => setSelectedMedia(mediaDetail)}
      className="flex w-full flex-col items-center gap-2 overflow-hidden text-sm transition group"
    >
      {/* Image and Title content remains the same... */}
      <div className="relative w-full">
        <img
          src={
            `https://image.tmdb.org/t/p/w500${media.imageUrl}` ||
            '/no_image_available.webp'
          }
          alt={media.title}
          className="aspect-[2/3] w-full rounded object-cover"
        />
      </div>
      <div className="flex flex-col items-center gap-1 text-center">
        <span className="font-semibold transition-colors group-hover:text-blue-400">
          {media.title}
        </span>
        {/* Badge logic remains the same... */}
        {!isReleased ? (
          <MediaBadge className="bg-yellow-900 text-yellow-200">
            Not Released
          </MediaBadge>
        ) : mediaDetail.availabilityCount > 0 ? (
          media.type === 'movie' ? (
            <MediaBadge className="bg-green-900 text-green-200">
              Available
            </MediaBadge>
          ) : (
            <MediaBadge className="bg-blue-900 text-blue-200">
              {mediaDetail.availabilityCount}/{mediaDetail.totalEpisodeCount}{' '}
              Episodes
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
}
