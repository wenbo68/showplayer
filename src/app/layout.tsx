// /src/app/layout.tsx

import '~/styles/globals.css';

import { type Metadata } from 'next';
import { Geist } from 'next/font/google';
import { SpeedInsights } from '@vercel/speed-insights/next';

import { TopNav } from '~/app/_components/TopNav';
import { env } from '~/env';
import { ContextProviders } from './_contexts/ContextProviders';
import { Suspense } from 'react';
import Script from 'next/script';

export const metadata: Metadata = {
  title: 'Showplayer',
  description: 'Stream movies, tv shows, and animes for free without popup ads',
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
  const gaMeasurementId = env.GA_MEASUREMENT_ID;
  return (
    <html lang="en" className={`${geist.variable}`}>
      {/* Add your Google Analytics scripts here */}
      {gaMeasurementId && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${gaMeasurementId}`}
            strategy="afterInteractive"
          />
          <Script id="google-analytics" strategy="afterInteractive">
            {`
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  gtag('js', new Date());
                  gtag('config', '${gaMeasurementId}');
                `}
          </Script>
        </>
      )}
      <body className="flex min-h-screen flex-col bg-gray-900 text-gray-400">
        <Suspense fallback={null}>
          <ContextProviders>
            <TopNav />
            <main className="max-w-7xl mx-auto w-full flex-grow p-2 py-4">
              {children}
            </main>
          </ContextProviders>
        </Suspense>
        <SpeedInsights />
      </body>
    </html>
  );
}

// finish optimizing fcp and lcp for home page.

// in list filter, add option that shows requested media of the user

// add aniwatch style carousel. make topnav sticky and semi transparent.
// it's ok to have certain comp (eg carousel and top nav) full width while others are 7xl for ad purposes (eg opgg)

// add bot nav

// add puppeteer stealth to fetch vidfast

// adless src will be fetched daily at midnight together.
// but users requests can be handled together once every 5 minutes (they can only watch ad version tho).

// can use media popup as carousel

// need to make home page load faster (faster initial load or give client skeleton faster and fill later)
// add provider embeds (with ads) as well and let user choose
// use run time (only present in mv details) instead of updatedDate for mv

// create a discord server for showplayer

// make media buttons display info according to the search filters (horizontal strips including or not including media description)
// also should media buttons display availability, total episodes, missing episodes?

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
