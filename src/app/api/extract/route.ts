import { NextRequest, NextResponse } from 'next/server';
import { validateAndSanitizeUrl } from '@/lib/security';
import { extractFromPage } from '@/lib/extractor';
import { ExtractApiResponse } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 15;

export async function POST(req: NextRequest): Promise<NextResponse<ExtractApiResponse>> {
  try {
    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON request payload.', code: 'INVALID_URL' },
        { status: 400 }
      );
    }

    const { url } = body || {};

    // 1. SSRF & Security Validation
    const validation = validateAndSanitizeUrl(url);
    if (!validation.isValid || !validation.viewkey) {
      return NextResponse.json(
        {
          success: false,
          error: validation.error || 'Invalid or unauthorized video URL provided.',
          code: validation.code || 'INVALID_URL',
        },
        { status: 400 }
      );
    }

    // 2. High-speed Metadata & Format Extraction
    const videoData = await extractFromPage(validation.viewkey);

    if (!videoData) {
      return NextResponse.json(
        {
          success: false,
          error: 'Video could not be found, or it may be private, removed, or geo-restricted.',
          code: 'NOT_FOUND',
        },
        { status: 404 }
      );
    }

    if (videoData.formats.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Could not extract playable stream or download links for this video.',
          code: 'PARSING_FAILED',
        },
        { status: 422 }
      );
    }

    // 3. Return Filtered Lightweight JSON Response
    return NextResponse.json(
      {
        success: true,
        data: {
          id: videoData.id,
          title: videoData.title,
          thumbnail: videoData.thumbnail,
          duration: videoData.duration,
          author: videoData.author,
          formats: videoData.formats,
          sourceUrl: videoData.sourceUrl,
        },
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    );
  } catch (error: any) {
    console.error('Extraction API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'An unexpected error occurred while parsing the video. Please try again.',
        code: 'UNKNOWN',
      },
      { status: 500 }
    );
  }
}
