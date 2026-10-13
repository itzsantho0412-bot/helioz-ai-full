# HELIOZ AI — Vercel-ready starter

## What is included
- React + Vite frontend
- Vercel serverless API at `api/index.ts`
- Gemini-powered chat when `GEMINI_API_KEY` is configured, with offline fallback
- Reminder create/update/delete endpoints and settings endpoints
- Small sample Gita slokas and call schedule data

## Deploy to Vercel
1. Download and extract this folder.
2. Create a GitHub repository and upload the project files (the files inside this folder, not the ZIP itself).
3. Sign in at https://vercel.com and choose **Add New → Project**.
4. Import the GitHub repository.
5. Use these project settings:
   - Framework Preset: Vite (or Other if Vite is not detected)
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`
6. In Vercel → Project → Settings → Environment Variables, add:
   - `GEMINI_API_KEY` = your private Google Gemini API key
   - `GEMINI_MODEL` = `gemini-2.5-flash` (optional)
   Apply variables to Production and Preview as needed.
7. Deploy. After deployment, test `https://YOUR-DOMAIN/api/health` and the main page.

## Local development
- Install Node.js 22.12 or newer.
- Run `npm install`.
- Copy `.env.example` to `.env.local` and optionally set your Gemini API key.
- Run `npm run dev`.
- Open `http://localhost:3000`.

## Important production limitation: reminder persistence
The included `server/store.ts` uses a JSON file. That works for local development, but Vercel serverless functions have an ephemeral filesystem and can run in separate instances. Therefore, reminders/settings may not persist reliably on Vercel. Before relying on deployed reminders, replace this storage with a managed database (for example, Vercel Postgres/Neon or Upstash Redis). Do not assume local JSON-file storage is production persistence.

## Voice changer limitation
The original upload did not include the frontend source files or audio DSP implementation. This starter recreates a working basic dashboard/chat/reminders flow; it does not yet implement a real-time voice changer or actual scheduled calls. The Gita data is a short sample and should be expanded if you need the full library.
