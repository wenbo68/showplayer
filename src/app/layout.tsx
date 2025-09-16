// /src/app/layout.tsx

import '~/styles/globals.css';

import { type Metadata } from 'next';
import { Geist } from 'next/font/google';

import { TRPCReactProvider } from '~/trpc/react';
import { TopNav } from '~/app/_components/TopNav';
import { MediaPopupProvider } from './_contexts/MediaPopupContext';
import { AuthProvider } from './_contexts/AuthContext';
import { env } from '~/env';

export const metadata: Metadata = {
  title: 'Showplayer',
  description: 'Stream movies and tv shows for free without popups',
  metadataBase: new URL(
    env.FRONTEND_URL === '*' ? `http://localhost:3000` : env.FRONTEND_URL
  ),

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
        <TRPCReactProvider>
          <AuthProvider>
            <MediaPopupProvider>
              <TopNav /> {/* ✨ Add the navigation bar here */}
              <main className="max-w-7xl mx-auto w-full flex-grow py-4">
                {children}
              </main>
            </MediaPopupProvider>
          </AuthProvider>
        </TRPCReactProvider>
      </body>
    </html>
  );
}

// link to google analytics
// create a discord server for showplayer

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
