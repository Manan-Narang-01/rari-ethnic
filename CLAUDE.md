# CLAUDE.md

Guidance for Claude Code working in this repo. Read this first, then `README.md` for full setup.

## What this is
E-commerce storefront + admin for **Rari Ethnic** (Indian ethnic wear: kurtis, suits, lehengas).
FastAPI + MongoDB backend, React (CRA/CRACO) + Tailwind + shadcn frontend. Built on the Emergent
`fastapi_react_mongo_shadcn` base image; runs on Emergent's cloud in production (Mongo, object
storage, and env vars are injected there).

## Run / verify
- Backend: `cd backend && python -m uvicorn server:app --reload --port 8001` (use `python -m` — on
  Windows the bare `uvicorn` can resolve to a different Python without the deps).
- Frontend: `cd frontend && yarn start` (port 3000). **Use Yarn, not npm** — package.json relies on
  `resolutions`, which npm ignores.
- Quick checks before committing: backend `python -m py_compile server.py admin_lib.py`; frontend
  `CI=false npx craco build`.
- Needs a running MongoDB and the two `.env` files (see `.env.example` in each dir). `.env` is gitignored.

## Architecture (know these before editing)
- **All API routes are under `/api`** (`api_router` prefix in `server.py`).
- **Three auth roles**, all JWT (`admin_lib.py`):
  - Admin — email+password, `role: admin`, guards `/api/admin/*` and `/api/auth/*`.
  - Customer — Google Sign-In, `role: customer`, guards `/api/customer/*` and order creation.
  - Dev-login — passwordless email fallback, auto-enabled only when `GOOGLE_CLIENT_ID` is unset.
- **Single axios instance, two tokens**: `frontend/src/lib/api.js` interceptor sends the admin token
  for `/admin` + `/auth` URLs and the customer token otherwise. Don't set default Authorization
  headers in the contexts — the interceptor owns this.
- **Dynamic content** = two Mongo collections seeded on startup (`server.py` `startup_tasks`):
  - `settings` (singleton, id `"site"`) — announcements, shipping rules, socials, home hero/categories/why, IG tiles.
  - `campaigns` — events (Navratri etc.); exactly one `is_active`. Fields: countdown, hero, `day_colors`, shloka.
  Frontend consumes both via `SiteContext` (`useSite()`), each with **hardcoded fallbacks** so the UI
  never breaks if the API is down. When you add a new editable field: add it to the Pydantic model +
  `SettingsUpdate`/`CampaignUpdate`, the admin editor page, and the consuming component's fallback.
- **Server-authoritative pricing**: `POST /api/orders` recomputes subtotal/shipping/total from DB
  product prices and the settings thresholds. Never trust client-sent totals — keep it that way.
- **Checkout is gated** on a signed-in customer (`Checkout.jsx` redirect + `require_customer` on the API).
  Browsing/cart are open.

## Conventions
- Match existing style: functional components, `@/` import alias (configured in `craco.config.js`),
  Tailwind with the brand palette (`#A0684E`, `#2A2E30`, `#E8E3D7`, `#B58D3E`; festive: `#3E0714`/`#F4C842`).
- Admin form primitives (`Card`, `Field`, `ImageField`, `UploadInline`) are exported from
  `pages/admin/AdminSettings.jsx` — reuse them in new admin pages.
- `data-testid` attributes are used throughout for testing — preserve/add them.
- Pydantic v2 (`ConfigDict`, `model_dump`). Dates are stored as ISO strings in Mongo and parsed back on read.

## Gotchas
- **Image uploads require Emergent object storage** (`EMERGENT_LLM_KEY`) — they fail locally. Admin
  Settings/Events editors accept pasted image URLs; `seed_demo.py` seeds hosted URLs.
- `requirements.txt` includes `emergentintegrations` (Emergent-only, not on PyPI). Don't rely on it
  locally; install the explicit runtime deps listed in README instead.
- `.env` and `.claude/` are gitignored; `package-lock.json` is ignored (yarn project).

## Current state / possible next steps
- Done: customer accounts (Google + dev-login), checkout gate, order history, admin Site-Settings and
  Events editors, dynamic Home/Navratri/Header/shipping, server-side order pricing.
- Not done (deliberately deferred): online payments (COD only today — Razorpay is the obvious next
  step, needs keys), order email/SMS notifications, product reviews, wiring the WhatsApp number from
  settings everywhere (still a constant in `lib/api.js` `buildWaLink`), and a CRA→Vite migration.
