import puppeteer, { ElementHandle, HTTPRequest, type Page } from 'puppeteer';
import type { M3U8Result, PuppeteerResult } from '~/type';
import { NextResponse } from 'next/server';
import { withCors } from '~/utils/api';
import { EventEmitter } from 'events';
import { use } from 'react';

// vidjoy: m3u8 before play (has antibot measures: wont load m3u8 if youre bot)
// videasy: have to click play
// vidfast: m3u8 before play
// vidlink: auto plays
// vidsrc: have to click play (if another play button shows up, just fail it)

const firstClickWaitTime = 2000;
const enSubtitleFindTime = 500;
const enSubtitleWaitTime = 2000;
const enSubtitleFindFailM3u8WaitTime = 3000;
const enSubtitleWaitFailM3u8WaitTime = 1;

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
  videasy: '::-p-xpath(//button[contains(text(), "Subtitles")])',
};

const enSubtitleSelectorsMap: Record<string, string> = {
  vidjoy: generateEnSubtitleSelector(
    '::-p-xpath(//button[h1[contains(text(), "")]])'
  ),
  videasy: generateEnSubtitleSelector(
    '::-p-xpath(//div[contains(text(), "")])'
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
) {
  const t1 = performance.now();
  let resolutionButton: ElementHandle<Element> | null = null;
  // 1. find the thing
  if (name === firstClickMap[provider]) {
    await page.waitForSelector(selector, {
      visible: true,
      timeout: firstClickWaitTime,
    });
  } else if (name === 'en subtitle') {
    await page.waitForSelector(selector, {
      visible: true,
      timeout: enSubtitleFindTime,
    });
  } else if (name === 'highest resolution') {
    resolutionButton = await page.waitForSelector(selector, {
      visible: true,
    });
  } else {
    await page.waitForSelector(selector, {
      visible: true,
    });
  }
  // 2. click the thing
  if (resolutionButton) {
    console.log(`returning if resolution has shadow-lg`);
    return await page.evaluate(
      (el) => el.classList.contains('shadow-lg'),
      resolutionButton
    );
  }
  await page.click(selector);
  console.log(`[${provider}] clicked ${name}: ${getTime(t1)} ms`);
}

function timeoutPromise(timeout: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, timeout);
  });
}

async function fetchSrcFromUrl(
  provider: string,
  embedUrl: string
): Promise<PuppeteerResult | null> {
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/chromium',
    headless: false,
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

  let m3u8BackupResolver: (value: M3U8Result) => void;
  let m3u8Resolver: (value: M3U8Result) => void;
  let subtitleResolver: (value: string) => void;
  const m3u8BackupPromise = new Promise<M3U8Result>((resolve) => {
    m3u8BackupResolver = resolve;
  });
  const m3u8Promise = new Promise<M3U8Result>((resolve) => {
    m3u8Resolver = resolve;
  });
  const subtitlePromise = new Promise<string>((resolve) => {
    subtitleResolver = resolve;
  });
  const m3u8AndSubtitlePromise = Promise.race([
    Promise.allSettled([m3u8Promise, subtitlePromise]),
    timeoutPromise(provider === 'vidjoy' ? 10000 : 7000),
  ]);

  let setResolution = true;
  if (provider === 'vidjoy') {
    setResolution = false;
  }
  let m3u8Pending = true;
  let captureSubtitle = false;
  let subtitlePending = true;
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
      if (isSubtitle && captureSubtitle && subtitlePending) {
        console.log(`[${provider}] Subtitle captured`);
        subtitleResolver(text);
        subtitlePending = false;
        return;
      }
      if (m3u8Pending) {
        if (text.includes('#EXTM3U')) {
          const headers = res.request().headers();
          if (text.includes('#EXT-X-STREAM-INF')) {
            console.log(`[${provider}] Master captured`);
            if (setResolution) {
              m3u8Resolver({ type: 'master', url: res.url(), headers });
            } else {
              m3u8BackupResolver({ type: 'master', url: res.url(), headers });
            }
          } else if (text.includes('#EXTINF')) {
            console.log(`[${provider}] Media captured`);
            if (setResolution) {
              m3u8Resolver({ type: 'media', url: res.url(), headers });
            } else {
              m3u8BackupResolver({ type: 'media', url: res.url(), headers });
            }
          }

          // m3u8Pending is trivial but does make puppeteer do less work
          if (setResolution) m3u8Pending = false;
        }
      }
    } catch (error) {}
  });

  let useBackup = false;
  const clickEvents = new EventEmitter();
  const firstClickFailPromise = new Promise<string>((resolve) =>
    clickEvents.once('firstClickFailed', () => resolve('firstClickFailed'))
  );
  const enSubtitleFindFailPromise = new Promise<string>((resolve) =>
    clickEvents.once('enSubtitleFindFailed', () =>
      resolve('enSubtitleFindFailed')
    )
  );
  const enSubtitleWaitFailPromise = new Promise<string>((resolve) =>
    clickEvents.once('enSubtitleWaitFailed', () =>
      resolve('enSubtitleWaitFailed')
    )
  );

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
          try {
            return await findAndClick(provider, name, selector, page);
          } catch (error) {
            if (name === firstClickMap[provider]) {
              clickEvents.emit('firstClickFailed');
              // throw new Error('first click failed');
            } else if (name === 'en subtitle') {
              if (subtitlePending) clickEvents.emit('enSubtitleFindFailed');
              // throw new Error('en subtitle failed');
            }
            throw error;
          }
        }
        if (provider === 'videasy') {
          await click('play button', playButtonSelectorsMap[provider]);
          await click('video', videoSelectorsMap[provider]);
        } else if (provider === 'vidsrc') {
          await clickPlayInFrame(provider, page);
        }
        if (provider === 'vidjoy') {
          await click('settings', settingsButtonSelectorsMap[provider]);
          //this aint working for some reason
          const alreadyHighestResolution = await click(
            'highest resolution',
            highestResolutionSelectorsMap[provider]
          );
          console.log(
            `[${provider}] already highest resolution: ${alreadyHighestResolution}`
          );
          useBackup = alreadyHighestResolution ?? false;
          setResolution = true;
        }
        await click('subtitle button', subtitleButtonSelectorsMap[provider]);
        if (provider === 'videasy') {
          await click('subtitle tab', subtitleTabSelectorsMap[provider]);
        }
        await click('en subtitle', enSubtitleSelectorsMap[provider]);
        console.log(`[${provider}] DONE: ${getTime(t0)} ms`);
        setTimeout(() => {
          if (subtitlePending) clickEvents.emit('enSubtitleWaitFailed');
        }, enSubtitleWaitTime);
      } catch (error) {
        // console.log(`[${provider}] DONE: ${getTime(t0)} ms`);
        // const errorMessage = error.message || '';
        // const isIgnorableError =
        //   errorMessage.includes('closed') || errorMessage.includes('detached');
        // if (!isIgnorableError) {
        //   console.error(`[${provider}] clicking failed`);
        // }
      }
    })();

    // 3. race all promises (only timeout returns void/undefined)

    // might have to race backup promise here as well? (but then if backup promise wins, we might need another race for enSubtitle and m3u8/subtitle promises)
    const raceResult1 = await Promise.race([
      firstClickFailPromise,
      enSubtitleWaitFailPromise,
      enSubtitleFindFailPromise,
      m3u8AndSubtitlePromise,
    ]);

    if (typeof raceResult1 === 'string') {
      console.warn(`[${provider}] ${raceResult1}`);
      // 1st click failed
      if (raceResult1 === 'firstClickFailed') {
        console.warn(`[${provider}] failed: 1st click failed`);
        return null;
      } else {
        // en subtitle failed
        const raceResult2 = await Promise.race([
          useBackup ? m3u8BackupPromise : m3u8Promise,
          timeoutPromise(
            raceResult1 === 'enSubtitleFindFailed'
              ? enSubtitleFindFailM3u8WaitTime
              : raceResult1 === 'enSubtitleWaitFailed'
              ? enSubtitleWaitFailM3u8WaitTime
              : 1
          ),
        ]);
        if (raceResult2 === undefined) {
          console.warn(`[${provider}] failed: m3u8 timeout`);
          return null;
        }
        return {
          provider: provider.substring(3),
          m3u8: raceResult2 as M3U8Result,
          subtitle: undefined,
        };
      }
    } else if (raceResult1 === undefined) {
      // failed to get m3u8 & subtitle within time limit
      console.warn(`[${provider}] failed: m3u8/subtitle timeout`);
      return null;
    } else {
      // got both m3u8 and subtitle (but still need checks, why?)
      const [m3u8Result, subtitleResult] = raceResult1;
      return m3u8Result.status === 'fulfilled'
        ? {
            provider: provider.substring(3), // remove 'vid' prefix
            m3u8: m3u8Result.value as M3U8Result,
            subtitle:
              subtitleResult.status === 'fulfilled'
                ? (subtitleResult.value as string)
                : undefined,
          }
        : null;
    }
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
  const fullProvider = provider.startsWith('vid') ? provider : `vid${provider}`;
  const embedUrl = `${
    type === 'mv' ? mvProvidersMap[fullProvider] : tvProvidersMap[fullProvider]
  }/${path}`;
  console.log(`=======`);
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
