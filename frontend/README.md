# HealthForecast AI - Frontend (Next.js + Tailwind)

Dashboards for doctors, hospital administrators, healthcare researchers and
system administrators.

## Layout

| Path                     | Responsibility |
|--------------------------|----------------|
| `src/app/`               | App Router pages and layouts |
| `src/components/ui/`     | Reusable primitives (buttons, cards, tables) |
| `src/components/charts/` | Recharts wrappers for analytics |
| `src/components/layout/` | Sidebar navigation, Forecast H brand mark, icons, theme toggle |
| `src/lib/api.ts`         | Typed fetch wrapper for the FastAPI backend |
| `src/hooks/`             | Empty: pages are server components and fetch on the server |
| `src/test-utils/`        | Shared test helpers (session and page mocks) |
| `src/types/`             | Shared TypeScript types mirroring the backend schemas |

## Run locally

```bash
cd frontend
npm install
npm run dev
```

Open <http://localhost:3000>. The backend must be running on port 8000, or set
`NEXT_PUBLIC_API_BASE_URL` in `.env.local`.

## Look and feel

- Design tokens (colours as RGB triplets) live in `src/app/globals.css` and are
  mapped in `tailwind.config.ts`. The font is Atkinson Hyperlegible Next, loaded with
  `next/font` (downloaded at build time, served from the app itself).
- A light and a dark theme. The toggle in the sidebar and on the sign-in page
  stores the choice in the browser; until a choice is made the system setting
  decides. The two dark colour blocks in `globals.css` must stay identical
  (`src/app/globals.test.ts` checks it).
- The sidebar groups the links the signed-in user's permissions allow into
  Records, Insights and Administration, and hides empty groups. This is
  presentation only; the backend authorises every request again.
- Every page that shows a model output keeps the experimental-status notice and
  score captions (`src/components/ui/ModelDisclaimer.tsx`). Do not remove them.

## Checks that CI runs

```bash
npm run lint
npm run build        # needs network access the first time (font download)
npm run typecheck
npm test
```

## Rules

- Only variables prefixed `NEXT_PUBLIC_` reach the browser. Never put a secret,
  a database URL or a JWT signing key behind that prefix.
- Never render a patient identifier in a researcher-facing view.
- Keep `src/types/index.ts` in sync with `backend/app/schemas/`.
