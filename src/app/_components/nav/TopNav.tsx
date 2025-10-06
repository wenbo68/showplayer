'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect, Suspense } from 'react';
import { AuthShowcase } from '~/app/_components/auth/AuthShowcase';
import { AuthShowcaseFallback } from '../auth/AuthShowcaseFallback';
import { IoSearchSharp } from 'react-icons/io5';

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
      <div className="flex items-center justify-between max-w-7xl mx-auto px-1.5 py-1">
        <Link href="/" className="block text-xl font-bold">
          <Image
            src="/showplayer-logo.png" // Path to your icon in the public folder
            alt="ShowPlayer Logo"
            width={40} // The original width of the icon file
            height={40} // The original height of the icon file
            priority // Recommended for logos to preload them
          />
        </Link>
        {/* ✨ 3. Wrap AuthShowcase with the Suspense boundary */}
        <div className="flex gap-4">
          {/* <div className="flex items-center justify-center">
            <Link href={'/search?&order=popularity-desc&page=1'}>
              <IoSearchSharp size={32} />
            </Link>
          </div> */}
          <Link
            href={'/donate'}
            onClick={() => {
              sessionStorage.setItem('previousPageUrl', window.location.href);
            }}
            className="block rounded bg-blue-600 hover:bg-blue-500 text-gray-300 px-4 py-2 text-sm font-semibold transition cursor-pointer"
          >
            Donate
          </Link>

          <Suspense fallback={<AuthShowcaseFallback />}>
            <AuthShowcase />
          </Suspense>
        </div>
      </div>
    </nav>
  );
}
