'use client';

import { useMemo } from 'react';
import type { FilterOptionsFromDb } from '~/type';
import { ClickableLabel, UnclickableLabel, LabelContainer } from './Label';
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
    | 'avail'
    | 'list';
  onRemove?: () => void;
  className?: string;
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
    avail,
    setAvail,
    order,
    // Note: We don't need setOrder here, as the order label isn't removable.
    handleSearch,
    genreOp,
    setGenreOp,
    list,
    setList,
  } = useFilterContext();

  const { activeLabels, orderLabel } = useMemo(() => {
    const activeLabels: ActiveLabel[] = [];

    // Title
    if (title) {
      activeLabels.push({
        key: `title-${title}`,
        label: `Title: ${title}`,
        type: 'title',
        onRemove: () => {
          setTitle('');
          handleSearch({ title: '' });
        },
      });
    }

    // Formats
    format.forEach((fmt) => {
      activeLabels.push({
        key: `format-${fmt}`,
        label: fmt === 'movie' ? 'Movie' : 'TV',
        type: 'format',
        // ✨ FIX: Use functional update
        onRemove: () => {
          const newFormat = format.filter((f) => f !== fmt);
          setFormat(newFormat);
          handleSearch({ format: newFormat });
        },
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
          onRemove: () => {
            const newOrigin = origin.filter((o) => o !== originId);
            setOrigin(newOrigin);
            handleSearch({ origin: newOrigin });
          },
        });
      }
    });

    // Genre Operator (cannot be removed once it appears)
    if (genreOp) {
      activeLabels.push({
        key: `genre-op-${genreOp}`,
        label: `Genre Op: ${genreOp}`,
        type: 'genre',
        // onRemove: () => {
        //   setGenreOp('');
        //   handleSearch({ genreOp: '' });
        // },
      });
    }

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
          onRemove: () => {
            const newGenre = genre.filter((g) => g !== genreId);
            setGenre(newGenre);
            handleSearch({ genre: newGenre });
          },
        });
      }
    });

    // Released Years
    released.forEach((year) => {
      activeLabels.push({
        key: `released-${year}`,
        label: `Released: ${year}`,
        type: 'released',
        onRemove: () => {
          const newReleased = released.filter((y) => y !== year);
          setReleased(newReleased);
          handleSearch({ released: newReleased });
        },
      });
    });

    // Updated Years
    updated.forEach((year) => {
      activeLabels.push({
        key: `updated-${year}`,
        label: `Updated: ${year}`,
        type: 'updated',
        onRemove: () => {
          const newUpdated = updated.filter((y) => y !== year);
          setUpdated(newUpdated);
          handleSearch({ updated: newUpdated });
        },
      });
    });

    // Rating Avg
    if (avg) {
      activeLabels.push({
        key: `avg-${avg}`,
        label: `Rating Avg > ${Number(avg) * 10}%`,
        type: 'avg',
        onRemove: () => {
          setAvg('');
          handleSearch({ avg: '' });
        },
      });
    }

    // Rating Count
    if (count) {
      activeLabels.push({
        key: `count-${count}`,
        label: `Rating Cnt > ${count}`,
        type: 'count',
        onRemove: () => {
          setCount('');
          handleSearch({ count: '' });
        },
      });
    }

    // Availability
    if (avail) {
      activeLabels.push({
        key: `avail-${avail}`,
        label: `Available: ${avail === 'no' ? 'No' : `> ${avail}% Ad-Free`}`,
        type: 'avail',
        onRemove: () => {
          setAvail('');
          handleSearch({ avail: '' });
        },
      });
    }

    // User List
    list.forEach((listType) => {
      activeLabels.push({
        key: `list-${listType}`,
        label: `${listType}`,
        type: 'list',
        onRemove: () => {
          const newList = list.filter((l) => l !== listType);
          setList(newList);
          handleSearch({ list: newList });
        },
        className: 'capitalize',
      });
    });

    // Order Label
    let orderLabel: string | null = null;
    if (order) {
      for (const group of orderOptions) {
        const foundOption = group.options.find((opt) => opt.urlInput === order);
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
    genreOp,
    genre,
    origin,
    released,
    updated,
    avg,
    count,
    avail,
    list,
    order,
    filterOptions,
    handleSearch,
    setTitle,
    setFormat,
    setGenreOp,
    setGenre,
    setOrigin,
    setReleased,
    setUpdated,
    setAvg,
    setCount,
    setAvail,
    setList,
  ]);

  return (
    <LabelContainer>
      {activeLabels.length === 0 ? (
        orderLabel ? (
          <UnclickableLabel label={orderLabel} colorType="order" />
        ) : (
          <UnclickableLabel label={'Empty Search'} colorType="order" />
        )
      ) : (
        <>
          {activeLabels.map((label) => {
            return label.onRemove ? (
              <ClickableLabel
                key={label.key}
                label={label.label}
                colorType={label.type}
                onRemove={label.onRemove}
              />
            ) : (
              <UnclickableLabel
                key={label.key}
                label={label.label}
                colorType={label.type}
                // onRemove={label.onRemove}
              />
            );
          })}
          {orderLabel && (
            <UnclickableLabel label={orderLabel} colorType="order" />
          )}
        </>
      )}
    </LabelContainer>
  );
}
