// server/clusterManager.ts
import { Cluster } from 'puppeteer-cluster';
import puppeteer, { Browser, HTTPRequest } from 'puppeteer';
import type { M3U8Result, PuppeteerResult } from '~/type';
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

/**
 * This is the main task logic, extracted from your old API endpoint.
 * It's defined once and used by the cluster for all jobs.
 */
const puppeteerTask = async ({ page, data }: { page: any; data: any }) => {
  const { provider, embedUrl } = data;

  await page.setUserAgent(
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'
  );
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
    window.open = () => null;
  });
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
    await page.goto(embedUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 15000,
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
        ? Number(process.env.M3U8_WAIT_JOY)
        : provider === 'videasy'
        ? Number(process.env.M3U8_WAIT_EASY)
        : provider === 'vidlink'
        ? Number(process.env.M3U8_WAIT_LINK)
        : provider === 'vidfast'
        ? Number(process.env.M3U8_WAIT_FAST)
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
    // ======== CORRECTED AND SIMPLIFIED CODE ========
    // We let Cluster.launch handle everything, as originally intended.
    // It will create and manage the browser(s) internally.
    // The CONCURRENCY_CONTEXT setting ensures it only launches ONE browser
    // and runs jobs in different "incognito" contexts, which is memory-efficient.
    clusterPromise = Cluster.launch({
      concurrency: Cluster.CONCURRENCY_CONTEXT,
      maxConcurrency: 3,
      puppeteer,
      puppeteerOptions: {
        headless: process.env.HEADLESS === 'true',
        executablePath: '/usr/bin/chromium',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
        ],
      },
    }).then(async (cluster) => {
      await cluster.task(puppeteerTask);
      console.log('Puppeteer Cluster initialized and task defined.');
      return cluster;
    });
    // ===============================================
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
