# Ruaha 360

Rural economic development platform for Ruaha Energy. First deployment:
Ilundo, Tanzania.

**This is an MVP for a stakeholder demo on 30 September 2026. It holds demo
data only — no real farmer data has been entered, and none should be.**

---

## What it does

A field officer registers a farmer, their household, farm, plot, crop cycle
and expected harvest — one page, one submit, one transaction. Everything after
that is a view over what the officer wrote:

- the farmer sees their own records, with provenance, and can request powered
  equipment with a live energy estimate
- ops reviews and decides those requests, records buyer demand, and matches it
  against village supply
- the Control Tower aggregates all of it, and every headline drills back to
  the records underneath it

The three specifications are `docs/schema.md`, `docs/business-rules.md` and
`docs/screens-and-components.md`. `supabase/migrations/` is the fourth.
`CLAUDE.md` is the working agreement.

---

## Running it

```bash
pnpm install
pnpm dev
```

`.env` needs `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` and
`VITE_DATA_MODE=demo`, plus `SUPABASE_DB_*` for the database scripts. There is
no service-role key anywhere in this application, deliberately.

```bash
pnpm typecheck        # tsc
pnpm test             # vitest
pnpm e2e              # playwright, against the cloud dev project
pnpm e2e journey      # the eight-step acceptance journey alone
pnpm db:rls           # the 24 policy assertions
pnpm db:push          # apply pending migrations
pnpm i18n:handover    # regenerate docs/i18n-handover.md
```

**There is no local Supabase on this project.** The cloud dev project is the
only database; every `db:*` script points there through `scripts/db-url.mjs`.
See `supabase/README.md`.

---

## Known gaps, stated plainly

### Swahili is not done

`CLAUDE.md` specifies that **the farmer and officer surfaces ship complete
Swahili**, and they currently do not. Of 559 strings, 2 carry Swahili — the
language switch's own labels, which are attested terms rather than product
copy. Everything else renders English through i18next's fallback.

This is a gap waiting on a **native Kiswahili reviewer**, not an engineering
task. The string list is frozen and exported to `docs/i18n-handover.md`, which
marks the 323 strings that block the demo and carries the labelling rules a
translator needs — "estimate", "indicative price" and "planned capacity" are
claims about what the programme does and does not promise.

Nothing in that file may be machine translated. An unreviewed guess is worse
than English: English is visibly untranslated, and a wrong Swahili string is
not. `src/i18n/bundles.test.ts` enforces this — the Swahili bundle is asserted
to contain only the attested keys, and adding to that list is a claim that a
reviewer supplied the string.

### What is deliberately absent

Training, services, progress tracking, photo upload, farm polygons, offline
sync queues, notifications, meter screens, tariffs, finance terms, repayments,
crowdfarming, wallets, export tracking, buyer self-service, and any AI
surface. Reference decks show several of these; a screen existing does not put
it in scope. Plan v2 controls that.

### Open research

Finance terms and Bank of Tanzania Tier 2 classification (item C), consent and
registration for real farmer data (items A and B), and the season, grade and
confidence taxonomies (Plan v2 S22). The demo does not depend on any of them,
and none should be guessed at.

---

## Where the numbers come from

Every figure on a screen is read from a database view. The client does not
aggregate — see `docs/business-rules.md` §7 and §11. The seeded demo figures
are part of the specification and are asserted by the test suite:

```
Ilundo maize, Sept    12,000 kg expected  (superseded 3,200 excluded)
committed              6,400 kg
available              5,600 kg
demand 9,000 kg    →   62.2% coverage
approved peak          (15.0 + 2×1.5) × 0.600 = 10.800 kW
headroom               489.200 kW
```

If a change moves one of these, either the change is wrong or the
specification has moved. Both are worth stopping for.
