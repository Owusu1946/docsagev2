# Deployment Guide

The DocSage API is designed to be easily deployable to Vercel (Serverless) or Render (Web Service).

> **Note:** We recently switched from `git clone` to **Zip Download**. This means the API works perfectly in serverless environments where `git` is not installed!

## Option 1: Vercel (Recommended for Free Tier)
Vercel is great for serverless deployment.

1.  **Push to GitHub**: Ensure this `api` folder is in a GitHub repository.
2.  **Import to Vercel**:
    -   Go to [Vercel Dashboard](https://vercel.com/dashboard) and click "Add New Project".
    -   Select your repository.
    -   **Root Directory**: Click "Edit" and select `api`.
    -   **Framework Preset**: Select "Other" (or let it auto-detect, but we have a custom `vercel.json` which it should pick up).
    -   *Crucial*: We use `src/serverless.ts` as the entry point for Vercel to avoid timeouts (500 Errors).
3.  **Environment Variables**:
    -   Add `GEMINI_API_KEY` with your key.
4.  **Deploy**: Vercel will detect `nest` and build it automatically.
    -   *Note*: A `vercel.json` file is included to help configuring the serverless function.

## Option 2: Render (Recommended for "Always On")
Render is robust and does not have the execution timeout limits of Vercel Free Tier.

### Method A: Blueprints (Easiest)
1.  **Push** this code to GitHub.
2.  Go to [Render Dashboard](https://dashboard.render.com/) -> **Blueprints**.
3.  Click **New Blueprint Instance**.
4.  Connect your repository.
5.  Render will automatically read `api/render.yaml` and set everything up.
6.  You just need to provide the `GEMINI_API_KEY` when prompted.

### Method B: Manual Web Service
1.  Create **Web Service**.
2.  **Root Directory**: `api`
3.  **Build Command**: `npm install && npm run build` (CRITICAL: Do not just use `npm install`)
4.  **Start Command**: `npm run start:prod` (CRITICAL: Do not use `npm start`)
5.  **Env Vars**: `GEMINI_API_KEY`

## Testing Deployment
Once deployed, use your URL:
```bash
curl -X POST https://your-app.onrender.com/api/docs/generate \
  -H "Content-Type: application/json" \
  -d '{"repoUrl": "https://github.com/nestjs/typescript-starter"}'
```
