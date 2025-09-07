// ~/app/_components/search/Pagination.tsx

'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';

type PaginationProps = {
  totalCount: number;
  pageSize: number;
  currentPage: number;
};

export default function Pagination({
  totalCount,
  pageSize,
  currentPage,
}: PaginationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const totalPages = Math.ceil(totalCount / pageSize);

  // Don't render pagination if there's only one page or less
  if (totalPages <= 1) {
    return null;
  }

  const handlePageChange = (newPage: number) => {
    // Prevent navigating to pages outside the valid range
    if (newPage < 1 || newPage > totalPages) {
      return;
    }
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(newPage));
    router.push(`${pathname}?${params.toString()}`);
  };

  // --- Logic to calculate the dynamic page range ---
  const pagesToShow = 5;
  let startPage = Math.max(1, currentPage - Math.floor(pagesToShow / 2));
  let endPage = Math.min(totalPages, startPage + pagesToShow - 1);

  // Adjust startPage if endPage is at the boundary
  if (endPage === totalPages) {
    startPage = Math.max(1, totalPages - pagesToShow + 1);
  }

  const pageNumbers = Array.from(
    { length: endPage - startPage + 1 },
    (_, i) => startPage + i
  );
  // --- End of page range logic ---

  const hasPrevPage = currentPage > 1;
  const hasNextPage = currentPage < totalPages;

  const buttonSize = 10;

  return (
    <div className="flex items-center justify-center gap-1 text-sm font-semibold">
      {/* First Page Button */}
      <button
        onClick={() => handlePageChange(1)}
        disabled={!hasPrevPage}
        className={`hover:enabled:text-blue-400 hover:enabled:cursor-pointer h-${buttonSize} w-${buttonSize} flex items-center justify-center`}
        aria-label="Go to first page"
      >
        <ChevronsLeft size={16} />
      </button>

      {/* Previous Page Button */}
      <button
        onClick={() => handlePageChange(currentPage - 1)}
        disabled={!hasPrevPage}
        className={`hover:enabled:text-blue-400 hover:enabled:cursor-pointer h-${buttonSize} w-${buttonSize} flex items-center justify-center`}
        aria-label="Go to previous page"
      >
        <ChevronLeft size={16} />
      </button>

      {/* Page Number Buttons */}
      {/* <div className="flex items-center gap-2"> */}
      {pageNumbers.map((page) => (
        <button
          key={page}
          onClick={() => handlePageChange(page)}
          disabled={currentPage === page}
          className={`h-${buttonSize} w-${buttonSize} flex items-center justify-center transition-colors
              ${
                currentPage === page
                  ? 'text-blue-400'
                  : 'hover:text-blue-400 cursor-pointer'
              }`}
        >
          {page}
        </button>
      ))}
      {/* </div> */}

      {/* Next Page Button */}
      <button
        onClick={() => handlePageChange(currentPage + 1)}
        disabled={!hasNextPage}
        className={`hover:enabled:text-blue-400 hover:enabled:cursor-pointer h-${buttonSize} w-${buttonSize} flex items-center justify-center`}
        aria-label="Go to next page"
      >
        <ChevronRight size={16} />
      </button>

      {/* Last Page Button */}
      <button
        onClick={() => handlePageChange(totalPages)}
        disabled={!hasNextPage}
        className={`hover:enabled:text-blue-400 hover:enabled:cursor-pointer h-${buttonSize} w-${buttonSize} flex items-center justify-center`}
        aria-label="Go to last page"
      >
        <ChevronsRight size={16} />
      </button>
    </div>
  );
}
