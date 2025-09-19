// ~/app/_components/search/ActiveFilters.tsx

'use client';

import { useMemo } from 'react';
import type { FilterGroupOption, FilterOptionsFromDb } from '~/type';
import { Label, OrderLabel, LabelContainer } from './Label';
import { orderOptions } from '~/constant';
import { useFilterContext } from '~/app/_contexts/SearchContext';

type ActiveLabel = {
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
}: {
  filterOptions: FilterOptionsFromDb;
}) {
  const {
    title,
    setTitle,
    format,
    setFormat,
    genre,
    setGenre,
    origin,
    setOrigin,
    released,
    setReleased,
    updated,
    setUpdated,
    avg,
    setAvg,
    count,
    setCount,
    order,
    // Note: We don't need setOrder here, as the order label isn't removable.
  } = useFilterContext();

  const { activeLabels, orderLabel } = useMemo(() => {
    const activeLabels: ActiveLabel[] = [];

    // Title
    if (title) {
      activeLabels.push({
        key: `title-${title}`,
        label: `Title: ${title}`,
        type: 'title',
        onRemove: () => setTitle(''),
      });
    }

    // Formats
    format.forEach((fmt) => {
      activeLabels.push({
        key: `format-${fmt}`,
        label: fmt === 'movie' ? 'Movie' : 'TV',
        type: 'format',
        // ✨ FIX: Use functional update
        onRemove: () =>
          setFormat((prevFormat) => prevFormat.filter((f) => f !== fmt)),
      });
    });

    // Origins
    origin.forEach((originId) => {
      const originDetails = filterOptions.origins.find(
        (o) => o.id === originId
      );
      if (originDetails) {
        activeLabels.push({
          key: `origin-${originId}`,
          label: originDetails.name,
          type: 'origin',
          // ✨ FIX: Use functional update
          onRemove: () =>
            setOrigin((prevOrigin) => prevOrigin.filter((o) => o !== originId)),
        });
      }
    });

    // Genres
    genre.forEach((genreId) => {
      const genreDetails = filterOptions.genres.find(
        (g) => g.id === Number(genreId)
      );
      if (genreDetails) {
        activeLabels.push({
          key: `genre-${genreId}`,
          label: genreDetails.name,
          type: 'genre',
          // ✨ FIX: Use functional update
          onRemove: () =>
            setGenre((prevGenre) => prevGenre.filter((g) => g !== genreId)),
        });
      }
    });

    // Released Years
    released.forEach((year) => {
      activeLabels.push({
        key: `released-${year}`,
        label: `Released: ${year}`,
        type: 'released',
        // ✨ FIX: Use functional update
        onRemove: () =>
          setReleased((prevReleased) => prevReleased.filter((y) => y !== year)),
      });
    });

    // Updated Years
    updated.forEach((year) => {
      activeLabels.push({
        key: `updated-${year}`,
        label: `Updated: ${year}`,
        type: 'updated',
        // ✨ FIX: Use functional update
        onRemove: () =>
          setUpdated((prevUpdated) => prevUpdated.filter((y) => y !== year)),
      });
    });

    // Rating Avg
    if (avg) {
      activeLabels.push({
        key: `avg-${avg}`,
        label: `Rating Avg > ${Number(avg) * 10}%`,
        type: 'avg',
        onRemove: () => setAvg(''),
      });
    }

    // Rating Count
    if (count) {
      activeLabels.push({
        key: `count-${count}`,
        label: `Rating Cnt > ${count}`,
        type: 'count',
        onRemove: () => setCount(''),
      });
    }

    // Order Label
    let orderLabel: string | null = null;
    if (order) {
      for (const group of orderOptions) {
        const foundOption = group.options.find(
          (opt) => opt.trpcInput === order
        );
        if (foundOption) {
          orderLabel = `${group.groupLabel}: ${foundOption.label}`;
          break;
        }
      }
    }

    return { activeLabels, orderLabel };
  }, [
    title,
    format,
    genre,
    origin,
    released,
    updated,
    avg,
    count,
    order,
    filterOptions,
    orderOptions,
  ]);

  return (
    <LabelContainer>
      {activeLabels.map((label) => (
        <Label
          key={label.key}
          label={label.label}
          type={label.type}
          onRemove={label.onRemove}
        />
      ))}
      {orderLabel && <OrderLabel label={orderLabel} />}
    </LabelContainer>
  );
}
