// ~/app/_components/media/MediaButtonFallback.tsx

export function MediaButtonFallback() {
  return (
    <div className="flex w-full flex-col items-center gap-2 overflow-hidden">
      {/* Image Placeholder */}
      <div className="aspect-[2/3] w-full rounded bg-gray-800 animate-pulse" />
      <div className="flex flex-col w-full items-start gap-1.5">
        {/* Text Placeholders */}
        <div className="h-4 w-5/6 rounded bg-gray-800 animate-pulse" />
        <div className="h-4 w-3/4 rounded bg-gray-800 animate-pulse" />
      </div>
    </div>
  );
}
