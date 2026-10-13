import { GoogleGenAI } from '@google/genai';
import type { Reminder } from './store';

export type HistoryItem = { sender: 'user' | 'helios'; text: string };
export function aiEnabled() { return Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'); }

export async function generateReply(message: string, history: HistoryItem[], reminders: Reminder[]) {
  if (aiEnabled()) {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const transcript = history.slice(-8).map(item => `${item.sender === 'user' ? 'User' : 'HELIOZ'}: ${item.text}`).join('\n');
      const prompt = `You are HELIOZ, a supportive personal-growth assistant. Be kind, practical, concise, and avoid claiming to be a therapist. If relevant, offer a small next step.\n\nRecent conversation:\n${transcript}\n\nCurrent user message: ${message}`;
      const response = await ai.models.generateContent({
        model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
        contents: prompt
      });
      return { text: response.text || 'I could not form a response just now. Please try again.', checklist: [], quoteNote: '', source: 'gemini' };
    } catch (error) {
      console.error('[ai] Gemini request failed; using offline reply:', error);
    }
  }
  const lower = message.toLowerCase();
  let text = 'Let’s make this manageable. Choose one small action you can complete in the next 10 minutes, and focus only on that.';
  if (/(hello|hi|hey)\b/.test(lower)) text = 'Hello! I’m HELIOZ. What would you like to focus on today?';
  else if (/(stress|anxious|overwhelm|worried)/.test(lower)) text = 'Pause for a moment and take a few slow breaths. Write down what is in your control, then choose one small next step. If you feel unsafe or this feels unmanageable, reach out to someone you trust or a qualified professional.';
  else if (/(plan|routine|schedule|today)/.test(lower)) text = `Try a simple plan: 1) choose your most important task, 2) work on it for 25 minutes, 3) take a short break, and 4) review your progress. You currently have ${reminders.length} reminder(s) saved.`;
  else if (/(gita|bhagavad|krishna|sloka)/.test(lower)) text = 'A useful Bhagavad Gita reflection is 2.47: focus on sincere action rather than becoming attached to the result. What is one constructive action you can take today?';
  return { text, checklist: [], quoteNote: '', source: 'offline' };
}
