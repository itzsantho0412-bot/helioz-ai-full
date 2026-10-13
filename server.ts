import 'dotenv/config';
import express, { type NextFunction, type Request, type Response } from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { GITA_SLOKAS, CALL_SCHEDULES } from './src/data/appData';
import * as store from './server/store';
import { aiEnabled, generateReply, type HistoryItem } from './server/ai';

const PORT = Number(process.env.PORT) || 3000;
const isProd = process.env.NODE_ENV === 'production';

const app = express();
app.use(express.json({ limit: '100kb' }));

// Wrap async handlers so thrown errors reach the error middleware
const wrap =
  (fn: (req: Request, res: Response) => Promise<unknown> | unknown) =>
  (req: Request, res: Response, next: NextFunction) =>
    Promise.resolve(fn(req, res)).catch(next);

// Tiny in-memory rate limiter for the (paid) chat endpoint: 20 requests / minute / IP
const hits = new Map<string, number[]>();
function chatLimiter(req: Request, res: Response, next: NextFunction) {
  const now = Date.now();
  const recent = (hits.get(req.ip ?? 'anon') ?? []).filter((t) => now - t < 60_000);
  if (recent.length >= 20) return res.status(429).json({ error: 'Too many messages, slow down a little.' });
  recent.push(now);
  hits.set(req.ip ?? 'anon', recent);
  next();
}

// ---------------- API ----------------
const api = express.Router();

api.get('/health', (_req, res) => res.json({ ok: true, ai: aiEnabled() }));

// Everything the UI needs on first load
api.get('/state', (_req, res) =>
  res.json({ reminders: store.listReminders(), settings: store.getSettings(), ai: aiEnabled() })
);

api.get('/reminders', (_req, res) => res.json(store.listReminders()));

api.post('/reminders', (req, res) => {
  const result = store.createReminder(req.body);
  if (typeof result === 'string') return res.status(400).json({ error: result });
  res.status(201).json(result);
});

api.patch('/reminders/:id', (req, res) => {
  const result = store.updateReminder(req.params.id, req.body);
  if (result === null) return res.status(404).json({ error: 'Reminder not found' });
  if (typeof result === 'string') return res.status(400).json({ error: result });
  res.json(result);
});

api.delete('/reminders/:id', (req, res) => {
  if (!store.deleteReminder(req.params.id)) return res.status(404).json({ error: 'Reminder not found' });
  res.status(204).end();
});

api.get('/settings', (_req, res) => res.json(store.getSettings()));
api.put('/settings', (req, res) => res.json(store.updateSettings(req.body)));

api.get('/gita', (_req, res) => res.json(GITA_SLOKAS));
api.get('/schedules', (_req, res) => res.json(CALL_SCHEDULES));

api.post(
  '/chat',
  chatLimiter,
  wrap(async (req, res) => {
    const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
    if (!message) return res.status(400).json({ error: 'message is required' });
    if (message.length > 2000) return res.status(400).json({ error: 'message is too long (max 2000 chars)' });

    const history: HistoryItem[] = Array.isArray(req.body?.history)
      ? req.body.history
          .filter((h: any) => (h?.sender === 'user' || h?.sender === 'helios') && typeof h?.text === 'string')
          .map((h: any) => ({ sender: h.sender, text: String(h.text).slice(0, 1000) }))
      : [];

    res.json(await generateReply(message, history, store.listReminders()));
  })
);

api.use((_req, res) => res.status(404).json({ error: 'Not found' }));
app.use('/api', api);

// ---------------- Frontend ----------------
async function mountFrontend() {
  if (isProd) {
    const dist = path.join(process.cwd(), 'dist');
    if (!fs.existsSync(dist)) console.warn('[server] dist/ not found, run "npm run build" first');
    app.use(express.static(dist));
    app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
  } else {
    const { createServer } = await import('vite');
    const vite = await createServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  }
}

// Error handler (must be last)
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[server] Unhandled error:', err);
  res.status(500).json({ error: 'Something went wrong on the server.' });
});

mountFrontend().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`HELIOZ AI running on http://localhost:${PORT}  (${isProd ? 'production' : 'dev'})`);
    console.log(aiEnabled() ? 'Gemini: enabled' : 'Gemini: no API key set, using offline replies');
  });
});
