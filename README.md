# Callens AI Frontend

Vite + React frontend prepared for Phase 1 deployment on Vercel.

## Environment Variables

Create a local `.env` from `.env.example`:

```bash
VITE_API_URL=https://your-api.example.com
```

For Vercel, set `VITE_API_URL` to your deployed Cloudflare Worker URL.

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
- Environment Variable: `VITE_API_URL=https://your-api.example.com`

## Phase 1 Scope

- Frontend is deployable to Vercel
- Backend URL is environment-driven
