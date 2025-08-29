'use client';

import { useState } from 'react';
import { api } from '~/trpc/react';

// Define a type for the search parameters for easier state management
type SearchParams = {
  query: string;
  type?: 'movie' | 'tv';
  genres: number[];
  origins: string[];
};

// This component will notify its parent when a search should be performed
interface SearchAndFiltersProps {
  onSearch: (params: SearchParams) => void;
}

export default function SearchAndFilters({ onSearch }: SearchAndFiltersProps) {
  const [query, setQuery] = useState('');
  const [type, setType] = useState<'movie' | 'tv' | undefined>(undefined);
  const [selectedGenres, setSelectedGenres] = useState<number[]>([]);

  // Fetch all genres and origins to populate the filters
  const { data: allGenres, isLoading: isLoadingGenres } =
    api.media.getAllGenres.useQuery();
  const { data: allOrigins, isLoading: isLoadingOrigins } =
    api.media.getAllOrigins.useQuery();

  const handleGenreChange = (genreId: number) => {
    setSelectedGenres((prev) =>
      prev.includes(genreId)
        ? prev.filter((id) => id !== genreId)
        : [...prev, genreId]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch({
      query,
      type,
      genres: selectedGenres,
      origins: [] /* Add origin state here */,
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full p-4 bg-gray-800 rounded-lg shadow-md space-y-4"
    >
      {/* Search Input */}
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search for a movie or TV show..."
        className="w-full p-2 rounded bg-gray-700 text-white"
      />

      {/* Genre Checkboxes */}
      <div className="flex flex-wrap gap-2">
        {isLoadingGenres ? (
          <p>Loading genres...</p>
        ) : (
          allGenres?.map((genre) => (
            <label
              key={genre.id}
              className="flex items-center space-x-2 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selectedGenres.includes(genre.id)}
                onChange={() => handleGenreChange(genre.id)}
                className="form-checkbox h-5 w-5 text-blue-600"
              />
              <span className="text-white">{genre.name}</span>
            </label>
          ))
        )}
      </div>

      {/* Add similar sections for Type (Radio buttons) and Origins (Checkboxes) */}

      <button
        type="submit"
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
      >
        Search
      </button>
    </form>
  );
}
