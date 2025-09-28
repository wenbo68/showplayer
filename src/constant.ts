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
      { label: 'Most→Least', urlInput: 'popularity-desc' },
      { label: 'Least→Most', urlInput: 'popularity-asc' },
    ],
  },
  {
    groupLabel: 'Rating Avg',
    options: [
      { label: 'High→Low', urlInput: 'vote-avg-desc' },
      { label: 'Low→High', urlInput: 'vote-avg-asc' },
    ],
  },
  {
    groupLabel: 'Rating Count',
    options: [
      { label: 'Most→Fewest', urlInput: 'vote-count-desc' },
      { label: 'Fewest→Most', urlInput: 'vote-count-asc' },
    ],
  },
  {
    groupLabel: 'Release Date',
    options: [
      { label: 'New→Old', urlInput: 'released-desc' },
      { label: 'Old→New', urlInput: 'released-asc' },
    ],
  },
  {
    groupLabel: 'Updated Date',
    options: [
      { label: 'Recent→Old', urlInput: 'updated-desc' },
      { label: 'Old→Recent', urlInput: 'updated-asc' },
    ],
  },
  {
    groupLabel: 'Title',
    options: [
      { label: 'A→Z', urlInput: 'title-asc' },
      { label: 'Z→A', urlInput: 'title-desc' },
    ],
  },
];
