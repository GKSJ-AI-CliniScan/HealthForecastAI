# Vercel Frontend Deployment Guide — HealthForecast AI

This guide details how to deploy the HealthForecast AI frontend application to [Vercel](https://vercel.com) using its high-performance edge global CDN.

---

## 1. Overview & Architecture

- **Application Type**: React 18 Single Page Application (SPA) built with TypeScript and Vite.
- **Repository**: `HealthForecastAI`
- **Root Directory**: `frontend/`
- **Output Directory**: `dist/`
- **Build Command**: `npm run build`
- **Framework Preset**: Vite

The frontend interacts with the Render backend via secure HTTPS requests to `VITE_API_BASE_URL`.

---

## 2. Configuration File (`frontend/vercel.json`)

Vercel requires SPA routing rules so that deep links (e.g., `/dashboard`, `/patients/123`, `/risk-assessment`) serve `/index.html` instead of returning 404 errors. Security headers are also configured:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "vite",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        }
      ]
    }
  ]
}
```

---

## 3. Step-by-Step Deployment Instructions

### Step 1: Connect Repository to Vercel
1. Log in to [Vercel Dashboard](https://vercel.com/dashboard).
2. Click **Add New...** > **Project**.
3. Import your GitHub repository: `GKSJ-AI-CliniScan/HealthForecastAI` (or your branch `intern/23-nishakar-t`).

### Step 2: Configure Project Settings
- **Project Name**: `healthforecast-ai`
- **Framework Preset**: `Vite`
- **Root Directory**: Click **Edit** and choose `frontend`.
- **Build and Output Settings**:
  - Build Command: `npm run build` (default)
  - Output Directory: `dist` (default)
  - Install Command: `npm install` (default)

### Step 3: Configure Environment Variables
Add the following production environment variable:

| Variable Name | Example Value | Description |
|---|---|---|
| `VITE_API_BASE_URL` | `https://healthforecast-api.onrender.com/api/v1` | URL of the live Render FastAPI backend API |

> **Note**: Do not add a trailing slash to `VITE_API_BASE_URL`.

### Step 4: Deploy
1. Click **Deploy**.
2. Vercel will install dependencies (`npm install`), execute the Vite build (`npm run build`), and deploy the output bundle to the edge network.
3. Once completed, your application will be assigned a live domain (e.g., `https://healthforecast-ai.vercel.app`).

---

## 4. Post-Deployment Verification

1. **Root URL**: Open `https://<your-project>.vercel.app`. Verify the login screen renders with high-fidelity glassmorphic styling and no asset 404s.
2. **SPA Routing**: Navigate to `/login`, `/dashboard`, or refresh the page on any internal route. Verify the SPA loads properly without a 404.
3. **API Integration**: Log in with credentials (`admin@healthforecast.ai` / password). Verify that requests to `VITE_API_BASE_URL/auth/login` succeed with status 200.
4. **Security Headers**: Inspect the response headers in DevTools Network tab. Confirm `X-Content-Type-Options: nosniff` and `X-Frame-Options: DENY` are present.

---

## 5. Rollback & Continuous Deployment

- **Automatic Previews**: Any push or pull request triggers an isolated Preview Deployment with a unique URL.
- **Rollback**: In the Vercel dashboard under the **Deployments** tab, find any previous healthy build and click **Instant Rollback** to redirect production traffic immediately.
