import { readFileSync } from 'node:fs';
import type { AnalyticsEntry } from './analytics/types.js';
import { getPluginMeta } from './plugin.js';
import { parseUserAgent } from './userAgent.js';

export class PluginNotFoundError extends Error {
  constructor() {
    super('Plugin file not found');
  }
}

export interface DownloadPayload {
  version: string;
  filename: string;
  buffer: Buffer;
  entry: AnalyticsEntry;
}

function headerValue(headers: Record<string, unknown>, name: string): string {
  const value = headers[name];
  if (Array.isArray(value)) return value[0] ?? '';
  return typeof value === 'string' ? value : '';
}

export function getClientIp(headers: Record<string, unknown>): string | undefined {
  const forwarded = headerValue(headers, 'x-forwarded-for');
  return forwarded.split(',')[0]?.trim() || undefined;
}

export function getCountry(headers: Record<string, unknown>): string {
  const candidates = [
    'cf-ipcountry',
    'x-appengine-country',
    'x-country-code',
    'x-vercel-ip-country',
    'x-azure-region',
  ];
  for (const name of candidates) {
    const value = headerValue(headers, name);
    if (value) return value;
  }
  return '';
}

export async function buildDownloadPayload(headers: Record<string, unknown>): Promise<DownloadPayload> {
  const meta = await getPluginMeta();
  if (!meta.exists) {
    throw new PluginNotFoundError();
  }
  const userAgent = headerValue(headers, 'user-agent');
  const ua = parseUserAgent(userAgent);
  const entry: AnalyticsEntry = {
    timestamp: new Date().toISOString(),
    version: meta.version,
    country: getCountry(headers),
    browser: ua.browser,
    os: ua.os,
    userAgent,
    referrer: headerValue(headers, 'referer') || headerValue(headers, 'referrer'),
  };
  return {
    version: meta.version,
    filename: meta.filename,
    buffer: readFileSync(meta.zipPath),
    entry,
  };
}
