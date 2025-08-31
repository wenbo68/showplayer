// ~/components/FilterDropdown.tsx

'use client';

import { useRef, useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { IoIosArrowDown } from 'react-icons/io';

type Option = {
  value: string | number;
  label: string;
};

type FilterProps = {
  label: string;
  options: Option[];
  placeholder?: string;
} & (
  | {
      mode: 'single';
      value: string | number;
      onChange: (value: string | number) => void;
    }
  | {
      mode: 'multi';
      value: (string | number)[];
      onChange: (value: (string | number)[]) => void;
    }
);

export default function Filter(props: FilterProps) {
  const { label, options, placeholder } = props;

  const [inputValue, setInputValue] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false); // NEW: State to track focus
  const containerRef = useRef<HTMLDivElement>(null);

  // Effect to handle "clicking away"
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
        setIsFocused(false); // Remove focus
        setInputValue(''); // Clear input text
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []); // This effect only needs to run once

  const filteredOptions = options.filter((option) =>
    option.label.toLowerCase().includes(inputValue.toLowerCase())
  );

  const handleSelectOption = (option: Option) => {
    if (props.mode === 'single') {
      props.onChange(String(option.value));
      setIsDropdownOpen(false);
      setIsFocused(false);
      setInputValue('');
    } else {
      const currentSelection = [...props.value];
      const index = currentSelection.indexOf(option.value);
      if (index > -1) {
        currentSelection.splice(index, 1); // Remove if exists
      } else {
        currentSelection.push(option.value); // Add if not
      }
      props.onChange(currentSelection);
      setInputValue(''); // Clear input after selection to allow further filtering
    }
  };

  const handleRemoveOption = (valueToRemove: string | number) => {
    if (props.mode === 'multi') {
      props.onChange(props.value.filter((v) => v !== valueToRemove));
    }
  };

  // Helper to get the full Option object from a value
  const getSelectedOptions = () => {
    if (props.mode === 'single') {
      const selected = options.find((opt) => opt.value === props.value);
      return selected ? [selected] : [];
    }
    return props.value
      .map((val) => options.find((opt) => opt.value === val))
      .filter((opt): opt is Option => opt !== undefined);
  };

  const selectedOptions = getSelectedOptions();

  return (
    <div className="relative flex flex-col w-full gap-3" ref={containerRef}>
      <div className="flex w-full gap-3 items-center">
        <label className="font-semibold">{label}</label>

        {selectedOptions.length > 0 && (
          <div className="flex flex-wrap gap-0">
            {selectedOptions.map((option) => (
              <button
                onClick={() =>
                  props.mode === 'single'
                    ? props.onChange('')
                    : handleRemoveOption(option.value)
                }
                key={option.value}
                className="flex items-center gap-1 bg-gray-900 text-blue-400 px-2 py-1 rounded-md text-xs cursor-pointer"
              >
                {option.label}
                {/* <button
                  onClick={() =>
                    props.mode === 'single'
                      ? props.onChange('')
                      : handleRemoveOption(option.value)
                  }
                  className="hover:text-white"
                > */}
                <X size={14} />
                {/* </button> */}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="w-full relative">
        <input
          type="text"
          value={inputValue}
          onFocus={() => {
            setIsFocused(true);
            setIsDropdownOpen(true);
          }}
          onChange={(e) => {
            setInputValue(e.target.value);
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

      {isDropdownOpen && (
        <div className="absolute z-10 top-full mt-2 w-full flex flex-col bg-gray-800 rounded p-2 shadow-lg max-h-60 overflow-y-auto scrollbar-thin">
          {filteredOptions.map((option) => (
            <label
              key={option.value}
              className={`w-full text-start p-2 rounded flex items-center gap-3 cursor-pointer hover:text-blue-400
              ${
                props.mode === 'multi' && props.value.includes(option.value)
                  ? 'bg-gray-900 text-blue-400'
                  : ''
              }
              ${
                props.mode === 'single' && props.value === option.value
                  ? 'bg-gray-900 text-blue-400'
                  : ''
              }`}
            >
              <span
                onClick={() => handleSelectOption(option)}
                className="flex-1"
              >
                {option.label}
              </span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

// NOTE: I've omitted the repeated JSX for the dropdown list for brevity,
// as it remains the same. You can copy it from your previous version.
