# Paisa — Personal Finance Manager

A private, single-user money tracker. Net worth, EMIs, loans, credit cards, friend
debts, investments and expenses — all in INR, all in one place, with a chart for
everything and a monthly mark-as-paid rhythm.

Built with Next.js 16 (App Router) · Drizzle ORM · Postgres (Neon) · Auth.js
(Google) · Recharts · Tailwind. Deploys to Vercel.

## What it does

- **Dashboard** — net worth, money due this month, investment value, total debt,
  a **Debt-Free Day** countdown, and charts: net-worth trend, income vs expense,
  spending by category, debt by account, investment value vs invested.
- **Dues** — recurring items (salary, EMIs, rent, SIPs, card bills) appear
  automatically each month. Mark one paid and it does the right thing atomically:
  an EMI cuts principal off the loan (reducing-balance interest split), tenure
  ticks down, cash drops, and net worth updates. Skip or carry-over supported.
- **Accounts** — cash/bank, investments, loans, credit cards and friend debts,
  plus the recurring templates that drive the Dues board.
- **Transactions** — fast expense/income quick-add; recurring payments are logged
  automatically.
- **Investments** — update values when you check them; gain/loss and a staleness
  nudge when a value is over 30 days old.
- **Friend Debts** — money owed to you and money you owe, with partial settlements.
- **Month Close** — snapshot your net worth so the history chart has a real point;
  re-closable and works for past months.

Money is stored as **integer paise** everywhere — no floating-point money.

## Run locally (zero external setup)

No database to install. With `DATABASE_URL` unset, the app uses an in-process
Postgres (PGlite) stored in `./.pglite`.

```bash
pnpm install
cp .env.example .env.local   # then edit (see below)
pnpm db:local                # creates + migrates + seeds the local PGlite DB
pnpm dev                     # http://localhost:3000
```

For local sign-in without Google, `.env.local` ships with `DEV_AUTH="1"`, which
adds a **Developer login** button on the sign-in page. This is hard-fenced and can
never activate in production (`NODE_ENV === "production"` disables it).

Minimum `.env.local`:

```
AUTH_SECRET="any-long-random-string"
ALLOWED_EMAIL="you@gmail.com"
DEV_AUTH="1"
AUTH_TRUST_HOST="true"
```

## Deploy to Vercel

1. **Database** — create a project at [neon.tech](https://neon.tech) and copy the
   **pooled** connection string.
2. **Google OAuth** — in the
   [Google Cloud console](https://console.cloud.google.com/apis/credentials),
   create an OAuth client (Web application) and add the redirect URI
   `https://YOUR-APP.vercel.app/api/auth/callback/google`.
3. **Push** this repo to GitHub and import it into Vercel.
4. **Environment variables** in Vercel (Production):

   | Variable | Value |
   |---|---|
   | `DATABASE_URL` | Neon pooled connection string |
   | `AUTH_SECRET` | `openssl rand -base64 32` |
   | `AUTH_GOOGLE_ID` | Google OAuth client ID |
   | `AUTH_GOOGLE_SECRET` | Google OAuth client secret |
   | `ALLOWED_EMAIL` | the one email allowed to sign in |

   Do **not** set `DEV_AUTH` in production.

5. **Migrations run on deploy.** The build command is
   `[ "$VERCEL_ENV" = "production" ] && pnpm db:migrate; next build` — it applies
   Drizzle migrations to Neon only on production builds (preview builds skip it so
   they never touch the production database). After the first deploy, seed
   categories once: run `pnpm db:seed` locally pointed at the production
   `DATABASE_URL`, or add categories from the Accounts UI.

Because `ALLOWED_EMAIL` gates sign-in server-side (in the Auth.js `signIn`
callback) and the middleware guards every route, only you can ever see your data.

## Scripts

| Script | What it does |
|---|---|
| `pnpm dev` | Dev server |
| `pnpm build` | Production build (migrates on Vercel production) |
| `pnpm db:local` | Create/migrate/seed the local PGlite database |
| `pnpm db:generate` | Generate a new SQL migration from schema changes |
| `pnpm db:migrate` | Apply migrations to `DATABASE_URL` |
| `pnpm db:seed` | Seed default categories into `DATABASE_URL` |
| `pnpm db:studio` | Drizzle Studio |

## Architecture notes

- **Driver switch** (`lib/db/index.ts`): a network `DATABASE_URL` uses Neon's
  serverless Pool (real transactions, Vercel-friendly); otherwise PGlite. The
  connection is created lazily so importing never opens a socket.
- **Lazy due generation** (`lib/dues.ts`): dues are generated idempotently on page
  load for every month from a template's start through now — no cron job, which
  avoids silent misses on Vercel's hobby tier. A partial unique index
  `(template_id, month) WHERE origin_due_id IS NULL` makes it safe to re-run.
- **Atomic mark-paid**: every payment is one DB transaction — the funding cash leg
  plus the target side-effect (loan principal cut, card paydown, investment
  contribution, or debt settlement). Fully reversible via Undo.
