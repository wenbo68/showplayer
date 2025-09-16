import { env } from '~/env';
import type { SourceWithSubtitles } from '~/type';

// cors headers: which frontend (websites) can make requests to your backend
// not needed if your frontend and backend are together (same subdomain/port)
export function withCors(headers: Record<string, string> = {}) {
  return {
    ...headers,
    'Access-Control-Allow-Origin': `${env.BUNNY_URL}`,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

// two ways to create url with params:
// 1. encode params and append them to to url as strings (encode the urls so that they can be included in another url otherwise the special characters in the embeded urls can cause confusions)
// 2. use URL obj and attach params (without encoding) as key/value
export function getProxiedSrcUrl(selectedSrc?: SourceWithSubtitles) {
  if (!selectedSrc) return undefined;
  const urlObject = new URL(`${env.BUNNY_URL}/api/proxy`);
  urlObject.searchParams.set('url', selectedSrc.url);

  if (selectedSrc.headers && typeof selectedSrc.headers === 'object') {
    for (const [key, value] of Object.entries(selectedSrc.headers)) {
      if (typeof value === 'string') {
        urlObject.searchParams.set(key, value);
      }
    }
  }
  console.log(`[getProxiedSrcUrl]: `, urlObject.toString());
  return urlObject.toString();
}
