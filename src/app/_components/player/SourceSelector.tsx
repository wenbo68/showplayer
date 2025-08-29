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
  selectedProvider?: number;
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
    if (!container || isServersExpanded) return;

    const activeEpisode = container.querySelector<HTMLElement>(
      '[data-active="true"]'
    );
    if (activeEpisode) {
      const containerWidth = container.offsetWidth;
      const elementLeft = activeEpisode.offsetLeft;
      const newScrollPosition = elementLeft - containerWidth / 2;

      // Apply the scroll only to the horizontal container
      container.scrollTo({
        left: newScrollPosition,
        behavior: 'smooth',
      });
    }
  }, [selectedProvider, isServersExpanded]); // Reruns when the page/episode or season changes

  return (
    <div className="flex flex-col gap-0">
      <div
        className="flex cursor-pointer"
        onClick={() => setIsServersExpanded(!isServersExpanded)}
      >
        <span className="font-semibold">Servers</span>
        {isServersExpanded ? (
          <MdOutlineKeyboardArrowDown className="relative top-[3px] left-[1px]" />
        ) : (
          <MdOutlineKeyboardArrowLeft className="relative top-[3px] left-[1px]" />
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
            className={`block py-2 rounded shrink-0 w-10 text-center text-sm ${
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
