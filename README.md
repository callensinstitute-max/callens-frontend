# Callens AI Frontend

Vite + React frontend prepared for Phase 1 deployment on Vercel.

## Environment Variables

Create a local `.env` from `.env.example`:

```bash
VITE_API_BASE_URL=http://127.0.0.1:8000
```

For Vercel, set `VITE_API_BASE_URL` to a temporary public URL that forwards to your current local FastAPI backend.

Example temporary backend tunnel:

```bash
cloudflared tunnel --url http://127.0.0.1:8000
```

Then use the generated `https://...trycloudflare.com` URL as `VITE_API_BASE_URL` in Vercel.

## Local Run

```bash
npm install
npm run dev
```

## Vercel Deploy

```bash
npm install
npm run build
vercel
```

Recommended Vercel settings:

- Framework Preset: `Vite`
- Root Directory: `frontend-react`
- Build Command: `npm run build`
- Output Directory: `dist`
- Environment Variable: `VITE_API_BASE_URL=https://YOUR-TEMP-BACKEND.trycloudflare.com`

## Phase 1 Scope

- Frontend is deployable to Vercel
- Backend URL is environment-driven
- Existing local backend can stay in place temporarily
- Cloudflare Worker API migration happens in Phase 2
