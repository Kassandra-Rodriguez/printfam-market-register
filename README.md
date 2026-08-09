# Market Register

A mobile-first inventory and event sales tracker for small businesses selling at markets, pop-ups, and vendor shows. It replaces the paper notebook: fast sale entry during a live event, real-time shared inventory across every logged-in employee/owner device, and simple end-of-day/event recaps.

Built with Next.js (App Router), Supabase (Auth + Postgres + Row Level Security + Realtime + Storage), Tailwind CSS, and shadcn/ui.

## Tech stack

- Next.js 16 (App Router, TypeScript strict, Turbopack)
- Supabase: Postgres, Auth, Row Level Security, Storage, Realtime
- Tailwind CSS v4 + shadcn/ui (base-ui primitives)
- React Hook Form + Zod
- TanStack Query (installed for client-side caching; realtime hooks drive most live updates directly)
- Vitest (unit tests + a live-Supabase business-rule integration suite)
- Deploys to Vercel

## Local setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a new project (the free tier is enough for development).
2. In **Project Settings → API**, copy the **Project URL**, **anon public key**, and **service role key**.
3. Copy `.env.example` to `.env.local` and fill in the three Supabase values plus `NEXT_PUBLIC_SITE_URL` (use `http://localhost:3000` locally):

   ```bash
   cp .env.example .env.local
   ```

### 3. Apply the database migrations

The full schema, Row Level Security policies, and business-logic functions live in `supabase/migrations/`. Apply them with the Supabase CLI:

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

Alternatively, paste each file in `supabase/migrations/` (in numeric order) into the Supabase dashboard's SQL Editor and run them.

This creates all 13 tables, Row Level Security policies, permission-helper functions, storage buckets, realtime publication, and the server-side functions that back every sale, void, inventory adjustment, and event transition (`complete_sale`, `void_transaction`, `adjust_inventory`, `start_event`, `close_event`, `reopen_event`, `record_cash_count`, `invite_employee`, `accept_invitation`, `create_business`).

### 4. Configure Supabase Auth email

In **Authentication → URL Configuration**, set the Site URL to your `NEXT_PUBLIC_SITE_URL`. Email/password sign-up, password reset, and employee invitations all rely on Supabase's built-in auth email templates. If you don't configure a custom SMTP provider, Supabase's default email service works fine for development but is rate-limited — employee invites still work without it because the app also shows a copyable invite link as a fallback.

### 5. Run the app

```bash
npm run dev
```

Visit `http://localhost:3000/welcome` to sign up as a business owner, or run the seed script below for a ready-made demo business.

## Seed data (demo business)

`scripts/seed.ts` creates a realistic demo business through the same code paths the app itself uses (real auth users, `create_business`, `invite_employee`/`accept_invitation`, `complete_sale`, `adjust_inventory`, `start_event`/`close_event`, `record_cash_count`) — nothing is inserted by bypassing the app's own rules.

```bash
npm run seed
```

This creates:
- 1 owner + 3 employees (see **Demo logins** below)
- 1 business ("Rivera Handmade Co.", USD, America/New_York)
- 17 inventory variations across 5 categories and multiple colors, including a couple of intentionally low-stock items
- 2 events: one closed (with a full recap and a recorded cash count) and one active (with a few sales already on it, ready for you to keep selling)
- Sales across Cash, Cash App, and Card, by different employees, including one with a customer note
- Inventory adjustments: stock added, damaged, and a manual correction, each with a note

### Demo logins

All accounts use the password `Password123!`.

| Role | Email |
| --- | --- |
| Owner | `owner@demo.marketregister.app` |
| Employee | `alex@demo.marketregister.app` |
| Employee | `morgan@demo.marketregister.app` |
| Employee | `sam@demo.marketregister.app` |

## Testing

```bash
npm test
```

This runs two kinds of tests:

1. **Unit tests** (`tests/unit/`) — pure logic with no external dependencies: business-timezone date math, CSV export formatting, and Zod validation rules (e.g. a note is required for damaged/lost/other inventory adjustments). These always run.
2. **Integration tests** (`tests/integration/business-rules.test.ts`) — the 10 core business rules, run against a **real** local Supabase instance using the actual RLS policies and `SECURITY DEFINER` functions (nothing mocked):
   - A user cannot access another business's data
   - An employee can record a valid sale
   - Inventory decreases after a sale
   - A sale fails when inventory is insufficient
   - A void returns inventory
   - Voided transactions are excluded from active sales totals
   - Payment method totals are correct
   - Cash count calculations are correct
   - Employee attribution is saved
   - Historical item snapshots remain unchanged after inventory edits

   These are skipped automatically (not failed) unless you point them at a local Supabase instance:

   ```bash
   npx supabase start   # requires Docker
   SUPABASE_TEST_URL=http://127.0.0.1:54321 \
   SUPABASE_TEST_ANON_KEY=<anon key from the `supabase start` output> \
   SUPABASE_TEST_SERVICE_ROLE_KEY=<service_role key from the `supabase start` output> \
   npm test
   ```

## Deployment (Vercel)

1. Push this repository to GitHub.
2. Import it into Vercel.
3. Add the same four environment variables from `.env.local` in the Vercel project settings (**never** expose `SUPABASE_SERVICE_ROLE_KEY` to the client — it's only read in server actions).
4. Deploy. Vercel builds with `npm run build` automatically.
5. Update `NEXT_PUBLIC_SITE_URL` to your production URL and update the Supabase Auth Site URL to match.

## Summary of completed features

**Accounts & business setup**
- Email/password sign up, log in, forgot/reset password, persistent sessions, logout
- Owner onboarding wizard (business name, logo, currency, timezone, contact info)
- Employee invitations by email with a secure random token (hashed at rest), email-match verification on accept, and a copyable join link as a fallback if email delivery isn't configured
- Business settings: allow negative inventory, employee permission toggles (adjust inventory, manage events, void own recent sales + time window)
- Employees list (invite, remove, revoke pending invites) and a per-employee activity log

**Inventory**
- Item + color/variation as its own row with its own quantity, so the same product in different colors tracks accurately
- Add/edit items (name, category, color, SKU, description, photo, price, cost, low stock threshold)
- Search, filter by category/color, low-stock filter, Active/Archived tabs
- Increase / decrease / set-exact quantity adjustments with a typed reason and a note (required for damaged/lost/other), all logged to `inventory_adjustments`
- Archive instead of delete, so historical sales always stay accurate
- Live quantity sync across every logged-in device (Supabase Realtime)

**Events & selling**
- Create, start, close (with recap + optional cash count), and reopen events; only one active event at a time (enforced server-side, easy to relax later)
- Mobile-first Sell screen: search/filter grid, tap-to-add, sticky cart bar, cart sheet with quantity steppers, Cash/Cash App/Card selection, optional note, one-tap complete, instant reset for the next sale
- Every sale is validated and committed server-side in a single atomic function — never shown as complete until the server confirms it, and it can't oversell unless the owner turns on negative inventory
- Transactions list and detail with full line-item snapshots (price/cost/name/color at time of sale, unaffected by later inventory edits)
- Voids with a required reason; inventory is restored and the original record stays visible in the audit trail

**Recaps, cash, and reports**
- Home dashboard: active event, today's sales/cash/Cash App/card totals, items sold, inventory totals, low-stock count, recent sales, quick actions
- Event recap: gross sales, transaction count, items sold, estimated profit, payment method breakdown, voided total
- Cash counting: starting cash, recorded cash sales, expected cash, actual counted, and the difference
- Reports: filter by today/yesterday/week/month/custom range, event, employee, or payment method; totals, best sellers, sales by employee, CSV export for transactions and inventory (owner-only)

**Platform**
- Row Level Security on every table; sensitive mutations (sales, voids, inventory quantity changes, event lifecycle, cash counts, invitations) are only reachable through audited `SECURITY DEFINER` Postgres functions — never a direct client write
- Realtime sync for inventory quantities, transactions, and event status
- Responsive layout: bottom nav on phones, side nav on tablet/desktop, light and dark mode
- Loading skeletons, empty states, and clear error messages throughout
- Installable PWA (manifest + app-shell service worker with an offline fallback page — sales are never queued offline, by design)
- Automated tests and a realistic seed script (see above)

## Future improvements (not in this v1)

- Offline sale queueing with background sync (v1 intentionally never shows a sale as complete before the server confirms it)
- Multiple concurrent active events per business (the data model already supports this; only the "one active event" convenience rule in `start_event` would need to change)
- Multi-currency support beyond USD
- Barcode/QR scanning for faster item lookup on the Sell screen
- CI pipeline running the test suite automatically on push
