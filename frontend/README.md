# HealthForecast AI — Frontend ("Saral" UI)

Simple, multilingual, accessible frontend for Milestones 1–4.
Next.js 15 · React 19 · TypeScript · Tailwind · Recharts. No new runtime dependencies.

## 1. Run it

```bash
cd frontend
cp .env.example .env.local      # set NEXT_PUBLIC_API_BASE_URL
npm install
npm run dev                      # http://localhost:3000
```

**Point at another backend = change one line** (`NEXT_PUBLIC_API_BASE_URL`) and rebuild.
The backend must allow the frontend's address in `BACKEND_CORS_ORIGINS`.

Presentation without a backend: `NEXT_PUBLIC_DATA_MODE=demo` (shows a "sample data" banner,
one-tap demo logins for the 4 roles).

## 2. What it does (PRD, short)

**Problem.** The previous UI was built for technical users, only the dashboard really
used the backend, and it mixed sample data into live results without saying so.
**Users.** Doctors, hospital administrators, researchers, system administrators —
including people who are not comfortable with computers, read an Indian language
other than English, or are blind / low-vision.
**Goals.** (1) every screen from the backend, honestly; (2) one idea per screen, big
text and buttons; (3) all 22 scheduled Indian languages + English; (4) usable without
sight. **Non-goals.** Translating free text that comes from the backend (diagnoses,
advice text), offline mode, a patient-facing app.

| Page | Route | Roles | Backend | Milestone |
|---|---|---|---|---|
| Sign in | `/login` | all | `POST /auth/login` | M1 |
| Home | `/dashboard` | all | `/patients/stats`, `/analytics/summary`*, `/patients` | M1 |
| Patients + search | `/patients` | doctor, admin, sysadmin | `/patients` | M1 |
| One patient | `/patients/[id]` | same | `/patients/{id}` | M1–M2 |
| Risk check | `/risk` | doctor, sysadmin | `POST /risk/predict`, clinical support | M2 |
| Forecast | `/forecast` | doctor, admin, sysadmin | `/risk/forecast` | M2 |
| Treatment results | `/treatment` | admin, researcher, sysadmin | `/treatment`, `/treatment/recovery-trends` | M3 |
| Care advice | `/clinical-support` | doctor, sysadmin | `/clinical-support/*` | M3 |
| Hospital report + CSV | `/analytics` | admin, researcher, sysadmin | `/analytics/summary`, `/analytics/readmissions` | M3 |
| Research data + CSV | `/research` | researcher, sysadmin | `/analytics/population-health`, `/patients/anonymised` | M3 |
| AI model | `/models` | sysadmin | `/models`, `/models/active`, `/models/metrics` | M4 |
| Users | `/users` | sysadmin | `GET/POST /users` | M1 |
| Help & accessibility | `/help` | all | — | — |

\* optional; a doctor gets 403 there, so "average days" shows "—".
Role access mirrors `docs/04-rbac` **and** what the backend actually returns (checked
against a running backend). The backend is the real guard.

**Behaviour rules.** A missing value shows "—", never a fake 0. A backend stub that
returns zeros (forecast) shows "The server has no data for this yet". Errors are
plain language by type: cannot reach server / no permission / not found / retry.

## 3. How it is built (TRD, short)

```
src/config.ts          API URL + data mode (the only settings)
src/data/http.ts       one fetch wrapper: token, timeout, typed ApiError, auto-logout on 401
src/data/mappers.ts    backend JSON → screen models (pure, unit-tested)
src/data/live.ts       real backend data source       ┐ both implement DataSource
src/data/demo.ts       sample data (team mock files)  ┘ (src/data/types.ts)
src/lib/session.tsx    sign-in state (sessionStorage — cleared when tab closes)
src/lib/nav.ts         role → pages (menu, guard, voice commands)
src/i18n/              23 languages, lazy-loaded; t() typed against en.json
src/a11y/              read aloud, voice commands, settings, shortcuts, announcer
src/saral/             UI building blocks (AppShell, ui.tsx, charts, picker, CSV)
src/app/**/page.tsx    the pages
```

Unit fixes pinned by tests: backend sends rates/risk/metrics as **fractions** (0.112),
`/patients/stats` sends a **percent**; `/analytics/readmissions` is grouped by discharge
type, not by month.

Older files (`src/components/**`, `src/services/**`, `src/lib/api.ts`,
`src/lib/auth-context.tsx`, `src/hooks/**`, `src/types/**`) are no longer used by pages.
`services/mock*.ts` + `types/**` still feed demo mode. They can be removed after team review.

## 4. Languages

English + Assamese, Bengali, Bodo, Dogri, Gujarati, Hindi, Kannada, Kashmiri, Konkani,
Maithili, Malayalam, Manipuri (Bengali script), Marathi, Nepali, Odia, Punjabi, Sanskrit,
Santali (Ol Chiki), Sindhi, Tamil, Telugu, Urdu. Urdu, Kashmiri and Sindhi are right-to-left.
Numbers use 0–9 in every language.

**Edit translations in `i18n-source/<code>.txt`** (line N = line N of `en.txt`), then
`npm run i18n:build`. The build refuses missing lines, empty lines or changed `{placeholders}`.

> ⚠ All translations are AI-drafted. Before real hospital use, a native speaker must review
> them — **especially** Bodo, Dogri, Kashmiri, Konkani, Maithili, Manipuri, Sanskrit,
> Santali and Sindhi (`review: 'needs_review'` in `src/i18n/languages.ts`).
> Santali is written in romanized form in `i18n-source/santali-romanized/` and converted
> to Ol Chiki by `olchiki.py`.

## 5. Accessibility (blind and low-vision users)

- Works with screen readers (TalkBack, NVDA, VoiceOver): landmarks, one `h1` per page,
  labelled fields, table captions, `aria-live` announcements, focus moves to the new page title.
- **Read aloud** (🔊 next to every page title) using the device's own voice in the chosen
  language; if missing, a same-script voice (e.g. Hindi voice for Maithili); otherwise it
  says how to install one. Nothing is sent to any cloud service.
- **Speak a command** (🎤): say a menu name in your language or English, or "read aloud",
  "stop reading", "go back", "sign out". Chrome/Edge only.
- Talking buttons, read page title on open, reading speed, text size (3 levels),
  high contrast, reduce movement — in **Help and accessibility**, remembered per device.
- Risk is always colour + icon + words. Every chart has a spoken summary and a
  "Show as table" button. Skip link, 48 px targets, visible focus ring, pinch-zoom allowed.
- Shortcuts: `Alt+Shift+R` read · `S` stop · `V` voice · `H` home · `1–9` menu items.

## 6. Checks

```bash
npm run lint && npm run typecheck && npm test && npm run build
```

`npm test` = 39 tests (Node's built-in runner, no extra packages): all 23 language files,
every `t('key')` used in code, backend→UI mappers, role access, voice matching, search, CSV.

## 7. Watermark

Put `logo-mark.svg` in `public/`. Until then the footer shows a "KP" text mark.
