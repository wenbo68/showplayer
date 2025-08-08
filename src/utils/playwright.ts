import puppeteer, { HTTPRequest, type Page } from 'puppeteer';
import type { M3U8Result, PuppeteerResult } from '~/type';
import EventEmitter from 'events';

// vidjoy: m3u8 before play (has antibot measures: wont load m3u8 if youre bot)
// videasy: have to click play
// vidfast: m3u8 before play
// vidlink: auto plays
// vidsrc: have to click play (if another play button shows up, just fail it)

// can intercept subtitle request now
// now need to send subtitle content back, convert to vtt, and store in db
// then need to modify videoPlayer to use the vtt file

// but before that we need to get subtitle from all providers
// vidjoy, videasy work now => vidfast, vidlink, vidsrc next

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

const subtitleButtonSelectorsMap: Record<string, string> = {
  vidjoy: '#media-menu-button-2',
  videasy: '[data-tooltip="Subtitles and quality"]',
  vidfast: '::-p-xpath(/html/body/div[1]/div/div[4]/div[2]/div[2]/button[6])',
  vidlink: '#media-menu-button-1',
  vidsrc: '#player_parent_control_showSubtitles',
};

const subtitleTabSelectorsMap: Record<string, string> = {
  videasy: '::-p-xpath(//button[contains(text(), "Subtitles")])',
};

const enSubtitleSelectorsMap: Record<string, string> = {
  vidjoy: '::-p-xpath(//button[h1[contains(text(), "en")]])',
  videasy: '::-p-xpath(//div[contains(text(), "English")])',
  vidfast:
    '::-p-xpath(/html/body/div[1]/div/div[4]/div[2]/div[2]/button[6]/div[2]/div/div[10])',
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
    console.log(`--entered iframe: ${(performance.now() - t1).toFixed(1)} ms`);

    // Step 3: Now, search for the play button *inside the iframe*.
    const t2 = performance.now();
    const playButton = await frame.waitForSelector(
      playButtonSelectorsMap[provider] ?? '',
      {
        visible: true,
        timeout: 5000,
      }
    );
    console.log(`--found play: ${(performance.now() - t2).toFixed(1)} ms`);

    if (playButton) {
      const t3 = performance.now();
      await playButton.click();
      console.log(`--clicked play: ${(performance.now() - t3).toFixed(1)} ms`);
    } else {
      throw new Error('Play button not found in iframe');
    }
  } catch (error) {
    console.warn('clickPlayInFrame failed: ', error);
  }
}

async function findAndClick(
  // name: string,
  selector: string,
  page: Page,
  timeout: number
) {
  try {
    // 1. find subtitle menu
    const t1 = performance.now();
    await page.waitForSelector(selector, {
      visible: true,
      timeout,
    });
    console.log(`--found: ${(performance.now() - t1).toFixed(1)} ms`);

    // 2. click subtitle menu
    const t2 = performance.now();
    await page.click(selector);
    console.log(`--clicked: ${(performance.now() - t2).toFixed(1)} ms`);
  } catch (error) {
    console.error(`findAndClick failed: `, error);
  }
}

async function attemptClick(
  actionFn: () => Promise<void>,
  name: string,
  maxAttempt: number,
  popupEmitter: EventEmitter
) {
  console.log(`Finding ${name}...`);
  for (let attempt = 1; attempt <= maxAttempt; attempt++) {
    console.log(`-attempt #${attempt}`);

    await actionFn();
    const raceResult = await Promise.race([
      new Promise((resolve) =>
        popupEmitter.once('popupClosed', () => resolve('popup'))
      ),
      new Promise((resolve) => setTimeout(() => resolve('timeout'), 2000)),
    ]);

    if (raceResult === 'timeout') {
      console.log('exiting');
      return;
    }
  }
  console.log(`Failed to click '${name}'`);
}

async function fetchSrcFromUrl(
  provider: string,
  embedUrl: string
): Promise<PuppeteerResult | null> {
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/chromium',
    headless: false,
    slowMo: 100,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  // configure browser to close popup ads (and send signal when one is closed)
  const popupEmitter = new EventEmitter();
  browser.on('targetcreated', async (target) => {
    if (target.type() === 'page') {
      try {
        const client = await target.createCDPSession();
        await client.send('Page.close');
        popupEmitter.emit('popupClosed');
      } catch (error) {}
    }
  });

  // configure page to bypass antibot and return full headers
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

  let m3u8Resolver: (value: M3U8Result) => void;
  const m3u8Promise = new Promise<M3U8Result>((resolve) => {
    m3u8Resolver = resolve;
  });
  let subtitleResolver: (value: string) => void;
  const subtitlePromise = new Promise<string>((resolve) => {
    subtitleResolver = resolve;
  });

  page.on('response', async (res) => {
    const url = res.url();

    // 1. Check for the subtitle request => if yes, get content and return
    if (url.includes('format=srt&encoding=UTF-8') || url.includes('.vtt')) {
      if (res.ok()) {
        console.log('Subtitle captured');
        subtitleResolver(await res.text());
      }
      return;
    }

    // 2. then check for m3u8 req
    const ct = res.headers()['content-type'] ?? '';
    if (
      !(
        ct.includes('mpegurl') ||
        ct.includes('x-mpegURL') ||
        ct.includes('text/plain')
      )
    )
      return;

    const text = await res.text();
    if (!text.includes('#EXTM3U')) return;

    const headers = res.request().headers();
    if (text.includes('#EXT-X-STREAM-INF')) {
      console.log('Master playlist captured');
      m3u8Resolver({
        type: 'master',
        url: res.url(),
        headers: headers,
      });
    } else if (text.includes('#EXTINF')) {
      console.log('Media playlist captured');
      m3u8Resolver({
        type: 'media',
        url: res.url(),
        headers: headers,
      });
    }
  });

  const t0 = performance.now();
  try {
    //1. go to url
    const t1 = performance.now();
    await page.goto(embedUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 5000,
    });
    console.log(`-${(performance.now() - t1).toFixed(1)} ms`);

    // 2. click play/subtitle
    async function click(name: string, selector: string | undefined) {
      if (!selector) {
        return;
      }
      await attemptClick(
        () => findAndClick(selector, page, 5000),
        name,
        5,
        popupEmitter
      );
    }
    if (provider === 'videasy') {
      await click('play button', playButtonSelectorsMap[provider]);
      await click('video', videoSelectorsMap[provider]);
    } else if (provider === 'vidsrc') {
      await attemptClick(
        () => clickPlayInFrame(provider, page),
        'play button',
        5,
        popupEmitter
      );
    }
    await click('subtitle button', subtitleButtonSelectorsMap[provider]);
    if (provider === 'videasy') {
      await click('subtitle tab', subtitleTabSelectorsMap[provider]);
    }
    await click('en subtitle', enSubtitleSelectorsMap[provider]);

    //3. now wait 5s for m3u8 and subtitle to come up in network
    console.log(`Waiting for m3u8 and subtitle`);
    const t3 = performance.now();
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(
        () =>
          reject(
            new Error('Timeout: Failed to get both M3U8 and subtitles in 5s')
          ),
        5000
      )
    );
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
    console.log(puppeteerResult);
    return puppeteerResult;
  } catch (err) {
    console.error('fetchSrcFromUrl failed:', err);
    return null;
  } finally {
    await browser.close();
    console.log(`total: ${(performance.now() - t0).toFixed(1)} ms`);
    console.log(`======`);
  }
}

// ====== exported

export async function fetchMvSrc(provider: string, tmdbId: number) {
  const embedUrl = `${mvProvidersMap[provider]}/${tmdbId}`;
  console.log(`======`);
  console.log('Navigating to:', embedUrl);
  return fetchSrcFromUrl(provider, embedUrl);
}

export async function fetchTvSrc(
  provider: string,
  tmdbId: number,
  season: number,
  episode: number
) {
  const embedUrl = `${tvProvidersMap[provider]}/${tmdbId}/${season}/${episode}`;
  console.log(`======`);
  console.log('Navigating to:', embedUrl);
  return fetchSrcFromUrl(provider, embedUrl);
}
