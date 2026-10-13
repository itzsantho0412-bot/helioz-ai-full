# HELIOZ AI Backend

Run: `npm install && npm run dev` (needs `GEMINI_API_KEY` in `.env.local`; works offline without it).
Production: `npm run build && npm start`.

| Method | Route | Purpose |
|---|---|---|
| GET | /api/health | Status, and whether Gemini is enabled |
| GET | /api/state | Reminders + settings in one call (UI loads this on start) |
| GET/POST | /api/reminders | List / create |
| PATCH/DELETE | /api/reminders/:id | Update / delete |
| GET/PUT | /api/settings | Call toggles + voice costume |
| POST | /api/chat | `{message, history}` -> `{text, checklist, quoteNote, source}` |
| GET | /api/gita, /api/schedules | Sloka and call-schedule data |

Data is stored in `data/db.json` (set `DATA_DIR` to move it).
