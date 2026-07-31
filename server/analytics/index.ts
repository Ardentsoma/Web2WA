import { createAnalytics } from './logDownload.js';
import type { Analytics } from './logDownload.js';
import { createTelegramNotifier } from './notify/telegram.js';
import { createGoogleSheetsStorage } from './storage/googleSheets.js';

export function createAnalyticsFromEnv(): Analytics {
  return createAnalytics({
    storage: createGoogleSheetsStorage({
      webhookUrl: process.env.SHEETS_WEBHOOK_URL || '',
      secret: process.env.SHEETS_SECRET || '',
    }),
    notifier: createTelegramNotifier({
      botToken: process.env.TELEGRAM_BOT_TOKEN || '',
      chatId: process.env.TELEGRAM_CHAT_ID || '',
    }),
  });
}
