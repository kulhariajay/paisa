# Paisa — project handoff / context

Read this first if you're picking up this project on a new machine or in a fresh
Claude session. It captures the full state so you don't have to reverse-engineer it.

## What this is

**Paisa** — a private, single-user personal finance manager (INR). Tracks net
worth, EMIs/loans, credit cards, friend debts, investments and expenses, with
charts and a monthly mark-as-paid flow. Full feature/architecture detail is in
[README.md](README.md) and [CLAUDE.md](CLAUDE.md).

Stack: Next.js 16 (App Router) · Drizzle ORM · Postgres (Neon prod / PGlite local)
· Auth.js (Google, single-email gate) · Recharts · Tailwind 4.

## Current status (as of 2026-06-13)

- ✅ App fully built and verified locally (all 7 pages, atomic EMI mark-paid,
  charts, month-close snapshots).
- ✅ Code on GitHub: https://github.com/kulhariajay/paisa (branch `main`).
- ✅ Neon database created, **migrated and seeded** (16 categories).
- 🟡 **Deploying to Vercel — in progress.** Auth was failing with Google
  "redirect_uri" errors because each Vercel deployment gets a new hash URL.
  The fix being applied: set `AUTH_URL` to the **stable** production domain and
  register only that one callback in Google. See "Deployment unblock" below.

## Run it on a new machine

```bash
pnpm install
pnpm db:local      # creates local PGlite DB (no external DB needed)
pnpm dev           # http://localhost:3000 — use the "Developer login" button
```
`.env.local` already has `DEV_AUTH=1` for passwordless local sign-in (never active
in production).

## Deployment unblock (the current task)

Symptom: Google OAuth rejects the redirect URI on every redeploy because Vercel
deployment URLs change (`paisa-<hash>-….vercel.app`).

Permanent fix:
1. In **Vercel → Settings → Domains**, copy the stable production domain (no
   hash), e.g. `paisa-ajays-projects-b0cb31b1.vercel.app`. Call it `PROD`.
2. **Vercel env (Production):** add `AUTH_URL=https://PROD`, then redeploy.
3. **Google Cloud Console → Credentials → OAuth client:**
   - Authorized JavaScript origin: `https://PROD`
   - Authorized redirect URI: `https://PROD/api/auth/callback/google`
4. Always open the app at `https://PROD` (not the per-deploy hash URL).

Required Vercel env vars (Production):

| Var | Notes |
|---|---|
| `DATABASE_URL` | Neon pooled connection string |
| `AUTH_SECRET` | `openssl rand -base64 32` |
| `AUTH_URL` | `https://PROD` (the stable domain) |
| `AUTH_GOOGLE_ID` | Google OAuth client ID |
| `AUTH_GOOGLE_SECRET` | Google OAuth client secret |
| `ALLOWED_EMAIL` | `kulhariajay19@gmail.com` |

Do NOT set `DEV_AUTH` in production. Actual secret values are NOT in this repo —
they live only in Vercel's env settings and your password manager.

## If the dashboard 500s in production

The build runs migrations, so a runtime error there is almost always a DB
connection issue: confirm `DATABASE_URL` is set for Production and that you
**redeployed after adding it**. Get the real error from Vercel → Logs (Runtime),
reload the page, expand the red row.

## Security note

Earlier in development, a Neon password and GitHub tokens were pasted into the
chat. Rotate/revoke them:
- GitHub tokens → https://github.com/settings/tokens
- Neon password → rotate in the Neon dashboard, then update `DATABASE_URL` in Vercel

## Where things live

- App code: this folder (`~/Desktop/ajay`), pushed to GitHub.
- A readable backup of the build conversation + the original design doc:
  `session-archive/` (gitignored — does NOT travel via `git clone`, only via a
  physical folder copy).
