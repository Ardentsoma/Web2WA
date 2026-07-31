import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createAnalyticsFromEnv } from '../server/analytics/index.js';
import { buildDownloadPayload, getClientIp, PluginNotFoundError } from '../server/downloadCore.js';

const analytics = createAnalyticsFromEnv();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const payload = await buildDownloadPayload(req.headers);
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${payload.filename}"`);
    res.send(payload.buffer);
    await analytics.logDownload(payload.entry, getClientIp(req.headers));
  } catch (err) {
    if (!res.headersSent) {
      const isNotFound = err instanceof PluginNotFoundError;
      console.error('[download] error:', err);
      res.status(isNotFound ? 404 : 500).json({
        error: isNotFound ? err.message : 'Internal server error',
      });
    }
  }
}
