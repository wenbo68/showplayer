// components/episode-list.tsx
'use client';

import Link from 'next/link';
import type { Season, Episode } from '~/type';

interface EpisodeListProps {
  tmdbId: number;
  seasons: (Season & { episodes: Episode[] })[];
  selectedEpisodeId: string;
}

export function EpisodeList({
  tmdbId,
  seasons,
  selectedEpisodeId,
}: EpisodeListProps) {
  return (
    <div className="bg-gray-800 p-4 rounded max-h-[80vh] overflow-y-auto">
      <h3 className="text-xl font-bold mb-4">Seasons & Episodes</h3>
      {seasons.map((season) => (
        <div key={season.id} className="mb-4">
          <h4 className="text-lg font-semibold border-b border-gray-600 pb-1 mb-2">
            Season {season.seasonNumber}
          </h4>
          <div className="flex flex-col gap-1">
            {season.episodes.map((episode) => (
              <Link
                key={episode.id}
                // NOTE: Assumes the first source is default, you may need to adjust this
                href={`/tv/${tmdbId}/${season.seasonNumber}/${episode.episodeNumber}`}
                className={`block p-2 rounded text-sm ${
                  episode.id === selectedEpisodeId
                    ? 'bg-blue-600 text-white'
                    : 'hover:bg-gray-700'
                }`}
              >
                E{episode.episodeNumber}:{' '}
                {episode.title ?? `Episode ${episode.episodeNumber}`}
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
