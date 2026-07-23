# Rari Ethnic — E-commerce Storefront

A full e-commerce site for an Indian ethnic-wear brand (kurtis, suits, lehengas) with a
festival/campaign system (Navratri, Diwali, wedding season), customer accounts via Google
Sign-In, and an admin panel for managing products, orders, site content, and events.

Originally scaffolded on the Emergent `fastapi_react_mongo_shadcn` stack.

---

## Stack

| Layer | Tech |
|-------|------|
| Frontend | React 19, React Router 7, CRA (react-scripts 5) via **CRACO**, TailwindCSS 3, shadcn/ui (Radix), Framer Motion, axios |
| Backend | FastAPI, Uvicorn, MongoDB (Motor async driver), Pydantic v2 |
| Auth | Admin: email + password (JWT). Customer: Google Sign-In (JWT), with a passwordless dev-login fallback for local testing |
| Storage | Emergent object storage for product image uploads (only available on the Emergent platform) |

---

## Prerequisites

- **Node.js** 18+ and **Yarn** (`npm i -g yarn`). The project uses Yarn `resolutions`, which npm ignores — **use Yarn, not npm**.
- **Python** 3.11+ (3.12 recommended).
- **MongoDB** running locally (`mongodb://localhost:27017`) or a MongoDB Atlas connection string.

> ⚠️ Windows note: it's common to have multiple Python installs where `python` and `uvicorn`
> resolve to *different* interpreters. Always launch the API with `python -m uvicorn ...`
> (not the bare `uvicorn` command) so it runs under the Python that has the dependencies.

---

## Setup

### 1. Backend

```bash
cd backend
python -m pip install fastapi "uvicorn[standard]" motor pymongo pydantic python-dotenv bcrypt pyjwt requests python-multipart
cp .env.example .env        # then edit values (see below)
```

> `requirements.txt` also lists `emergentintegrations`, an Emergent-only package **not on public
> PyPI**. It is not needed to run the app locally — the command above installs only what the code
> imports.

### 2. Frontend

```bash
cd frontend
yarn install
cp .env.example .env        # then edit values
```

### 3. Start MongoDB

If installed as a Windows service but stopped/disabled (run in an **Administrator** PowerShell):

```powershell
Set-Service -Name "MongoDB" -StartupType Automatic
Start-Service -Name "MongoDB"
```

### 4. (Optional) Seed demo products

The storefront starts empty (only admin/settings/campaign are seeded on boot). To populate a few
browsable products with hosted image URLs:

```bash
cd backend
python seed_demo.py
```

### 5. Run (two terminals)

```bash
# Terminal 1 — API on :8001
cd backend
python -m uvicorn server:app --reload --port 8001

# Terminal 2 — site on :3000
cd frontend
yarn start
```

Open **http://localhost:3000**. Admin panel at **http://localhost:3000/admin**
(default `admin@rari.com` / `admin12345`, configurable via backend `.env`).

---

## Environment variables

### `backend/.env`
| Var | Required | Notes |
|-----|----------|-------|
| `MONGO_URL` | ✅ | e.g. `mongodb://localhost:27017` |
| `DB_NAME` | ✅ | e.g. `rari_local` |
| `JWT_SECRET` | ✅ | long random string (`python -c "import secrets;print(secrets.token_hex(32))"`) |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | ✅ | seeds/updates the admin user on startup |
| `CORS_ORIGINS` | ✅ | comma-separated; use `http://localhost:3000` locally |
| `APP_NAME` | – | storage path prefix, default `rariethnic` |
| `GOOGLE_CLIENT_ID` | – | enables real Google login; when **empty**, dev-login auto-enables |
| `ALLOW_DEV_LOGIN` | – | force passwordless dev-login on/off (`true`/`false`) |
| `EMERGENT_LLM_KEY` | – | object storage for image uploads; not available locally |

### `frontend/.env`
| Var | Required | Notes |
|-----|----------|-------|
| `REACT_APP_BACKEND_URL` | ✅ | base URL of the API, e.g. `http://localhost:8001` (frontend appends `/api`) |
| `REACT_APP_GOOGLE_CLIENT_ID` | – | same OAuth client id as backend; empty → email dev-login form |

---

## Architecture notes

- **API**: all routes under `/api`. Public: products, orders, settings, active campaign. Admin
  (`/api/admin/*`, JWT `role: admin`). Customer (`/api/customer/*`, JWT `role: customer`).
- **Two token types** share one axios instance. `frontend/src/lib/api.js` has a request interceptor:
  admin token for `/admin` + `/auth` routes, customer token for everything else.
- **Dynamic content** lives in two Mongo collections, both seeded with defaults on startup:
  - `settings` (singleton) — announcement bar, shipping rules, socials, homepage hero/categories/why, Instagram tiles.
  - `campaigns` — events like Navratri: countdown date, hero, day-colours, shloka. One is `is_active`.
  Frontend reads them via `SiteContext` and falls back to hardcoded defaults if the API is unavailable.
- **Order totals are recomputed server-side** from DB prices in `POST /api/orders` — the client total is never trusted.
- **Checkout requires a signed-in customer** (browsing is fully open). The gate is in `Checkout.jsx` and enforced by `require_customer` on the backend.

### Google Sign-In / dev-login
- Frontend uses Google Identity Services (`GoogleSignInButton.jsx`), loaded only when `REACT_APP_GOOGLE_CLIENT_ID` is set.
- Backend verifies the Google ID token against Google's public keys (`admin_lib.verify_google_token`, pyjwt `PyJWKClient`).
- When Google isn't configured, `POST /api/customer/dev-login` (email-only) auto-enables so the full buy/account flow is testable. It **auto-disables** once `GOOGLE_CLIENT_ID` is set. Do not expose dev-login on a public production URL — set `ALLOW_DEV_LOGIN=false` to be safe.

---

## Gotchas

- **Use Yarn, not npm** (package.json `resolutions` + `packageManager: yarn`).
- **Image uploads need Emergent storage** — they fail locally. The Settings/Events admin editors accept pasted image URLs, and `seed_demo.py` uses hosted URLs, so local dev works without uploads.
- CRA is deprecated; a future migration to Vite is the recommended DX improvement (see CLAUDE.md).

---

## Project layout

```
backend/
  server.py        # FastAPI app: models, routes, startup seeding
  admin_lib.py     # auth (admin + customer + Google verify), object storage helpers
  seed_demo.py     # optional local demo-product seeder
frontend/src/
  context/         # AuthContext (admin), CustomerAuthContext, SiteContext, CartContext
  components/      # Header, Footer, CartDrawer, GoogleSignInButton, CountdownTimer, ui/ (shadcn)
  pages/           # storefront pages + admin/ (Products, Orders, Settings, Campaigns)
  lib/api.js       # axios instance + token interceptor + helpers
```
