// ~/app/_components/search/ActiveFilters.tsx

'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useMemo } from 'react';
import type { FilterOptionGroup, FilterOptions } from '~/type';
import { FilterPill, OrderLabel, PillContainer } from './Pill';

// type Pill = {
//   key: string;
//   label: string;
//   type:
//     | 'title'
//     | 'format'
//     | 'origin'
//     | 'genre'
//     | 'released'
//     | 'updated'
//     | 'avg'
//     | 'count'
//     | 'list';
//   onRemove: () => void;
// };

type PillData = {
  key: string;
  label: string;
  type:
    | 'title'
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

export default function ActiveLabels({
  filterOptions,
  orderOptions, // 2. Accept orderOptions as a prop
}: {
  filterOptions: FilterOptions;
  orderOptions: FilterOptionGroup[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // We can calculate both the pills and the order label inside the same useMemo
  const { activePills, orderLabel } = useMemo(() => {
    const pills: PillData[] = [];
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

    // 1. Title
    const titles = searchParams.getAll('title');
    titles.forEach((title) => {
      pills.push({
        key: `title-${title}`,
        label: `Title: ${title}`,
        type: 'title',
        onRemove: createRemoveHandler('title', title),
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

    // --- 3. Add logic to find the human-readable order label ---
    let foundOrderLabel: string | null = null;
    const currentOrder = searchParams.get('order');
    if (currentOrder) {
      for (const group of orderOptions) {
        const foundOption = group.options.find(
          (opt) => opt.trpcInput === currentOrder
        );
        if (foundOption) {
          foundOrderLabel = `${group.groupLabel}: ${foundOption.label}`;
          break; // Stop searching once found
        }
      }
    }

    return { activePills: pills, orderLabel: foundOrderLabel };
  }, [searchParams, filterOptions, orderOptions, pathname, router]);

  // if (activePills.length === 0) {
  //   return null; // Don't render anything if no filters are active
  // }

  // The rendering logic is now much simpler and more declarative.
  return (
    <PillContainer>
      {activePills.map((pill) => (
        <FilterPill
          key={pill.key}
          label={pill.label}
          type={pill.type}
          onRemove={pill.onRemove}
        />
      ))}
      {orderLabel && <OrderLabel label={orderLabel} />}
    </PillContainer>
  );
}
