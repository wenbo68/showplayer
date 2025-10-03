// components/SearchbarSkeleton.jsx

const TitleSearchFallback = () => {
  return (
    <div className="col-span-2 flex w-full animate-pulse flex-col gap-2 sm:col-span-1">
      {/* Label Skeleton */}
      <div className="h-5 w-1/4 rounded bg-gray-700"></div>
      <div className="flex w-full items-center gap-2">
        {/* Input Box Skeleton */}
        <div className="h-10 w-full rounded bg-gray-800"></div>
        {/* Mobile Toggle Button Skeleton */}
        <div className="h-10 w-10 rounded bg-gray-800 sm:hidden"></div>
      </div>
    </div>
  );
};

export default TitleSearchFallback;
