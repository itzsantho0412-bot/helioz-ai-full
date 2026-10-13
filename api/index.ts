import 'dotenv/config';
import express, { type Request, type Response, type NextFunction } from 'express';
import { GITA_SLOKAS, CALL_SCHEDULES } from '../src/data/appData';
import * as store from '../server/store';
import { aiEnabled, generateReply, type HistoryItem } from '../server/ai';

const app = express();
app.use(express.json({ limit: '100kb' }));

const hits = new Map<string, number[]>();
function chatLimiter(req: Request, res: Response, next: NextFunction) {
  const now = Date.now();
  const key = req.headers['x-forwarded-for']?.toString().split(',')[0] || req.ip || 'anon';
  const recent = (hits.get(key) || []).filter(t => now - t < 60_000);
  if (recent.length >= 20) return res.status(429).json({ error: 'Too many messages, slow down a little.' });
  recent.push(now);
  hits.set(key, recent);
  next();
}
const wrap = (fn: (req: Request, res: Response) => Promise<unknown> | unknown) =>
  (req: Request, res: Response, next: NextFunction) => Promise.resolve(fn(req, res)).catch(next);

app.get('/api/health', (_req, res) => res.json({ ok: true, ai: aiEnabled() }));
app.get('/api/state', (_req, res) => res.json({ reminders: store.listReminders(), settings: store.getSettings(), ai: aiEnabled() }));
app.get('/api/reminders', (_req, res) => res.json(store.listReminders()));
app.post('/api/reminders', (req, res) => {
  const result = store.createReminder(req.body);
  if (typeof result === 'string') return res.status(400).json({ error: result });
  res.status(201).json(result);
});
app.patch('/api/reminders/:id', (req, res) => {
  const result = store.updateReminder(req.params.id, req.body);
  if (result === null) return res.status(404).json({ error: 'Reminder not found' });
  if (typeof result === 'string') return res.status(400).json({ error: result });
  res.json(result);
});
app.delete('/api/reminders/:id', (req, res) => {
  if (!store.deleteReminder(req.params.id)) return res.status(404).json({ error: 'Reminder not found' });
  res.status(204).end();
});
app.get('/api/settings', (_req, res) => res.json(store.getSettings()));
app.put('/api/settings', (req, res) => res.json(store.updateSettings(req.body)));
app.get('/api/gita', (_req, res) => res.json(GITA_SLOKAS));
app.get('/api/schedules', (_req, res) => res.json(CALL_SCHEDULES));
app.post('/api/chat', chatLimiter, wrap(async (req, res) => {
  const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
  if (!message) return res.status(400).json({ error: 'message is required' });
  if (message.length > 2000) return res.status(400).json({ error: 'message is too long (max 2000 chars)' });
  const history: HistoryItem[] = Array.isArray(req.body?.history)
    ? req.body.history.filter((h: any) => (h?.sender === 'user' || h?.sender === 'helios') && typeof h?.text === 'string')
      .map((h: any) => ({ sender: h.sender, text: String(h.text).slice(0, 1000) }))
    : [];
  res.json(await generateReply(message, history, store.listReminders()));
}));
app.use((_req, res) => res.status(404).json({ error: 'Not found' }));
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[api] Unhandled error:', err);
  res.status(500).json({ error: 'Something went wrong on the server.' });
});

export default app;
