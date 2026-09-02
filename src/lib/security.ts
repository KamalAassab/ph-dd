/**
 * Security and SSRF validation utility for video extraction requests.
 */

// Allowed domain: strictly pornhub.com and its official subdomains
const ALLOWED_DOMAINS = [
  'pornhub.com',
];

// Blocked private/internal IPv4 and IPv6 CIDR patterns & hostnames
const BLOCKED_HOSTS_REGEX = /^(localhost|127\.\d+\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|192\.168\.\d+\.\d+|169\.254\.\d+\.\d+|0\.0\.0\.0|::1|fc00::.*|fe80::.*|.*\.local|.*\.internal)$/i;

export interface SanitizedUrlResult {
  isValid: boolean;
  error?: string;
  code?: 'INVALID_URL' | 'SSRF_BLOCKED';
  canonicalUrl?: string;
  viewkey?: string;
}

/**
 * Validates and sanitizes a user-supplied URL to prevent SSRF and malicious input.
 */
export function validateAndSanitizeUrl(rawUrl: string): SanitizedUrlResult {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return {
      isValid: false,
      error: 'Please enter a valid URL.',
      code: 'INVALID_URL',
    };
  }

  const trimmed = rawUrl.trim();

  // Basic length limit to prevent ReDoS / payload abuse
  if (trimmed.length > 2048) {
    return {
      isValid: false,
      error: 'URL exceeds maximum allowable length.',
      code: 'INVALID_URL',
    };
  }

  let parsed: URL;
  try {
    let target = trimmed;
    // If user inputs a raw viewkey like ph64... or a 10+ character hex viewkey
    if (/^(ph[a-f0-9]+|[a-f0-9]{8,64})$/i.test(target)) {
      target = `https://www.pornhub.com/view_video.php?viewkey=${target}`;
    } else if (!target.startsWith('http://') && !target.startsWith('https://')) {
      target = `https://${target}`;
    }

    parsed = new URL(target);
  } catch {
    return {
      isValid: false,
      error: 'Malformed URL format. Please provide a valid HTTP/HTTPS URL.',
      code: 'INVALID_URL',
    };
  }

  // Only allow HTTP and HTTPS
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return {
      isValid: false,
      error: 'Invalid protocol. Only HTTP and HTTPS are permitted.',
      code: 'SSRF_BLOCKED',
    };
  }

  const hostname = parsed.hostname.toLowerCase();

  // Reject blocked local / private IPs & loopbacks
  if (BLOCKED_HOSTS_REGEX.test(hostname)) {
    return {
      isValid: false,
      error: 'Access to local, private, or restricted network hosts is prohibited.',
      code: 'SSRF_BLOCKED',
    };
  }

  // Reject raw IP addresses (e.g. 169.254.169.254 or numbers)
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname) || /^\[.*\]$/.test(hostname)) {
    return {
      isValid: false,
      error: 'Direct IP address navigation is prohibited.',
      code: 'SSRF_BLOCKED',
    };
  }

  // Check if hostname matches allowed domain or subdomain
  const isAllowedDomain = ALLOWED_DOMAINS.some(
    (domain) => hostname === domain || hostname.endsWith(`.${domain}`)
  );

  if (!isAllowedDomain) {
    return {
      isValid: false,
      error: `Only supported domains are allowed (${ALLOWED_DOMAINS.join(', ')}).`,
      code: 'SSRF_BLOCKED',
    };
  }

  // Extract viewkey from query string or URL path
  let viewkey = parsed.searchParams.get('viewkey');

  if (!viewkey) {
    // Check if viewkey is embedded in path or URL fragment (e.g., /view_video.php?viewkey=ph123 or /embed/ph123 or ph123)
    const match = trimmed.match(/(?:viewkey=|embed\/|video\/|^)(ph[a-f0-9]+|[a-f0-9]{8,})/i);
    if (match && match[1]) {
      viewkey = match[1];
    }
  }

  if (!viewkey || !/^[a-zA-Z0-9_-]{5,64}$/.test(viewkey)) {
    return {
      isValid: false,
      error: 'Could not detect a valid video viewkey in the provided URL. Example: https://www.pornhub.com/view_video.php?viewkey=ph...',
      code: 'INVALID_URL',
    };
  }

  // Construct a safe canonical URL using known safe template
  const canonicalUrl = `https://www.pornhub.com/view_video.php?viewkey=${encodeURIComponent(viewkey)}`;

  return {
    isValid: true,
    canonicalUrl,
    viewkey,
  };
}
