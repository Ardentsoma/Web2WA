import './env.js';
import express from 'express';
import path from 'node:path';
import { createAnalyticsFromEnv } from './analytics/index.js';
import { createDownloadRouter } from './routes/download.js';

const app = express();
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.use('/api/download', createDownloadRouter(createAnalyticsFromEnv()));

const distDir = path.join(process.cwd(), 'dist');
app.use(express.static(distDir));

app.get(/^(?!\/api\/).*/, (req, res) => {
  res.sendFile(path.join(distDir, 'index.html'));
});

app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use(
  (err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
);

const port = Number(process.env.PORT || 8080);
app.listen(port, () => {
  console.log(`Web2WA server listening on port ${port}`);
});
