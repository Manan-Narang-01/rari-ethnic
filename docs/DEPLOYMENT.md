# Rari — Production Deployment Guide

Step-by-step guide to take this app from the current local dev setup to a working production
deployment: frontend, backend, database, auth, object storage, and verification. Rationale for the
platform/tooling choices lives in `docs/BACKEND_ARCHITECTURE.md` §10–§12 — this doc is the
"how", that one is the "why."

**Read this first — two things in the current code will not work on generic production hosting
without action:**

1. **Object storage** (`backend/app/utils/storage.py`) calls Emergent's hosted object-store API
   (`integrations.emergentagent.com`). That's fine inside the Emergent sandbox; outside it, image
   uploads will fail with a connection/auth error. **§4 below is a required step, not optional**,
   unless you're deploying back onto the Emergent platform.
2. **Password reset** (`POST /auth/forgot-password`) only logs the raw reset token to the server
   console — no email is actually sent yet (`backend/app/api/v1/auth.py`). Users clicking "forgot
   password" in production will get the "check your email" message but no email will arrive. **§8
   covers the options** (wire a real provider, or accept this as a known gap and handle resets
   manually via server logs until it's built).

Everything else (auth, RBAC, CORS, indexes, seeding) already works as built — no code changes
needed there, just configuration.

---

## 0. Architecture recap

```
Browser
  │  HTTPS
  ▼
Frontend (static build: React/CRA)  ──calls──►  Backend (FastAPI, /api/*)
  hosted on: Vercel / Netlify /                   hosted on: Render / Railway /
  static S3+CDN / Nginx                            Fly.io / any container host
                                                       │
                                                       ├─► PostgreSQL (Neon recommended) (data)
                                                       └─► S3-compatible storage (product images)
```

The frontend and backend are two independently deployable services connected only by
`REACT_APP_BACKEND_URL` (frontend → backend) and `CORS_ORIGINS` (backend allow-listing the
frontend's origin). Follow the sections in order — each one hands you a value the next one needs.

---

## 1. Provision PostgreSQL (Neon recommended)

Self-hosting Postgres means you own backups/failover/patching — not worth it at this project's
scale. Use [Neon](https://neon.tech) (free tier, serverless, standard Postgres wire protocol —
also works with pgAdmin if you want a GUI):

1. Create a project (any region close to where the backend will run).
2. Copy the connection string Neon gives you — a plain `postgresql://user:pass@host/dbname`
   URL. This becomes `DATABASE_URL` in step 3 (`app/config.py` upgrades it to the asyncpg driver
   scheme automatically, so no manual editing is needed).
3. Run the schema migration once, from your machine or CI, pointed at that URL:
   ```bash
   cd backend
   DATABASE_URL=<the connection string> python -m alembic upgrade head
   ```
   This creates every table/index/constraint (see `backend/alembic/versions/`) — no manual schema
   setup needed. Tables/rows for default categories, the settings singleton, and the payment/
   shipping/email provider catalog are seeded automatically on first backend startup
   (`app/main.py`'s startup hook), same as before.
4. Neon's free tier includes point-in-time restore for the last 24h out of the box; for longer
   retention, check their paid tiers or run your own periodic `pg_dump` to S3-compatible storage —
   an untested/absent backup is not a backup.
5. **pgAdmin**: connect to the same Neon connection string (Neon requires SSL — pgAdmin's default
   connection dialog handles this automatically) if you want a GUI for browsing/editing data.

---

## 2. Register a production Google OAuth client (customer sign-in)

Only needed if you want Google Sign-In live (otherwise `ALLOW_DEV_LOGIN`/dev-login stays as the
fallback — see the warning in §8 about *not* leaving that on in production).

1. [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials →
   **Create Credentials → OAuth client ID → Web application**.
2. **Authorized JavaScript origins**: add your production frontend origin, e.g.
   `https://yourdomain.com` (no path, no trailing slash). This app uses Google Identity Services'
   client-side widget (`GoogleSignInButton.jsx`), not a redirect flow, so only the JS origin
   matters — no redirect URI needed.
3. Copy the generated **Client ID**. It's used in *two* places, and must be the identical value in
   both:
   - Backend: `GOOGLE_CLIENT_ID` (verifies the token's `aud` claim — `app/core/google_auth.py`)
   - Frontend: `REACT_APP_GOOGLE_CLIENT_ID` (initializes the sign-in widget — `lib/api.js`)
4. Configure the OAuth consent screen (app name, support email, logo) — required before the
   client ID works for external users.

---

## 3. Backend environment variables

Copy `backend/env.example` → `backend/.env` on the host (or set these as your platform's secret/
env vars — **never commit real values**, `.env` is already gitignored). Every var the backend
reads is in `app/config.py`:

| Variable | Production value | Notes |
|---|---|---|
| `DATABASE_URL` | Neon connection string from §1 | |
| `APP_NAME` | `rariethnic` (or leave default) | used as an object-storage path prefix |
| `CORS_ORIGINS` | `https://yourdomain.com` (comma-separate multiple) | **Must not be left as `*`/unset in prod** — see §12 of the architecture doc. |
| `JWT_SECRET` | a long random value, **not** the placeholder | Generate: `python -c "import secrets; print(secrets.token_urlsafe(64))"`. Rotating this invalidates every issued token — treat it as a real secret, store it in your platform's secret manager. |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `30` (default is fine) | |
| `REFRESH_TOKEN_EXPIRE_DAYS` | `30` (default is fine) | |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | your real admin email + a strong password, **or leave both blank** | If set, seeded/synced into the DB on every startup (see the recent change — plaintext no longer needs to live in `.env` long-term: set it once to create the account, then blank both vars out and the account persists in Postgres as a bcrypt hash, same as any account created via Register). |
| `SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_PASSWORD` | same pattern, for the super-admin account | |
| `EMERGENT_LLM_KEY` | leave blank unless staying on Emergent's storage | See §4. |
| `BACKEND_PUBLIC_URL` | currently unused by any code path — safe to leave blank | Reserved; grep confirms nothing reads it today. |
| `GOOGLE_CLIENT_ID` | from §2 | Leave blank to disable Google Sign-In (dev-login becomes the customer sign-in fallback — see §8). |
| `ALLOW_DEV_LOGIN` | `false` / unset in production | See §8 — **do not leave this enabled in prod.** |

---

## 4. Object storage: move off Emergent's hosted store

`app/utils/storage.py` exposes exactly four functions callers depend on:
`init_storage() / put_object(path, data, content_type) / get_object(path) / guess_content_type(filename)`.
That's the entire surface — swapping the implementation is a one-file change, no caller
(`uploads.py`, `files.py`) needs to change.

`boto3` is already in `requirements.txt` (was added in anticipation of exactly this migration), so
no new dependency is needed for an S3-compatible target (AWS S3, DigitalOcean Spaces, Cloudflare
R2, Backblaze B2 — all speak the S3 API). Drop-in replacement:

```python
# backend/app/utils/storage.py
import logging
import boto3
from botocore.exceptions import ClientError
from app.config import settings

logger = logging.getLogger(__name__)

_s3 = boto3.client(
    "s3",
    endpoint_url=settings.s3_endpoint_url or None,   # None for real AWS S3; set for DO Spaces/R2/etc.
    aws_access_key_id=settings.s3_access_key,
    aws_secret_access_key=settings.s3_secret_key,
    region_name=settings.s3_region,
)
_BUCKET = settings.s3_bucket


def init_storage() -> str:
    return _BUCKET  # kept for interface compatibility; nothing to lazily init with S3


def put_object(path: str, data: bytes, content_type: str) -> dict:
    _s3.put_object(Bucket=_BUCKET, Key=path, Body=data, ContentType=content_type)
    return {"path": path, "size": len(data)}


def get_object(path: str):
    try:
        obj = _s3.get_object(Bucket=_BUCKET, Key=path)
    except ClientError as e:
        raise Exception(f"not found: {e}")
    return obj["Body"].read(), obj.get("ContentType", "application/octet-stream")


MIME_TYPES = {"jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png", "gif": "image/gif", "webp": "image/webp"}


def guess_content_type(filename: str, fallback: str = "application/octet-stream") -> str:
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    return MIME_TYPES.get(ext, fallback)
```

Add matching settings to `app/config.py` (`S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`,
`S3_REGION`, `S3_ENDPOINT_URL` env vars) and make the bucket **public-read** (or put a CDN in
front of it) since `files.py`'s `/api/files/{path}` route currently proxies every image byte
*through the FastAPI process* — fine at this catalog's scale, but once traffic grows, point
`ProductForm`'s returned `url` directly at the bucket/CDN URL instead of the `/api/files/...`
proxy path to take the backend out of the image-serving hot path.

*This file change isn't applied yet — ask me to implement it once you've created the bucket and
have credentials in hand, and I'll wire it in and update `uploads.py`'s response if you switch to
direct bucket URLs.*

---

## 5. Deploy the backend

**Platform recommendation** (matches `docs/BACKEND_ARCHITECTURE.md` §10): Render or Railway —
both do zero-downtime deploys from GitHub, managed TLS, and accept external Postgres (Neon)
connections without needing a self-managed DB. DigitalOcean App Platform is the fallback if you
want a bit more infra control while staying managed.

**Dockerfile** (none exists yet — add `backend/Dockerfile`):

```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
```
(`server:app` — not `app.main:app` — because `server.py` is the deployment entrypoint by design,
see the module docstring in `backend/server.py`.) Multi-process `--workers 4` is enough at this
scale without adding a `gunicorn` dependency; swap to `gunicorn -k uvicorn.workers.UvicornWorker`
later only if you need gunicorn's process-management features specifically.

**Steps on Render/Railway:**
1. Connect the GitHub repo, set the service root to `backend/`.
2. Build: Docker (uses the Dockerfile above), or native Python buildpack running
   `pip install -r requirements.txt` + the same `uvicorn` start command.
3. Add every env var from §3 in the platform's secret/env UI (not in the Dockerfile).
4. Run `alembic upgrade head` against `DATABASE_URL` once, before the first deploy (§1 step 3) —
   both Render and Railway support a one-off "pre-deploy"/"release" command for exactly this if
   you'd rather wire it into the deploy pipeline than run it manually.
5. Deploy. Note the public HTTPS URL the platform gives you (e.g.
   `https://rari-api.onrender.com`) — this becomes `REACT_APP_BACKEND_URL` in §6.
6. First boot will seed the admin/super-admin (if those env vars are set) and the default
   categories/provider catalog automatically — check the deploy logs for `"Seeded admin user:
   ..."` to confirm. Table/index creation itself already happened in step 4 (Alembic), not here.

---

## 6. Deploy the frontend

**Platform recommendation:** Vercel or Netlify (zero-config for a CRA/craco build, free TLS,
preview deploys per PR). Any static host works equally well since the build output is plain
static files (`frontend/build/`).

1. Set the project root to `frontend/`.
2. Build command: `yarn build` (already the `package.json` script — CRA via craco).
3. Output directory: `build`.
4. Environment variables (build-time, since CRA bakes `REACT_APP_*` into the JS bundle at build,
   not runtime):
   - `REACT_APP_BACKEND_URL` = the backend's public HTTPS URL from §5 (no trailing slash, no
     `/api` suffix — the app appends `/api` itself in `lib/api.js`).
   - `REACT_APP_GOOGLE_CLIENT_ID` = the client ID from §2 (leave unset to disable Google Sign-In).
5. **SPA fallback**: this is a client-side-routed app (React Router) — the host must serve
   `index.html` for any unmatched path (`/product/whatever`, `/admin/orders`, etc.), not a 404.
   Vercel/Netlify do this automatically for CRA builds; if self-hosting via Nginx, add
   `try_files $uri /index.html;` (see §7).
6. Point your domain's DNS at the platform (CNAME/A record per their instructions), and add the
   domain in the platform UI so TLS gets provisioned.
7. **Sitemap**: `frontend/public/sitemap.xml` is gitignored and generated, not committed — run it
   against the real domain and live backend before (or as part of) your deploy:
   ```
   SITE_URL=https://yourdomain.com REACT_APP_BACKEND_URL=https://api.yourdomain.com yarn sitemap
   ```
   Then add `Sitemap: https://yourdomain.com/sitemap.xml` to `frontend/public/robots.txt`. Without
   `SITE_URL` set, the script writes placeholder `example.com` URLs and warns on stdout — never
   ship that file as-is.

---

## 7. If self-hosting instead of using a PaaS (Docker + Nginx)

Skip this section if using Render/Vercel/etc. — they handle TLS/routing for you. If you're
running everything on your own VM/droplet instead:

```
docker-compose.yml
├── backend    (Dockerfile from §5)
├── frontend   (multi-stage: `yarn build` → nginx serving the static build)
└── nginx      (reverse proxy: TLS termination, routes / to frontend, /api to backend)
```

Nginx sketch:
```nginx
server {
    listen 443 ssl;
    server_name yourdomain.com;
    client_max_body_size 12m;  # headroom over the app's 10MB upload cap

    location /api/ {
        proxy_pass http://backend:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        root /usr/share/nginx/html;  # the frontend build
        try_files $uri /index.html;
    }
}
```
TLS via Let's Encrypt/certbot, or your platform's managed certificate.

---

## 8. Auth hardening before going live

- **Rotate `JWT_SECRET`** to a real random value (§3) — do this *before* the first real user logs
  in; rotating later invalidates every session.
- **Set a real admin password**, then (optionally) blank `ADMIN_EMAIL`/`ADMIN_PASSWORD` back out
  of `.env` once the account exists — it lives in Postgres from then on, same pattern used earlier
  this session for the dev admin account.
- **`ALLOW_DEV_LOGIN` must be unset/false in production.** Even without setting it explicitly, the
  passwordless dev-login endpoint auto-enables itself whenever `GOOGLE_CLIENT_ID` is blank
  (`AuthService.dev_login_allowed()` in `app/services/auth_service.py`) — so either configure
  Google Sign-In (§2) or accept that anyone can create a session for any email with no password
  until you do. Don't ship with both Google unconfigured *and* `ALLOW_DEV_LOGIN` unset thinking
  it's "off by default" — it isn't.
- **Password reset delivers no email yet** (see the top of this doc). Options, in order of effort:
  1. Ship as-is, and manually relay the reset token from server logs to users who ask (fine for a
     low-volume launch, not a real long-term answer).
  2. Wire a transactional email provider (Resend or SendGrid, per `docs/BACKEND_ARCHITECTURE.md`
     §3) — a small addition to `AuthService.request_password_reset` in
     `app/services/auth_service.py` to actually send the link instead of just logging it. Ask me
     to implement this once you have API credentials for whichever provider you pick.
- **Rate limiting is not implemented yet** (`/auth/login`, `/auth/register`,
  `/auth/forgot-password` have no throttle — flagged as the top security priority in
  `docs/BACKEND_ARCHITECTURE.md` §12). Acceptable to launch without it for a low-traffic store,
  but it's the first thing to add if abuse/brute-force becomes a concern — `slowapi` (Redis-backed)
  is the recommended library, already scoped in the architecture doc.
- **CORS**: confirm `CORS_ORIGINS` (§3) exactly matches your frontend's origin(s), including
  `https://` and no trailing slash. Test with the browser console after deploy (§9) — a CORS
  misconfiguration shows up immediately as blocked cross-origin requests.

---

## 9. Post-deployment verification checklist

Run through this against the live production URLs before calling it done:

- [ ] `GET https://your-api-domain/api/` → `{"message": "Rari Ethnic API"}`
- [ ] `GET https://your-api-domain/docs` → Swagger UI loads (confirms the API is reachable and
      FastAPI booted cleanly)
- [ ] Frontend loads at your domain with no console errors, especially no CORS errors on the
      first API call (Network tab → any `/api/*` request → check for a blocked/CORS-failed status)
- [ ] **Customer flow**: `/register` a new account → redirected to `/account` → `/login` again
      with that email/password → still lands on `/account`
- [ ] **Google Sign-In** (if configured): button renders on `/login`, completes sign-in, lands on
      `/account` with the correct name/picture
- [ ] **Forgot password**: `/forgot-password` → submit → check the backend's logs for the token
      (until §8's email delivery is wired up) → `/reset-password` with that token → new password
      works on `/login`
- [ ] **Admin flow**: log in with the seeded admin account on the *same* `/login` page → lands on
      `/admin` (not `/account`) → sidebar shows Products/Orders/Events/Site settings
- [ ] **Product create + image upload**: `/admin/products/new`, upload an image, save → confirm
      the image actually renders (this is the one most likely to break if §4's storage migration
      wasn't done — an upload failure or a broken image icon here means storage is still pointed
      at Emergent)
- [ ] **Place an order**: add a product to cart on the live site, `/checkout`, complete a COD
      order → appears in `/admin/orders`
- [ ] **Role isolation**: while logged in as admin, visit `/account` directly → bounced to
      `/admin`; log out, log in as the customer account from the register step, visit `/admin`
      directly → bounced to `/account`, not left on a blank/broken page
- [ ] HTTPS padlock valid on both the frontend and backend domains, no mixed-content warnings
- [ ] Neon dashboard (or pgAdmin connected to it) shows the tables populated (`users`, `products`,
      `orders`, `refresh_sessions`, `password_resets`) after the above steps
- [ ] Confirm `python -m pytest tests/backend_auth_test.py -q` still passes when pointed at the
      production API (`REACT_APP_BACKEND_URL=https://your-api-domain python -m pytest ...`) — this
      exercises register/login/refresh/logout/forgot-password/reset-password against the real
      deployment, not just locally

---

## 10. CI/CD (optional but recommended)

GitHub Actions, matching the pattern in `docs/BACKEND_ARCHITECTURE.md` §10:
- **On PR**: install backend deps + run `pytest`; `yarn build` the frontend (catches build
  breakage before merge).
- **On merge to `main`**: Render/Railway/Vercel's GitHub integration can auto-deploy on push
  directly — no custom pipeline needed unless you want a manual approval gate before prod deploys.

---

## 11. Monitoring

Add [Sentry](https://sentry.io) to both the FastAPI backend (`sentry-sdk[fastapi]`) and the React
frontend (`@sentry/react`) — covers most of the operational visibility a store this size needs
without standing up Prometheus/Grafana. Not implemented in the codebase yet; ask if you want this
wired in.
