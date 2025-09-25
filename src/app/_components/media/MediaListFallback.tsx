// ~/app/_components/media/MediaListFallback.tsx

import { MediaButtonFallback } from './MediaButtonFallback';

interface MediaListFallbackProps {
  count?: number; // How many placeholders to show
  label?: string;
}

export default function MediaListFallback({
  count = 12, // A reasonable default
  label,
}: MediaListFallbackProps) {
  return (
    <div className="w-full grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3 md:gap-4 lg:gap-5 xl:gap-6 space-y-2">
      {label && <span className="col-span-full font-bold">{label}</span>}
      {Array.from({ length: count }).map((_, index) => (
        <MediaButtonFallback key={index} />
      ))}
    </div>
  );
}
