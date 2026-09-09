# Ruaha 360 — database schema

Status: **written, reviewed, not applied.** Nothing has touched Supabase.
Authority: Ruaha 360 Overview Plan v2. Target: MVP demo, 30 September 2026.

## Apply order

```bash
supabase start                 # local, Docker
supabase db reset              # runs migrations + seed.sql
psql "$LOCAL_DB_URL" -f supabase/tests/rls_test.sql
# only once assertions pass:
supabase db push               # cloud
```

Never edit schema in the dashboard. Migrations in the repo are the single
source of truth, and they are what makes a later self-host a copy rather
than a rewrite.

## Files

| file | contents |
|---|---|
| `..._foundations.sql` | enums, `hectares` domain, `audit_log`, `write_audit()`, `set_updated_at()`, the provenance convention |
| `..._geography.sql` | `country` `project` `village` |
| `..._identity.sql` | `person` `household` `household_member` `app_user` `membership`, all RLS helpers |
| `..._production.sql` | `crop` `farm` `farm_manager` `plot` `crop_cycle` `harvest_report` |
| `..._pue.sql` | `equipment_category` `equipment` `pue_request` + status guard |
| `..._energy.sql` | `village_capacity` `energy_estimate` + recompute trigger |
| `..._market.sql` | `buyer` `buyer_demand` `opportunity` `opportunity_supply` + commitment guard |
| `..._views.sql` | seven Control Tower views, all `security_invoker` |
| `seed.sql` | labelled demo data, two villages, six accounts |
| `tests/rls_test.sql` | 20+ assertions on the policies |

## Conventions

**Every table has a uuid primary key.** Including the join tables —
`household_member`, `farm_manager`, `opportunity_supply` — which carry an `id`
plus a `unique` constraint on the natural pair rather than a composite primary
key. `write_audit()` records `audit_log.record_id` as a uuid, so a
composite-keyed table cannot be audited at all; the surrogate key is what
makes audit coverage uniform instead of a per-table exception.

All three join tables are audited. `opportunity_supply` in particular is the
traceability claim the product makes — who committed whose harvest to which
buyer, and when — which is precisely the record research item I is about.

**Config vs observed.** Config tables (`country` `project` `village` `crop`
`equipment_category` `equipment` `buyer` `village_capacity`) carry no
provenance. Observed tables carry the full block:

```
source · captured_at · captured_by · verification · verified_by · verified_at
confidence · evidence_ref · created_at · updated_at · deleted_at
```

**One source per row.** Where two facts need different provenance, they are
different rows — which is why `harvest_report` is a series rather than two
columns on `crop_cycle`.

**`village_id` is denormalised** down `farm → plot → crop_cycle →
harvest_report`, held true by composite foreign keys. Every policy is one
indexed comparison; drift is structurally impossible.

**No DELETE policies anywhere.** Removal is `deleted_at`. Membership uses
`revoked_at`. Access ends; the audit trail does not.

**`(select app_villages())`, never `app_villages()`** inside a policy — the
subquery form is evaluated once per statement rather than once per row.

**Units.** Area is always stored in hectares (`hectares` domain). `area_unit`
is a display preference. Money is `numeric(14,2)` plus a currency code,
default TZS, and every price is indicative.

## Roles

Three product roles plus `admin` for operations.

| | farmer | field_officer | ops | admin |
|---|---|---|---|---|
| scope | own person + household + farms | assigned village(s) | whole project | whole project |
| person, farm, plot, cycle | read own | read + write in village | read + write | read + write |
| pue_request | create + edit own draft | create + assist in village | **review and decide** | review and decide |
| energy_estimate | read own | read in village | read | read |
| buyer, buyer_demand | none | none | read + write | read + write |
| opportunity | read if own supply is in it | read in village | read + write | read + write |
| Tower views | empty | village rows | project rows | project rows |
| membership | read own | read own | grant farmer + officer | grant any role |

## Where the security actually lives

RLS is row-level. Three things it cannot express are done with triggers:

- **`pue_request_guard`** — legal status transitions, reviewer-only review,
  server-stamped `decided_by`/`decided_at`, and content frozen once a request
  leaves draft. Without it, `pue_update_own` lets a farmer approve their own
  request.
- **`opportunity_supply_guard`** — the same harvested kilos cannot be promised
  to two live buyers (research item I).
- **`pue_recompute_estimate`** — clients hold no write policy on
  `energy_estimate` at all. The trigger is the only writer.

RLS helper functions are `SECURITY DEFINER` because they read `membership`;
`membership`'s own read policy is kept trivial (`user_id = auth.uid()`) so
nothing recurses.

## Distinctions the schema enforces

- planned capacity vs measured — `capacity_basis` has **no** `'measured'` value
- prospective vs approved demand — `v_village_energy` splits by request status
- peak vs sum — `simultaneity_factor` is applied, raw sums also exposed
- expected vs actual harvest — `harvest_kind`, one current row each
- opportunity vs sale — no delivery, payment or contract tables exist
- cycle area vs land area — the column is named `cycle_area_ha` because
  intercropping means cycle areas can exceed the village's hectares

## Open — carried from Plan v2 S22

- confidence scale (`low/medium/high` chosen provisionally)
- farmer identifiers; PII kept deliberately minimal until this closes
- season / harvest-window taxonomy (`season_label` is free text)
- grades, lots, collection points (`quality_note` is free text)
- meter provider — no meter tables exist, on purpose
- finance terms, deposit, rate, schedule — absent; research item C
  (BoT Tier 2 classification) is unresolved

## Not in this schema, deliberately

Wallets and QR payments · crowdfarming and investor ROI · full commodity
exchange · end-to-end logistics and export traceability · meter fleet
management · offline sync queues · pgvector and any AI surface.

Reference screens from Control Center and African Farmers Market show several
of these. A screen existing does not put it in scope.
