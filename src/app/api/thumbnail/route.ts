import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Thumbnail proxy endpoint.
 * Fetches the thumbnail from the Pornhub CDN server-side (avoiding CORS
 * and CDN auth issues on iOS Safari / restrictive networks) and streams
 * the image bytes back to the browser.
 *
 * Usage: /api/thumbnail?viewkey=<viewkey>
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);
  const viewkey = searchParams.get('viewkey') || '';

  if (!viewkey || !/^[a-f0-9]+$/i.test(viewkey)) {
    return new NextResponse('Invalid viewkey', { status: 400 });
  }

  // Derive the thumbnail URL from the embed page
  const embedUrl = `https://www.pornhub.com/embed/${encodeURIComponent(viewkey)}`;

  try {
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

    if (!embedRes.ok) {
      return new NextResponse('Could not fetch video page', { status: 502 });
    }

    const html = await embedRes.text();

    // Extract image_url from embed page HTML
    const imageMatch = html.match(/"image_url":\s*"(.*?)"/i);
    if (!imageMatch) {
      return new NextResponse('Thumbnail not found', { status: 404 });
    }

    const rawImageUrl = imageMatch[1].replace(/\\\//g, '/');

    // Proxy the image through our server to avoid CORS/auth issues
    const imgController = new AbortController();
    const imgTimeoutId = setTimeout(() => imgController.abort(), 8000);

    const imgRes = await fetch(rawImageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Referer': 'https://www.pornhub.com/',
        'Accept': 'image/webp,image/avif,image/*,*/*;q=0.8',
      },
      signal: imgController.signal,
    });
    clearTimeout(imgTimeoutId);

    if (!imgRes.ok || !imgRes.body) {
      return new NextResponse('Thumbnail upstream failed', { status: 502 });
    }

    const contentType = imgRes.headers.get('content-type') || 'image/jpeg';

    const headers = new Headers();
    headers.set('Content-Type', contentType);
    headers.set('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');
    headers.set('Access-Control-Allow-Origin', '*');

    const contentLength = imgRes.headers.get('content-length');
    if (contentLength) headers.set('Content-Length', contentLength);

    return new NextResponse(imgRes.body as unknown as ReadableStream, {
      status: 200,
      headers,
    });
  } catch (err) {
    console.error('[thumbnail proxy] error:', err);
    return new NextResponse('Thumbnail proxy error', { status: 500 });
  }
}
