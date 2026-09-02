import { NextRequest, NextResponse } from 'next/server';
import { validateAndSanitizeUrl } from '@/lib/security';
import { extractFromPage, resolveDirectMp4Url } from '@/lib/extractor';
import { execFile } from 'child_process';
import util from 'util';
import path from 'path';
import fs from 'fs';
import os from 'os';

const execFileAsync = util.promisify(execFile);

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getYtDlpPath(): string | null {
  const localBin = path.resolve(process.cwd(), 'bin', 'yt-dlp.exe');
  if (fs.existsSync(localBin)) return localBin;

  const localLinuxBin = path.resolve(process.cwd(), 'bin', 'yt-dlp');
  if (fs.existsSync(localLinuxBin)) return localLinuxBin;

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

function getCacheDir(): string {
  const dir = path.join(os.tmpdir(), 'ph_video_cache');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
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

  const ytDlpExecutable = getYtDlpPath();

  // Mode A: Native yt-dlp Cache Pipeline (Provides 100% exact Content-Length, progress bar & IDM resume support)
  if (ytDlpExecutable) {
    const cacheDir = getCacheDir();
    const cachedFilePath = path.join(cacheDir, `${validation.viewkey}_${maxHeight}p.mp4`);

    try {
      // If not yet downloaded or file size is 0, download with multi-threaded yt-dlp to temp file
      if (!fs.existsSync(cachedFilePath) || fs.statSync(cachedFilePath).size < 1000) {
        const formatSelector = `bestvideo[height<=${maxHeight}]+bestaudio/best[height<=${maxHeight}]/best`;
        const videoPageUrl = `https://www.pornhub.com/view_video.php?viewkey=${validation.viewkey}`;
        const ffmpegDir = getFfmpegDir();

        const spawnArgs = [
          '-f', formatSelector,
          videoPageUrl,
          '-N', '16',
          '-o', cachedFilePath,
          '--no-warnings',
          '--no-check-certificates',
        ];

        if (ffmpegDir) {
          spawnArgs.push('--ffmpeg-location', ffmpegDir);
        }

        await execFileAsync(ytDlpExecutable, spawnArgs, { timeout: 120000 });
      }

      if (fs.existsSync(cachedFilePath)) {
        const stat = fs.statSync(cachedFilePath);
        const totalSize = stat.size;

        // Parse Range request (e.g. from IDM or browser resume)
        const rangeHeader = req.headers.get('range');

        if (rangeHeader) {
          const parts = rangeHeader.replace(/bytes=/, '').split('-');
          const start = parseInt(parts[0], 10) || 0;
          const end = parts[1] ? parseInt(parts[1], 10) : totalSize - 1;
          const chunkSize = end - start + 1;

          const fileStream = fs.createReadStream(cachedFilePath, { start, end });
          const webStream = new ReadableStream<Uint8Array>({
            start(controller) {
              fileStream.on('data', (chunk: Buffer) => {
                controller.enqueue(new Uint8Array(chunk));
              });
              fileStream.on('end', () => {
                controller.close();
              });
              fileStream.on('error', (err) => {
                controller.error(err);
              });
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
          headers.set('Content-Disposition', `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`);
          headers.set('Cache-Control', 'public, max-age=86400');

          return new NextResponse(webStream, {
            status: 206,
            headers,
          });
        }

        // Full file download with exact Content-Length
        const fileStream = fs.createReadStream(cachedFilePath);
        const webStream = new ReadableStream<Uint8Array>({
          start(controller) {
            fileStream.on('data', (chunk: Buffer) => {
              controller.enqueue(new Uint8Array(chunk));
            });
            fileStream.on('end', () => {
              controller.close();
            });
            fileStream.on('error', (err) => {
              controller.error(err);
            });
          },
          cancel() {
            fileStream.destroy();
          },
        });

        const headers = new Headers();
        headers.set('Content-Length', totalSize.toString());
        headers.set('Content-Type', 'video/mp4');
        headers.set('Content-Disposition', `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`);
        headers.set('Accept-Ranges', 'bytes');
        headers.set('Cache-Control', 'public, max-age=86400');

        return new NextResponse(webStream, {
          status: 200,
          headers,
        });
      }
    } catch (err) {
      console.error('yt-dlp exact-size cache error, falling back to proxy stream:', err);
    }
  }

  // Mode B: Serverless / Cloud Proxy Engine (Pure fetch proxy for Vercel)
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
    headers.set('Accept-Ranges', 'bytes');

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
