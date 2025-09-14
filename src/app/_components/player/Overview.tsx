'use client';

import type { Episode, ListMedia, Season } from '~/type';
import { MediaBadge } from '../media/MediaBadge';
import { tagClassMap } from '../media/MediaPopup';
import Backdrop from './Backdrop';

interface OverviewProps {
  selectedMedia: ListMedia;
  selectedSeason?: Season;
  selectedEpisode?: Episode;
  showOverview?: string;
}
export default function Overview({
  selectedMedia: mediaDetail,
  selectedSeason,
  selectedEpisode,
  showOverview,
}: OverviewProps) {
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

  return showOverview === 'media' ? (
    <div className="relative w-full rounded bg-gray-800 flex">
      {/* Details */}
      <div className="w-full p-4 flex flex-col gap-3 relative isolate">
        <Backdrop backdropUrl={media.backdropUrl} />
        {/* <div className="flex flex-col gap-4"> */}
        {/* Tags */}
        {/* <div className="flex flex-col gap-2 text-xs font-semibold"> */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
          {/* <div className="flex flex-wrap items-center gap-2"> */}
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
          {/* </div> */}
          {/* <div className="flex flex-wrap items-center gap-2"> */}
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
          {/* </div> */}
          {/* <div className="flex flex-wrap items-center gap-2"> */}
          {/** rating avg */}
          <MediaBadge className={tagClassMap['avg']}>
            Rating Avg: {(media.voteAverage * 10).toFixed(2)}%
          </MediaBadge>
          {/** rating count */}
          <MediaBadge className={tagClassMap['count']}>
            Rating Cnt: {media.voteCount}
          </MediaBadge>
          {/* </div> */}
        </div>
        {/* </div> */}

        <div className="font-medium text-sm max-w-none">
          {media.description ?? 'No description available.'}
        </div>
      </div>
    </div>
  ) : showOverview === 'season' && selectedSeason ? (
    <div className="relative w-full rounded bg-gray-800 flex">
      {/* Details */}
      <div className="w-full p-4 flex flex-col gap-2 relative isolate">
        <Backdrop backdropUrl={selectedSeason.imageUrl} />
        <div className="text-base font-semibold">{selectedSeason.title}</div>
        <div className="font-medium text-sm max-w-none">
          {selectedSeason.description ?? 'No description available.'}
        </div>
      </div>
    </div>
  ) : showOverview === 'episode' && selectedEpisode ? (
    <div className="relative w-full rounded bg-gray-800 flex">
      {/* Details */}
      <div className="w-full p-4 flex flex-col gap-2 relative isolate">
        <div className="text-base font-semibold">{selectedEpisode.title}</div>
        <div className="font-medium text-sm max-w-none">
          {selectedEpisode.description ?? 'No description available.'}
        </div>
      </div>
    </div>
  ) : null;
}
