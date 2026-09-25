# CLAUDE.md

Guidance for Claude Code working in this repo. Read this first, then `README.md` for full setup.

## What this is
E-commerce storefront + admin for **Rari Ethnic** (Indian ethnic wear: kurtis, suits, lehengas).
FastAPI + PostgreSQL backend (migrated from the original Emergent-scaffolded MongoDB setup),
React (CRA/CRACO) + Tailwind + shadcn frontend. Object storage and env vars are still injected by
Emergent's cloud when deployed there; the database itself is now a standalone Postgres instance
(e.g. Neon) rather than Emergent-managed Mongo.

## Run / verify
- Backend: `cd backend && python -m uvicorn server:app --reload --port 8001` (use `python -m` — on
  Windows the bare `uvicorn` can resolve to a different Python without the deps).
- Frontend: `cd frontend && yarn start` (port 3000). **Use Yarn, not npm** — package.json relies on
  `resolutions`, which npm ignores.
- Quick checks before committing: backend `python -m compileall -q server.py app`; frontend
  `CI=false npx craco build`.
- Needs a running PostgreSQL (`DATABASE_URL` in `backend/.env`) with the schema created via
  `cd backend && python -m alembic upgrade head`, plus the two `.env` files (see `.env.example`/
  `env.example` in each dir). `.env` is gitignored.

## Architecture (know these before editing)
- **All API routes are under `/api`** (`api_router` prefix in `server.py`).
- **Three auth roles**, all JWT (`app/services/auth_service.py`, `app/api/deps.py`, `app/core/security.py`):
  - Admin/super_admin — email+password, guards `/api/admin/*` via `require_admin` (mutating
    integration routes use `require_super_admin`).
  - Customer — Google Sign-In or password+OTP registration, guards `/api/customer/*` and order
    creation via `require_customer`.
  - Dev-login — passwordless email fallback (`POST /api/customer/dev-login`), auto-enabled only
    when `GOOGLE_CLIENT_ID` is unset; only ever creates a brand-new account, never authenticates an
    existing email (previously an account-takeover bug — keep it that way).
- **One identity, one token — not two**: `frontend/src/lib/api.js` keeps a single access+refresh
  token pair (`AUTH_TOKEN_KEY`/`AUTH_REFRESH_KEY`) and a single `AuthContext` for the whole app;
  admin and customer are just different `role` values on the same JWT/user record, and every
  request carries whatever token is currently stored, regardless of URL. Don't set default
  Authorization headers in the contexts — the shared request interceptor owns this. A response
  interceptor in the same file handles a 401 by refreshing once via `POST /auth/refresh` and
  replaying the request; if that fails it clears storage and fires a `rari:session-expired` window
  event, which `AuthContext` listens for to drop its React state — don't add per-page 401/expiry
  handling, it's already centralized there.
- **Dynamic content** = two Postgres tables seeded on startup (`app/main.py` `startup_tasks`):
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
  Tailwind with the brand palette. Primary: `#A0684E` (terracotta/CTA), `#2A2E30` (near-black text),
  `#E8E3D7` (cream background), `#B58D3E` (gold accent); festive: `#3E0714`/`#F4C842`. Secondary
  (used consistently for muted text/borders/status pills, not one-off): `#DDD5C4` (panel bg),
  `#6E7B85`/`#8B9A9F` (muted text/borders), `#7B6E5A`, `#A05B6A`, `#1E3A5F`, `#185D64`, `#7E1F35`
  (status colors), `#25D366` (WhatsApp brand green). Always pull from this set — no default Tailwind
  colors (`text-blue-500` etc.) outside vendored shadcn primitives.
- Admin form primitives (`Card`, `Field`, `ImageField`, `UploadInline`) are exported from
  `pages/admin/AdminSettings.jsx` — reuse them in new admin pages.
- `data-testid` attributes are used throughout for testing — preserve/add them.
- Pydantic v2 (`ConfigDict`, `model_dump`). Timestamps are native `TIMESTAMPTZ` columns in
  Postgres; repositories still accept the ISO strings services already produce
  (`doc["created_at"].isoformat()`) and normalize them on write.

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
