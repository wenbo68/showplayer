import z from 'zod';
import type { FilterGroupOption } from './type';

export const orderValues = [
  'released-desc',
  'released-asc',
  'title-desc',
  'title-asc',
  'popularity-desc',
  'popularity-asc',
  'vote-avg-desc',
  'vote-avg-asc',
  'vote-count-desc',
  'vote-count-asc',
  'updated-desc',
  'updated-asc',
] as const;

export const orderEnum = z.enum(orderValues);

export const orderOptions: FilterGroupOption[] = [
  {
    groupLabel: 'Popularity',
    options: [
      { label: 'Most→Least', trpcInput: 'popularity-desc' },
      { label: 'Least→Most', trpcInput: 'popularity-asc' },
    ],
  },
  {
    groupLabel: 'Rating Avg',
    options: [
      { label: 'High→Low', trpcInput: 'vote-avg-desc' },
      { label: 'Low→High', trpcInput: 'vote-avg-asc' },
    ],
  },
  {
    groupLabel: 'Rating Count',
    options: [
      { label: 'Most→Fewest', trpcInput: 'vote-count-desc' },
      { label: 'Fewest→Most', trpcInput: 'vote-count-asc' },
    ],
  },
  {
    groupLabel: 'Release Date',
    options: [
      { label: 'New→Old', trpcInput: 'released-desc' },
      { label: 'Old→New', trpcInput: 'released-asc' },
    ],
  },
  {
    groupLabel: 'Updated Date',
    options: [
      { label: 'Recent→Old', trpcInput: 'updated-desc' },
      { label: 'Old→Recent', trpcInput: 'updated-asc' },
    ],
  },
  {
    groupLabel: 'Title',
    options: [
      { label: 'A→Z', trpcInput: 'title-asc' },
      { label: 'Z→A', trpcInput: 'title-desc' },
    ],
  },
];
