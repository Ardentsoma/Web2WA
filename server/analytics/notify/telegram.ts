import type { NotificationInfo, Notifier } from '../types.js';

export interface TelegramConfig {
  botToken: string;
  chatId: string;
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, ' UTC');
}

function buildMessage({ entry, total }: NotificationInfo): string {
  const lines = [
    '⬇️ New Plugin Download',
    '',
    `Version:  ${entry.version || 'n/a'}`,
    `Time:     ${formatTimestamp(entry.timestamp)}`,
    `Country:  ${entry.country || 'Unknown'}`,
    `Browser:  ${entry.browser || 'Unknown'}`,
    `OS:       ${entry.os || 'Unknown'}`,
  ];
  if (entry.referrer) {
    lines.push(`Referrer: ${entry.referrer}`);
  }
  lines.push('', `Total downloads: ${total ?? 'n/a'}`);
  return lines.join('\n');
}

export function createTelegramNotifier(config: TelegramConfig): Notifier {
  return {
    async sendDownloadNotification(info: NotificationInfo): Promise<void> {
      if (!config.botToken || !config.chatId) {
        throw new Error('Telegram not configured (TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID)');
      }
      const res = await fetch(`https://api.telegram.org/bot${config.botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: config.chatId, text: buildMessage(info) }),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`Telegram API HTTP ${res.status}${body ? `: ${body}` : ''}`);
      }
    },
  };
}
