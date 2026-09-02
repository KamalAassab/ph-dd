import { validateAndSanitizeUrl } from './src/lib/security.ts';

// We can test the security function directly
console.log('Testing Security & SSRF Protection:');

const testCases = [
  // Blocked SSRF & local addresses
  { input: 'http://localhost/admin', shouldPass: false, label: 'localhost' },
  { input: 'http://127.0.0.1:8080/secret', shouldPass: false, label: '127.0.0.1 loopback' },
  { input: 'http://169.254.169.254/latest/meta-data', shouldPass: false, label: 'AWS metadata IP' },
  { input: 'http://192.168.1.1/router', shouldPass: false, label: 'RFC 1918 192.168.x' },
  { input: 'http://10.0.0.1/internal', shouldPass: false, label: 'RFC 1918 10.x' },
  { input: 'http://google.com/test', shouldPass: false, label: 'Disallowed domain' },
  { input: 'http://evil-pornhub.com.attacker.com/view_video.php?viewkey=ph123', shouldPass: false, label: 'Subdomain spoofing' },
  
  // Valid URLs
  { input: 'https://www.pornhub.com/view_video.php?viewkey=64866657c9632', shouldPass: true, label: 'Valid canonical PH video URL' },
  { input: 'https://rt.pornhub.com/view_video.php?viewkey=ph63f8dbcd71d1e', shouldPass: true, label: 'Valid regional subdomain URL' },
  { input: 'https://pornhub.com/embed/ph63f8dbcd71d1e', shouldPass: true, label: 'Valid embed URL' },
  { input: 'ph63f8dbcd71d1e', shouldPass: true, label: 'Valid raw viewkey string' },
];

let passedCount = 0;

for (const test of testCases) {
  const res = validateAndSanitizeUrl(test.input);
  const ok = (res.isValid === test.shouldPass);
  console.log(`${ok ? '✅' : '❌'} ${test.label}: Input="${test.input}" -> Valid=${res.isValid} (${res.error || res.canonicalUrl})`);
  if (ok) passedCount++;
}

console.log(`\nSecurity Test Results: ${passedCount}/${testCases.length} Passed.`);
