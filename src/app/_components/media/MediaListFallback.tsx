// ~/app/_components/media/MediaListFallback.tsx

import { MediaButtonFallback } from './MediaButtonFallback';

interface MediaListFallbackProps {
  viewMode?: 'preview' | 'grid';
  count?: number; // How many placeholders to show
  label?: string;
}

export default function MediaListFallback({
  viewMode = 'grid',
  count = 12, // A reasonable default
  label,
}: MediaListFallbackProps) {
  return (
    <>
      {viewMode === 'preview' ? (
        <div
          className={`${
            label
              ? `w-full flex flex-col gap-2 sm:gap-3 md:gap-4 lg:gap-5 xl:gap-6`
              : ``
          }`}
        >
          {label && (
            <div className="flex items-end">
              <span className="text-gray-300 font-bold">{label}</span>
            </div>
          )}
          <div className="w-full grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3 md:gap-4 lg:gap-5 xl:gap-6">
            {Array.from({ length: count }).map((_, index) => (
              <MediaButtonFallback key={index} />
            ))}
          </div>
        </div>
      ) : (
        <div className="w-full grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3 md:gap-4 lg:gap-5 xl:gap-6">
          {label && (
            <span className="col-span-full text-gray-300 font-bold">
              {label}
            </span>
          )}
          {Array.from({ length: count }).map((_, index) => (
            <MediaButtonFallback key={index} />
          ))}
        </div>
      )}
    </>
  );
}
