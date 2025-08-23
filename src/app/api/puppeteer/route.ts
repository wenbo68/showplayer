import puppeteer, { Browser, HTTPRequest, type Page } from 'puppeteer';
import type { M3U8Result, PuppeteerResult } from '~/type';
import { NextResponse } from 'next/server';
import { withCors } from '~/utils/api';

// vidjoy: m3u8 before play (has antibot measures: wont load m3u8 if youre bot)
// videasy: have to click play
// vidfast: m3u8 before play
// vidlink: auto plays
// vidsrc: have to click play (if another play button shows up, just fail it)

const firstClickMap: Record<string, string> = {
  vidjoy: 'settings',
  videasy: 'play button',
  vidfast: 'subtitle button',
  vidlink: 'subtitle button',
};

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
  videasy: '::-p-xpath(//button[span[contains(text(), "Subtitles")]])',
};

const enSubtitleSelectorsMap: Record<string, string> = {
  vidjoy: generateEnSubtitleSelector(
    '::-p-xpath(//button[h1[contains(text(), "")]])'
  ),
  videasy: generateEnSubtitleSelector(
    '::-p-xpath(//button[span[contains(text(), "")]])'
  ),
  vidfast: generateEnSubtitleSelector(
    '::-p-xpath(//div[div[contains(text(), "")]])'
  ),
  vidlink: generateEnSubtitleSelector(
    '::-p-xpath(//div[span[contains(text(), "")]])'
  ),
  vidsrc: '[data-subkey="eng"]',
};

// ====== helpers

function getTime(start: number) {
  return (performance.now() - start).toFixed(1);
}

function timeoutPromise(timeout: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, timeout);
  });
}

function generateEnSubtitleSelector(selector: string) {
  const variations = [
    'en',
    'En',
    'EN',
    'eng',
    'ENG',
    'english',
    'English',
    'ENGLISH',
  ];
  return variations.map((v) => selector.replace('""', `"${v}"`)).join(', ');
}

async function clickPlayInFrame(provider: string, page: Page) {
  try {
    // Step 1: Find the iframe that contains the video player.
    const t1 = performance.now();
    const iframeHandle = await page.waitForSelector('iframe', {});
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

const firstClickWaitTime = 4000;
const longClickWaitTime = 5000;
const midClickWaitTime = 3000;
const shortClickWaitTime = 2000;
async function findAndClick(
  provider: string,
  name: string,
  selector: string,
  page: Page
) {
  try {
    const t1 = performance.now();
    // 1. find the thing
    await page.waitForSelector(selector, {
      visible: true,
      timeout:
        name === firstClickMap[provider] // takes abt 2500-3000
          ? firstClickWaitTime
          : name === 'highest resolution' // takes abt 3500-4000
          ? longClickWaitTime
          : provider === 'vidfast' && name === 'en subtitle' // takes abt 1500
          ? midClickWaitTime
          : shortClickWaitTime, // takes abt 500-1000
    });
    // 2. click the thing
    await page.click(selector);
    console.log(`[${provider}] clicked ${name}: ${getTime(t1)} ms`);
  } catch (error) {
    throw new Error(`click failed: ${name}`);
  }
}

let browser: Browser | null = null;
let isLaunching = false; // Our "lock" to prevent race conditions
let requestCount = 0;
const MAX_REQUESTS_PER_BROWSER = 20; // Increased limit

async function getBrowser(): Promise<Browser> {
  // If the browser is launching, wait for it to be ready
  while (isLaunching) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  // Restart the browser if it's dead or has served too many requests
  if (
    !browser ||
    !browser.connected ||
    requestCount >= MAX_REQUESTS_PER_BROWSER
  ) {
    isLaunching = true;
    try {
      if (browser) {
        await browser
          .close()
          .catch((e) => console.error('Failed to close browser:', e));
      }
      browser = await puppeteer.launch({
        executablePath: '/usr/bin/chromium',
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--no-zygote',
          '--single-process',
        ],
      });
      console.log('New browser instance launched.');
      requestCount = 0;
    } catch (error) {
      console.error('Failed to launch browser:', error);
      browser = null; // Ensure we don't use a broken instance
      throw error; // Propagate the error
    } finally {
      isLaunching = false; // Release the lock
    }
  }

  requestCount++;
  return browser!;
}

async function fetchSrcFromUrl(
  provider: string,
  embedUrl: string
): Promise<PuppeteerResult | null> {
  const browser = await getBrowser();

  // configure page to bypass antibot and return full headers and don't open popups
  const page = await browser.newPage();
  await page.setUserAgent(
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'
  );
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
  });
  await page.setCacheEnabled(false);
  await page.setRequestInterception(true);
  page.on('request', (req: HTTPRequest) => {
    try {
      req.continue();
    } catch (err) {
      console.error('request.continue() failed', err);
      req.abort();
    }
  });
  await page.evaluateOnNewDocument(() => {
    window.open = () => null;
  });

  const m3u8List: M3U8Result[] = [];
  const subtitleList: string[] = [];
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
        console.log(`[${provider}] >>> Subtitle captured`);
        subtitleList.push(text);
        return;
      }
      if (text.includes('#EXTM3U')) {
        const headers = res.request().headers();
        if (text.includes('#EXT-X-STREAM-INF')) {
          console.log(`[${provider}] >>> Master captured`);
          m3u8List.push({ type: 'master', url: res.url(), headers });
        } else if (text.includes('#EXTINF')) {
          if (!m3u8List.some((item) => item.type === 'master')) {
            console.log(`[${provider}] >>> Media captured`);
            m3u8List.push({ type: 'media', url: res.url(), headers });
          }
        }
      }
    } catch (error) {}
  });

  async function click(name: string, selector: string | undefined) {
    if (!selector) return;
    await findAndClick(provider, name, selector, page);
  }
  const t0 = performance.now();
  try {
    //1. go to url
    const t1 = performance.now();
    await page.goto(embedUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 15000,
    });
    // console.log(`[${provider}] entered page: ${getTime(t1)} ms`);

    // 2. click play/quality/subtitle
    try {
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
      }
      await click('subtitle button', subtitleButtonSelectorsMap[provider]);
      if (provider === 'videasy') {
        await click('subtitle tab', subtitleTabSelectorsMap[provider]);
      }
      await click('en subtitle', enSubtitleSelectorsMap[provider]);
      // console.log(`[${provider}] DONE: ${getTime(t0)} ms`);
    } catch (error: any) {
      console.warn(
        `[${provider}] ${error.message} ${
          error.message.includes(firstClickMap[provider]) ? `(1st click)` : ``
        }`
      );
    }

    // 3. use the flags and arrays to compose the return value
    await timeoutPromise(provider === 'videasy' ? 3000 : 1000);
    if (m3u8List.length === 0) throw new Error(`m3u8 timeout`);
    return {
      provider: provider.substring(3),
      m3u8: m3u8List.at(-1)!,
      subtitle: subtitleList.at(-1),
    };
  } catch (error: any) {
    console.error(`[${provider}] failed: ${error.message}`);
    return null;
  } finally {
    await page.close();
    console.log(`[${provider}] total: ${getTime(t0)} ms`);
  }
}

// ====== exported

async function fetchSrcFromProvider(
  type: 'mv' | 'tv',
  path: string,
  provider: string
) {
  const fullProvider = provider.startsWith('vid') ? provider : `vid${provider}`;
  const embedUrl = `${
    type === 'mv' ? mvProvidersMap[fullProvider] : tvProvidersMap[fullProvider]
  }/${path}`;
  return fetchSrcFromUrl(fullProvider, embedUrl);
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
    console.log('=======');
    const data = await fetchSrcFromProvider(type, path, provider);
    console.log('=======');
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

// close the browser when you exit/interrupt the nextjs app
process.on('exit', async () => {
  if (browser) await browser.close();
});

process.on('SIGINT', async () => {
  if (browser) await browser.close();
  process.exit();
});

process.on('SIGTERM', async () => {
  if (browser) await browser.close();
  process.exit();
});
