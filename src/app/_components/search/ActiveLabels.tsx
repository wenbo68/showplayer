// ~/app/_components/search/ActiveFilters.tsx

'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useMemo } from 'react';
import type { FilterOptions } from '~/type';
import { tagClassMap } from '../media/MediaPopup';

type Pill = {
  key: string;
  label: string;
  type: // | 'title'
  | 'format'
    | 'origin'
    | 'genre'
    | 'released'
    | 'updated'
    | 'avg'
    | 'count'
    | 'list';
  onRemove: () => void;
};

const pillColors = {
  // title: tagClassMap['title'],
  format: tagClassMap['format'],
  origin: tagClassMap['origin'],
  genre: tagClassMap['genre'],
  released: tagClassMap['released'],
  updated: tagClassMap['updated'],
  avg: tagClassMap['avg'],
  count: tagClassMap['count'],
  list: tagClassMap['list'],
};

export default function ActiveLabels({
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

    // // 1. Title
    // const titles = searchParams.getAll('title');
    // titles.forEach((title) => {
    //   pills.push({
    //     key: `title-${title}`,
    //     label: `Title: ${title}`,
    //     type: 'title',
    //     onRemove: createRemoveHandler('title', title),
    //   });
    // });

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

    // 1. Released Years
    const released = searchParams.getAll('released');
    released.forEach((year) => {
      pills.push({
        key: `released-${year}`,
        label: `Released: ${year}`,
        type: 'released',
        onRemove: createRemoveHandler('released', year),
      });
    });

    // 1. Released Years
    const updated = searchParams.getAll('updated');
    updated.forEach((year) => {
      pills.push({
        key: `updated-${year}`,
        label: `Updated: ${year}`,
        type: 'updated',
        onRemove: createRemoveHandler('updated', year),
      });
    });

    // 1. Rating Avg
    const avg = searchParams.getAll('avg');
    avg.forEach((num) => {
      pills.push({
        key: `avg-${num}`,
        label: `Rating Avg > ${Number(num) * 10}%`,
        type: 'avg',
        onRemove: createRemoveHandler('avg', num),
      });
    });

    // 1. Rating Count
    const count = searchParams.getAll('count');
    count.forEach((num) => {
      pills.push({
        key: `count-${num}`,
        label: `Rating Cnt > ${num}`,
        type: 'count',
        onRemove: createRemoveHandler('count', num),
      });
    });

    // 3. Add logic to create pills for the 'list' parameter
    const lists = searchParams.getAll('list');
    lists.forEach((listValue) => {
      const listLabels = {
        saved: 'my list',
        favorite: 'favorites',
        later: 'watch later',
      };
      pills.push({
        key: `list-${listValue}`,
        label: `List: ${
          listLabels[listValue as keyof typeof listLabels] ?? listValue
        }`,
        type: 'list',
        onRemove: createRemoveHandler('list', listValue),
      });
    });

    return pills;
  }, [searchParams, filterOptions, pathname, router]);

  // if (activePills.length === 0) {
  //   return null; // Don't render anything if no filters are active
  // }

  return (
    <div className="flex flex-wrap gap-2 text-xs font-semibold items-center">
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
