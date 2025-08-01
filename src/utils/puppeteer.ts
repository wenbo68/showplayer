import puppeteer, { HTTPRequest, type Page } from 'puppeteer';
import type { M3U8FetchResult } from '~/type';

// vidjoy: m3u8 before play (has antibot measures: wont load m3u8 if youre bot)
// videasy: have to click play
// vidfast: m3u8 before play
// vidlink: auto plays
// vidsrc: have to click play (if another play button shows up, just fail it)

// can intercept subtitle request now => now need to send subtitle content back and store in db
// then need to modify videoPlayer to use the vtt file (convert srt to vtt)

const MvSrcMap: Record<string, string> = {
  vidjoy: 'https://vidjoy.pro/embed/movie',
  videasy: 'https://player.videasy.net/movie',
  vidfast: 'https://vidfast.pro/movie',
  vidlink: 'https://vidlink.pro/movie',
  vidsrc: 'https://vidsrc.net/embed/movie',
};

const TvSrcMap: Record<string, string> = {
  vidjoy: 'https://vidjoy.pro/embed/tv',
  videasy: 'https://player.videasy.net/tv',
  vidfast: 'https://vidfast.pro/tv',
  vidlink: 'https://vidlink.pro/tv',
  vidsrc: 'https://vidsrc.net/embed/tv',
};

// ====== selectors

const playButtonSelector = [
  '.play-icon-main', //videasy
  '[aria-label*="Play"]', //vidjoy, vidlink
  '[aria-label*="play"]',
  '[data-plyr="play"]',
  '.vjs-big-play-button',
  '.player-poster',
  '#play_button',
  '#pl_but', //vidsrc
  'button:has(path[d^="M21.4086"])', //vidfast
].join(', ');

const subtitleMenuSelector = [
  '#media-menu-button-2', //vidjoy
].join(', ');

const enSubtitleSelector = [
  '::-p-xpath(//button[h1[contains(text(), "en")]])',
].join(', ');

// ====== helpers

async function clickPlay(src: string, page: Page) {
  if (src === 'vidsrc') {
    clickPlayInFrame(page);
  } else {
    clickPlayDirectly(page);
  }
}

async function clickPlayDirectly(page: Page) {
  try {
    const t1 = performance.now();
    const playButton = await page.waitForSelector(playButtonSelector, {
      visible: true,
      timeout: 5000,
    });
    console.log(`--found: ${(performance.now() - t1).toFixed(1)} ms`);

    if (playButton) {
      const t2 = performance.now();
      await playButton.click();
      console.log(`--clicked: ${(performance.now() - t2).toFixed(1)} ms`);
    } else {
      throw new Error('Play button not found');
    }
  } catch (error) {
    console.warn('clickPlayDirectly failed: ', error);
  }
}

async function clickPlayInFrame(page: Page) {
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
    const playButton = await frame.waitForSelector(playButtonSelector, {
      visible: true,
      timeout: 5000,
    });
    console.log(`--found: ${(performance.now() - t2).toFixed(1)} ms`);

    if (playButton) {
      const t3 = performance.now();
      await playButton.click();
      console.log(`--clicked: ${(performance.now() - t3).toFixed(1)} ms`);
    } else {
      throw new Error('Play button not found in iframe');
    }
  } catch (error) {
    console.warn('clickPlayInFrame failed: ', error);
  }
}

async function clickSubtitleMenu(src: string, page: Page) {
  try {
    // 1. find subtitle menu
    const t1 = performance.now();
    const subtitleMenu = await page.waitForSelector(subtitleMenuSelector, {
      visible: true,
      timeout: 5000,
    });
    console.log(`--found menu: ${(performance.now() - t1).toFixed(1)} ms`);

    // 2. click subtitle menu
    const t2 = performance.now();
    if (subtitleMenu) {
      await subtitleMenu.click();
    } else {
      throw new Error(`could not find subtitle menu for ${src}`);
    }
    console.log(`--clicked menu: ${(performance.now() - t2).toFixed(1)} ms`);
  } catch (error) {
    console.error(`clickSubtitleMenu failed: `, error);
  }
}

async function clickEnSubtitle(src: string, page: Page) {
  try {
    // 3. Find the first button containing the text 'en' using XPath
    const t3 = performance.now();
    const enSubtitle = await page.waitForSelector(enSubtitleSelector, {
      visible: true,
      timeout: 5000,
    });
    console.log(`--found subtitle: ${(performance.now() - t3).toFixed(1)} ms`);

    // 4. Click the 'en' button if it was found
    const t4 = performance.now();
    if (enSubtitle) {
      await enSubtitle.click();
    } else {
      throw new Error(`could not find english subtitle for ${src}`);
    }
    console.log(
      `--clicked subtitle: ${(performance.now() - t4).toFixed(1)} ms`
    );
  } catch (error) {
    console.error(`clickEnSubtitle failed: `, error);
  }
}

async function fetchSrcFromUrl(
  src: string,
  embedUrl: string
): Promise<M3U8FetchResult | null> {
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/chromium',
    headless: false,
    slowMo: 100,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  // configure browser to close popup ads
  let aPopupWasClosed = false;
  browser.on('targetcreated', async (target) => {
    if (target.type() === 'page') {
      const newPage = await target.page();
      if (newPage) {
        aPopupWasClosed = true;
        await newPage.close();
      }
    }
  });

  const page = (await browser.pages())[0]!;

  // // Set the user agent for the page
  // await page.setUserAgent(
  //   'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Mobile Safari/537.36'
  // );

  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
  });

  await page.setCacheEnabled(false);
  await page.setRequestInterception(true);
  page.on('request', (request: HTTPRequest) => {
    // Continue all requests, but with interception enabled,
    // we can bypass the service worker's cache.
    request.continue();
  });

  let resolveFound: (result: M3U8FetchResult) => void;
  const resultPromise = new Promise<M3U8FetchResult>((resolve) => {
    resolveFound = resolve;
  });

  page.on('response', async (res) => {
    const url = res.url();

    // 1. Check for the subtitle request first
    if (url.includes('format=srt&encoding=UTF-8')) {
      if (res.ok()) {
        const srtContent = await res.text();
        console.log('--- Subtitle Captured ---');
        console.log(srtContent.slice(0, 500) + '...');
      }
      // Return early to prevent processing this as an M3U8 file
      return;
    }

    // 2. then check for m3u8 req
    try {
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
        resolveFound({
          type: 'master',
          url: res.url(),
          headers: headers,
        });
      } else if (text.includes('#EXTINF')) {
        resolveFound({
          type: 'media',
          url: res.url(),
          headers: headers,
        });
      }
    } catch {
      // ignore parse errors
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
    let clickAttempts = 0;
    aPopupWasClosed = true;
    if (src === 'videasy' || src === 'vidsrc') {
      // videasy/vidsrc: click play button (rid ads) => click subtitle menu => click en subtitle

      // loop until play clicked
      console.log(`Finding play button`);
      while (aPopupWasClosed && clickAttempts < 5) {
        clickAttempts++;
        aPopupWasClosed = false;

        console.log(`-attempt #${clickAttempts}`);
        clickPlay(src, page);

        // wait 5s after clicking play for ad to be closed
        await new Promise((res) => setTimeout(res, 5000));
      }

      // get subtitle
      console.log(`Finding subtitle menu`);
      await clickSubtitleMenu(src, page);
      console.log(`Finding en subtitle`);
      await clickEnSubtitle(src, page);
    } else {
      // vidjoy/vidfast/vidlink: click subtitle menu (rid ads) => click en subtitle
      console.log(`Finding subtitle menu`);
      while (aPopupWasClosed && clickAttempts < 5) {
        clickAttempts++;
        aPopupWasClosed = false;

        console.log(`-attempt #${clickAttempts}`);
        clickSubtitleMenu(src, page);

        // wait 5s after clicking play for ad to be closed
        await new Promise((res) => setTimeout(res, 5000));
      }

      console.log(`Finding en subtitle`);
      clickAttempts = 0;
      aPopupWasClosed = true;
      while (aPopupWasClosed && clickAttempts < 5) {
        clickAttempts++;
        aPopupWasClosed = false;

        console.log(`-attempt #${clickAttempts}`);
        clickEnSubtitle(src, page);

        // wait 5s after clicking play for ad to be closed
        await new Promise((res) => setTimeout(res, 5000));
      }
    }

    //3. now wait 10s for m3u8 to come up in network
    console.log(`Waiting for m3u8`);
    await new Promise((res) => setTimeout(res, 30000));
    const t3 = performance.now();
    const result = await Promise.race([
      resultPromise,
      new Promise<M3U8FetchResult | null>((res) =>
        setTimeout(() => res(null), 10000)
      ),
    ]);
    console.log(`-${(performance.now() - t3).toFixed(1)} ms`);

    return result;
  } catch (err) {
    console.error('fetchSrcFromUrl Error:', err);
    return null;
  } finally {
    await browser.close();
    console.log(`total: ${(performance.now() - t0).toFixed(1)} ms`);
    console.log(`======`);
  }
}

// ====== exported

export async function fetchMvSrc(src: string, tmdbId: number) {
  const embedUrl = `${MvSrcMap[src]}/${tmdbId}`;
  console.log(`======`);
  console.log('Navigating to:', embedUrl);
  return fetchSrcFromUrl(src, embedUrl);
}

export async function fetchTvSrc(
  src: string,
  tmdbId: number,
  season: number,
  episode: number
) {
  const embedUrl = `${TvSrcMap[src]}/${tmdbId}/${season}/${episode}`;
  console.log(`======`);
  console.log('Navigating to:', embedUrl);
  return fetchSrcFromUrl(src, embedUrl);
}
