'use client';

import { IoGrid } from 'react-icons/io5';

interface SelectorPanelProps {
  title: string;
  isExpanded: boolean;
  onToggle: () => void;
  containerRef?: React.RefObject<HTMLDivElement | null>;
  children: React.ReactNode;
}

export function SelectorPanel({
  title,
  isExpanded,
  onToggle,
  containerRef,
  children,
}: SelectorPanelProps) {
  return (
    <div className="flex flex-col gap-2">
      <div
        className="flex cursor-pointer items-center gap-2 group"
        onClick={onToggle}
      >
        <div className="flex items-center justify-center text-base">
          {title}
        </div>
        <IoGrid
          size={15}
          className={`${
            isExpanded ? `text-blue-400` : `group-hover:text-blue-400`
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
