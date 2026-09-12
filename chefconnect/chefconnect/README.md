# ChefConnect

A marketplace for cooking classes. Chefs of every kind (home cooks, restaurant chefs, YouTube creators, celebrity chefs, cooking schools) host in-person classes with optional virtual seats. Everyone else can search, book, review, and read post-class recaps.

**Stack:** Next.js 14 (App Router, TypeScript, Tailwind) · Supabase (Postgres, Auth, Storage, Row Level Security) · Vercel.

## Setup

You need Node 20+ and a free Supabase account.

1. **Install and configure**

   ```bash
   npm install
   cp .env.example .env.local
   ```

2. **Create the Supabase project.** At supabase.com create a project named `chefconnect` in a US East region. In **Project Settings → API Keys** copy the Project URL, the publishable key (`sb_publishable_…`), and a secret key (`sb_secret_…`) into `.env.local`. The secret key bypasses RLS and must never reach the browser.

3. **Apply the migrations.** In the Supabase **SQL Editor**, paste and run each file in `supabase/migrations/` in order: `0001` → `0002` → `0003` → `0004`. Wait for "Success" before running the next one.

4. **Verify.** Run `npm run dev` and open http://localhost:3000. The page checks your keys, the database connection, the migrations, and that exact addresses are hidden from anonymous reads. When all four pass, the foundation is done. The same report is at `/api/health` as JSON.

5. **Generate types after any schema change** (optional now; required once we add migrations):

   ```bash
   npx supabase login                       # once
   SUPABASE_PROJECT_REF=<your-ref> npm run db:types
   ```

## Scripts

| Command             | What it does                                        |
| ------------------- | --------------------------------------------------- |
| `npm run dev`       | Local dev server                                    |
| `npm run build`     | Production build (also typechecks and lints)        |
| `npm run typecheck` | `tsc --noEmit`                                      |
| `npm run lint`      | ESLint via Next                                     |
| `npm run db:types`  | Regenerate `src/lib/database.types.ts` from Supabase |

CI (`.github/workflows/ci.yml`) runs typecheck, lint, and build on every push, and applies all migrations to a throwaway Postgres 16 so a broken migration fails before it reaches Supabase.

## Project layout

```
src/
  app/
    layout.tsx            root layout + metadata
    page.tsx              foundation check (replaced by the real home page in Phase 1)
    globals.css           Tailwind base + design tokens
    api/health/route.ts   JSON health check
  middleware.ts           refreshes the Supabase session on every request
  lib/
    env.ts                reads env vars with clear errors
    foundation-check.ts   the four startup checks
    database.types.ts     generated types for the whole schema
    supabase/
      client.ts           browser client (RLS applies)
      server.ts           server client for RSC / actions / routes (RLS applies)
      admin.ts            secret-key client, server-only (bypasses RLS)
      middleware.ts       session refresh + protected route prefixes
supabase/
  migrations/             append-only, numbered, apply in order
  ci/harness.sql          CI-only stand-in for the auth schema and API roles
tailwind.config.ts        colour, type and radius tokens
```

## How the data model works

**Classes are templates, sessions are instances.** A class holds the description, cuisine, tags, and price; each session is a scheduled run of it with a format (`in_person`, `virtual`, `hybrid`), separate in-person and virtual capacities, and public `*_booked` counters so "seats left" needs no joins.

**Privacy is split at the table level.** `locations` holds what anyone may see (city, neighbourhood, coordinates fuzzed 300–800 m by a trigger). `location_addresses` holds the exact address and is readable only by the owning chef and attendees with a live booking there. `session_secrets` does the same for virtual join links. Because RLS is per table, a `select *` can never leak these.

**Multi-table writes go through RPCs.** `upsert_location()` writes both location halves; `book_session()` records the waiver acceptance and the booking in one transaction (a booking cannot exist without its waiver — the column is NOT NULL); `cancel_booking()` applies the cancellation rules. Call them with `supabase.rpc(...)`.

**Rules live in the database, not just the app.**

- Capacity: `claim_seat()` is a single conditional `UPDATE`, which Postgres row-locks, so concurrent bookings serialise and the last seat goes to exactly one person.
- Reviews: only the booking's owner, only after the session ends, only if the booking was confirmed or attended. Session/class/chef on the review are filled from the booking, never trusted from input.
- Roles: a user becomes `chef` only by creating a chef profile; `admin` only via the secret key.
- Cancellation: attendees can cancel until `cancellation_cutoff_hours` before start; chefs can cancel any time. Cancelling a session cancels every booking and notifies each attendee.
- `users` rows are created automatically when Supabase Auth creates a user, so RLS always has a row to match.

**Waivers are versioned.** `waivers` holds one current version; every booking references the version accepted. The seeded `2026-09-v1` text is a placeholder — add a reviewed version as a new row (flip `is_current`) before launch.

## Working agreements

- **Migrations are append-only.** Never edit a migration that has been run on Supabase; add the next number.
- **Draft and commit.** Claude drafts files; Mohammad reviews and commits. Short-lived branches (`feat/auth`, `feat/booking`) merged into `main`, which stays deployable.
- **Never commit `.env.local`.** `.gitignore` already excludes it.

## Roadmap

Phase 0 (this scaffold) → Phase 1 free MVP: auth, chef profiles and class creation, search and filters, booking, recaps → Phase 2 polish and soft launch → Phase 3 payments.
