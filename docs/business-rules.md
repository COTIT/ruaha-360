# Ruaha 360 — business rules and data access

Status: **specification, nothing built.** Migrations have never been applied.
Companions: `schema.md`, `screens-and-components.md`, `supabase/migrations/`.
Authority: Ruaha 360 Overview Plan v2.

This document says **how each function behaves**. Where a rule is enforced by
the database, that is stated — the client must not duplicate it, and must not
work around it.

---

## 0 · Rules of engagement

1. **The database is the authority on truth.** Status transitions, provenance,
   estimates, double-commit limits and access are enforced by triggers and RLS.
   The client's job is to offer only legal actions and to display errors
   honestly.
2. **Never compute in the client what the database computes.** Listed in §11.
3. **Never pre-validate a rule the database enforces** in order to show a
   friendlier message. Call it, catch the error, show it. The pre-check will
   drift from the trigger within a fortnight.
4. **Zero rows is an answer.** RLS returning nothing means "you may not see
   this". Render an empty state. Do not retry, do not error, do not escalate.
5. **Every observed-table insert carries provenance.** There is one helper for
   this and it is not optional (§4).

---

## 1 · Registration — `app_register_farmer(payload jsonb)`

Migration `..._rpc.sql`. `SECURITY INVOKER`, so RLS applies inside: an officer
can only register into a village they are assigned to.

### Why an RPC and not five inserts

The officer is on a phone with intermittent signal. Five chained client
inserts that fail on the third leave a person and household with no farm, and
no way for the officer to know. One transaction either fully succeeds or
changes nothing.

### Payload

```jsonc
{
  "client_ref": "uuid",          // REQUIRED. Generated once per form session.
  "village_id": "uuid",
  "person":    { "given_name": "", "family_name": "", "phone": "", "confidence": "high" },
  "household": { "label": "", "is_head": true },          // or { "existing_household_id": "uuid" }
  "farm":      { "label": "", "latitude": null, "longitude": null },  // or { "existing_farm_id": "uuid" }
  "plot":      { "label": "", "area_ha": "1.8" },
  "cycle":     { "crop_id": "uuid", "season_label": "", "area_ha": "1.6",
                 "tree_count": null, "unit_count": null,
                 "planted_on": "2026-03-05", "harvest_start": "2026-09-01",
                 "harvest_end": "2026-09-30", "status": "growing" },
  "harvest":   { "quantity_kg": "4100", "confidence": "medium", "reported_for": "2026-09-15" }
}
```

`cycle` and `harvest` are optional. `person`, `plot` and a farm are not.

### Returns

```json
{ "person_id":"…", "household_id":"…", "farm_id":"…", "plot_id":"…",
  "crop_cycle_id":"…", "harvest_report_id":"…", "replayed": false }
```

### Idempotency — `client_ref`

**The client generates one UUID when the form is opened** and sends the same
value on every retry. A replay returns the original result with
`"replayed": true` and creates nothing. Without this, a request that times out
after the transaction committed produces a duplicate farmer on retry — the
single most likely data-integrity failure in field conditions.

Store `client_ref` in the IndexedDB draft alongside the form values. Do not
regenerate it on retry. Do not regenerate it on page reload.

### Provenance it sets

| record | source |
|---|---|
| person, household, farm, plot, crop_cycle | `field_verified` |
| harvest_report (expected) | `farmer_reported` |

`captured_by = auth.uid()`, `captured_at = now()`, `verification = 'unverified'`
on everything. **Registration never verifies.** Verification is a separate,
deliberate act (§5).

The expected harvest is `farmer_reported` even though an officer typed it,
because the *farmer* is the source of the number. This distinction is the
whole point of S13 and the UI must reflect it.

### Validation performed in the RPC

- `client_ref` present, else refuse
- caller is staff, else refuse
- crop measure matches `crop.measured_by` — an `area` crop requires `area_ha`,
  a `tree_count` crop requires `tree_count`, a `unit_count` crop requires
  `unit_count`. **The client must branch the same way** (`MeasureInput`), but
  the RPC is the enforcement.

### Client contract

- One submit button. Disabled while in flight.
- On network failure: keep the draft, show **not yet submitted**, offer retry
  with the same `client_ref`.
- On success: clear the draft, navigate to `/officer/people/$personId`.
- Never show a success state for a write that only reached IndexedDB.

---

## 2 · PUE request status machine

Enforced by `pue_request_guard` (migration `..._pue.sql`).

### Legal transitions

```
draft         → submitted | withdrawn
submitted     → under_review | withdrawn
under_review  → approved | rejected
```

Everything else raises. `approved`, `rejected` and `withdrawn` are terminal.

### Who may do what

| state | farmer (own) | field officer | ops / admin |
|---|---|---|---|
| draft | edit, submit, withdraw | edit, submit (assisting) | edit, submit |
| submitted | withdraw only | withdraw only | start review, withdraw |
| under_review | nothing | nothing | approve, reject |
| approved / rejected / withdrawn | nothing | nothing | nothing |

Moving to `under_review`, `approved` or `rejected` requires `ops` or `admin`.
The trigger raises `only ops or admin may review a request` otherwise.

### Server-stamped fields

`submitted_at`, `decided_at` and `decided_by` are set by the trigger. **The
client must never send them.** If it does, the trigger overwrites them.

### Content freeze

Once a request leaves `draft`, a non-reviewer changing `equipment_id`,
`quantity`, `hours_per_day`, `days_per_week` or `purpose` raises
`a submitted request cannot be edited`. The farmer UI must not render those
inputs as editable after submission.

### Insert rule

A request may only be **created** as `draft` or `submitted`. Creating one
directly as `approved` raises. This also applies to seeds and fixtures.

---

## 3 · Energy estimate

Enforced by `pue_recompute_estimate` (migration `..._energy.sql`).

### The rule

`energy_estimate` has **no client write policy**. The trigger is the only
writer. Any attempt to insert or update it fails.

The trigger fires on insert, and on update of `equipment_id`, `quantity`,
`hours_per_day`, `days_per_week`, `village_id` or `confidence`.

### The arithmetic

```
est_power_kw     = rated_power_kw × quantity
est_kwh_per_day  = rated_power_kw × quantity × hours_per_day
est_kwh_per_week = rated_power_kw × quantity × hours_per_day × days_per_week
```

These are `GENERATED ALWAYS … STORED` columns, so the stored result can never
disagree with the stored inputs.

### Snapshotting

The trigger copies `rated_power_kw` from the catalogue **at compute time**. If
ops later changes the catalogue, existing estimates keep the figure they were
computed from. This is deliberate: an estimate must stay explainable after the
inputs beneath it move.

Fallbacks: `hours_per_day` and `days_per_week` fall back to the catalogue's
`typical_*`, then to `0`. An equipment row with a null `rated_power_kw` causes
the estimate to be **deleted**, not zeroed.

### Client contract

- `EnergyEstimatePanel` may recompute locally **for preview only**, using the
  same three formulas, before submit.
- After any write, the displayed figure comes from the `energy_estimate` row.
  Never from a local calculation.
- If a local preview and the stored row ever differ, the component is wrong.

---

## 4 · Provenance

### The helper — write it on day one

```ts
withProvenance(payload, source: SourceType)
// injects: source, captured_at = now(), captured_by = session.app_user.id
```

Every insert into `person`, `household`, `farm`, `plot`, `crop_cycle`,
`harvest_report`, `pue_request` goes through it. Retrofitting provenance into
thirty call sites later is a bad week.

Config tables — `country`, `project`, `village`, `crop`, `equipment_category`,
`equipment`, `buyer`, `village_capacity` — have **no** provenance columns.
Do not try to set them.

### Which source, where

| written by | source |
|---|---|
| officer registering or editing a record | `field_verified` |
| a number the farmer supplied, typed by anyone | `farmer_reported` |
| a farmer editing their own profile | `farmer_reported` |
| a PUE request | `farmer_reported` (schema default) |
| an energy estimate | `model_estimated` (trigger sets it) |
| meter data | `sensor_derived` — **not in MVP, nothing writes this** |
| a recorded transaction | `transaction_derived` — **not in MVP** |

`buyer_demand` deliberately has **no** `source` column. The five categories
classify how a fact about the *productive economy* was learned. A buyer's
stated requirement is a counterparty input; it carries `captured_by` and
`verification` instead.

---

## 5 · Verification — `app_verify(table, id)`

One entry point, so `verification` can never be set without a verifier.

- Allowed tables: `person`, `household`, `farm`, `plot`, `crop_cycle`,
  `harvest_report`. Anything else raises.
- Caller must be staff.
- Sets `verification = 'verified'`, `verified_by = auth.uid()`,
  `verified_at = now()`.

### Rules

- **Nobody verifies their own farmer-reported figure by accident.** The UI
  shows verification as a distinct, deliberate action with the verifier's name
  attached, never a checkbox inside an edit form.
- Registration never verifies (§1).
- `disputed` and `pending` exist in the enum but MVP only moves
  `unverified → verified`. Do not build a dispute flow.
- After verifying, invalidate the record's query key **and** the farmer-facing
  key — a farmer's My Farm badge must change without a manual refresh.

---

## 6 · Harvest reports — `app_supersede_harvest(...)`

A harvest figure is a **series**, not a value. Expected estimates get revised
through a season; the old numbers stay auditable.

### The invariant

`harvest_one_current` — a partial unique index — permits exactly one row per
`(crop_cycle_id, kind)` where `is_current and deleted_at is null`. This is the
double-counting guard that research item I asks for, enforced by the database.

### The procedure

`app_supersede_harvest(cycle, kind, quantity_kg, source, confidence, reported_for)`
retires the current row and inserts the replacement in one transaction, so the
index never sees two current rows.

**Never** write `harvest_report` directly from the client for a revision. A
naive insert violates the index; a naive update loses the history.

### Expected vs actual

- `expected` — usually `farmer_reported`, low or medium confidence
- `actual` — usually `field_verified` after harvest
- They are independent series. A cycle may have one current row of each.
- Aggregation reads only `is_current` rows. `v_harvest_available` filters to
  `kind = 'expected'`.

---

## 7 · Aggregation

All of it lives in views (migration `..._views.sql`). The client does not
aggregate.

### Current-row selection
Only `is_current and deleted_at is null` harvest reports participate. A
superseded estimate never reaches a total.

### Committed supply
`v_harvest_available.available_kg = quantity_kg − committed_kg`, where
`committed_kg` sums `opportunity_supply` rows on opportunities with status
`proposed`, `shared` or `accepted`. Declined and lapsed opportunities release
their supply.

### Simultaneity
Village peak is **not** the sum of rated power. `v_village_energy` multiplies
by `village_capacity.simultaneity_factor` and exposes both the raw sum and the
corrected peak. The UI shows the factor next to the peak it was applied to.

### Prospective vs approved
Never summed into one "demand" figure.

- prospective = requests in `submitted` or `under_review` — an **application**
- approved = requests in `approved` — still **not measured consumption**
- capacity = `capacity_kw` with its `basis`, which is `planned` or `nameplate`
  and never `measured`

### Area
`v_village_production.cycle_area_ha` is the sum of **cycle** areas. Intercropping
means several cycles share one plot, so this can exceed the village's land.
Label it "planted area across cycles". Never "land area", never "hectares
farmed".

---

## 8 · Opportunities

### What an opportunity is not
Not a sale, not a delivery, not a payment, not a contract. `accepted` means
both sides agreed to keep talking. The UI states this on every opportunity
screen.

### Attaching supply
`opportunity_supply` rows link an opportunity to specific `harvest_report`
rows. This foreign key **is** the product's traceability claim — "every
headline traces back to records" is enforced structurally, not reported.

### The double-commit guard
`opportunity_supply_guard` raises if the same harvest report is committed
beyond its available quantity across live opportunities:

```
over-commitment: 4100.00 kg available, 4100.00 kg already committed, 100.00 kg requested
```

Show that message to the user as written. Do not pre-check in the client.

### Headline consistency
`opportunity.offered_quantity_kg` is re-summed by `opportunity_resum` on every
supply change. The client never sets it. The tile and the drill-down cannot
drift apart.

---

## 9 · Error contract

Postgres error messages in this schema are written to be read by humans.
Surface them verbatim in a toast or inline alert.

| raised by | message | UI |
|---|---|---|
| `pue_request_guard` | `illegal transition x -> y` | bug — the UI offered an illegal action. Log it. |
| `pue_request_guard` | `only ops or admin may review a request` | bug — control should not have been rendered |
| `pue_request_guard` | `a submitted request cannot be edited` | show inline on the form |
| `opportunity_supply_guard` | `over-commitment: …` | show verbatim; it names the numbers |
| `app_register_farmer` | `this crop is measured by area: area_ha is required` | show on the field |
| `app_register_farmer` | `client_ref is required …` | bug — fix the client |
| RLS | *no error, zero rows* | empty state |
| unique violation `harvest_one_current` | constraint error | you wrote a harvest row directly — use `app_supersede_harvest` |

Three of these mean the client rendered a control it should not have. Treat
them as bugs to fix, not conditions to handle politely.

---

## 10 · Data access conventions

### Query keys

```
['session']
['villages']
['person', personId]            ['people', villageId, filters]
['farm', farmId]                ['farms', villageId]
['cycle', cycleId]              ['harvest', cycleId]
['equipment', projectId]        ['equipmentItem', equipmentId]
['requests', { villageId, status }]   ['request', requestId]
['estimate', requestId]
['demand', demandId]            ['demands', projectId]
['opportunity', opportunityId]
['tower', 'production', villageId]
['tower', 'energy', villageId]
['tower', 'market', villageId]
['tower', 'quality', villageId]
```

### Invalidation map

| after | invalidate |
|---|---|
| `app_register_farmer` | `['people', village]` `['farms', village]` `['tower', *, village]` |
| `app_verify` | the record key, plus `['tower','quality',village]` and the farmer-facing key |
| request insert / update | `['requests', …]` `['request', id]` `['estimate', id]` `['tower','energy',village]` |
| approve / reject | as above, plus the farmer's `['request', id]` |
| `app_supersede_harvest` | `['harvest', cycle]` `['tower','production',village]` `['tower','market',village]` |
| `opportunity_supply` change | `['opportunity', id]` `['demand', demandId]` `['tower','market',village]` |

### Reads
Views for anything aggregate. Tables for record detail. Nested `select()` for
graph reads — one round trip, RLS applies all the way down:

```ts
supabase.from('farm').select(`
  id, label, verification,
  plot ( id, label, area_ha,
         crop_cycle ( id, crop_id, harvest_start, harvest_end,
                      harvest_report ( quantity_kg, kind, is_current, source ) ) )
`)
```

---

## 11 · Never compute in the client

- energy estimates that will be stored (preview only, §3)
- village aggregates of any kind
- available vs committed supply
- coverage percentages
- whether a status transition is permitted *as a substitute* for calling it
- who may see a row

The client may compute: display-unit conversion (ha ↔ acre), formatting,
sorting a page of already-fetched rows, and the live estimate preview.

---

## 12 · Drafts and interrupted saves

- Every multi-field form persists to IndexedDB on change, keyed by form name
  plus `client_ref`.
- Restore on mount. Clear only after a confirmed server write.
- A draft renders an `UnsavedDraftBadge`. **An unsaved write must look
  unsaved.** No success toast for something that only reached local storage.
- Retry is explicit and user-initiated. No background queue, no replay engine,
  no conflict resolution. That is offline sync, and Plan v2 defers it until
  field testing proves it necessary.

---

## 13 · Session and access

- `useSession()` resolves: auth user → `app_user` → memberships
  (`revoked_at is null`).
- Active membership determines the landing route and the nav. Held in memory
  and the URL, never in the token.
- **Route guards are UX.** A farmer who hand-types `/ops/requests` gets the
  page shell and zero rows. That is correct behaviour, not a hole.
- A revoked membership takes effect on the next query. No session
  invalidation is required, because RLS re-evaluates every statement.

---

## 14 · Units, formats, time

| | rule |
|---|---|
| area | stored in hectares (`hectares` domain). Display per `country.default_area_unit`. Convert at the edge only |
| weight | kg, 2 dp |
| power | kW, 3 dp |
| energy | kWh, 3 dp |
| money | `numeric(14,2)` + explicit currency code. Default TZS. Always labelled **indicative** |
| percentages | 1 dp |
| timestamps | `timestamptz`, stored UTC, displayed `Africa/Dar_es_Salaam` |
| harvest windows, planting dates | plain `date`. No timezone. Never converted |
| alignment | `tabular-nums` wherever figures stack |

---

## 15 · Open

- Confidence is `low/medium/high` provisionally (S22)
- Season taxonomy — `season_label` is free text (S22)
- Grades and quality — `quality_note` is free text (S12 later)
- Finance terms, deposit, rate, schedule — **absent by design**; research item
  C (BoT Tier 2 classification) is unresolved and nothing here models lending
- Meter ingestion — no tables, no `sensor_derived` writer. Provider unselected
  (S22)
