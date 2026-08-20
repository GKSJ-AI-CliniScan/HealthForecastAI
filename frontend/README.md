# HealthForecast AI - Frontend (Next.js + Tailwind)

Dashboards for doctors, hospital administrators, healthcare researchers and
system administrators.

## Layout

| Path                     | Responsibility |
|--------------------------|----------------|
| `src/app/`               | App Router pages and layouts |
| `src/components/ui/`     | Reusable primitives (buttons, cards, tables) |
| `src/components/charts/` | Recharts wrappers for analytics |
| `src/components/layout/` | Shell, navigation, role-aware menus |
| `src/lib/api.ts`         | Typed fetch wrapper for the FastAPI backend |
| `src/hooks/`             | Client-side data hooks |
| `src/types/`             | Shared TypeScript types mirroring the backend schemas |

## Run locally

```bash
cd frontend
npm install
npm run dev
```

Open <http://localhost:3000>. The backend must be running on port 8000, or set
`NEXT_PUBLIC_API_BASE_URL` in `.env.local`.

## Checks that CI runs

```bash
npm run lint
npm run build
npm run typecheck
```

## Rules

- Only variables prefixed `NEXT_PUBLIC_` reach the browser. Never put a secret,
  a database URL or a JWT signing key behind that prefix.
- Never render a patient identifier in a researcher-facing view.
- Keep `src/types/index.ts` in sync with `backend/app/schemas/`.
