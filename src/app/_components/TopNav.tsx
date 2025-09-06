'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { AuthShowcase } from '~/app/_components/auth/AuthShowcase';

export function TopNav() {
  const [lastScrollY, setLastScrollY] = useState(0);
  const [navPosition, setNavPosition] = useState(0);

  const NAVBAR_HEIGHT = 56;

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      // Don't do anything if the user is at the very top of the page
      if (currentScrollY <= 0) {
        setNavPosition(0);
        setLastScrollY(currentScrollY);
        return;
      }

      // Calculate the difference in scroll position
      const scrollDelta = currentScrollY - lastScrollY;

      // Calculate the new position for the navbar
      const newNavPosition = navPosition - scrollDelta;

      // Clamp the position so it doesn't go off-screen
      const clampedNavPosition = Math.max(
        -NAVBAR_HEIGHT,
        Math.min(0, newNavPosition)
      );

      setNavPosition(clampedNavPosition);
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    // Cleanup function to remove the event listener
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [lastScrollY, navPosition]);

  return (
    <nav
      className="w-full bg-gray-800 sticky top-0 z-50 transition-transform duration-0"
      style={{ transform: `translateY(${navPosition}px)` }}
    >
      <div className="flex items-center justify-between max-w-7xl mx-auto px-4 py-2">
        <Link href="/" className="block text-xl font-bold">
          SP
        </Link>
        <AuthShowcase />
      </div>
    </nav>
  );
}
