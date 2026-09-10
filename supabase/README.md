# supabase/

**Cloud dev project only.** No local Supabase, no Docker, no `--local` flags.
Everything — the app, Playwright, `rls_test.sql`, type generation, migrations —
runs against the project in `.env`. The `db:*` scripts in `package.json` are
the entry points.

`migrations/` is the only source of schema truth. Never change schema in the
dashboard — that is what makes a later self-host a copy rather than a rewrite.

## Migration history is now tracked — edit-in-place is over

Until 11 September 2026 the schema had been applied to the dev project by
direct `psql`, so `supabase_migrations.schema_migrations` did not exist and
CLAUDE.md's rule applied: **fix migrations in place, no corrective
migrations.** Tiers 0–6 relied on that.

That door is now closed. History records all nine migrations *with their
statements*, so editing a migration file makes the file and the recorded
history disagree — silently, until someone stands up a fresh project and gets
a different schema.

**From now on: a schema change is a NEW migration.** Never an edit to an
existing one.

## Applying migrations to the dev project

`supabase link` fails on this project: the access token in `.env` lacks
Management API privileges for the project ref. Not a blocker — every
migration command takes `--db-url` instead, which needs no link:

```bash
pnpm db:list        # migration history: files vs database
pnpm db:push:dry    # what would apply
pnpm db:push        # apply
pnpm db:types       # regenerate src/lib/db.types.ts — commit it
pnpm db:rls         # the 24 policy assertions
```

`db:types` is the exception: it goes through the Management API with
`--project-id`, because `gen types --db-url` still shells out to Docker to run
pg_meta and there is no Docker here. It writes to `db.types.ts.new` and moves
it on success — a shell `>` truncates its target *before* the command runs, so
a failed generation would otherwise destroy the committed types.

The rest build their connection URL with `scripts/db-url.mjs`, which reads
`SUPABASE_DB_*` from `.env` and percent-encodes the password (the CLI takes a
URL, not a keyword conninfo string). `SUPABASE_DB_HOST` is the **session-mode**
pooler on 5432: `db.<ref>.supabase.co` is IPv6-only on this project, and
transaction mode (6543) cannot hold the transaction-local
`request.jwt.claims` that `tests/rls_test.sql` sets.

## How the history came to be recorded

The schema was already on the database, so replaying the migrations would have
failed on objects that exist. The history was recorded without re-running
anything:

```bash
pnpm supabase migration repair --status applied \
  --db-url "$(node scripts/db-url.mjs)" \
  20260909090001 20260909090002 20260909090003 20260909090004 20260909090005 \
  20260909090006 20260909090007 20260909090008 20260909090009
```

After which `db push` reports `Remote database is up to date`.

**Recorded as unproven:** that the nine migrations replay from empty. They have
only ever been applied by hand, in order, to a database that then kept running.
Demonstrating it would need a throwaway database, and this project deliberately
has exactly one — the cloud dev project the demo runs against. So it stays
unproven, on purpose, and the mitigation is that history now stores every
migration's statements: the files and the database cannot drift silently.

## tests/

```bash
pnpm db:rls
```

24 assertions over the policies. RLS is the security boundary, so this is the
highest-value test here; it also runs in CI, gated on the `SUPABASE_DB_*`
secrets.

## seed.sql

Demo data, every figure invented. It refuses to run against a database whose
`project.code` does not end in `-DEMO`. The figures CLAUDE.md asserts —
12,000 / 6,400 / 5,600 kg, 62.2%, 10.800 kW, 489.200 kW — are specification,
asserted by both `rls_test.sql` and the Playwright suite, so the seed is not
edited casually.
