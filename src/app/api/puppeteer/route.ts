import puppeteer, { HTTPRequest, type Page } from 'puppeteer';
import type { M3U8Result, PuppeteerResult } from '~/type';
import { NextResponse } from 'next/server';
import { withCors } from '~/utils/api';

// vidjoy: m3u8 before play (has antibot measures: wont load m3u8 if youre bot)
// videasy: have to click play
// vidfast: m3u8 before play
// vidlink: auto plays
// vidsrc: have to click play (if another play button shows up, just fail it)

const mvProvidersMap: Record<string, string> = {
  vidjoy: 'https://vidjoy.pro/embed/movie',
  videasy: 'https://player.videasy.net/movie',
  vidfast: 'https://vidfast.pro/movie',
  vidlink: 'https://vidlink.pro/movie',
  vidsrc: 'https://vidsrc.net/embed/movie',
};

const tvProvidersMap: Record<string, string> = {
  vidjoy: 'https://vidjoy.pro/embed/tv',
  videasy: 'https://player.videasy.net/tv',
  vidfast: 'https://vidfast.pro/tv',
  vidlink: 'https://vidlink.pro/tv',
  vidsrc: 'https://vidsrc.net/embed/tv',
};

// ====== selectors

const videoSelectorsMap: Record<string, string> = {
  videasy: 'video',
};

const playButtonSelectorsMap: Record<string, string> = {
  vidjoy: '[aria-label*="Play"]',
  videasy: '.play-icon-main',
  vidfast: 'button:has(path[d^="M21.4086"])',
  vidlink: '[aria-label*="Play"]',
  vidsrc: '#pl_but',
};

const settingsButtonSelectorsMap: Record<string, string> = {
  vidjoy: '#media-menu-button-4',
};

const highestResolutionSelectorsMap: Record<string, string> = {
  vidjoy: '::-p-xpath(//button[contains(text(), "p")])',
};

const subtitleButtonSelectorsMap: Record<string, string> = {
  vidjoy: '#media-menu-button-2',
  videasy: '[data-tooltip="Subtitles and quality"]',
  vidfast: 'button.mui-79elbk:has(svg.mui-0)',
  vidlink: '#media-menu-button-1',
  vidsrc: '#player_parent_control_showSubtitles',
};

const subtitleTabSelectorsMap: Record<string, string> = {
  videasy: '::-p-xpath(//button[contains(text(), "Subtitles")])',
};

const enSubtitleSelectorsMap: Record<string, string> = {
  vidjoy: '::-p-xpath(//button[h1[contains(text(), "en")]])',
  videasy: '::-p-xpath(//div[contains(text(), "English")])',
  vidfast: '::-p-xpath(//div[div[contains(text(), "English")]])',
  vidlink: '::-p-xpath(//div[span[contains(text(), "English")]])',
  vidsrc: '[data-subkey="eng"]',
};

// ====== helpers

function getTime(start: number) {
  return (performance.now() - start).toFixed(1);
}

async function clickPlayInFrame(provider: string, page: Page) {
  try {
    // Step 1: Find the iframe that contains the video player.
    const t1 = performance.now();
    const iframeHandle = await page.waitForSelector('iframe', {
      // timeout: 5000,
    });
    if (!iframeHandle) {
      throw new Error('Could not find iframe');
    }
    // Step 2: Switch to the iframe's content/context.
    const frame = await iframeHandle.contentFrame();
    if (!frame) {
      throw new Error('Could not switch to iframe context');
    }
    console.log(`-entered iframe: ${getTime(t1)} ms`);

    // Step 3: Now, search for the play button *inside the iframe*.
    const t2 = performance.now();
    const playButton = await frame.waitForSelector(
      playButtonSelectorsMap[provider] ?? '',
      {
        visible: true,
        // timeout: 5000,
      }
    );
    console.log(`-found play: ${getTime(t2)} ms`);

    if (playButton) {
      const t3 = performance.now();
      await playButton.click();
      console.log(`-clicked play: ${getTime(t3)} ms`);
    } else {
      throw new Error('Play button not found in iframe');
    }
  } catch (error) {
    console.warn('clickPlayInFrame failed: ', error);
  }
}

async function findAndClick(
  provider: string,
  name: string,
  selector: string,
  page: Page
  // timeout: number
) {
  const t1 = performance.now();
  // 1. find the thing
  await page.waitForSelector(selector, {
    visible: true,
    // timeout,
  });
  // 2. click the thing
  await page.click(selector);
  console.log(`[${provider}] clicked ${name}: ${getTime(t1)} ms`);
}

async function fetchSrcFromUrl(
  provider: string,
  embedUrl: string
): Promise<PuppeteerResult | null> {
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/chromium',
    headless: true,
    // slowMo: 100,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
    ],
  });

  // configure page to bypass antibot and return full headers and don't open popups
  const page = (await browser.pages())[0]!;
  await page.setUserAgent(
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'
  );
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
  });
  await page.setCacheEnabled(false);
  await page.setRequestInterception(true);
  page.on('request', (request: HTTPRequest) => {
    request.continue();
  });
  await page.evaluateOnNewDocument(() => {
    window.open = () => null;
  });

  let m3u8Resolver: (value: M3U8Result) => void;
  const m3u8Promise = new Promise<M3U8Result>((resolve) => {
    m3u8Resolver = resolve;
  });
  let subtitleResolver: (value: string) => void;
  const subtitlePromise = new Promise<string>((resolve) => {
    subtitleResolver = resolve;
  });
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(
      () =>
        reject(
          new Error('Timeout: Failed to get both M3U8 and subtitles within 15s')
        ),
      15000
    )
  );

  let captureM3U8 = true;
  if (provider === 'vidjoy') {
    captureM3U8 = false; // For vidjoy, don't capture the initial M3U8 (need to set resolution first)
  }
  let m3u8Resolved = false;
  page.on('response', async (res) => {
    if (!res.ok()) return;
    const url = res.url();
    const ct = res.headers()['content-type'] ?? '';
    const isSubtitle =
      url.includes('format=srt&encoding=UTF-8') || url.includes('.vtt');
    const isM3U8 =
      ct.includes('mpegurl') ||
      ct.includes('x-mpegURL') ||
      ct.includes('text/plain');
    if (!isSubtitle && !isM3U8) return;

    try {
      const text = await res.text();
      if (isSubtitle) {
        console.log(`[${provider}] Subtitle captured`);
        subtitleResolver(text);
        return;
      }
      if (!captureM3U8 || m3u8Resolved) return;
      if (text.includes('#EXTM3U')) {
        const headers = res.request().headers();
        if (text.includes('#EXT-X-STREAM-INF')) {
          console.log(`[${provider}] Master captured`);
          m3u8Resolver({ type: 'master', url: res.url(), headers });
        } else if (text.includes('#EXTINF')) {
          console.log(`[${provider}] Media captured`);
          m3u8Resolver({ type: 'media', url: res.url(), headers });
        }
        m3u8Resolved = true;
      }
    } catch (error) {}
  });

  const t0 = performance.now();
  try {
    // run step 1&2 in parallel with waiting for subtitle/m3u8
    (async () => {
      try {
        //1. go to url
        const t1 = performance.now();
        await page.goto(embedUrl, {
          waitUntil: 'domcontentloaded',
          // timeout: 5000,
        });
        console.log(`[${provider}] entered page: ${getTime(t1)} ms`);

        // 2. click play, select quality/subtitle
        async function click(name: string, selector: string | undefined) {
          if (!selector) {
            return;
          }
          await findAndClick(provider, name, selector, page);
        }
        if (provider === 'videasy') {
          await click('play button', playButtonSelectorsMap[provider]);
          await click('video', videoSelectorsMap[provider]);
        } else if (provider === 'vidsrc') {
          await clickPlayInFrame(provider, page);
        }
        if (provider === 'vidjoy') {
          await click('settings', settingsButtonSelectorsMap[provider]);
          await click(
            'highest resolution',
            highestResolutionSelectorsMap[provider]
          );
          captureM3U8 = true;
        }
        await click('subtitle button', subtitleButtonSelectorsMap[provider]);
        if (provider === 'videasy') {
          await click('subtitle tab', subtitleTabSelectorsMap[provider]);
        }
        await click('en subtitle', enSubtitleSelectorsMap[provider]);
      } catch (error: any) {
        const errorMessage = error.message || '';
        const isIgnorableError =
          errorMessage.includes('Session closed') ||
          errorMessage.includes('Target closed') ||
          errorMessage.includes('detached Frame') ||
          errorMessage.includes('frame got detached');
        if (!isIgnorableError) {
          console.error(`[${provider}] clicking failed: `, error);
        }
      }
    })();

    //3. now wait for m3u8 and subtitle to come up in network
    const [m3u8Result, subtitleResult] = await Promise.allSettled([
      Promise.race([m3u8Promise, timeout]),
      Promise.race([subtitlePromise, timeout]),
    ]);

    // 4. return m3u8 and subtitle
    return m3u8Result.status === 'fulfilled'
      ? {
          provider,
          m3u8: m3u8Result.value as M3U8Result,
          subtitle:
            subtitleResult.status === 'fulfilled'
              ? (subtitleResult.value as string)
              : undefined,
        }
      : null;
  } catch (error) {
    console.error('fetchSrcFromUrl failed:', error);
    return null;
  } finally {
    await browser.close();
    console.log(`Total: ${getTime(t0)} ms`);
    console.log(`=======`);
  }
}

// ====== exported

async function fetchSrcFromProvider(
  type: 'mv' | 'tv',
  path: string,
  provider: string
) {
  const embedUrl = `${
    type === 'mv' ? mvProvidersMap[provider] : tvProvidersMap[provider]
  }/${path}`;
  console.log(`=======`);
  return fetchSrcFromUrl(provider, embedUrl);
}

export async function POST(req: Request) {
  try {
    const { type, path, provider } = await req.json();

    if (!type || !path || !provider) {
      return new NextResponse(
        JSON.stringify({ error: 'Missing required parameters' }),
        {
          status: 400,
          headers: withCors({ 'Content-Type': 'application/json' }),
        }
      );
    }

    const data = await fetchSrcFromProvider(type, path, provider);
    return new NextResponse(JSON.stringify(data), {
      headers: withCors({ 'Content-Type': 'application/json' }),
    });
  } catch (err: any) {
    return new NextResponse(
      JSON.stringify({ error: err.message || 'Server error' }),
      { status: 500, headers: withCors({ 'Content-Type': 'application/json' }) }
    );
  }
}

// Handle OPTIONS (CORS preflight)
export async function OPTIONS() {
  return new NextResponse(null, { headers: withCors() });
}
