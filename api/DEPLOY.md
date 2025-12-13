# Deployment Guide

The DocSage API is designed to be easily deployable to Vercel (Serverless) or Render (Web Service).

> **Note:** We recently switched from `git clone` to **Zip Download**. This means the API works perfectly in serverless environments where `git` is not installed!

## Option 1: Vercel (Recommended for Free Tier)
Vercel is great for serverless deployment.

1.  **Push to GitHub**: Ensure this `api` folder is in a GitHub repository.
2.  **Import to Vercel**:
    -   Go to [Vercel Dashboard](https://vercel.com/dashboard) and click "Add New Project".
    -   Select your repository.
    -   **Root Directory**: Click "Edit" and select `api` (since this is a monorepo structure).
3.  **Environment Variables**:
    -   Add `GEMINI_API_KEY` with your key.
4.  **Deploy**: Vercel will detect `nest` and build it automatically.
    -   *Note*: A `vercel.json` file is included to help configuring the serverless function.

## Option 2: Render (Recommended for "Always On")
Render is an excellent alternative that runs the API as a standard Node.js service.

1.  **Push to GitHub**.
2.  **Create Web Service**:
    -   Go to [Render Dashboard](https://dashboard.render.com/) -> New -> Web Service.
    -   Connect your repo.
3.  **Settings**:
    -   **Root Directory**: `api`
    -   **Build Command**: `npm install && npm run build`
    -   **Start Command**: `npm run start:prod`
4.  **Environment Variables**:
    -   `GEMINI_API_KEY`: Your key.
    -   `NODE_VERSION`: `18` or higher (optional, but recommended).

## Testing Deployment
Once deployed, use your URL:
```bash
curl -X POST https://your-app.vercel.app/api/docs/generate \
  -H "Content-Type: application/json" \
  -d '{"repoUrl": "https://github.com/nestjs/typescript-starter"}'
```
