import type { AnalyticsEntry, Notifier, StorageAdapter } from './types.js';

export interface AnalyticsOptions {
  storage: StorageAdapter;
  notifier: Notifier;
  dedupeWindowMs?: number;
}

export interface Analytics {
  logDownload(entry: AnalyticsEntry, ip?: string): Promise<void>;
}

export function createAnalytics(options: AnalyticsOptions): Analytics {
  const dedupeWindowMs =
    options.dedupeWindowMs ?? Number(process.env.DEDUPE_WINDOW_MS || 10000);
  const lastSeen = new Map<string, number>();

  function isDuplicate(ip: string | undefined): boolean {
    const key = ip || 'unknown';
    const now = Date.now();
    const last = lastSeen.get(key);
    if (last !== undefined && now - last < dedupeWindowMs) {
      return true;
    }
    lastSeen.set(key, now);
    return false;
  }

  function prune(now: number): void {
    for (const [key, seenAt] of lastSeen) {
      if (now - seenAt >= dedupeWindowMs) {
        lastSeen.delete(key);
      }
    }
  }

  async function logDownload(entry: AnalyticsEntry, ip?: string): Promise<void> {
    prune(Date.now());
    if (isDuplicate(ip)) {
      return;
    }

    let total: number | null = null;
    try {
      total = await options.storage.appendRow(entry);
    } catch (err) {
      console.error('[analytics] sheet append failed:', err);
    }

    try {
      await options.notifier.sendDownloadNotification({ entry, total });
    } catch (err) {
      console.error('[analytics] telegram notify failed:', err);
    }
  }

  return { logDownload };
}
