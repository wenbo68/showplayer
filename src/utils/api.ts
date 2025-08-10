// Helper to set CORS headers
export function withCors(headers: Record<string, string> = {}) {
  return {
    ...headers,
    'Access-Control-Allow-Origin': '*', // Replace '*' with your Vercel domain in production
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}
