import { NextRequest, NextResponse } from 'next/server';
import { validateAndSanitizeUrl } from '@/lib/security';
import { extractFromPage, resolveDirectMp4Url } from '@/lib/extractor';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);
  const rawUrl = searchParams.get('url') || searchParams.get('streamUrl') || '';
  const rawQuality = searchParams.get('quality') || '720p';
  const rawTitle = searchParams.get('title') || '';

  // 1. Validate URL & extract viewkey
  const validation = validateAndSanitizeUrl(rawUrl);
  if (!validation.isValid || !validation.viewkey) {
    return new NextResponse('Invalid or unauthorized video URL provided.', { status: 400 });
  }

  const cleanQuality = rawQuality.toLowerCase().includes('p') ? rawQuality : `${rawQuality}p`;

  try {
    // 2. Extract video metadata
    const videoData = await extractFromPage(validation.viewkey);
    if (!videoData || videoData.formats.length === 0) {
      return new NextResponse('Video stream could not be found or has expired.', { status: 404 });
    }

    // Determine exact title: use provided title or extracted exact video title
    const videoTitle = rawTitle && rawTitle !== 'video' ? rawTitle : (videoData.title || 'video');

    // Remove only illegal OS filesystem characters (\ / : * ? " < > |), preserving spaces & exact casing
    const exactTitle = videoTitle
      .replace(/[\\/:*?"<>|]/g, '')
      .trim() || 'video';

    const filename = `${exactTitle}.mp4`;
    const asciiFilename = (exactTitle.replace(/[^\x20-\x7E]/g, '').trim() || 'video') + '.mp4';

    let chosenFormat = videoData.formats.find(
      (f) => f.quality.toLowerCase() === cleanQuality.toLowerCase()
    ) || videoData.formats[0];

    if (!chosenFormat?.url) {
      return new NextResponse('No valid stream format found.', { status: 404 });
    }

    // 3. Resolve direct CDN URL
    const directMp4Url = await resolveDirectMp4Url(chosenFormat.url);

    // Forward range header if present (for IDM / browser resume)
    const clientRange = req.headers.get('range');
    const upstreamHeaders: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
      'Referer': 'https://www.pornhub.com/',
      'Accept': '*/*',
    };
    if (clientRange) {
      upstreamHeaders['Range'] = clientRange;
    }

    // 4. Stream directly from CDN with exact video title
    const upstreamRes = await fetch(directMp4Url, {
      headers: upstreamHeaders,
    });

    if (!upstreamRes.ok || !upstreamRes.body) {
      return NextResponse.redirect(directMp4Url, 302);
    }

    const headers = new Headers();
    headers.set('Content-Type', 'video/mp4');
    headers.set('Content-Disposition', `attachment; filename="${asciiFilename}"; filename*=UTF-8''${encodeURIComponent(filename)}`);
    headers.set('Cache-Control', 'public, max-age=3600');
    headers.set('Accept-Ranges', 'bytes');

    const contentLength = upstreamRes.headers.get('content-length');
    if (contentLength) {
      headers.set('Content-Length', contentLength);
    }

    const contentRange = upstreamRes.headers.get('content-range');
    if (contentRange) {
      headers.set('Content-Range', contentRange);
    }

    return new NextResponse(upstreamRes.body as any, {
      status: upstreamRes.status === 206 ? 206 : 200,
      headers,
    });
  } catch (err) {
    console.error('Download route streaming error:', err);
    return new NextResponse('Error generating video download stream.', { status: 500 });
  }
}
