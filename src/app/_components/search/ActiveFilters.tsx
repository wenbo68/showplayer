// ~/app/_components/search/ActiveFilters.tsx

'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useMemo } from 'react';
import type { FilterOptions } from '~/type';

type Pill = {
  key: string;
  label: string;
  type: 'year' | 'format' | 'origin' | 'genre' | 'list';
  onRemove: () => void;
};

const pillColors = {
  year: 'bg-red-500/20 text-red-300 ring-red-500/30',
  format: 'bg-orange-500/20 text-orange-300 ring-orange-500/30',
  origin: 'bg-cyan-500/20 text-cyan-300 ring-cyan-500/30',
  genre: 'bg-blue-500/20 text-blue-300 ring-blue-500/30',
  list: 'bg-violet-500/20 text-violet-300 ring-violet-500/30', // 2. Add a new color
};

export default function ActiveFilters({
  filterOptions,
}: {
  filterOptions: FilterOptions;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // This function builds the list of active pills from the URL and filterOptions
  const activePills = useMemo(() => {
    const pills: Pill[] = [];
    const params = new URLSearchParams(searchParams.toString());

    const createRemoveHandler = (key: string, value: string) => () => {
      const currentValues = params.getAll(key);
      const newValues = currentValues.filter((v) => v !== value);
      params.delete(key);
      newValues.forEach((v) => params.append(key, v));
      // Reset to the first page whenever a filter is removed.
      params.set('page', '1');
      router.push(`${pathname}?${params.toString()}`);
    };

    // 1. Years
    const years = searchParams.getAll('year');
    years.forEach((year) => {
      pills.push({
        key: `year-${year}`,
        label: year,
        type: 'year',
        onRemove: createRemoveHandler('year', year),
      });
    });

    // 2. Formats
    const formats = searchParams.getAll('format');
    formats.forEach((format) => {
      pills.push({
        key: `format-${format}`,
        label: format === 'movie' ? 'Movie' : 'TV',
        type: 'format',
        onRemove: createRemoveHandler('format', format),
      });
    });

    // 3. Origins
    const origins = searchParams.getAll('origin');
    origins.forEach((originId) => {
      const origin = filterOptions.origins.find((o) => o.id === originId);
      if (origin) {
        pills.push({
          key: `origin-${origin.id}`,
          label: origin.name,
          type: 'origin',
          onRemove: createRemoveHandler('origin', origin.id),
        });
      }
    });

    // 4. Genres
    const genres = searchParams.getAll('genre');
    genres.forEach((genreId) => {
      const genre = filterOptions.genres.find((g) => String(g.id) === genreId);
      if (genre) {
        pills.push({
          key: `genre-${genre.id}`,
          label: genre.name,
          type: 'genre',
          onRemove: createRemoveHandler('genre', genreId),
        });
      }
    });

    // 3. Add logic to create pills for the 'list' parameter
    const lists = searchParams.getAll('list');
    lists.forEach((listValue) => {
      const listLabels = {
        saved: 'My List',
        favorite: 'Favorites',
        later: 'Watch Later',
      };
      pills.push({
        key: `list-${listValue}`,
        label: listLabels[listValue as keyof typeof listLabels] ?? listValue,
        type: 'list',
        onRemove: createRemoveHandler('list', listValue),
      });
    });

    return pills;
  }, [searchParams, filterOptions, pathname, router]);

  if (activePills.length === 0) {
    return null; // Don't render anything if no filters are active
  }

  return (
    <div className="flex w-full flex-wrap gap-2 text-xs font-semibold justify-center">
      {/* <span className="text-sm font-semibold">Active Filters:</span> */}
      {activePills.map((pill) => (
        <button
          key={pill.key}
          onClick={pill.onRemove}
          className={`cursor-pointer rounded px-[9px] py-0.5 ring-1 ring-inset transition hover:opacity-80 ${
            pillColors[pill.type]
          }`}
        >
          {pill.label}
          {/* <X size={12} /> */}
        </button>
      ))}
    </div>
  );
}
