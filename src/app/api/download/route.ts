import { NextRequest, NextResponse } from 'next/server';
import { validateAndSanitizeUrl } from '@/lib/security';
import { extractFromPage, resolveDirectMp4Url } from '@/lib/extractor';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getYtDlpPath(): string | null {
  // 1. Check local project bin directory
  const localBin = path.resolve(process.cwd(), 'bin', 'yt-dlp.exe');
  if (fs.existsSync(localBin)) return localBin;

  const localLinuxBin = path.resolve(process.cwd(), 'bin', 'yt-dlp');
  if (fs.existsSync(localLinuxBin)) return localLinuxBin;

  // 2. Check scoop shim location
  const scoopBin = 'C:\\Users\\4B\\scoop\\shims\\yt-dlp.exe';
  if (fs.existsSync(scoopBin)) return scoopBin;

  return null;
}

function getFfmpegDir(): string {
  const scoopFfmpeg = 'C:\\Users\\4B\\scoop\\shims';
  if (fs.existsSync(path.join(scoopFfmpeg, 'ffmpeg.exe'))) {
    return scoopFfmpeg;
  }
  return '';
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);
  const rawUrl = searchParams.get('url') || searchParams.get('streamUrl') || '';
  const rawQuality = searchParams.get('quality') || '720p';
  const rawTitle = searchParams.get('title') || 'video';

  // 1. Validate URL & extract viewkey
  const validation = validateAndSanitizeUrl(rawUrl);
  if (!validation.isValid || !validation.viewkey) {
    return new NextResponse('Invalid or unauthorized video URL provided.', { status: 400 });
  }

  const safeTitle = (rawTitle || 'video')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '_')
    .slice(0, 80) || 'video';

  const cleanQuality = rawQuality.toLowerCase().includes('p') ? rawQuality : `${rawQuality}p`;
  const filename = `${safeTitle}_${cleanQuality}.mp4`;

  const qualityHeight = parseInt(cleanQuality.replace(/\D/g, ''), 10) || 720;
  const maxHeight = Math.min(qualityHeight, 720);

  const videoPageUrl = `https://www.pornhub.com/view_video.php?viewkey=${validation.viewkey}`;
  const ytDlpExecutable = getYtDlpPath();

  // Mode A: Native yt-dlp Engine (High-speed multi-threaded fragment stitching)
  if (ytDlpExecutable) {
    const formatSelector = `bestvideo[height<=${maxHeight}]+bestaudio/best[height<=${maxHeight}]/best`;
    const ffmpegDir = getFfmpegDir();

    const spawnArgs = [
      '-f', formatSelector,
      videoPageUrl,
      '-o', '-',
      '-N', '16',
      '--buffer-size', '16M',
      '--no-warnings',
      '--no-check-certificates',
    ];

    if (ffmpegDir) {
      spawnArgs.push('--ffmpeg-location', ffmpegDir);
    }

    try {
      const child = spawn(ytDlpExecutable, spawnArgs, { stdio: ['ignore', 'pipe', 'pipe'] });

      let isTerminated = false;

      const cleanup = () => {
        if (isTerminated) return;
        isTerminated = true;
        try {
          child.stdout.removeAllListeners('data');
          child.stdout.removeAllListeners('end');
          child.stdout.removeAllListeners('error');
          child.stdout.pause();
          child.kill();
        } catch {}
      };

      req.signal.addEventListener('abort', cleanup);

      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          child.stdout.on('data', (chunk: Buffer) => {
            if (isTerminated) return;
            try {
              controller.enqueue(new Uint8Array(chunk));
            } catch {
              cleanup();
            }
          });

          child.stdout.on('end', () => {
            if (isTerminated) return;
            isTerminated = true;
            try {
              controller.close();
            } catch {}
            cleanup();
          });

          child.stdout.on('error', () => {
            if (isTerminated) return;
            isTerminated = true;
            try {
              controller.close();
            } catch {}
            cleanup();
          });

          child.on('error', () => {
            cleanup();
          });

          child.on('close', () => {
            cleanup();
          });
        },
        cancel() {
          cleanup();
        },
      });

      const headers = new Headers();
      headers.set('Content-Type', 'video/mp4');
      headers.set('Content-Disposition', `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`);
      headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');

      return new NextResponse(stream, {
        status: 200,
        headers,
      });
    } catch {
      // Fallback to direct stream proxy if spawn fails
    }
  }

  // Mode B: Serverless / Cloud Proxy Engine (Pure fetch & pipe without native binaries)
  try {
    const videoData = await extractFromPage(validation.viewkey);
    if (!videoData || videoData.formats.length === 0) {
      return new NextResponse('Video stream could not be found or has expired.', { status: 404 });
    }

    let chosenFormat = videoData.formats.find(
      (f) => f.quality.toLowerCase() === cleanQuality.toLowerCase()
    ) || videoData.formats[0];

    if (!chosenFormat?.url) {
      return new NextResponse('No valid stream format found.', { status: 404 });
    }

    const directMp4Url = await resolveDirectMp4Url(chosenFormat.url);

    const upstreamRes = await fetch(directMp4Url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Referer': 'https://www.pornhub.com/',
        'Accept': '*/*',
      },
    });

    if (!upstreamRes.ok || !upstreamRes.body) {
      return NextResponse.redirect(directMp4Url, 302);
    }

    const headers = new Headers();
    headers.set('Content-Type', 'video/mp4');
    headers.set('Content-Disposition', `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`);
    headers.set('Cache-Control', 'public, max-age=3600');

    const contentLength = upstreamRes.headers.get('content-length');
    if (contentLength) {
      headers.set('Content-Length', contentLength);
    }

    return new NextResponse(upstreamRes.body as any, {
      status: 200,
      headers,
    });
  } catch (err) {
    console.error('Download route fallback error:', err);
    return new NextResponse('Error generating video download.', { status: 500 });
  }
}
