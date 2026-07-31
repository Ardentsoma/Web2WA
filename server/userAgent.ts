export interface UserAgentInfo {
  browser: string;
  os: string;
}

function detectBrowser(ua: string): string {
  if (/Edg\//.test(ua)) return 'Edge';
  if (/OPR\//.test(ua) || /Opera/.test(ua)) return 'Opera';
  if (/SamsungBrowser\//.test(ua)) return 'Samsung Internet';
  if (/UCBrowser\//.test(ua)) return 'UC Browser';
  if (/Chrome\//.test(ua)) return 'Chrome';
  if (/Firefox\//.test(ua)) return 'Firefox';
  if (/MSIE\s|Trident\//.test(ua)) return 'Internet Explorer';
  if (/Safari\//.test(ua)) return 'Safari';
  return 'Unknown';
}

function detectOs(ua: string): string {
  if (/Windows NT 10/.test(ua)) return 'Windows';
  if (/Windows NT 6\.[0-3]/.test(ua)) return 'Windows';
  if (/Windows Phone/.test(ua)) return 'Windows Phone';
  if (/Android/.test(ua)) return 'Android';
  if (/iPhone|iPad|iPod/.test(ua)) return 'iOS';
  if (/Mac OS X/.test(ua)) return 'macOS';
  if (/CrOS/.test(ua)) return 'Chrome OS';
  if (/Linux/.test(ua)) return 'Linux';
  return 'Unknown';
}

export function parseUserAgent(ua: string | undefined): UserAgentInfo {
  const value = ua || '';
  return {
    browser: detectBrowser(value),
    os: detectOs(value),
  };
}
