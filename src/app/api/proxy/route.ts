import { NextRequest, NextResponse } from 'next/server';

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
      const newUrl = new URL(proxyUrl, 'http://localhost');
      newUrl.searchParams.set('url', vidSegUrl);
      for (const [key, value] of headers.entries()) {
        if (key.toLowerCase() !== 'url') {
          newUrl.searchParams.set(key, value);
        }
      }

      // only include relative proxy path (/api/proxy) + params
      return newUrl.pathname + newUrl.search;
    })
    .join('\n');
}

// could be playlist url or vid seg url
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  // 1. Extract the target URL
  const targetUrl = searchParams.get('url');

  if (!targetUrl) {
    return NextResponse.json(
      { error: 'Target URL is required' },
      { status: 400 }
    );
  }

  // 2. Prepare the headers for the outgoing request
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
    console.log('[PROXY] Initiating fetch for:', targetUrl);
    const response = await fetch(targetUrl, {
      headers: headers,
    });

    if (!response.ok) {
      console.error(
        `[PROXY] Error: Fetch failed with status ${response.status}`
      );
      // Log the error body text to see the error message
      const errorText = await response.text();
      console.error('[PROXY] Error body:', errorText);
      return new NextResponse(errorText, { status: response.status });
    }

    const contentType = response.headers.get('content-type') || '';
    // console.log(`[PROXY] Step 3: Content-Type is "${contentType}"`);

    // Step 2: return result to frontend
    const buffer = Buffer.from(await response.arrayBuffer());

    if (buffer.toString('utf-8', 0, 7) === '#EXTM3U') {
      // if playlist => rewrite the vidseg urls to be directed to proxy and include our headers here => send it back to frontend
      console.log(`it's a playlist`);
      const playlistText = buffer.toString('utf-8');
      const proxyUrl = `${request.nextUrl.origin}/api/proxy`;
      const rewrittenPlaylist = rewritePlaylist(
        playlistText,
        proxyUrl,
        targetUrl,
        headers
      );

      // // save playlist content
      // const downloadDir = path.join(process.cwd(), 'downloads');
      // if (!fs.existsSync(downloadDir)) {
      //   fs.mkdirSync(downloadDir, { recursive: true });
      // }
      // let filename =
      //   path.basename(new URL(targetUrl).pathname) + crypto.randomUUID();
      // if (!filename || filename === '/') {
      //   filename = `playlist-${Date.now()}-${Math.floor(
      //     Math.random() * 1000
      //   )}.m3u8`;
      // } else if (!filename.includes('.m3u8')) {
      //   filename = `${filename}.m3u8`;
      // }
      // const savePath = path.join(downloadDir, filename);
      // fs.writeFileSync(savePath, buffer);
      // console.log(`Saved playlist to: ${savePath}`);

      // // save rewritten playlist content
      // const savePathRewritten = path.join(downloadDir, `rewritten-${filename}`);
      // fs.writeFileSync(savePathRewritten, rewrittenPlaylist);
      // console.log(`Saved rewritten playlist to: ${savePathRewritten}`);

      return new NextResponse(rewrittenPlaylist, {
        headers: {
          'Content-Type': contentType,
          'Access-Control-Allow-Origin': '*',
        },
      });
    } else {
      // if .ts (vid seg) or another file type => just send back to frontend
      console.log(`it's a vidseg`);

      // // save vidseg content
      // const downloadDir = path.join(process.cwd(), 'downloads');
      // if (!fs.existsSync(downloadDir)) {
      //   fs.mkdirSync(downloadDir, { recursive: true });
      // }
      // let filename = path.basename(new URL(targetUrl).pathname);
      // if (!filename || filename === '/') {
      //   filename = `segment-${Date.now()}-${Math.floor(
      //     Math.random() * 1000
      //   )}.ts`;
      // }
      // const savePath = path.join(downloadDir, filename);
      // fs.writeFileSync(savePath, buffer);
      // console.log(`Saved segment to: ${savePath}`);

      return new NextResponse(buffer, {
        headers: {
          'Content-Type': contentType,
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
  } catch (error) {
    // This will catch network errors or other unexpected issues
    console.error(
      '[PROXY] CRITICAL: A crash occurred in the try block.',
      error
    );
    return NextResponse.json(
      { error: 'Failed to proxy request' },
      { status: 500 }
    );
  }
}
