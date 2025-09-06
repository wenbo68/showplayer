// ~/app/_components/search/Filter.tsx

'use client';

import { useRef, useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { IoIosArrowDown } from 'react-icons/io';

// --- Define the shape of our options ---
type FilterOption = {
  trpcInput: string | number;
  label: string;
};

type OptionGroup = {
  groupLabel: string;
  options: FilterOption[];
};

// Type guard to check if we have grouped options
function isGroupedOptions(
  options: (FilterOption | OptionGroup)[]
): options is OptionGroup[] {
  return (
    options.length > 0 && options[0] !== undefined && 'groupLabel' in options[0]
  );
}

type FilterProps = {
  label: string;
  options: (FilterOption | OptionGroup)[];
  placeholder?: string;
} & (
  | {
      mode: 'single';
      state: string | number;
      setState: (value: string | number) => void;
    }
  | {
      mode: 'multi';
      state: (string | number)[];
      setState: (value: (string | number)[]) => void;
    }
);

export default function Filter(props: FilterProps) {
  const { label, options, placeholder, mode, state, setState } = props;

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

  // const optionsGrouped = isGroupedOptions(options);

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
        .filter((group): group is OptionGroup => group !== null) // Filter out the discarded groups.
    : (options as FilterOption[]).filter((option) =>
        option.label.toLowerCase().includes(searchText)
      );

  const handleSelectOption = (option: FilterOption) => {
    if (mode === 'single') {
      setState(option.trpcInput);
      setIsDropdownOpen(false);
      setWrittenText('');
    } else {
      const currentSelection = [...state];
      const index = currentSelection.findIndex(
        (item) => String(item) === String(option.trpcInput)
      );
      if (index > -1) {
        currentSelection.splice(index, 1);
      } else {
        currentSelection.unshift(option.trpcInput);
      }
      setState(currentSelection);
    }
  };

  const handleRemoveOption = (valueToRemove: string | number) => {
    if (mode === 'single') {
      setState('');
    } else {
      setState(state.filter((v) => String(v) !== String(valueToRemove)));
    }
  };

  // --- Smarter getter for both flat and grouped options ---
  const getSelectedOptions = (): FilterOption[] => {
    const allOptionsFlat = isGroupedOptions(options)
      ? options.flatMap((g) => g.options)
      : (options as FilterOption[]);
    if (mode === 'single') {
      const selected = allOptionsFlat.find(
        (opt) => String(opt.trpcInput) === String(state)
      );
      return selected ? [selected] : [];
    }
    return state
      .map((val) =>
        allOptionsFlat.find((opt) => String(opt.trpcInput) === String(val))
      )
      .filter((opt): opt is FilterOption => opt !== undefined);
  };

  const selectedOptions = getSelectedOptions();

  return (
    <div className="relative flex flex-col w-[170px] lg:w-[194px] gap-3">
      <div className="flex w-full gap-2 items-baseline">
        {/** filter label */}
        <label className="font-semibold">{label}</label>
        {/* * selected option labels */}
        {selectedOptions.length > 0 && mode === 'single' && (
          <div className="flex flex-wrap gap-1">
            {selectedOptions.map((option) => (
              <button
                disabled={mode === 'single'}
                onClick={() => handleRemoveOption(option.trpcInput)}
                key={option.trpcInput}
                className={`flex items-center gap-1 bg-gray-800 ${
                  mode === 'single' ? `` : `hover:text-blue-400 cursor-pointer`
                } rounded px-2 text-xs font-semibold`}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
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
          <div className="text-xs font-semibold absolute z-10 top-full mt-2 w-full flex flex-col bg-gray-800 rounded p-2 max-h-60 overflow-y-auto scrollbar-thin">
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
                          String(state) === String(option.trpcInput)
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
                      // --- FIX FOR MULTI-SELECT ---
                      // Use .some() to check for inclusion with string comparison
                      mode === 'multi' &&
                      state.some(
                        (item) => String(item) === String(option.trpcInput)
                      )
                        ? 'text-blue-400'
                        : ''
                    }
                    ${
                      // --- FIX FOR SINGLE-SELECT ---
                      // Compare as strings
                      mode === 'single' &&
                      String(state) === String(option.trpcInput)
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
