// ~/app/_components/search/ActiveLabelsFallback.tsx

export default function ActiveLabelsFallback() {
  return (
    <div className="flex flex-wrap gap-2 items-center">
      {/* Create a few skeleton pills */}
      <div className="h-6 w-20 rounded bg-gray-700 animate-pulse" />
      <div className="h-6 w-24 rounded bg-gray-700 animate-pulse" />
      <div className="h-6 w-16 rounded bg-gray-700 animate-pulse" />
    </div>
  );
}
