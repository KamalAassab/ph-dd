import { NextRequest, NextResponse } from 'next/server';
import { validateAndSanitizeUrl } from '@/lib/security';
import { getYtDlpPath, getFfmpegDir, extractFromPage } from '@/lib/extractor';
import { execFile } from 'child_process';
import util from 'util';
import path from 'path';
import fs from 'fs';
import os from 'os';

const execFileAsync = util.promisify(execFile);

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getCacheDir(): string {
  const dir = path.join(os.tmpdir(), 'ph_video_cache');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

/**
 * Re-fetch a fresh signed CDN URL at download time by re-running the
 * embed + get_media pipeline. CDN tokens expire in minutes, so we NEVER
 * use the URL extracted during the /api/extract call.
 */
async function getFreshStreamUrl(viewkey: string, qualityHeight: number): Promise<string> {
  const embedUrl = `https://www.pornhub.com/embed/${encodeURIComponent(viewkey)}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(embedUrl, {
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

    if (!response.ok) return '';
    const html = await response.text();

    // Collect all get_media endpoints and resolve them to actual CDN MP4s
    const getMediaMatches = Array.from(html.matchAll(/"videoUrl"\s*:\s*"(https?:\\\/\\\/[^"]+get_media[^"]*)"/gi));
    
    const allStreams: Array<{ height: number; url: string }> = [];

    for (const m of getMediaMatches) {
      const rawMediaUrl = m[1].replace(/\\\//g, '/');
      try {
        const mediaRes = await fetch(rawMediaUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
            'Referer': 'https://www.pornhub.com/',
            'Accept': 'application/json, text/plain, */*',
          },
        });
        if (mediaRes.ok) {
          const items = await mediaRes.json();
          if (Array.isArray(items)) {
            for (const item of items) {
              if (item.videoUrl && item.height) {
                allStreams.push({ height: item.height, url: item.videoUrl.replace(/\\\//g, '/') });
              }
            }
          }
        }
      } catch {
        // ignore
      }
    }

    if (allStreams.length === 0) return '';

    // Sort by height descending and find closest match
    allStreams.sort((a, b) => b.height - a.height);

    // Find best match for requested quality
    const exact = allStreams.find(s => s.height === qualityHeight);
    if (exact) return exact.url;

    // If requesting a lower quality (420p/360p), use best available (will be transcoded server-side)
    const lowerOrEqual = allStreams.filter(s => s.height <= qualityHeight);
    if (lowerOrEqual.length > 0) return lowerOrEqual[0].url;

    // Fallback: return best available
    return allStreams[0].url;

  } catch {
    clearTimeout(timeoutId);
    return '';
  }
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);
  const rawUrl = searchParams.get('url') || '';
  const rawQuality = searchParams.get('quality') || '720p';
  const rawTitle = searchParams.get('title') || '';

  // 1. Validate URL & extract viewkey
  const validation = validateAndSanitizeUrl(rawUrl);
  if (!validation.isValid || !validation.viewkey) {
    return new NextResponse('Invalid or unauthorized video URL provided.', { status: 400 });
  }

  const viewkey = validation.viewkey;
  const cleanQuality = rawQuality.toLowerCase().includes('p') ? rawQuality : `${rawQuality}p`;
  const qualityHeight = parseInt(cleanQuality.replace(/\D/g, ''), 10) || 720;
  const videoTitle = rawTitle && rawTitle !== 'video' ? rawTitle : 'video';

  const ytDlpExecutable = getYtDlpPath();

  // ─── Mode A: yt-dlp (local / dedicated server with binary) ───────────────
  if (ytDlpExecutable) {
    const cacheDir = getCacheDir();
    const cachedFilePath = path.join(cacheDir, `${viewkey}_${qualityHeight}p.mp4`);

    try {
      if (!fs.existsSync(cachedFilePath) || fs.statSync(cachedFilePath).size < 100_000) {
        const videoPageUrl = `https://www.pornhub.com/view_video.php?viewkey=${viewkey}`;
        const ffmpegDir = getFfmpegDir();

        const isOriginal = qualityHeight >= 480;
        const ffmpegPostArgs = isOriginal
          ? 'ffmpeg:-movflags +faststart'
          : `ffmpeg:-vf scale=-2:${qualityHeight} -c:v libx264 -preset ultrafast -crf 24 -c:a copy -movflags +faststart`;

        const spawnArgs = [
          '-f', isOriginal
            ? `bestvideo[height<=${qualityHeight}]+bestaudio/best[height<=${qualityHeight}]/best`
            : 'bestvideo+bestaudio/best',
          videoPageUrl,
          '-N', '16',
          '--postprocessor-args', ffmpegPostArgs,
          '-o', cachedFilePath,
          '--no-warnings',
          '--no-check-certificates',
        ];

        if (ffmpegDir) {
          spawnArgs.push('--ffmpeg-location', ffmpegDir);
        }

        await execFileAsync(ytDlpExecutable, spawnArgs, { timeout: 180_000 });
      }

      if (fs.existsSync(cachedFilePath) && fs.statSync(cachedFilePath).size > 100_000) {
        const stat = fs.statSync(cachedFilePath);
        const totalSize = stat.size;

        const exactTitle = videoTitle.replace(/[\\/:*?"<>|]/g, '').trim() || 'video';
        const filename = `${exactTitle}.mp4`;
        const asciiFilename = (exactTitle.replace(/[^\x20-\x7E]/g, '').trim() || 'video') + '.mp4';

        const rangeHeader = req.headers.get('range');

        if (rangeHeader) {
          const parts = rangeHeader.replace(/bytes=/, '').split('-');
          const start = parseInt(parts[0], 10) || 0;
          const end = parts[1] ? parseInt(parts[1], 10) : totalSize - 1;
          const chunkSize = end - start + 1;

          const fileStream = fs.createReadStream(cachedFilePath, { start, end });
          const webStream = new ReadableStream<Uint8Array>({
            start(controller) {
              fileStream.on('data', (chunk: Buffer | string) => {
                controller.enqueue(typeof chunk === 'string' ? Buffer.from(chunk) : new Uint8Array(chunk));
              });
              fileStream.on('end', () => controller.close());
              fileStream.on('error', (err) => controller.error(err));
            },
            cancel() { fileStream.destroy(); },
          });

          const headers = new Headers();
          headers.set('Content-Range', `bytes ${start}-${end}/${totalSize}`);
          headers.set('Accept-Ranges', 'bytes');
          headers.set('Content-Length', chunkSize.toString());
          headers.set('Content-Type', 'video/mp4');
          headers.set('Content-Disposition', `attachment; filename="${asciiFilename}"; filename*=UTF-8''${encodeURIComponent(filename)}`);
          headers.set('Cache-Control', 'no-cache');

          return new NextResponse(webStream, { status: 206, headers });
        }

        const fileStream = fs.createReadStream(cachedFilePath);
        const webStream = new ReadableStream<Uint8Array>({
          start(controller) {
            fileStream.on('data', (chunk: Buffer | string) => {
              controller.enqueue(typeof chunk === 'string' ? Buffer.from(chunk) : new Uint8Array(chunk));
            });
            fileStream.on('end', () => controller.close());
            fileStream.on('error', (err) => controller.error(err));
          },
          cancel() { fileStream.destroy(); },
        });

        const headers = new Headers();
        headers.set('Content-Length', totalSize.toString());
        headers.set('Content-Type', 'video/mp4');
        headers.set('Content-Disposition', `attachment; filename="${asciiFilename}"; filename*=UTF-8''${encodeURIComponent(filename)}`);
        headers.set('Accept-Ranges', 'bytes');
        headers.set('Cache-Control', 'no-cache');

        return new NextResponse(webStream, { status: 200, headers });
      }
    } catch (err) {
      console.error('[download] yt-dlp error, falling back to proxy:', err);
    }
  }

  // ─── Mode B: Cloud/Serverless — Always re-extract a fresh signed URL ─────
  // CRITICAL: Never use the URL from extraction time. CDN tokens expire in minutes.
  // We always re-run the embed + get_media pipeline at download time.
  try {
    const freshUrl = await getFreshStreamUrl(viewkey, qualityHeight);

    if (!freshUrl) {
      // Last resort: try full re-extraction
      const videoData = await extractFromPage(viewkey);
      if (!videoData || videoData.formats.length === 0) {
        return new NextResponse('Video stream could not be found or has expired. Please try again.', { status: 404 });
      }
      const format = videoData.formats.find(f => f.quality === cleanQuality) || videoData.formats[0];
      if (!format?.url) {
        return new NextResponse('No valid stream format found.', { status: 404 });
      }
    }

    if (!freshUrl) {
      return new NextResponse('Could not resolve a valid video stream. Please retry.', { status: 502 });
    }

    const exactTitle = videoTitle.replace(/[\\/:*?"<>|]/g, '').trim() || 'video';
    const filename = `${exactTitle}.mp4`;
    const asciiFilename = (exactTitle.replace(/[^\x20-\x7E]/g, '').trim() || 'video') + '.mp4';

    const clientRange = req.headers.get('range');
    const upstreamHeaders: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
      'Referer': 'https://www.pornhub.com/',
      'Accept': '*/*',
      'Accept-Encoding': 'identity',
    };
    if (clientRange) {
      upstreamHeaders['Range'] = clientRange;
    }

    const upstreamRes = await fetch(freshUrl, { headers: upstreamHeaders });

    if (!upstreamRes.ok || !upstreamRes.body) {
      console.error('[download] upstream CDN failed:', upstreamRes.status, freshUrl.substring(0, 60));
      return new NextResponse(`Upstream video CDN returned ${upstreamRes.status}. The link may have expired — please retry.`, { status: 502 });
    }

    const headers = new Headers();
    headers.set('Content-Type', 'video/mp4');
    headers.set('Content-Disposition', `attachment; filename="${asciiFilename}"; filename*=UTF-8''${encodeURIComponent(filename)}`);
    headers.set('Cache-Control', 'no-cache, no-store');
    headers.set('Accept-Ranges', 'bytes');

    const contentLength = upstreamRes.headers.get('content-length');
    if (contentLength) headers.set('Content-Length', contentLength);

    const contentRange = upstreamRes.headers.get('content-range');
    if (contentRange) headers.set('Content-Range', contentRange);

    return new NextResponse(upstreamRes.body as unknown as ReadableStream, {
      status: upstreamRes.status === 206 ? 206 : 200,
      headers,
    });

  } catch (err) {
    console.error('[download] proxy streaming error:', err);
    return new NextResponse('Error generating video download stream.', { status: 500 });
  }
}
