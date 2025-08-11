// Helper to set CORS headers
export function withCors(headers: Record<string, string> = {}) {
  return {
    ...headers,
    'Access-Control-Allow-Origin': `${process.env.FRONTEND_URL}`, // Replace '*' with your Vercel domain in production
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

// two ways to create url with params:
// 1. encode params and append them to to url as strings (encode the urls so that they can be included in another url otherwise the special characters in the embeded urls can cause confusions)
// 2. use URL obj and attach params (without encoding) as key/value
export function getProxiedSrcUrl(selectedSrc: {
  url: string;
  headers: unknown;
  id: string;
  type: 'master' | 'media';
  mediaId: string | null;
  episodeId: string | null;
  provider: string;
  subtitles: {
    id: string;
    sourceId: string;
    language: string;
    content: string;
  }[];
}) {
  const urlObject = new URL(`${process.env.VPS_URL}/api/proxy`);
  urlObject.searchParams.set('url', selectedSrc.url);

  if (selectedSrc.headers && typeof selectedSrc.headers === 'object') {
    for (const [key, value] of Object.entries(selectedSrc.headers)) {
      if (typeof value === 'string') {
        urlObject.searchParams.set(key, value);
      }
    }
  }
  return urlObject.toString();
}
