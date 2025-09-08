// ~/app/_components/search/SortControl.tsx

'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { IoIosArrowDown } from 'react-icons/io';

// 1. A new data structure to hold contextual direction labels
const sortOptions = {
  date: {
    label: 'Release Date',
    directions: {
      desc: 'New → Old',
      asc: 'Old → New',
    },
  },
  title: {
    label: 'Title',
    directions: {
      asc: 'A → Z',
      desc: 'Z → A',
    },
  },
};

type SortField = keyof typeof sortOptions;
type SortDirection = keyof (typeof sortOptions)[SortField]['directions'];

export default function OrderSelector() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const containerRef = useRef<HTMLDivElement>(null);

  // State for each dropdown's visibility
  const [isFieldDropdownOpen, setIsFieldDropdownOpen] = useState(false);
  const [isDirectionDropdownOpen, setIsDirectionDropdownOpen] = useState(false);

  // --- STATE MANAGEMENT ---
  // Initialize state from the URL on the first render
  const [sortField, setSortField] = useState<SortField>(() => {
    const sortValue = searchParams.get('sort') ?? 'released-desc';
    const [field] = sortValue.split('-');
    return field === 'title' ? 'title' : 'date';
  });

  const [sortDirection, setSortDirection] = useState<SortDirection>(() => {
    const sortValue = searchParams.get('sort') ?? 'released-desc';
    const [, direction] = sortValue.split('-');
    return direction === 'asc' ? 'asc' : 'desc';
  });

  // useEffect to update the URL whenever the state changes
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('sort', `${sortField}-${sortDirection}`);
    router.replace(`${pathname}?${params.toString()}`);
  }, [sortField, sortDirection, router, pathname, searchParams]);

  // Effect to handle "clicking away" for both dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsFieldDropdownOpen(false);
        setIsDirectionDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // --- HANDLERS ---
  const handleFieldChange = (newField: SortField) => {
    setSortField(newField);
    setIsFieldDropdownOpen(false);
  };

  const handleDirectionChange = (newDirection: SortDirection) => {
    setSortDirection(newDirection);
    setIsDirectionDropdownOpen(false);
  };

  return (
    <div
      className="flex items-center gap-2 text-sm font-semibold"
      ref={containerRef}
    >
      <label className="text-gray-400 font-normal">Sort by</label>

      {/* --- UI Part 1: Field Selector Dropdown --- */}
      <div className="relative">
        <button
          onClick={() => setIsFieldDropdownOpen(!isFieldDropdownOpen)}
          className="flex items-center gap-2 rounded-md border border-gray-600 bg-gray-700 p-2 text-white hover:border-gray-500"
        >
          {sortOptions[sortField].label}
          <IoIosArrowDown
            className={`transition-transform ${
              isFieldDropdownOpen ? 'rotate-180' : ''
            }`}
          />
        </button>
        {isFieldDropdownOpen && (
          <div className="absolute left-0 top-full z-10 mt-2 flex w-36 flex-col rounded bg-gray-800 p-2 shadow-lg">
            {(Object.keys(sortOptions) as SortField[]).map((fieldKey) => (
              <button
                key={fieldKey}
                onClick={() => handleFieldChange(fieldKey)}
                className={`w-full rounded p-2 text-left hover:bg-gray-900 hover:text-blue-400 ${
                  sortField === fieldKey ? 'text-blue-400' : ''
                }`}
              >
                {sortOptions[fieldKey].label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* --- UI Part 2: Direction Selector Dropdown --- */}
      <div className="relative">
        <button
          onClick={() => setIsDirectionDropdownOpen(!isDirectionDropdownOpen)}
          className="flex items-center gap-2 rounded-md border border-gray-600 bg-gray-700 p-2 text-white hover:border-gray-500"
        >
          {sortOptions[sortField].directions[sortDirection]}
          <IoIosArrowDown
            className={`transition-transform ${
              isDirectionDropdownOpen ? 'rotate-180' : ''
            }`}
          />
        </button>
        {isDirectionDropdownOpen && (
          <div className="absolute left-0 top-full z-10 mt-2 flex w-36 flex-col rounded bg-gray-800 p-2 shadow-lg">
            {(
              Object.keys(sortOptions[sortField].directions) as SortDirection[]
            ).map((dirKey) => (
              <button
                key={dirKey}
                onClick={() => handleDirectionChange(dirKey)}
                className={`w-full rounded p-2 text-left hover:bg-gray-900 hover:text-blue-400 ${
                  sortDirection === dirKey ? 'text-blue-400' : ''
                }`}
              >
                {sortOptions[sortField].directions[dirKey]}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
