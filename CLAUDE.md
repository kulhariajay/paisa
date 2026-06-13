# Paisa — project notes for Claude

Single-user personal finance manager. Next.js 16 App Router + Drizzle + Postgres
(Neon in prod, PGlite locally) + Auth.js (Google) + Recharts + Tailwind 4.

## Conventions

- **Money is always integer paise.** Convert at the UI boundary only, via
  `lib/paise.ts` (`toPaise`, `toRupees`, `formatINR`). Never do float money math.
- **Mutations are server actions** in `app/actions.ts`; they call `revalidateAll()`.
  Reads live in `lib/queries.ts`, `lib/finance.ts`, `lib/dashboard.ts`.
- **The financial core** is `lib/dues.ts` (lazy generation + atomic mark-paid /
  undo / skip / carry) and `lib/emi.ts` (reducing-balance amortization). Keep
  every balance change inside a `db.transaction`.
- **Schema**: `lib/db/schema.ts`, 7 tables. After changing it run
  `pnpm db:generate` then `pnpm db:local` (local) / `pnpm db:migrate` (remote).
- **Account balance semantics depend on type** — see the comment on the `accounts`
  table. Net worth = assets − liabilities, computed in `lib/finance.ts`.
- UI primitives in `components/ui/`. Charts (client) in `components/charts.tsx`.

## Running

`pnpm db:local && pnpm dev`. Local sign-in uses the dev login button (DEV_AUTH=1),
never active in production. Route guard is `proxy.ts` (Next 16 middleware).

## Don't

- Don't add a cron job for due generation — it's deliberately lazy/idempotent.
- Don't store money as float or in rupees in the DB.
- Don't bundle `@electric-sql/pglite` / `@neondatabase/serverless` — they're in
  `serverExternalPackages` in `next.config.ts`.
