# supabase/

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
set -a; . ./.env; set +a
DBURL=$(python3 -c "
import os,urllib.parse as u
print('postgresql://%s:%s@%s:%s/postgres' % (
  u.quote(os.environ['SUPABASE_DB_USER'], safe=''),
  u.quote(os.environ['SUPABASE_DB_PASSWORD'], safe=''),
  os.environ['SUPABASE_DB_HOST'],
  os.environ.get('SUPABASE_DB_PORT', '5432')))")

pnpm supabase migration list --db-url "$DBURL"      # local vs remote
pnpm supabase db push --db-url "$DBURL" --dry-run   # what would apply
pnpm supabase db push --db-url "$DBURL"
```

The password is percent-encoded because the CLI takes a URL, not a keyword
conninfo string. `SUPABASE_DB_HOST` is the **session-mode** pooler (port 5432):
`db.<ref>.supabase.co` is IPv6-only on this project, and transaction mode
(6543) cannot hold the transaction-local `request.jwt.claims` that
`tests/rls_test.sql` sets.

## How the history came to be recorded

The schema was already on the database, so replaying the migrations would have
failed on objects that exist. The history was recorded without re-running
anything:

```bash
pnpm supabase migration repair --status applied --db-url "$DBURL" \
  20260909090001 20260909090002 20260909090003 20260909090004 20260909090005 \
  20260909090006 20260909090007 20260909090008 20260909090009
```

After which `db push` reports `Remote database is up to date`.

**Still unproven:** that the nine migrations replay from empty. They have only
ever been applied by hand, in order, to a database that then kept running.
Proving it needs a scratch project or a local `supabase start`, and a
`db reset` there — not on the dev project, which is what the demo runs against.

## tests/

```bash
psql "$CONN" -v ON_ERROR_STOP=1 -f supabase/tests/rls_test.sql
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
