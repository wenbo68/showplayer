'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Source } from '~/type';

interface SourceSelectorProps {
  sources: Source[];
  selectedProvider: string;
}

export function SourceSelector({
  sources,
  selectedProvider,
}: SourceSelectorProps) {
  const pathname = usePathname();
  const basePath = pathname.substring(0, pathname.lastIndexOf('/'));

  return (
    <div className="mt-4">
      <h3 className="text-lg font-semibold mb-2">Sources:</h3>
      <div className="flex flex-wrap gap-2">
        {sources.map((source) => (
          <Link
            key={source.id}
            href={`${basePath}/${source.provider}`}
            className={`px-4 py-2 rounded ${
              source.provider === selectedProvider
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 hover:bg-gray-600'
            }`}
          >
            {source.provider}
          </Link>
        ))}
      </div>
    </div>
  );
}
