// ~/app/search/error.tsx
'use client'; // Error components must be Client Components

import Link from 'next/link';
import { useEffect } from 'react';

export default function SearchError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Optionally log the error to an error reporting service
    console.error(error);
  }, [error]);

  // Handle the specific UNAUTHORIZED error from tRPC
  if (error.message.includes('UNAUTHORIZED')) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-5 font-semibold">
        <h2 className="text-lg">Not Authorized!</h2>
        <p className="">Only admin can access this page.</p>
        {/* <Link
          href="/api/auth/signin"
          className="rounded bg-blue-600 px-4 py-2 text-gray-300 hover:bg-blue-500 text-sm"
        >
          Log In
        </Link> */}
      </div>
    );
  }

  // Generic fallback for other errors
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-5 font-semibold">
      <h2 className="text-lg">Something went wrong!</h2>
      <p className="">Please try again.</p>
      <button
        onClick={() => reset()}
        className="rounded bg-blue-600 px-4 py-2 text-gray-300 hover:bg-blue-500 text-sm"
      >
        Try again
      </button>
    </div>
  );
}
