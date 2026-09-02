import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const preferredRegion = 'fra1';

/**
 * Thumbnail proxy endpoint.
 * Fetches the thumbnail from Pornhub CDN server-side to avoid CORS and 403
 * Referer-blocking issues on iOS Safari and mobile browsers.
 *
 * Usage:
 *   /api/thumbnail?url=<cdn_image_url>&viewkey=<viewkey>
 *   or
 *   /api/thumbnail?viewkey=<viewkey>
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);
  const rawImageUrl = searchParams.get('url') || '';
  const viewkey = searchParams.get('viewkey') || '';

  let targetImageUrl = rawImageUrl;

  // If no direct image URL provided, extract it from the embed page
  if (!targetImageUrl && viewkey) {
    // Validate viewkey format (supports alphanumeric including ph... prefix)
    if (!/^[a-zA-Z0-9_-]{5,64}$/.test(viewkey)) {
      return new NextResponse('Invalid viewkey parameter', { status: 400 });
    }

    try {
      const embedUrl = `https://www.pornhub.com/embed/${encodeURIComponent(viewkey)}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const embedRes = await fetch(embedUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Cookie': 'age_verified=1; accessAgeDisclaimerPH=1; platform=pc;',
          'Referer': 'https://www.pornhub.com/',
        },
        signal: controller.signal,
        cache: 'no-store',
      });
      clearTimeout(timeoutId);

      if (embedRes.ok) {
        const html = await embedRes.text();
        const imageMatch = html.match(/"image_url":\s*"(.*?)"/i) || html.match(/"poster":\s*"(.*?)"/i);
        if (imageMatch && imageMatch[1]) {
          targetImageUrl = imageMatch[1].replace(/\\\//g, '/');
        }
      }
    } catch {
      // ignore
    }
  }

  if (!targetImageUrl) {
    return new NextResponse('Thumbnail not available', { status: 404 });
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const imgRes = await fetch(targetImageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Referer': 'https://www.pornhub.com/',
        'Accept': 'image/avif,image/webp,image/jpeg,image/*,*/*;q=0.8',
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!imgRes.ok || !imgRes.body) {
      return new NextResponse('Upstream thumbnail fetch failed', { status: 502 });
    }

    const contentType = imgRes.headers.get('content-type') || 'image/jpeg';
    const contentLength = imgRes.headers.get('content-length');

    const headers = new Headers();
    headers.set('Content-Type', contentType);
    headers.set('Cache-Control', 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800');
    headers.set('Access-Control-Allow-Origin', '*');
    if (contentLength) {
      headers.set('Content-Length', contentLength);
    }

    return new NextResponse(imgRes.body as unknown as ReadableStream, {
      status: 200,
      headers,
    });
  } catch (err) {
    console.error('[thumbnail] fetch error:', err);
    return new NextResponse('Error proxying thumbnail', { status: 500 });
  }
}
