# Ruaha 360 — working agreement

You are building the MVP of Ruaha 360: a rural economic development platform
for Ruaha Energy, first deployment Ilundo, Tanzania.

**Target: a working stakeholder demo by 30 September 2026.**
Solo developer. Demo data only — no real farmer data will be entered.

---

## Read before writing code

In this order. Do not skip.

1. `docs/schema.md` — tables, conventions, role matrix
2. `docs/business-rules.md` — how every function behaves, and what the database
   enforces so you don't
3. `docs/screens-and-components.md` — every screen, its data, its states, its
   acceptance criteria

Those three plus `supabase/migrations/` are the specification. This file is the
working agreement.

---

## Start here — the first session

**Do not write UI first.** The migrations have never been applied. Everything
downstream inherits their assumptions.

```bash
supabase start
supabase db reset                                   # migrations + seed
psql "$LOCAL_DB_URL" -f supabase/tests/rls_test.sql
```

Expect failures. The assertion suite tests policies nobody has executed. Likely
breakages, in order:

1. `auth.users` / `auth.identities` shape in `seed.sql` — GoTrue version drift.
   Fallback is documented in the seed header
2. The farmer's visible-person count — `person_read_household` is the most
   intricate policy in the schema
3. `set local role authenticated` behaviour in your psql session

**Fix the migrations in place.** Nothing has been pushed to a shared database,
so corrections are edits, not new migrations. Once `db push` runs, that freedom
is gone forever.

> **No longer true, as of 11 September 2026.** The nine migrations are now
> recorded in `supabase_migrations.schema_migrations` on the dev project,
> statements included. A schema change is a NEW migration from here on — never
> an edit to an existing one. See `supabase/README.md`.

Only when every assertion passes does UI work begin.

---

## Non-negotiables

1. **Migrations are the only source of schema truth.** Never change schema in
   the Supabase dashboard. This is also what makes a later self-host a copy
   rather than a rewrite.
2. **RLS is the security boundary.** Route guards are convenience. Never add a
   client-side check as a substitute for a policy.
3. **Zero rows is an answer**, not an error. RLS returning nothing means "you
   may not see this". Render an empty state. Never retry, never escalate.
4. **Do not invent tables, columns, views or enum values.** If a screen appears
   to need one that does not exist, stop and ask. The absence is usually
   deliberate — `capacity_basis` has no `'measured'` value on purpose.
5. **Do not pre-validate rules the database enforces.** Call it, catch the
   error, show the message. A client-side copy of a trigger drifts within a
   fortnight.
6. **Every observed-table insert goes through `withProvenance`.** Write that
   helper before the second feature, not after the thirtieth call site.
7. **Do not add dependencies** beyond the locked stack. If something seems to
   need one, ask first.
8. **The MVP contains no AI.** No pgvector, no embeddings, no assistant, no
   "smart" suggestions. Plan v2 defers all of it (S07, S18, S21).

---

## Stack — locked

```
Vite + React + TypeScript          SPA, no SSR
TanStack Router                    typed routes, URL-held filter state, guards
TanStack Query                     all server state; no other state manager
Tailwind + shadcn/ui               UI primitives
TanStack Table                     ops tables, Tower drill-downs
react-hook-form + Zod              forms
react-i18next                      Swahili + English
vite-plugin-pwa                    cached shell
@supabase/supabase-js              the only data client
Playwright + Vitest                e2e and unit
```

**Explicitly not used:** SSR of any kind · Next.js · Nuxt · TanStack Start ·
monorepo tooling · Drizzle or any ORM · GraphQL · NestJS or any separate
backend · Redux/Zustand/Jotai · any chart library before the Tower renders real
numbers.

Rationale for each is in the specs. Reopen a decision only with a concrete
reason, and say what changed.

---

## Commands

```bash
pnpm dev                # vite
pnpm build              # static bundle
pnpm typecheck
pnpm test               # vitest
pnpm e2e                # playwright, against local supabase + seed

supabase start
supabase db reset       # migrations + seed. Safe: seed refuses non-demo databases
supabase gen types typescript --local > src/lib/db.types.ts
```

Regenerate `db.types.ts` after every migration change and commit it. No
hand-written row types.

---

## Layout

```
src/
  app/            router, providers, layouts, guards
  routes/         TanStack Router route files
  features/
    officer/  farmer/  ops/  tower/
  components/     shared UI (see spec §9)
  lib/
    supabase.ts     client
    db.types.ts     GENERATED — never hand-edited
    provenance.ts   withProvenance
    drafts.ts       useDraft, IndexedDB
    queryKeys.ts    the key registry from business-rules §10
    format.ts       units, currency, dates
  i18n/
    en/common.json  sw/common.json  (+ per-feature namespaces)
  styles/
supabase/
  migrations/  seed.sql  tests/rls_test.sql
docs/
e2e/            the acceptance journey
```

Reference data — crop names, equipment names, categories — is translated **in
the database** (`name_en` / `name_sw`), not in JSON. Those rows are created at
runtime and repo files cannot translate them.

---

## Environment

```
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_DATA_MODE=demo        # drives the demo banner
```

The demo banner is driven by this variable, never by a database column. The
demo instance and any future live instance are **different databases** — there
is no `is_demo` flag by design.

Never commit a service-role key. Never use one from the browser.

---

## Build order

Tiers are defined in `docs/screens-and-components.md`.

```
0  migrations green + rls_test passing        <- gate, not a task
1  shell · login · membership routing · i18n · brand tokens
2  officer register (the RPC) + person detail + verify
3  farmer my-farm + equipment + request
4  ops request pipeline + review + decide
5  ops demand + coverage + opportunity + supply
6  tower tiles + drill-downs
7  seed polish + playwright journey
```

**Finish every T1 screen before any T2 screen.** The T1 set is exactly the
acceptance journey. Steps 2 and 3 are the whole product — everything after is a
view over what the officer wrote.

Do not start at step 6 because it demos well.

---

## Definition of done

Both must be true:

1. `supabase/tests/rls_test.sql` passes with no failures
2. The acceptance journey passes in Playwright against seeded demo data:

```
officer registers person + household + farm + plot + cycle + expected harvest
officer verifies the records
farmer sees the same records, with provenance
farmer submits an equipment request; the estimate moves when hours change
ops reviews and approves
ops opens the maize demand and sees Ilundo coverage
ops creates an opportunity and attaches supply
tower reflects all of it, and a headline drills to that farmer's record
```

Plus: role permissions tested, and an interrupted save in step 1 that survives
a reload.

Expected seeded figures — assert these, do not eyeball them:

```
Ilundo maize, Sept    12,000 kg expected  (superseded 3,200 excluded)
committed              6,400 kg
available              5,600 kg
demand 9,000 kg    →   62.2% coverage
approved peak          (15.0 + 2×1.5) × 0.600 = 10.800 kW
headroom               489.200 kW
```

---

## Language and labelling

These are product requirements, not copy preferences. Getting them wrong
misrepresents the programme.

- Capacity is **planned**, never measured. Always shown with its `basis`
- Prospective and approved demand are separate figures, **never summed**
- An estimate is always labelled an estimate
- Prices are always labelled **indicative**. They are not quotations
- An opportunity is **not** a sale, a delivery or a payment
- `cycle_area_ha` is "planted area across cycles", never "land area" —
  intercropping means it can exceed the village's hectares
- Every record shows where its data came from (`ProvenanceBadge`)

Farmer and Officer surfaces ship complete Swahili. Ops and Tower may ship
English for the demo. **Swahili strings do not exist yet and need a native
reviewer** — flag any string you invent rather than shipping machine
translation to Tanzanian stakeholders.

---

## Do not build

Training · Services · Progress · translations admin · user admin · photo
upload · farm polygons · PostGIS · offline sync queues · notifications · meter
screens · tariffs · finance terms, schedules or repayments · crowdfarming ·
wallets or QR payments · export or shipment tracking · buyer self-service
accounts · any AI surface.

Reference screens from the Ruaha Control Center and African Farmers Market
decks show several of these. **A screen existing does not put it in scope.**
Plan v2 controls scope.

---

## When unsure

Stop and ask. Do not guess at:

- a missing table or column — the gap is probably deliberate
- finance terms, interest, deposits or repayment — unresolved, and research
  item C (Bank of Tanzania Tier 2 classification) is open
- anything touching real farmer data, consent or registration — research items
  A and B are open and this build is demo-only
- Swahili wording
- a season, grade or confidence taxonomy — all still open under Plan v2 S22

A question costs minutes. A wrong assumption baked into the schema costs the
deadline.
