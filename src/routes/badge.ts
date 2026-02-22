import { generateBadge, normalizeTheme } from '../lib/badge';
import type { Env, Button } from '../types';

/**
 * GET /badge/:publicId.svg
 * Returns an SVG badge showing the nice count for a button
 */
export async function serveBadge(
  request: Request,
  env: Env,
  publicId: string
): Promise<Response> {
  const url = new URL(request.url);
  const theme = normalizeTheme(url.searchParams.get('theme') ?? undefined);

  // Look up button by publicId in KV
  let count: number = 0;
  
  try {
    const buttonData = await env.NICE_KV.get(`btn:${publicId}`);
    
    if (buttonData) {
      const button: Button = JSON.parse(buttonData);
      count = button.count ?? 0;
    }
  } catch {
    // On error, default to 0 - don't break the badge
  }

  const svg = generateBadge(count, { theme });

  return new Response(svg, {
    status: 200,
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=60, s-maxage=300',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
