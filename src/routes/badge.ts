import { generateBadge, normalizeStyle, normalizeColor } from '../lib/badge';
import type { Env } from '../types';

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
  const style = normalizeStyle(url.searchParams.get('style') ?? undefined);
  const color = normalizeColor(url.searchParams.get('color') ?? undefined);
  const label = url.searchParams.get('label') || 'nice';

  // Look up button by publicId
  let count: number | null = null;
  
  try {
    const result = await env.DB.prepare(
      'SELECT nice_count FROM buttons WHERE public_id = ?'
    ).bind(publicId).first<{ nice_count: number }>();
    
    if (result) {
      count = result.nice_count;
    }
  } catch {
    // On error, show "?" - don't break the badge
  }

  const svg = generateBadge(count, { style, color, label });

  return new Response(svg, {
    status: 200,
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=60, s-maxage=300',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
