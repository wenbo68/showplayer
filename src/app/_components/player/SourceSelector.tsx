'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import {
  MdOutlineKeyboardArrowDown,
  MdOutlineKeyboardArrowLeft,
} from 'react-icons/md';
import type { Source } from '~/type';

interface SourceSelectorProps {
  sources: Source[];
  selectedProvider?: string;
}

export function SourceSelector({
  sources,
  selectedProvider,
}: SourceSelectorProps) {
  const pathname = usePathname();
  const basePath = pathname.substring(0, pathname.lastIndexOf('/'));

  const [isServersExpanded, setIsServersExpanded] = useState(() => {
    if (typeof window === 'undefined') return false; // Guard for SSR
    return sessionStorage.getItem('isServersExpanded') === 'true';
  });

  useEffect(() => {
    sessionStorage.setItem('isServersExpanded', String(isServersExpanded));
  }, [isServersExpanded]);

  const serversContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = serversContainerRef.current;
    if (!container) return;

    // A small delay can help ensure the element is ready after navigation
    const timer = setTimeout(() => {
      const activeEpisode = container.querySelector('[data-active="true"]');
      if (activeEpisode) {
        activeEpisode.scrollIntoView({
          behavior: 'smooth',
          inline: 'center',
          block: 'nearest',
        });
      }
    }, 100); // 100ms delay

    return () => clearTimeout(timer); // Cleanup the timer
  }, [selectedProvider]);

  return (
    <div className="flex flex-col">
      <div
        className="flex cursor-pointer"
        onClick={() => setIsServersExpanded(!isServersExpanded)}
      >
        <span className="font-semibold">Servers</span>
        {isServersExpanded ? (
          <MdOutlineKeyboardArrowDown className="relative top-[3px] left-[3px]" />
        ) : (
          <MdOutlineKeyboardArrowLeft className="relative top-[3px] left-[3px]" />
        )}
      </div>
      <div
        ref={serversContainerRef}
        className={`flex gap-2 ${
          isServersExpanded ? 'flex-wrap' : 'overflow-x-auto scrollbar-hide'
        }`}
      >
        {sources.map((source) => (
          <Link
            key={source.id}
            href={`${basePath}/${source.provider}`}
            className={`block py-2 rounded shrink-0 w-12 text-center text-sm ${
              source.provider === selectedProvider
                ? 'bg-gray-800'
                : 'hover:bg-gray-800'
            }`}
          >
            {source.provider}
          </Link>
        ))}
      </div>
    </div>
  );
}
