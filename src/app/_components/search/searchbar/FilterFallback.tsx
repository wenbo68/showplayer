// components/FilterSkeleton.jsx

export default function FilterFallback() {
  return (
    <div className="flex w-full animate-pulse flex-col gap-2">
      {/* Label Skeleton */}
      <div className="h-5 w-1/3 rounded bg-gray-700"></div>
      {/* Input Box Skeleton */}
      <div className="h-10 w-full rounded bg-gray-800"></div>
    </div>
  );
}
