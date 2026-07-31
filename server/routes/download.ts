import { Router } from 'express';
import type { Analytics } from '../analytics/logDownload.js';
import { buildDownloadPayload, getClientIp, PluginNotFoundError } from '../downloadCore.js';

export function createDownloadRouter(analytics: Analytics): Router {
  const router = Router();

  router.get('/', async (req, res) => {
    try {
      const headers = req.headers as Record<string, unknown>;
      const payload = await buildDownloadPayload(headers);
      void analytics.logDownload(payload.entry, getClientIp(headers));
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${payload.filename}"`);
      res.send(payload.buffer);
    } catch (err) {
      console.error('[download] error:', err);
      if (!res.headersSent) {
        const isNotFound = err instanceof PluginNotFoundError;
        res.status(isNotFound ? 404 : 500).json({
          error: isNotFound ? err.message : 'Internal server error',
        });
      }
    }
  });

  return router;
}
