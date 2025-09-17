'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react'; // Using lucide for a clean icon

export function BackButton() {
  const [backUrl, setBackUrl] = useState<string>('/search'); // Default fallback URL

  useEffect(() => {
    // This effect runs once on the client after the component mounts
    const storedUrl = sessionStorage.getItem('previousPageUrl');
    if (storedUrl) {
      setBackUrl(storedUrl);
    }
  }, []); // Empty dependency array ensures it only runs once

  return (
    <Link
      href={backUrl}
      className="inline-flex items-center gap-2 text-sm font-semibold text-gray-400 transition hover:text-blue-400"
    >
      <ArrowLeft size={20} />
      <span>Back</span>
    </Link>
  );
}
