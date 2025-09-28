'use client';

import { tagClassMap } from '../../media/MediaPopup';

const labelColors = {
  title: tagClassMap['title'],
  format: tagClassMap['format'],
  origin: tagClassMap['origin'],
  genre: tagClassMap['genre'],
  released: tagClassMap['released'],
  updated: tagClassMap['updated'],
  avg: tagClassMap['avg'],
  count: tagClassMap['count'],
  avail: tagClassMap['avail'],
  list: tagClassMap['list'],
  order: 'bg-gray-500/20 text-gray-300 ring-gray-500/30',
};

// 1. The Shared Container
export function LabelContainer({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap gap-2 text-xs font-semibold items-center">
      {children}
    </div>
  );
}

// 2. The Clickable Filter Pill
type UnclickableLabelProps = {
  label: string;
  colorType: keyof typeof labelColors;
  className?: string;
};
type ClickableLabelProps = UnclickableLabelProps & {
  onRemove: () => void;
};

export function ClickableLabel({
  label,
  colorType,
  onRemove,
  className,
}: ClickableLabelProps) {
  return (
    <button
      onClick={onRemove}
      className={`cursor-pointer rounded px-[9px] py-0.5 ring-1 ring-inset transition hover:opacity-80 ${labelColors[colorType]} ${className}`}
    >
      {label}
    </button>
  );
}

// 3. The Non-Clickable Order Label
export function UnclickableLabel({
  label,
  colorType,
  className,
}: UnclickableLabelProps) {
  return (
    <span
      className={`rounded px-[9px] py-0.5 ring-1 ring-inset ${labelColors[colorType]} ${className}`}
    >
      {label}
    </span>
  );
}

// 4. The Skeleton Pill for the Fallback
export function LabelSkeleton({ width }: { width: string }) {
  return <div className={`h-6 ${width} rounded bg-gray-700 animate-pulse`} />;
}
