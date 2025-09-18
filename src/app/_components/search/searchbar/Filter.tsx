// ~/app/_components/search/Filter.tsx

'use client';

import { useRef, useState, useEffect } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { IoIosArrowDown } from 'react-icons/io';
import type { FilterOption, FilterGroupOption } from '~/type';

// Type guard to check if we have grouped options
function isGroupedOptions(
  options: (FilterOption | FilterGroupOption)[]
): options is FilterGroupOption[] {
  return (
    options.length > 0 && options[0] !== undefined && 'groupLabel' in options[0]
  );
}

type FilterProps = {
  label: string;
  options: (FilterOption | FilterGroupOption)[];
  placeholder?: string;
} & (
  | {
      mode: 'single';
      value: string | number;
      onChange: Dispatch<SetStateAction<string>>;
    }
  | {
      mode: 'multi';
      value: (string | number)[];
      onChange: Dispatch<SetStateAction<string[]>>;
    }
);
// );

export default function Filter(props: FilterProps) {
  const { label, options, placeholder, mode, value, onChange } = props;

  const [writtenText, setWrittenText] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Effect to handle "clicking away"
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
        setWrittenText('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // --- Smarter filtering for both flat and grouped options ---
  const searchText = writtenText.toLowerCase();
  const filteredOptions = isGroupedOptions(options)
    ? options
        .map((group) => {
          // 1. Check if the main group label matches the search text.
          const groupLabelMatches = group.groupLabel
            .toLowerCase()
            .includes(searchText);

          // 2. Separately, find which of the inner options match.
          const matchingOptions = group.options.filter((option) =>
            option.label.toLowerCase().includes(searchText)
          );

          // 3. If the group label itself matches, return the entire group with all its original options.
          if (groupLabelMatches) {
            return group;
          }

          // 4. If the group label doesn't match, but some of its options do,
          //    return a new group containing only the matching options.
          if (matchingOptions.length > 0) {
            return { ...group, options: matchingOptions };
          }

          // 5. If neither the group nor any of its options match, discard it.
          return null;
        })
        .filter((group): group is FilterGroupOption => group !== null) // Filter out the discarded groups.
    : (options as FilterOption[]).filter((option) =>
        option.label.toLowerCase().includes(searchText)
      );

  const handleSelectOption = (option: FilterOption) => {
    if (mode === 'single') {
      onChange(option.trpcInput);
      setIsDropdownOpen(false);
      setWrittenText('');
    } else {
      // --- THIS IS THE FIX ---
      // Instead of calculating the new array from the stale `value` prop,
      // we pass an updater function to `onChange`. React guarantees
      onChange((prevValue: string[]) => {
        const currentSelection = [...prevValue]; // Use the guaranteed latest state
        const index = currentSelection.findIndex(
          (item) => String(item) === String(option.trpcInput)
        );

        if (index > -1) {
          // Item exists, so remove it
          currentSelection.splice(index, 1);
        } else {
          // Item doesn't exist, so add it
          currentSelection.push(option.trpcInput);
        }

        return currentSelection; // Return the newly computed state
      });
      // });
    }
  };

  return (
    <div className="relative flex flex-col w-full gap-2">
      <div className="flex w-full gap-2 items-baseline">
        {/** filter label */}
        <label className="font-semibold">{label}</label>
      </div>
      <div ref={containerRef}>
        {/** text bar */}
        <div className="w-full rounded flex items-center bg-gray-800">
          <input
            type="text"
            value={writtenText}
            onFocus={() => setIsDropdownOpen(true)}
            onChange={(e) => {
              setWrittenText(e.target.value);
              setIsDropdownOpen(true);
            }}
            placeholder={placeholder ?? `Filter ${label.toLowerCase()}...`}
            className="w-full pl-3 outline-none"
          />
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="p-2 cursor-pointer"
          >
            <IoIosArrowDown size={20} />
          </button>
        </div>
        {/** dropdown */}
        {isDropdownOpen && (
          <div className="text-xs font-semibold absolute z-10 top-full mt-2 w-full flex flex-col bg-gray-800 rounded p-2 max-h-96 overflow-y-auto scrollbar-thin">
            {isGroupedOptions(filteredOptions)
              ? filteredOptions.map((group) => (
                  <div key={group.groupLabel}>
                    <div className="p-1 text-xs text-gray-500 uppercase">
                      {group.groupLabel}
                    </div>
                    {group.options.map((option) => (
                      <button
                        key={option.trpcInput}
                        onClick={() => handleSelectOption(option)}
                        className={`w-full text-start p-2 rounded cursor-pointer hover:text-blue-400 hover:bg-gray-900 pl-5 ${
                          String(value) === String(option.trpcInput)
                            ? 'text-blue-400'
                            : ''
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                ))
              : // Fallback for original flat options
                (filteredOptions as FilterOption[]).map((option) => (
                  <button
                    key={option.trpcInput}
                    onClick={() => handleSelectOption(option)}
                    className={`w-full text-start p-2 rounded cursor-pointer hover:text-blue-400 hover:bg-gray-900
                    ${
                      // Use .some() to check for inclusion with string comparison
                      mode === 'multi' &&
                      value.some(
                        (item) => String(item) === String(option.trpcInput)
                      )
                        ? 'text-blue-400'
                        : ''
                    }
                    ${
                      // Compare as strings
                      mode === 'single' &&
                      String(value) === String(option.trpcInput)
                        ? 'text-blue-400'
                        : ''
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
          </div>
        )}
      </div>
    </div>
  );
}
