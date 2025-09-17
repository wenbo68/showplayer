import type { Page } from 'puppeteer';
import type { Provider } from '../db/schema';

// ====== maps

export const EnumProviderMap: Record<Provider, string> = {
  E: 'videasy',
  J: 'vidjoy',
  L: 'vidlink',
  F: 'vidfast',
};

export const providerEnumMap: Record<string, Provider> = {
  videasy: 'E',
  vidjoy: 'J',
  vidlink: 'L',
  vidfast: 'F',
};

export const mvProvidersMap: Record<string, string> = {
  vidjoy: 'https://vidjoy.pro/embed/movie',
  videasy: 'https://player.videasy.net/movie',
  vidfast: 'https://vidfast.pro/movie',
  vidlink: 'https://vidlink.pro/movie',
  vidsrc: 'https://vidsrc.net/embed/movie',
};

export const tvProvidersMap: Record<string, string> = {
  vidjoy: 'https://vidjoy.pro/embed/tv',
  videasy: 'https://player.videasy.net/tv',
  vidfast: 'https://vidfast.pro/tv',
  vidlink: 'https://vidlink.pro/tv',
  vidsrc: 'https://vidsrc.net/embed/tv',
};

export const firstClickMap: Record<string, string> = {
  vidjoy: 'settings',
  videasy: 'play button',
  vidfast: 'subtitle button',
  vidlink: 'subtitle button',
};

// ====== selectors

export const videoSelectorsMap: Record<string, string> = {
  videasy: 'video',
};

export const playButtonSelectorsMap: Record<string, string> = {
  vidjoy: '[aria-label*="Play"]',
  videasy: '.play-icon-main',
  vidfast: 'button:has(path[d^="M21.4086"])',
  vidlink: '[aria-label*="Play"]',
  vidsrc: '#pl_but',
};

export const settingsButtonSelectorsMap: Record<string, string> = {
  vidjoy: '#media-menu-button-4',
};

export const highestResolutionSelectorsMap: Record<string, string> = {
  vidjoy: '::-p-xpath(//button[contains(text(), "p")])',
};

export const subtitleButtonSelectorsMap: Record<string, string> = {
  vidjoy: '#media-menu-button-2',
  videasy: '[data-tooltip="Subtitles and quality"]',
  vidfast: 'button.mui-79elbk:has(svg.mui-0)',
  vidlink: '#media-menu-button-1',
  vidsrc: '#player_parent_control_showSubtitles',
};

export const subtitleTabSelectorsMap: Record<string, string> = {
  videasy: '::-p-xpath(//button[span[starts-with(text(), "Subtitles")]])',
};

export const enSubtitleSelectorsMap: Record<string, string> = {
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

export function getTime(start: number) {
  return (performance.now() - start).toFixed(1);
}

export function timeoutPromise(timeout: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, timeout);
  });
}

export function generateEnSubtitleSelector(selector: string) {
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

export async function clickPlayInFrame(provider: string, page: Page) {
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

export async function findAndClick(
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
          ? Number(process.env.FIRST_CLICK)
          : name === 'highest resolution' // takes abt 3500-4000
          ? Number(process.env.LONG_CLICK)
          : provider === 'vidfast' && name === 'en subtitle' // takes abt 1500
          ? Number(process.env.MID_CLICK)
          : Number(process.env.SHORT_CLICK), // takes abt 500-1000
    });
    // 2. click the thing
    await page.click(selector);
    console.log(`[${provider}] clicked ${name}: ${getTime(t1)} ms`);
  } catch (error) {
    throw new Error(`click failed: ${name}`);
  }
}
