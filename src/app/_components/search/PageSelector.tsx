// ~/app/_components/search/Pagination.tsx

'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { NavButton } from '../NavButton';

type PageSelectorProps = {
  currentPage: number;
  totalPages: number;
};

export default function PageSelector({
  currentPage,
  totalPages,
}: PageSelectorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

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
    window.scrollTo(0, 0); // <-- Add this line
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

  return (
    <div className="flex items-center justify-center gap-1">
      {/* First Page Button */}
      <NavButton
        onClick={() => handlePageChange(1)}
        isDisabled={!hasPrevPage}
        aria-label="Go to first page"
      >
        <ChevronsLeft size={16} />
      </NavButton>

      {/* Previous Page Button */}
      <NavButton
        onClick={() => handlePageChange(currentPage - 1)}
        isDisabled={!hasPrevPage}
        aria-label="Go to previous page"
      >
        <ChevronLeft size={16} />
      </NavButton>

      {/* Page Number Buttons */}
      {pageNumbers.map((page) => (
        <NavButton
          key={page}
          onClick={() => handlePageChange(page)}
          isActive={currentPage === page}
        >
          {page}
        </NavButton>
      ))}

      {/* Next Page Button */}
      <NavButton
        onClick={() => handlePageChange(currentPage + 1)}
        isDisabled={!hasNextPage}
        aria-label="Go to next page"
      >
        <ChevronRight size={16} />
      </NavButton>

      {/* Last Page Button */}
      <NavButton
        onClick={() => handlePageChange(totalPages)}
        isDisabled={!hasNextPage}
        aria-label="Go to last page"
      >
        <ChevronsRight size={16} />
      </NavButton>
    </div>
  );
}
