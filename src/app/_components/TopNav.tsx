'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect, Suspense } from 'react';
import { AuthShowcase } from '~/app/_components/auth/AuthShowcase';
import { AuthShowcaseFallback } from './auth/AuthShowcaseFallback';

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
      <div className="flex items-center justify-between max-w-7xl mx-auto px-1.5 py-1.5">
        <Link href="/" className="block text-xl font-bold">
          <Image
            src="/showplayer-logo.png" // Path to your icon in the public folder
            alt="ShowPlayer Logo"
            width={36} // The original width of the icon file
            height={36} // The original height of the icon file
            priority // Recommended for logos to preload them
          />
        </Link>
        {/* ✨ 3. Wrap AuthShowcase with the Suspense boundary */}
        <Suspense fallback={<AuthShowcaseFallback />}>
          <AuthShowcase />
        </Suspense>
      </div>
    </nav>
  );
}
