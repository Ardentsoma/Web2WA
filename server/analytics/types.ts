export interface AnalyticsEntry {
  timestamp: string;
  version: string;
  country: string;
  browser: string;
  os: string;
  userAgent: string;
  referrer: string;
}

export interface StorageAdapter {
  appendRow(entry: AnalyticsEntry): Promise<number>;
}

export interface NotificationInfo {
  entry: AnalyticsEntry;
  total: number | null;
}

export interface Notifier {
  sendDownloadNotification(info: NotificationInfo): Promise<void>;
}
