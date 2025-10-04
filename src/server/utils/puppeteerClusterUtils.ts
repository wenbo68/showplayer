import { Cluster } from 'puppeteer-cluster';
import puppeteer, { HTTPRequest } from 'puppeteer';
import type { M3U8Result } from '~/type';
import {
  findAndClick,
  clickPlayInFrame,
  playButtonSelectorsMap,
  videoSelectorsMap,
  settingsButtonSelectorsMap,
  highestResolutionSelectorsMap,
  subtitleButtonSelectorsMap,
  subtitleTabSelectorsMap,
  enSubtitleSelectorsMap,
  firstClickMap,
  timeoutPromise,
  getTime,
  providerEnumMap,
} from './puppeteerUtils'; // Assuming your helper functions and maps are in a utils file
import { env } from '~/env';

const puppeteerTask = async ({ page, data }: { page: any; data: any }) => {
  const { provider, embedUrl } = data;

  // Our manual, targeted fingerprinting is now the only source of truth.
  const a_VALID_USER_AGENT =
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';
  await page.setUserAgent(a_VALID_USER_AGENT);
  // await page.setViewport({ width: 1680, height: 1050 });

  await page.evaluateOnNewDocument(() => {
    // We override these to match the "good" report and ensure consistency.
    Object.defineProperty(navigator, 'platform', { get: () => 'Linux x86_64' });
    Object.defineProperty(navigator, 'languages', { get: () => ['en-US'] });
    Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 14 });
    Object.defineProperty(navigator, 'deviceMemory', { get: () => 8 });
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
    window.open = () => null;
    // Since we disabled the GPU, we don't need to spoof WebGL params.
    // The browser will now naturally report a software renderer.
  });

  const client = await page.target().createCDPSession();
  await client.send('Network.clearBrowserCookies');

  await page.setCacheEnabled(false);
  await page.setRequestInterception(true);
  page.on('request', (req: HTTPRequest) => {
    try {
      req.continue();
    } catch (err) {
      req.abort();
    }
  });

  const m3u8List: M3U8Result[] = [];
  const subtitleList: string[] = [];
  page.on('response', async (res: any) => {
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
        subtitleList.push(text);
        return;
      }
      if (text.includes('#EXTM3U')) {
        const headers = res.request().headers();
        if (text.includes('#EXT-X-STREAM-INF')) {
          m3u8List.push({ type: 'master', url: res.url(), headers });
        } else if (text.includes('#EXTINF')) {
          if (!m3u8List.some((item) => item.type === 'master')) {
            m3u8List.push({ type: 'media', url: res.url(), headers });
          }
        }
      }
    } catch (error) {
      // Silently fail for individual response processing
    }
  });

  async function click(name: string, selector: string | undefined) {
    if (!selector) return;
    await findAndClick(provider, name, selector, page);
  }

  const t0 = performance.now();
  try {
    await page.setExtraHTTPHeaders({
      Referer: 'https://vidfast.pro/',
    });

    await page.goto(embedUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 10000,
    });

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
    } catch (error: any) {
      console.warn(
        `[${provider}] ${error.message} ${
          error.message.includes(firstClickMap[provider]) ? `(1st click)` : ``
        }`
      );
    }

    await timeoutPromise(
      provider === 'vidjoy'
        ? Number(env.M3U8_WAIT_JOY)
        : provider === 'videasy'
        ? Number(env.M3U8_WAIT_EASY)
        : provider === 'vidlink'
        ? Number(env.M3U8_WAIT_LINK)
        : provider === 'vidfast'
        ? Number(env.M3U8_WAIT_FAST)
        : 1000
    );

    if (m3u8List.length === 0) throw new Error(`m3u8 timeout`);
    return {
      provider: providerEnumMap[provider]!,
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
};

let clusterPromise: Promise<Cluster<any, any>> | null = null;

/**
 * Gets the shared cluster instance. Initializes it on the first call.
 */
export function getCluster() {
  if (!clusterPromise) {
    console.log('Initializing Puppeteer Cluster for batch processing...');
    clusterPromise = Cluster.launch({
      concurrency: Cluster.CONCURRENCY_CONTEXT,
      timeout: 10000,
      maxConcurrency: 4,
      puppeteer,
      puppeteerOptions: {
        headless: env.HEADLESS === 'true',
        executablePath: '/usr/bin/chromium',
        // --- START: NEW LAUNCH ARGUMENTS ---
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          // Force software rendering and disable the GPU
          '--disable-gpu',
          '--use-gl=swiftshader', // This is the key to matching your Incognito renderer
          '--disable-software-rasterizer',
          // Disable new features that can be used for fingerprinting
          '--disable-features=WebGPU',
        ],
        // --- END: NEW LAUNCH ARGUMENTS ---
      },
    }).then(async (cluster) => {
      await cluster.task(puppeteerTask);
      console.log('Puppeteer Cluster initialized and task defined.');
      return cluster;
    });
  }
  return clusterPromise;
}

/**
 * Gracefully shuts down the cluster.
 */
export async function closeCluster() {
  if (!clusterPromise) return;
  const cluster = await clusterPromise;
  console.log('Closing cluster after batch job...');
  await cluster.idle();
  await cluster.close(); // This will close the browser(s) created by the cluster.

  // Reset state
  clusterPromise = null;

  console.log('Cluster closed.');
}
