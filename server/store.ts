import fs from 'node:fs';
import path from 'node:path';

export type Reminder = { id: string; title: string; dueAt?: string; completed: boolean; createdAt: string };
type Settings = { callsEnabled: boolean; voiceCostume: string };
type DB = { reminders: Reminder[]; settings: Settings };
const dataDir = path.resolve(process.env.DATA_DIR || './data');
const dbPath = path.join(dataDir, 'db.json');
const defaults: DB = { reminders: [], settings: { callsEnabled: true, voiceCostume: 'default' } };

function read(): DB {
  try {
    const value = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    return { reminders: Array.isArray(value.reminders) ? value.reminders : [], settings: { ...defaults.settings, ...(value.settings || {}) } };
  } catch { return structuredClone(defaults); }
}
function write(db: DB) {
  fs.mkdirSync(dataDir, { recursive: true });
  const tmp = dbPath + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, dbPath);
}
export function listReminders() { return read().reminders; }
export function createReminder(input: any): Reminder | string {
  const title = typeof input?.title === 'string' ? input.title.trim() : '';
  if (!title) return 'title is required';
  if (title.length > 160) return 'title must be 160 characters or fewer';
  const db = read();
  const item: Reminder = { id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`, title, dueAt: typeof input.dueAt === 'string' ? input.dueAt : undefined, completed: Boolean(input.completed), createdAt: new Date().toISOString() };
  db.reminders.push(item); write(db); return item;
}
export function updateReminder(id: string, patch: any): Reminder | string | null {
  const db = read(); const item = db.reminders.find(r => r.id === id);
  if (!item) return null;
  if (patch.title !== undefined) {
    if (typeof patch.title !== 'string' || !patch.title.trim() || patch.title.trim().length > 160) return 'title must be 1–160 characters';
    item.title = patch.title.trim();
  }
  if (patch.completed !== undefined) item.completed = Boolean(patch.completed);
  if (patch.dueAt !== undefined) item.dueAt = typeof patch.dueAt === 'string' ? patch.dueAt : undefined;
  write(db); return item;
}
export function deleteReminder(id: string) {
  const db = read(); const length = db.reminders.length;
  db.reminders = db.reminders.filter(r => r.id !== id);
  if (db.reminders.length === length) return false;
  write(db); return true;
}
export function getSettings() { return read().settings; }
export function updateSettings(patch: any) {
  const db = read();
  if (typeof patch?.callsEnabled === 'boolean') db.settings.callsEnabled = patch.callsEnabled;
  if (typeof patch?.voiceCostume === 'string' && patch.voiceCostume.length <= 80) db.settings.voiceCostume = patch.voiceCostume;
  write(db); return db.settings;
}
