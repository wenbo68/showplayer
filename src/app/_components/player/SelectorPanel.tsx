'use client';

import { IoGrid } from 'react-icons/io5';

interface SelectorPanelProps {
  title: string;
  isExpanded: boolean;
  onToggleExpand: () => void;
  containerRef?: React.RefObject<HTMLDivElement | null>;
  children: React.ReactNode;
}

export function SelectorPanel({
  title,
  isExpanded,
  onToggleExpand,
  containerRef,
  children,
}: SelectorPanelProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <div className="flex items-center justify-center text-base">
          {title}
        </div>
        <IoGrid
          size={15}
          onClick={onToggleExpand}
          className={`cursor-pointer ${
            isExpanded ? `text-blue-400` : `hover:text-blue-400`
          }`}
        />
      </div>
      <div
        ref={containerRef}
        className={`flex gap-1 flex-wrap ${
          isExpanded ? '' : 'max-h-[15vh] overflow-y-auto scrollbar-thin'
        }`}
      >
        {children}
      </div>
    </div>
  );
}
