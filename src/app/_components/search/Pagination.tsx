// ~/app/_components/search/PaginationControls.tsx

'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';

type PaginationControlsProps = {
  totalCount: number;
  pageSize: number;
  currentPage: number;
};

export default function Pagination({
  totalCount,
  pageSize,
  currentPage,
}: PaginationControlsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const totalPages = Math.ceil(totalCount / pageSize);

  // if (totalPages <= 1) {
  //   return null; // Don't render pagination if there's only one page
  // }

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(newPage));
    router.push(`${pathname}?${params.toString()}`);
  };

  const hasPrevPage = currentPage > 1;
  const hasNextPage = currentPage < totalPages;

  return (
    <div className="flex items-center justify-center gap-4 text-sm">
      <button
        onClick={() => handlePageChange(currentPage - 1)}
        disabled={!hasPrevPage}
        className="flex items-center gap-2 rounded-md border border-gray-600 bg-gray-700 px-3 py-2 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:enabled:bg-gray-600"
      >
        <ChevronLeft size={16} />
        Previous
      </button>

      <span className="font-semibold text-gray-300">
        Page {currentPage} of {totalPages}
      </span>

      <button
        onClick={() => handlePageChange(currentPage + 1)}
        disabled={!hasNextPage}
        className="flex items-center gap-2 rounded-md border border-gray-600 bg-gray-700 px-3 py-2 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:enabled:bg-gray-600"
      >
        Next
        <ChevronRight size={16} />
      </button>
    </div>
  );
}
