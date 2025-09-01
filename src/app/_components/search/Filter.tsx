// ~/components/FilterDropdown.tsx

'use client';

import { useRef, useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { IoIosArrowDown } from 'react-icons/io';

type Option = {
  trpcInput: string | number;
  label: string;
};

type FilterProps = {
  label: string;
  options: Option[];
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
  }, []); // This effect only needs to run once

  const filteredOptions = options.filter((option) =>
    option.label.toLowerCase().includes(writtenText.toLowerCase())
  );

  const handleSelectOption = (option: Option) => {
    if (mode === 'single') {
      setState(option.trpcInput); // No change needed here
      setIsDropdownOpen(false);
      setWrittenText('');
    } else {
      const currentSelection = [...state];
      // --- FIX: Use findIndex with string comparison ---
      const index = currentSelection.findIndex(
        (item) => String(item) === String(option.trpcInput)
      );

      if (index > -1) {
        currentSelection.splice(index, 1);
      } else {
        currentSelection.push(option.trpcInput);
      }
      setState(currentSelection);
    }
  };

  const handleRemoveOption = (valueToRemove: string | number) => {
    if (mode === 'single') {
      setState('');
    } else {
      // --- FIX: Filter with string comparison ---
      setState(state.filter((v) => String(v) !== String(valueToRemove)));
    }
  };

  const getSelectedOptions = () => {
    if (mode === 'single') {
      // --- FIX: Compare as strings ---
      const selected = options.find(
        (opt) => String(opt.trpcInput) === String(state)
      );
      return selected ? [selected] : [];
    }
    // --- FIX: Compare as strings ---
    return state
      .map((val) =>
        options.find((opt) => String(opt.trpcInput) === String(val))
      )
      .filter((opt): opt is Option => opt !== undefined);
  };

  const selectedOptions = getSelectedOptions();

  return (
    <div className="relative flex flex-col w-full gap-3" ref={containerRef}>
      {/** above search bar */}
      <div className="flex w-full gap-3 items-center">
        {/** filter title */}
        <label className="font-semibold">{label}</label>

        {/** selected options */}
        {selectedOptions.length > 0 && (
          <div className="flex flex-wrap space-x-1">
            {selectedOptions.map((option) => (
              <button
                onClick={() => handleRemoveOption(option.trpcInput)}
                key={option.trpcInput}
                className="flex gap-0 bg-gray-900 text-blue-400 text-xs cursor-pointer"
              >
                {option.label}
                <X size={14} className="relative top-[1px]" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/** search/filter */}
      <div className="w-full relative">
        <input
          type="text"
          value={writtenText}
          onFocus={() => setIsDropdownOpen(true)}
          onChange={(e) => {
            setWrittenText(e.target.value);
            setIsDropdownOpen(true);
          }}
          placeholder={placeholder ?? `Filter ${label.toLowerCase()}...`}
          className="w-full py-2 px-3 bg-gray-800 rounded outline-none"
        />
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer"
        >
          <IoIosArrowDown size={20} />
        </button>
      </div>

      {/** filter dropdown */}
      {isDropdownOpen && (
        <div className="absolute z-10 top-full mt-2 w-full flex flex-col bg-gray-800 rounded p-2 max-h-60 overflow-y-auto scrollbar-thin">
          {filteredOptions.map((option) => (
            <button
              key={option.trpcInput}
              onClick={() => handleSelectOption(option)}
              className={`w-full text-start p-2 rounded flex items-center gap-3 cursor-pointer hover:text-blue-400
              ${
                // --- FIX FOR MULTI-SELECT ---
                // Use .some() to check for inclusion with string comparison
                mode === 'multi' &&
                state.some((item) => String(item) === String(option.trpcInput))
                  ? 'bg-gray-900 text-blue-400'
                  : ''
              }
              ${
                // --- FIX FOR SINGLE-SELECT ---
                // Compare as strings
                mode === 'single' && String(state) === String(option.trpcInput)
                  ? 'bg-gray-900 text-blue-400'
                  : ''
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
