'use client';

import { useEffect } from 'react';

/**
 * A hook that automatically scrolls a container to center the active element.
 * @param containerRef Ref to the scrollable container element.
 * @param dependency The value that, when changed, should trigger the scroll.
 */
export function useAutoScroll(
  containerRef: React.RefObject<HTMLDivElement | null>,
  dependency: any
) {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const activeElement = container.querySelector<HTMLElement>('.is-active');
    if (activeElement) {
      const containerWidth = container.offsetWidth;
      const elementLeft = activeElement.offsetLeft;
      // Calculate scroll position to center the active element
      const newScrollPosition =
        elementLeft - containerWidth / 2 + activeElement.offsetWidth / 2;

      container.scrollTo({ left: newScrollPosition, behavior: 'smooth' });
    }
  }, [dependency, containerRef]);
}
