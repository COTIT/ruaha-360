# Ruaha 360 — QA findings

**Swept:** 11 September 2026, against the cloud dev project (`hdpvsdlbtmqtldohixrq`)
with the demo seed, driving the app in a browser as all four roles —
farmer (Neema), field officer (Ilundo), ops, admin.

**Method:** every route in `src/routes/` visited by hand, plus malformed route
params, unknown paths, form edge values, a mobile viewport, and the browser
console and network log. Nothing fixed — this is the list only.

**Not in scope of this sweep:** anything the automated suites already assert.
103 Playwright tests, 269 unit tests and `rls_test.sql` 24/24 were green
before and after. Every finding below is something those suites do **not**
cover, which is the point.

---

## Summary

| # | severity | area | finding |
|---|---|---|---|
| 1 | **blocker** | routing | 11 routes are still "Session 1 placeholder", including 2 of the officer's 3 tabs and both surface landing pages |
| 2 | **blocker** | i18n | Swahili is 2 keys against English's 365 — the farmer and officer surfaces render in English |
| 3 | **high** | all `$id` routes | a malformed id shows a raw Postgres error to the user |
| 4 | **high** | farmer | a rejected request shows a raw check-constraint name to the farmer |
| 5 | **high** | farmer | a draft request is a dead end — no submit, no edit, no delete |
| 6 | **high** | ops/admin | drilling into an officer screen loses the ops sidebar and offers the officer's tabs |
| 7 | **high** | tower | the energy drill-down lists rows that do not add up to the headline |
| 8 | **medium** | ops | the ops surface is unusable below ~800px — the sidebar never collapses |
| 9 | **medium** | farmer | no sanity limits on the request form: 99 hours a day is accepted and estimated |
| 10 | **medium** | auth | `/select-role` is reachable with one role and claims you hold several |
| 11 | **medium** | forms | Enter does not submit any form except Register |
| 12 | **medium** | ops | the opportunity screen cannot detach supply or move status |
| 13 | low | auth | signing out leaves an in-flight token refresh that 400s in the console |
| 14 | low | tooling | Vite logs HMR 404s for route files that do not exist |
| 15 | — | testing | the e2e suite never visits a landing or tab route, which is why #1 went unseen |

---

## 1 · Eleven placeholder routes — blocker

`src/app/Placeholder.tsx` still renders "Session 1 placeholder — built in
tier N" on:

| route | who lands there | file |
|---|---|---|
| `/officer` | **every officer, on sign-in** | `_officer/officer.index.tsx` |
| `/officer/people` | officer — **"People" tab** | `_officer/officer.people.index.tsx` |
| `/officer/verify` | officer — **"Verify" tab** | `_officer/officer.verify.tsx` |
| `/officer/cycles/$cycleId` | Tower production drill target | `_officer/officer.cycles.$cycleId.tsx` |
| `/officer/farms/$farmId` | Tower / person-detail drill target | `_officer/officer.farms.$farmId.tsx` |
| `/ops` | **every ops and admin user, on sign-in** | `_ops/ops.index.tsx` |
| `/ops/buyers` | ops — sidebar | `_ops/ops.buyers.tsx` |
| `/ops/catalogue` | ops — sidebar | `_ops/ops.catalogue.tsx` |
| `/ops/villages` | ops — sidebar | `_ops/ops.villages.tsx` |
| `/farm` | **every farmer, on sign-in** | `_farmer/farm.index.tsx` |
| `/farm/opportunities` | farmer — tab | `_farmer/farm.opportunities.tsx` |

Consequences worth stating plainly:

- **All three roles land on a placeholder when they sign in.** A stakeholder's
  first screen is the words "Session 1 placeholder".
- The officer's bottom bar is Register / People / Verify. **Two of the three
  are placeholders**, so the only working officer screen is Register — and the
  person detail you can only reach by submitting the form or by a Tower drill.
- `/officer/cycles/$cycleId` and `/officer/farms/$farmId` are drill targets
  from the Tower and from person detail, so **those traces dead-end** — which
  contradicts spec 8.2 ("from any Tower headline, reach a single farmer's
  record").

These are T2 screens in `docs/screens-and-components.md`, not tier-7 work.
They were skipped while the tiers advanced through the deep screens.

## 2 · Swahili is effectively absent — blocker

```
src/i18n/en/common.json   365 keys
src/i18n/sw/common.json     2 keys   (the language switch's own labels)
```

So with `locale = 'sw'` — which is what seeded Neema and the seeded Ilundo
officer have — every UI string falls back to English. Observed: the login
form, "My farm", "Harvest window", "Register a farmer", "First name", the
status pills ("Draft", "Approved"), and the error copy all render in English
while the switch reads "Kiswahili".

Only database-translated reference data is genuinely Swahili — `name_sw` on
crop and equipment — which does work: "Mahindi", "Ndizi", "Mashine ya kusaga
mahindi 500 kg/saa".

CLAUDE.md: "Farmer and Officer surfaces ship complete Swahili" and "Swahili
strings do not exist yet and need a native reviewer". So this is a known gap
rather than a regression — but it is 363 strings, it is on the two surfaces a
Tanzanian stakeholder will look at, and machine translation is explicitly
ruled out. It needs a person.

## 3 · A malformed id shows a raw Postgres error — high

**Repro:** sign in as anyone, visit `/officer/people/not-a-uuid`.

**Shows:**

```
Something went wrong
invalid input syntax for type uuid: "not-a-uuid"
Try again
```

Database internals reaching the user. Affects every `$id` route:
`/officer/people/$personId`, `/farm/requests/$requestId`,
`/farm/equipment/$equipmentId`, `/ops/demand/$demandId`,
`/ops/requests/$requestId`, `/ops/opportunities/$opportunityId`.

Note the contrast, which shows the fix is already understood elsewhere: a
malformed **search param** degrades cleanly — `/ops/tower?village=not-a-uuid`
renders the Tower with a "Choose a village" prompt and no error. Route
**params** are not validated the same way.

A well-formed id that matches nothing is handled correctly — RLS returns zero
rows and the screen says "Request not found · It may not exist, or you may not
have access to it." That is the behaviour a bad id should reach too.

## 4 · A raw check-constraint name reaches the farmer — high

**Repro:** as Neema, `/farm/equipment/51000000-0000-4000-8000-000000000001`,
set hours per day to `99`, fill a purpose, submit.

**Shows:**

```
Something went wrong
new row for relation "pue_request" violates check constraint
"pue_request_hours_per_day_check"
Try again
```

CLAUDE.md's rule is "call it, catch the error, show the message" — deliberately
no client-side copy of a database rule. That rule is right, but "show the
message" cannot mean showing `pue_request_hours_per_day_check` to a farmer in
a language she does not read. The constraint messages need a human mapping at
the point of display.

Same shape reachable with quantity `0` (`quantity > 0`) and days per week `8`
(`between 0 and 7`).

## 5 · A draft request is a dead end — high

**Repro:** as Neema, `/farm/requests`, open the seeded "Chumba cha baridi 5 kW"
draft.

The detail renders the assumptions and the stored estimate, and offers **no
control at all** — no submit, no edit, no withdraw, no delete. The status
machine in `pue_request_guard` allows `draft → submitted`, so the transition
exists in the database and is unreachable in the UI.

Related: the equipment form creates requests directly as `submitted`, so the
app cannot produce a draft either. The only drafts in the system are the
seeded one, and it is inert.

## 6 · Ops and admin lose their nav on officer screens — high

**Repro:** sign in as `admin@demo.ruaha360.test` (or ops), then visit
`/officer/people/60000000-0000-4000-8000-000000000001` — which is exactly where
the Tower's production and market drills land.

The ops **sidebar disappears** and is replaced by the officer's bottom tab bar:
Register / People / Verify. Two of those are placeholders (#1). So an ops user
who drills from a Tower headline to a farmer's record has no way back to
Requests, Demand or the Tower except the browser's back button or the wordmark.

Spec 4.1 does split nav by surface, so the layout is behaving as written — but
the officer surface being reachable by ops (required for the Tower's
traceability claim, and correct) makes that split a trap.

## 7 · The energy drill-down does not reconcile with its headline — high

**Repro:** `/ops/tower/energy?village=30000000-0000-4000-8000-000000000001`.

Lists five requests under "Requests behind the energy figures":

| applicant | equipment | status | est. peak |
|---|---|---|---|
| Neema Mwakalinga | Cold room 5 kW | **Draft** | 5.000 kW |
| Baraka Mgeni | Grain dryer 1000 kg/batch | Under review | 12.000 kW |
| Neema Mwakalinga | Maize mill 500 kg/hr | Approved | 15.000 kW |
| Joseph Kimaro | Solar water pump 2 HP | Approved | 3.000 kW |
| Amina Sanga | Oil press 200 kg/day | **Rejected** | 7.500 kW |

The headline figures are prospective **7.200 kW** (submitted + under_review,
× 0.600) and approved **10.800 kW**. Draft and rejected requests contribute to
neither, yet they are listed as the rows "behind" those numbers, and nothing on
the screen says which rows feed which figure or that simultaneity has been
applied. A reader adding the column gets 42.5 kW and can reconcile it with
nothing.

Spec 8.2: "If a number cannot be traced, it does not belong on the screen."
The inverse holds too — a trace that does not add up is worse than no trace.

## 8 · The ops surface breaks below ~800px — medium

**Repro:** 375 × 812 viewport, `/ops/tower?village=…` or `/ops/requests`.

The sidebar keeps its full width and never collapses, so the content column is
squeezed and clipped at the right edge: on the Tower, "12,000" and "1,150" are
cut mid-figure; on the request pipeline, the "Village" column and the title are
cut. The table's own `overflow-x: auto` wrapper works, so the page does not
scroll sideways — it just hides data.

The farmer surface is fine (bottom tabs, single column, mobile-first as
specified). `docs/screens-and-components.md` allows ops to be desktop-first,
so this is a judgement call — but "figures silently truncated" is not the same
as "desktop-first".

## 9 · No sanity limits on the request form — medium

**Repro:** as Neema on the mill detail screen.

| input | what the estimate panel shows | what the database does |
|---|---|---|
| hours per day `99` | Estimated per day **1,485.000 kWh**, per week 7,425.000 kWh | rejects on submit (#4) |
| hours per day `0` | 0.000 kWh/day, submit still enabled | accepts — `between 0 and 24` |
| quantity `0` | Estimated peak **0.000 kW**, submit still enabled | rejects on submit |

No inline message on any of them. The farmer is shown a computed, confident,
impossible figure and only learns it is impossible after submitting.

This is the boundary of "do not pre-validate rules the database enforces". The
rule protects against *duplicating business logic*; it does not require
rendering 99 hours in a day as though it were a real answer. An input bound to
its own column's range, and a submit disabled while the form is arithmetically
meaningless, would not be a copy of a trigger.

## 10 · `/select-role` misfires for single-role users — medium

**Repro:** as the Ilundo officer (who holds exactly one membership), visit
`/select-role`.

**Shows:** "Choose a role — You hold more than one role. Pick the one you want
to work in." followed by a single option.

The copy asserts something untrue, and the screen should not be reachable when
`activeMemberships` has one entry — `resolveLanding` already sends single-role
users straight to their home, so nothing routes here; only a direct URL does.

## 11 · Enter does not submit any form except Register — medium

Only `RegisterScreen.tsx` has a real `<form onSubmit>` with
`<button type="submit">`. Every other action is a bare
`<button type="button">` with an `onClick`:

```
src/features/farmer/EquipmentDetailScreen.tsx   Submit request
src/features/ops/DemandListScreen.tsx           Create demand
src/features/ops/DemandDetailScreen.tsx         Create opportunity
src/features/ops/OpportunityDetailScreen.tsx    Attach supply
src/features/ops/OpsRequestReviewScreen.tsx     Start review / approve / reject
src/features/officer/VerifyButton.tsx           Verify
```

So keyboard users must tab to the button; pressing Enter in a text field does
nothing. On the farmer's request form and the ops demand form — both of which
are field-then-submit — that is a real friction, and it is an accessibility
gap rather than a style preference.

## 12 · The opportunity screen cannot detach supply or move status — medium

**Repro:** `/ops/opportunities/e2000000-0000-4000-8000-000000000001`.

- Two supply lines are listed with **no way to remove one**. Attaching the
  wrong harvest is unrecoverable in the UI.
- Status is "Proposed" with **no control to move it** to shared or accepted,
  though `opportunity_status` carries those values and the screen's own copy
  explains what "accepted" means.
- The header reads "Quantity 9,000.00 kg" then "Offered 6,400.00 kg". The
  9,000 is the *buyer's demand*, not this opportunity's quantity — the label
  is ambiguous on a screen whose whole job is keeping demand and supply
  distinct.
- Dropdown option labels read "4,100.00 kg · 0.00 kg Available · 1 Sep 2026" —
  capital "Available" mid-phrase, and the first figure is unlabelled.

## 13 · Sign-out leaves a failing token refresh — low

24 × `400` appeared in the console across the sweep, all clustered around
sign-out and role switching: an in-flight refresh fires against an already
invalidated token.

Confirmed **not** a page-level problem — instrumenting `fetch` and
`performance.getEntriesByType('resource')` on a clean Tower load gives 15
Supabase requests and **zero** failures. Cosmetic, but it makes the console
noisy enough to hide a real error during a demo.

## 14 · Vite HMR 404s for non-existent route files — low

```
[vite] Failed to reload /src/routes/_farmer/farm.equipment.tsx
[vite] Failed to reload /src/routes/_ops/ops.requests.tsx
[vite] Failed to reload /src/routes/_officer/officer.people.tsx
```

Those files genuinely do not exist — the paths are segments the TanStack Router
plugin generates into the route tree without a physical file. Dev-only noise;
no effect on the built bundle or on any screen.

## 15 · Why the automated suite missed most of this — testing gap

The Playwright specs navigate straight to deep routes — `/officer/people/<id>`,
`/ops/requests`, `/farm/my-farm` — because that is where the behaviour under
test lives. **No spec ever visits a landing or tab route**, so eleven
placeholder screens sat behind a fully green suite, including the three
screens every role sees first.

Worth adding whatever else is decided: one spec that signs in as each role and
asserts its landing page and every nav destination renders something real.
That single test would have caught #1 and #6 on the day they appeared.

---

## Verified working

Recorded so the list above is not read as the whole picture. All of this was
driven live against the cloud dev project:

- **Control Tower**, both villages: production 12,000.00 kg, available
  5,600.00 kg, coverage 62.2%, approved peak 10.800 kW, headroom 489.200 kW,
  quality 3/6 · 3/4 · 5/7 — every one of CLAUDE.md's asserted figures
- Production drill: all seven Ilundo cycles, each row ending in a farmer
- Request pipeline: six requests, all six statuses, sortable, filterable, URL-held
- Maize demand: Ilundo 62.2% / Mgama 30.0%, committed 6,400 kg shown separately
- Opportunity: offered 6,400.00 kg re-summed by the database from two lines
- Farmer my-farm: her farm only, Swahili crop names, provenance on every figure
- Farmer equipment: five items, every price marked indicative
- Officer person detail: full record graph, verify only on unverified rows
- Officer register: full form, all fields, draft badge
- Unknown path → "That page does not exist"; `/no-access` → correct copy
- Another farmer's request → "Request not found", not an error
- Language switch persists to `app_user.locale`
- Demo banner on every page, driven by `VITE_DATA_MODE`
- Role guards hold: farmer → `/ops/*` bounces to `/farm`; officer → `/farm/*`
  bounces to `/officer`
