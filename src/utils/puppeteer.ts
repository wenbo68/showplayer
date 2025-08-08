import puppeteer, { HTTPRequest, type Page } from 'puppeteer';
import type { M3U8Result, PuppeteerResult } from '~/type';

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
  vidjoy: '::-p-xpath(//button[contains(text(), "0p")])',
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

async function clickPlayInFrame(provider: string, page: Page) {
  try {
    // Step 1: Find the iframe that contains the video player.
    const t1 = performance.now();
    const iframeHandle = await page.waitForSelector('iframe', {
      timeout: 5000,
    });
    if (!iframeHandle) {
      throw new Error('Could not find iframe');
    }
    // Step 2: Switch to the iframe's content/context.
    const frame = await iframeHandle.contentFrame();
    if (!frame) {
      throw new Error('Could not switch to iframe context');
    }
    console.log(`-entered iframe: ${(performance.now() - t1).toFixed(1)} ms`);

    // Step 3: Now, search for the play button *inside the iframe*.
    const t2 = performance.now();
    const playButton = await frame.waitForSelector(
      playButtonSelectorsMap[provider] ?? '',
      {
        visible: true,
        timeout: 5000,
      }
    );
    console.log(`-found play: ${(performance.now() - t2).toFixed(1)} ms`);

    if (playButton) {
      const t3 = performance.now();
      await playButton.click();
      console.log(`-clicked play: ${(performance.now() - t3).toFixed(1)} ms`);
    } else {
      throw new Error('Play button not found in iframe');
    }
  } catch (error) {
    console.warn('clickPlayInFrame failed: ', error);
  }
}

async function findAndClick(
  name: string,
  selector: string,
  page: Page,
  timeout: number
) {
  console.log(`Finding ${name}...`);
  // 1. find the thing
  const t1 = performance.now();
  await page.waitForSelector(selector, {
    visible: true,
    timeout,
  });
  console.log(`-found: ${(performance.now() - t1).toFixed(1)} ms`);

  // 2. click the thing
  const t2 = performance.now();
  await page.click(selector);
  console.log(`-clicked: ${(performance.now() - t2).toFixed(1)} ms`);
}

async function fetchSrcFromUrl(
  provider: string,
  embedUrl: string
): Promise<PuppeteerResult | null> {
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/chromium',
    headless: true,
    slowMo: 100,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
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
          new Error('Timeout: Failed to get both M3U8 and subtitles within 20s')
        ),
      20000
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
        console.log('Subtitle captured');
        subtitleResolver(text);
        return;
      }
      if (!captureM3U8 || m3u8Resolved) return;
      if (text.includes('#EXTM3U')) {
        m3u8Resolved = true;
        const headers = res.request().headers();
        if (text.includes('#EXT-X-STREAM-INF')) {
          console.log('Master playlist captured');
          m3u8Resolver({ type: 'master', url: res.url(), headers });
        } else if (text.includes('#EXTINF')) {
          console.log('Media playlist captured');
          m3u8Resolver({ type: 'media', url: res.url(), headers });
        }
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
          timeout: 5000,
        });
        console.log(`-${(performance.now() - t1).toFixed(1)} ms`);

        // 2. click play, select quality/subtitle
        async function click(name: string, selector: string | undefined) {
          if (!selector) {
            return;
          }
          await findAndClick(name, selector, page, 10000);
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
          console.log('[vidjoy] finished setting resolution...');
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
    console.log(`Waiting for m3u8 and subtitle`);
    const t3 = performance.now();
    const [m3u8, subtitle] = await Promise.race([
      Promise.all([m3u8Promise, subtitlePromise]),
      timeout,
    ]);
    console.log(`-${(performance.now() - t3).toFixed(1)} ms`);

    // 4. return m3u8 and subtitle
    const puppeteerResult: PuppeteerResult = {
      provider,
      m3u8,
      subtitle,
    };
    // console.log(puppeteerResult);
    return puppeteerResult;
  } catch (error) {
    console.error('fetchSrcFromUrl failed:', error);
    return null;
  } finally {
    await browser.close();
    console.log(`Total: ${(performance.now() - t0).toFixed(1)} ms`);
    console.log(`=======`);
  }
}

// ====== exported

export async function fetchMvSrc(provider: string, tmdbId: number) {
  const embedUrl = `${mvProvidersMap[provider]}/${tmdbId}`;
  console.log(`=======`);
  console.log('Navigating to:', embedUrl);
  return fetchSrcFromUrl(
    // provider === 'vidfast' ? 'vidfastMv' : provider,
    provider,
    embedUrl
  );
}

export async function fetchTvSrc(
  provider: string,
  tmdbId: number,
  season: number,
  episode: number
) {
  const embedUrl = `${tvProvidersMap[provider]}/${tmdbId}/${season}/${episode}`;
  console.log(`=======`);
  console.log('Navigating to:', embedUrl);
  return fetchSrcFromUrl(
    // provider === 'vidfast' ? 'vidfastTv' : provider,
    provider,
    embedUrl
  );
}
