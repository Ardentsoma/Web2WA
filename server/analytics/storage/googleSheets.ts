import type { AnalyticsEntry, StorageAdapter } from '../types.js';

export interface GoogleSheetsConfig {
  webhookUrl: string;
  secret: string;
}

export function createGoogleSheetsStorage(config: GoogleSheetsConfig): StorageAdapter {
  return {
    async appendRow(entry: AnalyticsEntry): Promise<number> {
      if (!config.webhookUrl) {
        throw new Error('SHEETS_WEBHOOK_URL not configured');
      }
      const res = await fetch(config.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret: config.secret, ...entry }),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; total?: number; error?: string } | null;
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error ? `Sheets webhook: ${data.error}` : `Sheets webhook HTTP ${res.status}`);
      }
      return typeof data.total === 'number' ? data.total : 0;
    },
  };
}
