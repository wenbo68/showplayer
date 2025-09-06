import { NextRequest, NextResponse } from 'next/server';
import { withCors } from '~/app/_utils/api';

//bunny caching behavior is weird: different comb of Smart Cache and Optimize for Video Delivery result in different caching behavior

// rewrites vid seg urls within the m3u8 playlist
function rewritePlaylist(
  playlistText: string,
  proxyUrl: string,
  playlistUrl: string,
  headers: Headers
): string {
  // We need the original playlist's URL to resolve relative vid seg paths
  const playlistUrlObj = new URL(playlistUrl);
  // base url = protocol + domain
  const playlistBaseUrl = `${playlistUrlObj.protocol}//${playlistUrlObj.host}`;
  // path = the path/folder the playlist is in
  const playlistPath = playlistUrlObj.pathname.substring(
    0,
    playlistUrlObj.pathname.lastIndexOf('/')
  );

  // need to find how to relay headers to all vid seg urls correctly
  return playlistText
    .split('\n')
    .map((line) => {
      line = line.trim();
      if (line.length === 0 || line.startsWith('#')) {
        return line;
      }

      // If not empty and not a comment => then it's vid seg url
      // Step 1. prepare the vid seg url
      let vidSegUrl: string;
      if (line.startsWith('http')) {
        // It's already an absolute URL
        vidSegUrl = line;
      } else if (line.startsWith('/')) {
        // It's a root-relative path (starts from root)
        vidSegUrl = `${playlistBaseUrl}${line}`;
      } else {
        // It's a relative path (starts from the current path => same path as playlist)
        vidSegUrl = `${playlistBaseUrl}${playlistPath}/${line}`;
      }

      // Step 2: new url = point to proxy + params (vidSegUrl + headers)
      const newUrl = new URL(proxyUrl);
      newUrl.searchParams.set('url', vidSegUrl);
      for (const [key, value] of headers.entries()) {
        if (key.toLowerCase() !== 'url') {
          newUrl.searchParams.set(key, value);
        }
      }

      // use absolute URL for the rewritten vid seg
      return newUrl.toString();
    })
    .join('\n');
}

// could be playlist url or vidseg url
export async function GET(request: NextRequest) {
  console.log(`[GET] Proxy request received.`);
  const { searchParams } = new URL(request.url);

  // 1. Extract the target URL
  console.log(`[GET] extracting target url.`);
  const targetUrl = searchParams.get('url');
  if (!targetUrl) {
    return new NextResponse(
      JSON.stringify({ error: 'Target URL is required' }),
      { status: 400, headers: withCors({ 'Content-Type': 'application/json' }) }
    );
  }

  // 2. Prepare the headers for the outgoing request
  console.log(`[GET] extracting headers.`);
  const headers = new Headers();
  for (const [key, value] of searchParams.entries()) {
    // Add all search parameters except for 'url' itself to the headers
    if (key !== 'url') {
      headers.set(key, value);
    }
  }

  // 3. Make the proxied request
  try {
    // Step 1: Fetch the resource using the url and header
    console.log(`[GET] Fetching target URL.`);
    const response = await fetch(targetUrl, { headers });

    if (!response.ok) {
      const errorText = await response.text();
      return new NextResponse(errorText, {
        status: response.status,
        headers: withCors(),
      });
    }

    const contentType = response.headers.get('content-type') || '';

    // Step 2: return result to frontend
    const buffer = Buffer.from(await response.arrayBuffer());

    if (buffer.toString('utf-8', 0, 7) === '#EXTM3U') {
      // if playlist => rewrite the vidseg urls to be directed to proxy and include our headers here => send it back to frontend
      console.log(`it's a playlist`);
      const playlistText = buffer.toString('utf-8');
      const proxyUrl = `${process.env.BUNNY_URL}/api/proxy`;
      const rewrittenPlaylist = rewritePlaylist(
        playlistText,
        proxyUrl,
        targetUrl,
        headers
      );

      return new NextResponse(rewrittenPlaylist, {
        headers: withCors({
          'Content-Type': contentType,
          'Cache-Control':
            'public, max-age=15, s-maxage=15, stale-while-revalidate=30',
        }),
      });
    } else {
      // if .ts (vid seg) or another file type => just send back to frontend
      console.log(`it's a vidseg`);

      return new NextResponse(buffer, {
        headers: withCors({
          'Content-Type': contentType,
          'Cache-Control':
            'public, max-age=3600, s-maxage=3600, stale-while-revalidate=60',
        }),
      });
    }
  } catch (error) {
    return new NextResponse(
      JSON.stringify({ error: 'Failed to proxy request' }),
      { status: 500, headers: withCors({ 'Content-Type': 'application/json' }) }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { headers: withCors() });
}
