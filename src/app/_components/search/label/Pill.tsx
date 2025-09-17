'use client';

import { tagClassMap } from '../../media/MediaPopup';

const pillColors = {
  title: tagClassMap['title'],
  format: tagClassMap['format'],
  origin: tagClassMap['origin'],
  genre: tagClassMap['genre'],
  released: tagClassMap['released'],
  updated: tagClassMap['updated'],
  avg: tagClassMap['avg'],
  count: tagClassMap['count'],
  list: tagClassMap['list'],
  order: 'bg-gray-500/20 text-gray-300 ring-gray-500/30',
};

// 1. The Shared Container
export function PillContainer({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap gap-2 text-xs font-semibold items-center">
      {children}
    </div>
  );
}

// 2. The Clickable Filter Pill
type FilterPillProps = {
  label: string;
  type: keyof typeof pillColors;
  onRemove: () => void;
};

export function FilterPill({ label, type, onRemove }: FilterPillProps) {
  return (
    <button
      onClick={onRemove}
      className={`cursor-pointer rounded px-[9px] py-0.5 ring-1 ring-inset transition hover:opacity-80 ${pillColors[type]}`}
    >
      {label}
    </button>
  );
}

// 3. The Non-Clickable Order Label
export function OrderLabel({ label }: { label: string }) {
  return (
    <span
      className={`rounded px-[9px] py-0.5 ring-1 ring-inset ${pillColors['order']}`}
    >
      {label}
    </span>
  );
}

// 4. The Skeleton Pill for the Fallback
export function PillSkeleton({ width }: { width: string }) {
  return <div className={`h-6 ${width} rounded bg-gray-700 animate-pulse`} />;
}
