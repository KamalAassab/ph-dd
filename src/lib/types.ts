export interface VideoFormat {
  quality: string; // e.g. '1080p', '720p', '480p', '360p', '240p'
  resolution?: string; // e.g. '1920x1080'
  url: string;
  ext: 'mp4' | 'm3u8';
  label: string;
  formattedSize?: string;
  isHls?: boolean;
}

export interface VideoMetadata {
  id: string;
  title: string;
  thumbnail: string;
  duration?: string;
  durationSeconds?: number;
  author?: string;
  authorUrl?: string;
  views?: string;
  rating?: string;
  formats: VideoFormat[];
  sourceUrl: string;
}

export interface ExtractApiResponse {
  success: boolean;
  data?: VideoMetadata;
  error?: string;
  code?: 'INVALID_URL' | 'SSRF_BLOCKED' | 'NOT_FOUND' | 'PARSING_FAILED' | 'NETWORK_ERROR' | 'UNKNOWN';
}

export type ExtractionStatus = 'idle' | 'loading' | 'error' | 'success';
