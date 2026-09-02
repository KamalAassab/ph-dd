import { NextRequest, NextResponse } from 'next/server';
import { validateAndSanitizeUrl } from '@/lib/security';
import { extractFromPage, resolveDirectMp4Url, getYtDlpPath, getFfmpegDir } from '@/lib/extractor';
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

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);
  const rawUrl = searchParams.get('url') || '';
  const directStreamUrl = searchParams.get('streamUrl') || '';
  const rawQuality = searchParams.get('quality') || '720p';
  const rawTitle = searchParams.get('title') || '';

  // 1. Validate URL & extract viewkey
  const validation = validateAndSanitizeUrl(rawUrl || directStreamUrl);
  if (!validation.isValid || !validation.viewkey) {
    return new NextResponse('Invalid or unauthorized video URL provided.', { status: 400 });
  }

  const cleanQuality = rawQuality.toLowerCase().includes('p') ? rawQuality : `${rawQuality}p`;
  const qualityHeight = parseInt(cleanQuality.replace(/\D/g, ''), 10) || 720;

  // Exact title sanitization: preserve spaces, exact wording, numbers, and casing
  const candidateTitle = rawTitle && rawTitle !== 'video' ? rawTitle : '';
  let videoTitle = candidateTitle;

  const ytDlpExecutable = getYtDlpPath();

  // Mode A: Native High-Speed yt-dlp Cache & Multi-part Engine (Local & Dedicated Server)
  if (ytDlpExecutable) {
    const cacheDir = getCacheDir();
    const cachedFilePath = path.join(cacheDir, `${validation.viewkey}_${qualityHeight}p.mp4`);

    try {
      // If cached file doesn't exist or is too small, download with 16 parallel threads
      if (!fs.existsSync(cachedFilePath) || fs.statSync(cachedFilePath).size < 1000) {
        const videoPageUrl = `https://www.pornhub.com/view_video.php?viewkey=${validation.viewkey}`;
        const ffmpegDir = getFfmpegDir();

        const spawnArgs = [
          '-f', `bestvideo[height<=${qualityHeight}]+bestaudio/best[height<=${qualityHeight}]/best`,
          videoPageUrl,
          '-N', '16',
          '--postprocessor-args', 'ffmpeg:-movflags +faststart',
          '-o', cachedFilePath,
          '--no-warnings',
          '--no-check-certificates',
        ];

        if (ffmpegDir) {
          spawnArgs.push('--ffmpeg-location', ffmpegDir);
        }

        await execFileAsync(ytDlpExecutable, spawnArgs, { timeout: 180000 });
      }

      if (fs.existsSync(cachedFilePath)) {
        const stat = fs.statSync(cachedFilePath);
        const totalSize = stat.size;

        if (!videoTitle) {
          const videoData = await extractFromPage(validation.viewkey);
          videoTitle = videoData?.title || 'video';
        }

        const exactTitle = (videoTitle || 'video')
          .replace(/[\\/:*?"<>|]/g, '')
          .trim() || 'video';

        const filename = `${exactTitle}.mp4`;
        const asciiFilename = (exactTitle.replace(/[^\x20-\x7E]/g, '').trim() || 'video') + '.mp4';

        // Parse HTTP Range header (for IDM parallel chunk download & browser resume)
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
            cancel() {
              fileStream.destroy();
            },
          });

          const headers = new Headers();
          headers.set('Content-Range', `bytes ${start}-${end}/${totalSize}`);
          headers.set('Accept-Ranges', 'bytes');
          headers.set('Content-Length', chunkSize.toString());
          headers.set('Content-Type', 'video/mp4');
          headers.set('Content-Disposition', `attachment; filename="${asciiFilename}"; filename*=UTF-8''${encodeURIComponent(filename)}`);
          headers.set('Cache-Control', 'public, max-age=86400');

          return new NextResponse(webStream, {
            status: 206,
            headers,
          });
        }

        // Full file stream with exact total size
        const fileStream = fs.createReadStream(cachedFilePath);
        const webStream = new ReadableStream<Uint8Array>({
          start(controller) {
            fileStream.on('data', (chunk: Buffer | string) => {
              controller.enqueue(typeof chunk === 'string' ? Buffer.from(chunk) : new Uint8Array(chunk));
            });
            fileStream.on('end', () => controller.close());
            fileStream.on('error', (err) => controller.error(err));
          },
          cancel() {
            fileStream.destroy();
          },
        });

        const headers = new Headers();
        headers.set('Content-Length', totalSize.toString());
        headers.set('Content-Type', 'video/mp4');
        headers.set('Content-Disposition', `attachment; filename="${asciiFilename}"; filename*=UTF-8''${encodeURIComponent(filename)}`);
        headers.set('Accept-Ranges', 'bytes');
        headers.set('Cache-Control', 'public, max-age=86400');

        return new NextResponse(webStream, {
          status: 200,
          headers,
        });
      }
    } catch (err) {
      console.error('Local yt-dlp cache engine error, falling back to direct CDN proxy:', err);
    }
  }

  // Mode B: Serverless / Cloud Proxy Streaming (Pure fetch for Vercel)
  try {
    let targetStreamUrl = directStreamUrl;

    if (!targetStreamUrl || !videoTitle) {
      const videoData = await extractFromPage(validation.viewkey);
      if (!videoData || videoData.formats.length === 0) {
        return new NextResponse('Video stream could not be found or has expired.', { status: 404 });
      }
      if (!videoTitle) {
        videoTitle = videoData.title || 'video';
      }
      if (!targetStreamUrl) {
        const chosenFormat = videoData.formats.find(
          (f) => f.quality.toLowerCase() === cleanQuality.toLowerCase()
        ) || videoData.formats[0];
        targetStreamUrl = chosenFormat?.url || '';
      }
    }

    if (!targetStreamUrl) {
      return new NextResponse('No valid stream format found.', { status: 404 });
    }

    const exactTitle = (videoTitle || 'video')
      .replace(/[\\/:*?"<>|]/g, '')
      .trim() || 'video';

    const filename = `${exactTitle}.mp4`;
    const asciiFilename = (exactTitle.replace(/[^\x20-\x7E]/g, '').trim() || 'video') + '.mp4';

    const directMp4Url = await resolveDirectMp4Url(targetStreamUrl);

    const clientRange = req.headers.get('range');
    const upstreamHeaders: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
      'Referer': 'https://www.pornhub.com/',
      'Accept': '*/*',
    };
    if (clientRange) {
      upstreamHeaders['Range'] = clientRange;
    }

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
