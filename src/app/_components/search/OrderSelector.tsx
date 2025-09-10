'use client';

import { useRef, useState, useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Cookies from 'js-cookie';
import { CgArrowsExchangeV } from 'react-icons/cg';

// Assuming you create a shared types file or define these here
type FilterOption = { trpcInput: string; label: string };
type OptionGroup = { groupLabel: string; options: FilterOption[] };

// --- Helper function to find the details of the currently selected option ---
function findOrderLabels(
  orderOptions: OptionGroup[],
  currentOption: string
): { groupLabel: string; optionLabel: string } {
  for (const group of orderOptions) {
    const foundOption = group.options.find(
      (opt) => opt.trpcInput === currentOption
    );
    if (foundOption) {
      return {
        groupLabel: group.groupLabel,
        optionLabel: foundOption.label,
      };
    }
  }
  return { groupLabel: 'Unknown', optionLabel: 'Unknown' };
}

//
export default function OrderSelector({ options }: { options: OptionGroup[] }) {
  // 1. Add client-side hooks for URL interaction
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // 2. Derive the current value directly from the URL
  const orderFromUrl = searchParams.get('order') ?? 'popularity-desc';

  // Effect to handle "clicking away"
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 3. Create a handler that updates the URL
  const handleOrderChange = (newSortValue: string) => {
    setIsDropdownOpen(false);
    const params = new URLSearchParams(searchParams.toString());

    // Update the order and reset the page to 1
    params.set('order', newSortValue);
    params.set('page', '1');

    // Persist the choice for other pages
    // sessionStorage.setItem('lastUsedOrder', newSortValue);
    Cookies.set('lastUsedOrder', newSortValue, { expires: 7 });

    router.push(`${pathname}?${params.toString()}`);
  };

  const { groupLabel, optionLabel } = findOrderLabels(options, orderFromUrl);

  return (
    <div
      className="relative min-w-[200px] flex items-center justify-end text-xs font-semibold"
      ref={containerRef}
    >
      <button
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className="flex gap-0 cursor-pointer hover:text-blue-400 transition"
      >
        <CgArrowsExchangeV size={16} />
        {`${groupLabel}: ${optionLabel}`}
      </button>

      {isDropdownOpen && (
        <div className="absolute z-10 top-full mt-2 w-48 flex flex-col bg-gray-800 rounded p-2 max-h-96 overflow-y-auto scrollbar-thin">
          {options.map((group) => (
            <div key={group.groupLabel}>
              <div className="p-1 text-xs text-gray-500 uppercase">
                {group.groupLabel}
              </div>
              {group.options.map((option) => (
                <button
                  key={option.trpcInput}
                  // 4. Call the new internal handler
                  onClick={() => handleOrderChange(option.trpcInput)}
                  className={`w-full text-start p-2 rounded cursor-pointer hover:text-blue-400 hover:bg-gray-900 pl-5 ${
                    orderFromUrl === option.trpcInput ? 'text-blue-400' : ''
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
