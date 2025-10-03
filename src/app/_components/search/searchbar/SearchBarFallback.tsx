// components/SearchFormSkeleton.jsx

import FilterFallback from './FilterFallback';
import TitleSearchFallback from './TitleSearchFallback';

const SearchBarFallback = ({ filterCount = 10 }) => {
  return (
    <div className="text-sm w-full grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3 md:gap-4 lg:gap-5 xl:gap-6">
      {/* The main search bar skeleton is always present */}
      <TitleSearchFallback />

      {/* Generate the specified number of filter skeletons */}
      {Array.from({ length: filterCount }).map((_, index) => (
        <FilterFallback key={index} />
      ))}
    </div>
  );
};

export default SearchBarFallback;
