// /src/app/layout.tsx

import '~/styles/globals.css';

import { type Metadata } from 'next';
import { Geist } from 'next/font/google';
import { SpeedInsights } from '@vercel/speed-insights/next';

import { TopNav } from '~/app/_components/TopNav';
import { env } from '~/env';
import { ContextProviders } from './_contexts/ContextProviders';
import { Suspense } from 'react';

export const metadata: Metadata = {
  title: 'Showplayer',
  description: 'Stream movies and tv shows for free without popups',
  metadataBase: new URL(env.AUTH_URL),

  // Points to your manifest file for PWA capabilities (website can be saved like apps)
  // the manifest file calls android-chrome images internally
  manifest: '/site.webmanifest',

  // Defines all your site icons
  icons: {
    // Standard favicons for browser tabs
    icon: [
      // fallback for older browsers
      { url: '/favicon.ico', sizes: 'any' },
      // png for modern browsers
      { url: '/favicon-16x16.png', type: 'image/png', sizes: '16x16' },
      { url: '/favicon-32x32.png', type: 'image/png', sizes: '32x32' },
    ],
    // Icon for Apple devices (when saved to home screen)
    apple: '/apple-touch-icon.png',
  },
};

const geist = Geist({
  subsets: ['latin'],
  variable: '--font-geist-sans',
});

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // const session = await auth();
  return (
    <html lang="en" className={`${geist.variable}`}>
      <body className="flex min-h-screen flex-col bg-gray-900 text-gray-400">
        <Suspense fallback={null}>
          <ContextProviders>
            <TopNav />
            <main className="max-w-7xl mx-auto w-full flex-grow px-2 py-4">
              {children}
            </main>
          </ContextProviders>
        </Suspense>
        <SpeedInsights />
      </body>
    </html>
  );
}

// add trending as auto sliding backdrops at the top
// test cron trigger

// need to add a one-time-use function to get genre/origin for all media missing them
// make logo s thicker

// add players with ads as well

// link to google analytics
// create a discord server for showplayer
// create github actions to automate building docker image and pulling that image in vps

// make media buttons display info according to the search filters (horizontal strips including or not including media description)
// also should media buttons display availability, total episodes, missing episodes?

// use run time (only present in mv details) instead of updatedDate for mv

// if media title isn't english -> don't add to db
// update trpc procedure to update popularity, rating, vote count when fetching new media via tmdb api

// allow 3 modes for season/episode selector: horizontal scrolling, grid, detailed vertical scrolling (show poster, title, description)

// search bar, mv/tv, genre, origin, release year,
// airing status (finished: all episodes are older than yesterday, airing: at least 1 episode is in future, not released: releaseDate in the future),
// availability (full: all episodes have source, partial: at least 1 episode have no src, none: 0 episodes or no episode have src)

// add display modes to search page (grid, detailed grid, horizontal strips)
// add vidfast
// add recapture/cloudflare at access/login

// if a movie belongs to a collection, fetch all others in the collection (and display them as related?)
// add recommendations (just implement your own, tmdb recommendations are too random)
// add comment function
// add rating for each mv/tv (make it influence the top rated lists)

// add voting function: vip can name show/mv, then users can vote. top 10 will be added.
// allow commenting on the votes

// player page: add report function (if theres no src) so that i can manually get m3u8 and insert to db
// fix the player to the top while i scroll down
