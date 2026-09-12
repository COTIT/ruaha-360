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

---
---

# Second sweep — edge cases and error cases

**Swept:** 11 September 2026, same session, same cloud dev project.

**Method:** hostile and boundary inputs through the real forms; failure
injected at the network layer by patching `window.fetch` in the page; the auth
token deleted from `localStorage`; a corrupt draft written directly into
IndexedDB; submit clicked three times in one tick; view queries delayed 4s to
hold the loading state open.

**Records created and removed:** two marked persons with their full record
graphs. `e2e/support/cleanup.sql` ran afterwards; seeded counts verified back
to 8 persons · 5 farms · 8 cycles · 9 harvest reports · 6 requests · 2 demands
· 1 opportunity · 2 supply lines, zero `E2E-` leftovers, and `rls_test.sql`
passing 24/24. Nothing seeded was verified or decided.

---

## Summary

| # | severity | area | finding |
|---|---|---|---|
| 16 | **high** | register | whitespace-only text passes every required check — a person can be registered with a blank name |
| 17 | **high** | register | the register form has no Zod schema at all, though the stack pairs it with react-hook-form |
| 18 | **high** | a11y | `<html lang="sw">` is hardcoded and never follows the language, so English pages are announced as Swahili |
| 19 | **medium** | register | the conditional measure field is not required, so the failure is a server round-trip |
| 20 | **medium** | errors | `numeric field overflow` reaches the user naming no field at all |
| 21 | **medium** | register | a backwards harvest window shows the raw `cycle_window_sane` constraint |
| 22 | **medium** | drafts | a corrupt or stale draft is restored into the form unvalidated |
| 23 | **medium** | forms | submit is never disabled in flight, so the "saving" state spec 5.2 names does not exist |
| 24 | **medium** | errors | a transient error banner survives navigation to another screen |
| 25 | **medium** | errors | raw JS exceptions (`TypeError: Failed to fetch`) are rendered as user copy |
| 26 | low | auth | `/login` renders the sign-in form while already signed in |
| 27 | low | register | high-precision decimals are silently rounded with no feedback |
| 28 | low | register | phone accepts anything, including `not-a-phone-!!!` |
| 29 | low | tower | drill links are clickable while the figures behind them are still loading |

## Held up under attack — recorded deliberately

These were probed and **passed**. Worth knowing which parts are solid.

| probe | result |
|---|---|
| **XSS** — `<img src=x onerror="window.__xss=1">` as a first name | escaped end to end. Stored, returned through PostgREST, rendered as literal text. Zero `<img>` elements in `main`, handler never fired, on both the register success screen and person detail |
| **SQL injection** — `'; drop table person; --` as a farm name | stored and displayed as a literal string. Parameterised throughout |
| **Double submit** — submit clicked 3× in one tick | exactly **one** person and **one** `registration_receipt` row. The `client_ref` idempotency in `app_register_farmer` does what it was built for |
| **Atomicity** — a registration that fails on the last table | nothing partially written. The backwards-window failure left no person, household or farm behind |
| **Expired session on reload** | correctly bounced to `/login?redirect=%2Fofficer%2Fregister`, preserving the destination |
| **Loading states** — view queries delayed 4s | each Tower tile shows its own "Loading…" independently; the page never blanks |
| **Offline read** | with every REST call failing, the register form still rendered with its crop list from the TanStack Query cache |
| **Unreadable record** — another farmer's request by id | "Request not found · It may not exist, or you may not have access to it." Not an error |

---

## 16 · Whitespace-only input passes every required check — high

**Repro:** `/officer/register`, put a single space in First name, Family name
and Farm name, fill nothing else, submit.

**Observed:** the only validation errors raised are for Plot name and Crop —
the two fields left genuinely empty. **First name, Family name and Farm name
are accepted as `"   "`.**

**Cause:** `src/features/officer/RegisterScreen.tsx` validates with
react-hook-form's `{ required: true }`:

```
register('given_name',  { required: true })
register('family_name', { required: true })
register('farm_label',  { required: true })
register('plot_label',  { required: true })
```

`required: true` rejects only an empty string. It does not trim.

**Consequence:** the database does not catch it either — `person.given_name`
and `family_name` are `not null`, and `'   '` is not null. So a farmer can be
registered with a blank name, which then appears as a blank row on person
detail, the officer's people list, the Tower production drill's farmer column,
and every opportunity supply line tracing back to them. There is no rename
screen, so it cannot be corrected in the app.

## 17 · The register form has no Zod schema — high

Related to #16 but worth separating, because it is the reason #16 and #19 both
exist. The locked stack is "react-hook-form + Zod ... forms", and
`@hookform/resolvers` is installed — but the only `z.object` in `src/` is in
`LoginScreen.tsx`:

```
$ grep -rln "z\.object" src/
src/app/LoginScreen.tsx
```

The most important form in the build (spec 5.2) validates with inline
`required` flags and one `if (!measure) throw` at submit time. A schema would
have caught the whitespace case, the missing measure field, the backwards date
window and the numeric ranges in one place, before any request.

## 18 · `<html lang>` is hardcoded to Swahili — high

```
$ grep -rn "lang=" index.html src/
index.html:2:<html lang="sw">
```

Nothing ever updates it. So:

- Ops and admin, whose surfaces are English by design, serve a document
  declared as Swahili. A screen reader applies Swahili pronunciation rules to
  English text — which is close to unusable.
- Switching language in the app changes the rendered strings and does **not**
  change `document.documentElement.lang`. Verified: switch set to `en`, `<h1>`
  reading "Register a farmer", `document.documentElement.lang` still `"sw"`.

## 19 · The conditional measure field is not required — medium

**Repro:** on `/officer/register`, choose Mahindi (maize), fill everything
except "Planted area (ha)", submit.

**Observed:** no inline error. The submit goes to the server and comes back
with the RPC's own message:

```
this crop is measured by area: area_ha is required
```

The measure field is rendered conditionally on `crop.measured_by`, and unlike
its five siblings it carries no `required`. So the one field whose presence
depends on another field's value is the one field with no client-side check —
costing a round-trip and showing server prose where an inline message belongs.

## 20 · `numeric field overflow` names no field — medium

**Repro:** expected harvest `999999999999`, everything else valid, submit.

**Shows:**

```
Something went wrong
numeric field overflow
Try again
```

Worse than the named-constraint errors in #4 and #21: there is no indication
of *which* input was too large. The form has three numeric fields (plot area,
planted area, expected harvest) and the officer must guess.

## 21 · A backwards harvest window shows a raw constraint name — medium

**Repro:** harvest window starts `2026-09-30`, ends `2026-09-01`, submit.

**Shows:**

```
Something went wrong
new row for relation "crop_cycle" violates check constraint "cycle_window_sane"
Try again
```

Same family as #4 (`pue_request_hours_per_day_check` on the farmer surface) and
as the `demand_window_sane` message the ops demand form already surfaces. Three
instances of one pattern: constraint identifiers used as user-facing copy.

Two dates sitting next to each other in the same form is the clearest possible
case for an inline check — it needs no knowledge of any database rule, only
that an end date follows a start date.

The transaction did roll back cleanly: no orphan person, household or farm.

Also derived from the schema, same family, not separately reproduced here:
`opportunity_supply.contributed_kg` is `check (contributed_kg > 0)`, so 0 or a
negative contribution on the attach-supply form will surface the same way.

## 22 · A corrupt or stale draft is restored unvalidated — medium

**Repro:** write an object of the wrong shape into IndexedDB
(`ruaha360` → `drafts`) under `register:<uuid>`, then open
`/officer/register?draft=<uuid>`.

**Observed:** the form restores it verbatim. First name renders as the literal
string `[object Object]`; Family name renders as `array` (from
`['array'].toString()`). The "Not yet submitted" badge appears and the form
would submit those values.

`useDraft` restores with `reset(draft.draft)` and no shape check. The realistic
route to this is not tampering — it is **a stale draft written by an older
deployment of the form**. Any field renamed or retyped in `RegisterForm` turns
every draft in the field into this, on phones that were mid-registration when
the app updated. Which is precisely the scenario the draft feature exists for.

## 23 · Submit is never disabled in flight — medium

Measured directly: `register-submit.disabled` is `false` immediately after the
first click and still `false` after three clicks in the same tick.

Spec 5.2 names six states for this screen, one of which is **saving**. There is
no saving state: no disabled control, no spinner, no text change. On a slow
rural connection the officer's only feedback is that nothing has happened yet.

The data is safe — the "held up" table above shows the `client_ref`
idempotency absorbed a triple submit into one person — so this is a feedback
defect, not a duplication one. The same pattern applies to every other action
button listed in #11.

## 24 · A transient error banner survives navigation — medium

**Repro:** with writes failing, change the language on `/officer/register`, then
click through to another screen.

**Observed:** the banner "Language changed for now, but could not be saved: …"
is still on screen after the route change, and stayed through two further
navigations. The message describes an event that is over, on a screen that has
nothing to do with it.

## 25 · Raw JS exceptions are rendered as user copy — medium

Same repro. Two places print the exception's `toString()`:

```
Language changed for now, but could not be saved: TypeError: Failed to fetch
```
```
Something went wrong
TypeError: Failed to fetch
```

The **behaviour** is right and worth keeping — the switch tells the truth
("changed for now, but could not be saved") rather than silently pretending it
saved. Only the message needs replacing: "TypeError: Failed to fetch" tells a
field officer nothing, and "check your connection" tells them everything.

## 26 · `/login` renders while already signed in — low

Visiting `/login` with a live session shows the sign-in form *and* the header's
"Sign out" button. A signed-in user should be sent to their own home, the way
`resolveLanding` already does elsewhere. Harmless, but it is a route with two
mutually exclusive states rendered at once.

## 27 · High-precision decimals are silently rounded — low

Plot area `1.23456789` was stored and is displayed as `1.2346 ha`, the
`hectares` domain being `numeric(_,4)`. Correct rounding, no feedback: the
operator typed one number and the record holds another, with nothing on screen
saying so.

## 28 · Phone accepts anything — low

`not-a-phone-!!!` was stored and rendered as the person's phone number.
`person.phone` is free-text `text` by design and the seed uses `+255…`, so
there is no rule to enforce — but there is also no hint, mask or placeholder,
and the field is how a field officer would later reach this farmer.

## 29 · Drill links are live while figures are still loading — low

With view queries held 4s, each Tower tile correctly shows its own "Loading…",
but the tile header's "See the records" link renders immediately and is
clickable. Clicking through before the headline resolves lands on a drill-down
whose own query has not started. Cosmetic ordering issue.

---
---

# Triage — work, then right, then fast

All 29 findings above, sorted by `docs/screens-and-components.md` §1:

> **Working order: make it work → make it right → make it fast.**
> T1 is "make it work". Validation depth, empty/error polish and
> accessibility are "make it right". Visual design is deliberately last.

The rule is the spec's, not mine, and it decides most of these on its own.
Where it forced a placement that reads oddly, that is called out rather than
quietly overridden — see "Where the rule and the risk disagree" at the end.

**The test applied to each finding:** does the thing not exist, or produce a
wrong number? → *work*. Does it exist and give the right answer, but handle
input, failure, or assistive technology badly? → *right*. Is it only slow?
→ *fast*.

---

## Phase 1 · Make it work — 7 items

Screens that do not exist, transitions that cannot be reached, and one figure
that does not reconcile. Nothing here is a polish item; all of it is absence.

| order | # | finding | effort | why it is "work" |
|---|---|---|---|---|
| 1 | 15 | one spec that signs in as each role and asserts its landing page and every nav destination renders | S | the gate. Without it, everything in this phase can regress into a green suite exactly as it did the first time |
| 2 | 1 | build the eleven placeholder screens | L | the screens do not exist. Every role's first screen is the words "Session 1 placeholder" |
| 3 | 7 | make the energy drill-down reconcile with its headline | M | the trace is **wrong**, not ugly. Spec 8.2 makes traceability the Tower's licence to show a number |
| 4 | 6 | give ops and admin a way back from officer screens | S | the route out does not exist, so the Tower→farmer journey cannot be completed and returned from |
| 5 | 5 | let a farmer submit or withdraw a draft request | S | `pue_request_guard` permits `draft → submitted`; no UI reaches it. The feature is absent, not rough |
| 6 | 12 | opportunity status transitions, and detaching a supply line | M | `opportunity_status` carries shared and accepted; nothing can set them. Attaching the wrong harvest is unrecoverable |
| 7 | 2 | complete Swahili for the farmer and officer surfaces | L | CLAUDE.md files this under product requirements, not copy: those two surfaces "ship complete Swahili". 363 strings absent |

**Dependency:** #1 before #6. There is no point routing ops back to an officer
tab that is itself a placeholder.

**#2 is not an engineering task.** It is blocked on a native Swahili reviewer,
and CLAUDE.md forbids shipping machine translation to Tanzanian stakeholders.
The engineering half is hours; the lead time on a person is not. **Start the
ask on day one of this phase**, in parallel with everything else, or it becomes
the thing that misses 30 September while the code sits finished.

---

## Phase 2 · Make it right — 21 items

Everything here already returns the correct answer. What is wrong is how it
handles bad input, how it explains failure, and how it behaves for a screen
reader — which is precisely the list §1 assigns to this phase.

### 2a · Validation depth — fix the cause, not the five symptoms

| order | # | finding | effort |
|---|---|---|---|
| 1 | **17** | **give the register form a Zod schema** | M |
| 2 | 16 | trim before the required check — no blank names | S · inside #17 |
| 3 | 19 | make the conditional measure field required | S · inside #17 |
| 4 | 21 | check the harvest window order before submitting | S · inside #17 |
| 5 | 9 | bound hours/day, days/week and quantity on the request form | S |

**#17 first, and the four beneath it mostly disappear into it.** One schema on
the form the spec calls "the most important screen in the build" closes the
blank-name hole, the missing-measure round-trip and the backwards date window
together. Doing 16, 19 and 21 as separate patches means three more places for
the next field to be forgotten.

This is also the phase's only real ordering constraint: #16 lets the app write
a record it has no screen to repair, so within phase 2 it goes first. See the
disagreement note below.

### 2b · Error copy — five instances of one pattern

| order | # | finding | effort |
|---|---|---|---|
| 6 | 3 | validate route params, so a bad id is "not found", not a uuid parse error | S |
| 7 | 4 · 20 · 21 | map constraint violations to human messages | M |
| 8 | 25 | replace raw exception text with "check your connection" | S |
| 9 | 24 | clear the error banner on navigation | S |

#4, #20 and #21 are **one fix**: a single place that turns
`pue_request_hours_per_day_check`, `cycle_window_sane`, `demand_window_sane`,
`contributed_kg > 0` and `numeric field overflow` into sentences. Built once,
every future constraint inherits it.

Keep the *behaviour* in #25 exactly as it is. "Changed for now, but could not
be saved" is the honest report a silent failure would not give. Only the
appended `TypeError: Failed to fetch` needs to go.

### 2c · State cycle — the states the spec names but the code lacks

| order | # | finding | effort |
|---|---|---|---|
| 10 | 23 | disable submit in flight — spec 5.2's "saving" state | S |
| 11 | 22 | validate a draft's shape before restoring it | S |
| 12 | 29 | hold drill links until their figures resolve | S |

#22 earns its place because the realistic trigger is not tampering: it is a
draft written by an older deployment of the form, on a phone that was
mid-registration when the app updated. Which is the exact scenario drafts exist
to survive.

### 2d · Accessibility — §1 assigns this here explicitly

| order | # | finding | effort |
|---|---|---|---|
| 13 | 18 | set `<html lang>` from the active language | XS |
| 14 | 11 | make the action buttons real form submits | S |

#18 is a one-line change with a disproportionate effect: today every English
ops and admin page is announced to a screen reader with Swahili pronunciation.

### 2e · The rest

| order | # | finding | effort |
|---|---|---|---|
| 15 | 26 | send a signed-in visitor away from `/login` | XS |
| 16 | 10 | guard `/select-role` and fix its copy for single-role users | XS |
| 17 | 27 | say when a typed decimal was rounded | S |
| 18 | 28 | a placeholder or hint on the phone field | XS |
| 19 | 8 | collapse the ops sidebar below ~800px | M |
| 20 | 13 | stop the post-sign-out token refresh | S |

#8 sits last on purpose. §1 puts visual design last, `docs/screens-and-components.md`
permits ops to be desktop-first, and a stakeholder demo runs on a laptop. It is
only on the list at all because figures are *silently truncated* rather than
scrolled — which is a correctness smell wearing a layout costume.

---

## Phase 3 · Make it fast — 0 items

**Nothing on this list is a performance finding, and that is the honest
answer rather than a gap in the sweep.** Both passes measured response times
incidentally throughout: the Tower renders inside a second against a remote
database on the other side of the world, and the full 103-test browser suite
completes in 4.2 minutes serialised on one worker.

Recorded so this phase has a starting point when its turn comes — an
observation, **not a finding, and not something to act on now**: one Tower page
load issues 15 Supabase requests, being roughly one per tile plus the crop
lookup that `useTower` deliberately keeps separate because the views declare no
foreign keys for PostgREST to embed through. If the Tower is ever slow, that is
where to look first. It is not slow today.

---

## Not in any phase

**#14 · Vite HMR 404s for route files that do not exist.** Dev-server noise
from the TanStack Router plugin's generated route tree. No effect on the built
bundle or on any screen, and no user-visible behaviour to make work, right or
fast. Left on the list as an explanation for anyone who sees it in a terminal
and goes looking.

---

## Where the rule and the risk disagree

Stated plainly, because applying the rule strictly is what was asked and
hiding the tension would make the ordering less useful, not more.

**#16 — whitespace-only names — lands in phase 2 and is the finding I would
most want in phase 1.** §1 is unambiguous that validation depth is "make it
right", so that is where it sits. But its consequence is unlike anything else
in phase 2: a person registered with a blank name is *permanently* blank. It
propagates to person detail, the people list, the Tower's farmer column and
every supply line tracing back to them, and there is no rename screen anywhere
in scope to repair it. Every other phase-2 item produces a bad message or a
missed keystroke; this one produces a corrupt record that outlives the fix.

Two ways to resolve it, both defensible:

1. **Keep the rule, front-load the item.** #16 is already first in phase 2,
   and it rides along with #17 which is that phase's opening move anyway.
   Phase 1's largest item (#1, eleven screens) will outlast it regardless, so
   in practice #16 gets fixed while phase 1 is still running.
2. **Promote it.** Argue that "cannot be corrected once written" is a
   works/does-not-work property rather than a validation-depth one.

Recommendation: **option 1.** The ordering inside phase 2 already gets the fix
in early, and re-litigating what counts as "work" for one item costs more than
the two days of overlap buys.

**#23 — no saving state — is the mirror case.** Spec 5.2 names six states for
the register screen and one of them simply does not exist, which reads like
absence. It stays in phase 2 because the data is provably safe: three submits
in one tick produced exactly one person and one receipt. The user gets no
feedback; the record is never wrong. Feedback is "right".

---
---

# Batches — one unit of work per plan-mode phase

The 29 findings regrouped into **17 batches**, each one a single coherent
change: it touches one cluster of files, has one root cause, and has one way to
prove it is done. A plan-mode phase should take exactly one batch.

**How the grouping was decided**, in priority order:

1. **Same root cause** — one fix, not five patches. `P2-A` is the clearest
   case: one schema closes four findings.
2. **Same files** — two batches editing `RegisterScreen.tsx` in different
   phases means reading it twice, re-testing it twice, and a merge risk for
   nothing.
3. **One verification story** — a batch that cannot be proven done in one test
   pass is two batches.
4. **Never spans a phase.** Batches are phase-pure so a phase never inherits
   half of one. Where a later-phase finding touches an earlier batch's files it
   is listed as a **ride-along candidate**, and taking it is a judgement call
   at planning time, not a silent merge.

Effort is relative, not calendar: **XS** trivial · **S** an afternoon ·
**M** a day or two · **L** longer than a day and worth its own plan.

---

## Phase 1 — make it work · 9 batches

### `P1-GATE` · the landing-route spec
- **Finding:** #15
- **Files:** `e2e/nav.spec.ts` (new)
- **Why alone:** it is the acceptance test for every other phase-1 batch. It
  must exist and be **red** before `P1-OFFICER` starts, or those batches have
  no definition of done beyond eyeballing.
- **Done when:** signing in as each of the four roles asserts the landing page
  and every nav destination renders real content — no `Placeholder`.
- **Depends on:** nothing. **Effort:** S.

### `P1-OFFICER` · the officer surface's five missing screens
- **Finding:** #1 (part 1 of 3)
- **Files:** `src/routes/_officer/officer.index.tsx`, `officer.people.index.tsx`,
  `officer.verify.tsx`, `officer.cycles.$cycleId.tsx`,
  `officer.farms.$farmId.tsx` + new screens under `src/features/officer/`
- **Why together:** one surface, one nav bar, one role's mental model. The
  People list and the Verify queue share a query shape, and the officer's
  landing page is a summary of both.
- **Do first of the three:** it is the largest hole (two of three tabs), and
  `officer.cycles.$cycleId` / `officer.farms.$farmId` are the Tower's own drill
  targets, so `P1-TOWER-TRUTH` and `P1-NAV` both read better afterwards.
- **Done when:** `P1-GATE`'s officer assertions pass, and the Tower's
  production drill reaches a cycle and a farm rather than a placeholder.
- **Depends on:** `P1-GATE`. **Effort:** L — plan this one on its own.

### `P1-OPS` · the ops surface's four missing screens
- **Finding:** #1 (part 2 of 3)
- **Files:** `src/routes/_ops/ops.index.tsx`, `ops.buyers.tsx`,
  `ops.catalogue.tsx`, `ops.villages.tsx` + new screens under `src/features/ops/`
- **Why together:** three of the four are flat reference-data lists over
  `buyer`, `equipment` and `village` — near-identical read-and-table work, and
  the ops landing page is the roll-up above them.
- **Done when:** `P1-GATE`'s ops and admin assertions pass; every sidebar link
  resolves to real content.
- **Depends on:** `P1-GATE`. **Effort:** M.

### `P1-FARMER` · the farmer surface's two missing screens
- **Finding:** #1 (part 3 of 3)
- **Files:** `src/routes/_farmer/farm.index.tsx`, `farm.opportunities.tsx`
  + new screens under `src/features/farmer/`
- **Why separate from the other two:** it is the only surface that ships
  complete Swahili, so it is the batch whose copy feeds `P1-SWAHILI`. Landing
  it before the translation ask goes out means the string list is final.
- **Done when:** `P1-GATE`'s farmer assertions pass, and `/farm/opportunities`
  shows the one opportunity RLS grants Neema — the count `rls_test.sql` asserts.
- **Depends on:** `P1-GATE`. **Effort:** S.

### `P1-TOWER-TRUTH` · make the energy drill reconcile
- **Finding:** #7
- **Files:** `src/features/tower/TowerDrillScreens.tsx`, `useTower.ts`
- **Why alone:** this is not a screen to build, it is a claim to correct. The
  drill lists draft and rejected requests as the records behind prospective
  7.200 kW and approved 10.800 kW, which they do not feed. Deciding what the
  rows should be — filtered by contributing status, split by which figure they
  serve, with simultaneity shown — is a spec-reading job, not a UI job.
- **Done when:** every row listed contributes to a stated figure, and the
  column reconciles to the headline on screen.
- **Ride-along candidate:** #29 (`P2-C`) touches `TowerTile.tsx`, next door.
  Cheap to take here; not required.
- **Depends on:** nothing. **Effort:** M.

### `P1-NAV` · a way back for ops and admin
- **Finding:** #6
- **Files:** `src/app/` layout and nav components
- **Why alone:** one decision about spec 4.1's surface split — whether an ops
  user on an officer screen keeps the ops sidebar, gets a breadcrumb, or gets
  both bars. Small change, but it is a design call that should not be buried
  inside a screen-building batch.
- **Done when:** an ops user who drills from a Tower headline to a person can
  reach Requests, Demand and the Tower without the browser's back button.
- **Depends on:** `P1-OFFICER` — routing ops back to a placeholder tab is not
  a fix. **Effort:** S.

### `P1-DRAFT-ACTIONS` · let a farmer act on a draft request
- **Finding:** #5
- **Files:** `src/features/farmer/RequestDetailScreen.tsx`, `useRequests.ts`
- **Why alone:** its own screen, its own mutation, and its own rule — the
  status machine in `pue_request_guard` already permits `draft → submitted`,
  so this is wiring a transition the database is waiting for.
- **Done when:** the seeded cold-room draft can be submitted and appears in the
  ops pipeline; a draft can also be withdrawn.
- **Depends on:** nothing. **Effort:** S.

### `P1-OPPORTUNITY` · opportunity lifecycle
- **Finding:** #12
- **Files:** `src/features/ops/OpportunityDetailScreen.tsx`, `useOpportunity.ts`
- **Why together:** status transitions and detaching a supply line are the same
  screen, the same hook, and the same question — what an ops user is allowed to
  change after an opportunity exists. The ambiguous "Quantity" label is on that
  screen too, so it rides here.
- **Watch:** detaching means deleting an `opportunity_supply` row, and the
  schema has **no DELETE policies by design**. Check whether the intended path
  is a policy, an RPC, or a status change — and if the answer is not in
  `docs/business-rules.md`, **that is a question to ask, not a guess to make.**
- **Done when:** an opportunity can move proposed → shared → accepted, a
  wrongly attached line can be removed, and `opportunity_resum` re-sums the
  offered total after both.
- **Depends on:** nothing. **Effort:** M.

### `P1-SWAHILI` · complete the farmer and officer strings
- **Finding:** #2
- **Files:** `src/i18n/sw/common.json` (2 keys → ~365)
- **Why alone:** the engineering is one file. The work is a person.
- **Start the ask on day one of phase 1, not when this batch comes up.** The
  translation cannot begin until the string list is final, which means after
  `P1-OFFICER` and `P1-FARMER` land — so send the reviewer everything that
  exists now and top it up, rather than waiting.
- **Ride-along candidate:** #18 (`P2-LANG-ATTR`) is the `<html lang>` fix and
  is the natural companion to any i18n work. XS. Take it here.
- **Done when:** both surfaces render Swahili with no English fallback, signed
  off by a native reviewer.
- **Depends on:** `P1-OFFICER`, `P1-FARMER` for the final list. **Effort:** L,
  mostly waiting.

---

## Phase 2 — make it right · 8 batches

### `P2-A` · what the write forms accept, and what they say about it
- **Findings:** #17, #16, #19, #21, #9, #27, #28
- **Files:** `src/features/officer/RegisterScreen.tsx`, `registerPayload.ts`,
  `src/features/farmer/EquipmentDetailScreen.tsx`
- **Why this is the biggest batch and should stay one:** every finding in it is
  the same missing thing — a schema on a write form. #17 adds it; #16 (trim),
  #19 (conditional measure required), #21 (date order) and #9 (hours, days,
  quantity ranges) are then fields in that schema rather than four separate
  patches. #27 (say when a decimal was rounded) and #28 (a phone hint) are the
  same two files and the same conversation about what the form tells the
  operator.
- **The one thing to get right:** a schema is **not** a client-side copy of a
  database rule, which CLAUDE.md forbids. Bound each field to its own column's
  type — `hours_per_day between 0 and 24` is the column's shape, not business
  logic — and let every genuine rule still come back from the database.
- **Done when:** `"   "` is rejected as a name, hours 99 and quantity 0 cannot
  be submitted, a backwards window is caught inline, and no valid registration
  is newly blocked.
- **Depends on:** nothing. **Do first in phase 2** — #16 writes a permanently
  uncorrectable record, per the triage note above. **Effort:** M.

### `P2-B` · one error-message layer
- **Findings:** #3, #4, #20, #25 (and #21's message half)
- **Files:** a new `src/lib/errors.ts`, `src/components/ErrorState.tsx`, every
  `$id` route file
- **Why together:** four findings, one absence — nothing translates a failure
  into a sentence. `invalid input syntax for type uuid`,
  `pue_request_hours_per_day_check`, `cycle_window_sane`, `demand_window_sane`,
  `contributed_kg > 0`, `numeric field overflow` and
  `TypeError: Failed to fetch` are all the same defect wearing different text.
  Built once, every future constraint inherits it.
- **Route params (#3) belong here** rather than with the schemas: a bad id is a
  read failing, not a form being wrong, and the right answer is the "not found"
  empty state the app already renders for a well-formed id that matches nothing.
- **Keep #25's behaviour.** "Changed for now, but could not be saved" is the
  honest report; only the appended exception text goes.
- **Done when:** no user-facing string contains a table name, a constraint
  name, or `TypeError`.
- **Depends on:** `P1-OFFICER` — its two new `$id` routes need the same
  treatment, and doing this first means doing it twice. **Effort:** M.

### `P2-C` · form semantics and in-flight feedback
- **Findings:** #11, #23, #29
- **Files:** `EquipmentDetailScreen.tsx`, `DemandListScreen.tsx`,
  `DemandDetailScreen.tsx`, `OpportunityDetailScreen.tsx`,
  `OpsRequestReviewScreen.tsx`, `VerifyButton.tsx`, `RegisterScreen.tsx`,
  `src/features/tower/TowerTile.tsx`
- **Why together:** one sweep over every action control in the app asking two
  questions — is it a real form submit (#11, so Enter works and screen readers
  see a form), and is it disabled while its request is in flight (#23, spec
  5.2's missing "saving" state). #29 is the same question about a link: a drill
  affordance should not be live before the figure behind it resolves.
- **Why it comes after `P1-DRAFT-ACTIONS` and `P1-OPPORTUNITY`:** both add
  controls to screens on this list. Sweeping first means sweeping twice.
- **Done when:** Enter submits every form, every action control disables while
  its mutation runs, and a drill link is inert until its tile has data.
- **Depends on:** `P1-DRAFT-ACTIONS`, `P1-OPPORTUNITY`. **Effort:** S.

### `P2-D` · draft integrity
- **Finding:** #22
- **Files:** `src/lib/drafts.ts`, `RegisterScreen.tsx`
- **Why alone and why it must follow `P2-A`:** the fix is to validate a
  restored draft against the form's schema and discard it if it does not
  match — which needs the schema `P2-A` introduces. Doing it before means
  writing a second, throwaway validator.
- **Done when:** a draft of the wrong shape is discarded with a plain message
  rather than restored as `[object Object]`, and a valid draft still restores
  intact — the acceptance criterion `register.spec.ts` already asserts.
- **Depends on:** `P2-A`. **Effort:** S.

### `P2-E` · transient state that outlives its moment
- **Findings:** #24, #13
- **Files:** `src/app/` shell and session code, `LanguageSwitch`
- **Why together:** both are something that should have ended and did not — an
  error banner surviving three navigations, and a token refresh firing after
  sign-out. Same area of the code, same class of bug, one small batch.
- **Done when:** an error banner clears on route change, and signing out
  produces no further requests.
- **Depends on:** nothing. **Effort:** S.

### `P2-F` · routing edges
- **Findings:** #26, #10
- **Files:** `src/routes/(auth)/login.tsx`, `select-role.tsx`,
  `src/app/membership.ts`
- **Why together:** two auth routes that render a state that cannot be true —
  a sign-in form for someone signed in, and "you hold more than one role" for
  someone holding one. `resolveLanding` already knows the right answer in both
  cases; neither route asks it.
- **Done when:** a signed-in visitor to `/login` lands on their home, and
  `/select-role` either redirects a single-role user or stops claiming they
  have several.
- **Depends on:** nothing. **Effort:** XS. Good filler between larger batches.

### `P2-LANG-ATTR` · document language
- **Finding:** #18
- **Files:** `index.html`, `src/i18n/`
- **Why it exists as its own batch:** so it is not lost. One line, and it stops
  every English ops page being announced to a screen reader in Swahili.
- **Strong ride-along:** fold into `P1-SWAHILI`. It is the same subject and
  costs nothing there.
- **Depends on:** nothing. **Effort:** XS.

### `P2-G` · ops layout below 800px
- **Finding:** #8
- **Files:** `src/app/` ops layout, `src/styles/`
- **Why last:** §1 puts visual design last, and the demo runs on a laptop. It
  is on the list only because figures are silently truncated rather than
  scrolled.
- **Done when:** at 375px no figure is clipped — the sidebar collapses or the
  tiles reflow.
- **Depends on:** `P1-OPS` — new sidebar destinations change what has to
  collapse. **Effort:** M.

---

## Phase 3 — make it fast · 0 batches

Nothing measured warrants one. If a batch is ever needed, its first line is
already written in the triage above: the Tower's 15 requests per page load.

---

## Not batched

**#14** · Vite HMR 404s. Dev-server noise, no user-visible behaviour. Nothing
to batch it with, and nothing to do.

---

## Reading this into a plan

**The critical path** is `P1-GATE` → `P1-OFFICER` → `P1-NAV`, with
`P2-B` waiting on `P1-OFFICER` and `P2-C` waiting on `P1-DRAFT-ACTIONS` and
`P1-OPPORTUNITY`. Everything else is free to move.

**Runnable in any order:** `P1-TOWER-TRUTH`, `P1-DRAFT-ACTIONS`,
`P1-OPPORTUNITY`, `P2-A`, `P2-E`, `P2-F`. Solo developer, so this means
"reorder freely if blocked", not "run at once".

**`P1-SWAHILI` is the only calendar risk on the board.** Every other batch is
bounded by how fast the code gets written. That one is bounded by a person's
availability, and 30 September does not move.

**Batches worth splitting if a phase runs long:** `P1-OFFICER` (five screens —
People list, Verify queue and the landing page are three natural halts) and
`P2-A` (the schema plus #16/#19/#21 is the necessary core; #9, #27 and #28 can
follow).

**Batches not worth splitting:** `P2-B` — splitting the error layer by call
site is what produced five instances of one bug in the first place.

---

# Found while fixing — additions to the board

Findings that surfaced during remediation rather than in the two sweeps.
Numbered on from the sweeps so ticket references stay unambiguous.

## 30 · Sign-in intermittently lands on `/no-access` — medium

**Found:** M5, in `e2e/opportunity.spec.ts`. Twice, always on the FIRST test of
a cold worker, ops sign-in redirected to `/no-access` instead of `/ops`; both
times the retry passed, and it did not recur in a full-suite run.

`resolveLanding([])` sends a user with no membership rows to `/no-access`, so
the redirect means `fetchSession` returned an `appUser` **and zero
memberships**. That combination should not be reachable: both reads run under
the same JWT in one `Promise.all`, and if the client were still anonymous the
`app_user` read would have been empty too — which `session.ts` deliberately
raises on rather than treating as no-access.

So either the two reads are not seeing the same auth state, or `membership`'s
policies evaluate differently in the moment after `signInWithPassword`
resolves. Worth an answer before a stakeholder sees "You do not have access"
on their first sign-in of the day.

**Not a regression from M5** — `signInAsOps` is copied verbatim from
`e2e/demand.spec.ts`, which predates it.

**Where it belongs:** `P2-E` or its own ticket. Effort unknown until the cause
is found; the fix may be one line or may be a retry that masks it, and the
difference matters.

---
---

# Third sweep — what the remediation actually closed

Written 13 September 2026, after M1–M9. The two sweeps above found 29 items;
#30 was added during M5. This records what changed, what did not, and the
handful of places where the fix differed from what the finding asked for.

**State:** 689 unit tests · 173 e2e · `rls_test` 24/24 · typecheck and lint
clean · seeded baseline intact, zero `E2E-` leftovers.

---

## Closed — 29 of 30

| # | Finding | Milestone | What was actually done |
|---|---|---|---|
| 1 | Eleven placeholder routes | M1–M4 | All eleven replaced. `e2e/nav.spec.ts` is the gate; its `built` scaffolding is gone because it reads true everywhere. |
| 3 | Malformed id shows a Postgres error | M7 | `isUuid` at the fetch boundary on all eight `$id` routes. A bad id reaches the same "not found" state as an absent one. |
| 4 | Raw check-constraint name | M7 | `humanizeDbError` maps constraint identifiers to sentences. |
| 5 | Draft request is a dead end | M4 | Submit and withdraw wired to the machine the trigger already permitted. |
| 6 | Ops loses its nav on officer screens | M1 | `navSurfaceFor` keeps the sidebar. Deliberately not symmetrical for the farmer surface. |
| 7 | Energy drill does not reconcile | M1 | Rows grouped by the figure they feed; both sums read from `v_village_energy`, nothing summed client-side. |
| 8 | Ops surface breaks below ~800px | M8 | Sidebar becomes a horizontal strip below `lg`. Desktop-first stays the choice; silent truncation does not. |
| 9 | No sanity limits on the request form | M6 | `requestSchema`, and the estimate is no longer computed from impossible inputs. |
| 10 | `/select-role` misfires | M8 | Guarded on `needsRoleChoice`, counted by distinct role. |
| 11 | Enter does not submit | M8 | Real forms where text fields feed one action — see the scope note below. |
| 12 | Opportunity cannot move status | M5 | Full machine. Declining releases supply; see the note below on detach. |
| 13 | Failing token refresh after sign-out | M8 | Cancel in-flight queries, then invalidate, then clear the cache. |
| 15 | Why the suite missed most of this | M1 | `nav.spec.ts` visits the page a human lands on. |
| 16 | Whitespace passes required checks | M6 | Trimmed at the schema, so the stored value is the trimmed one. |
| 17 | Register form has no Zod schema | M6 | Three schemas — register, request, supply. |
| 18 | `<html lang>` hardcoded to Swahili | M8 | Follows the active language; `index.html` no longer declares English screens as Swahili. |
| 19 | Conditional measure field not required | M6 | The schema is built per crop, so the resolver reads the crop chosen rather than the one selected at mount. |
| 20 | `numeric field overflow` names no field | M6, M7 | Bounded at the form; mapped at the error layer for anything that still reaches the server. |
| 21 | Backwards window shows a constraint name | M6, M7 | Caught inline; mapped where it still arrives. Its tail — `contributed_kg > 0` — closed by `supplySchema`. |
| 22 | Corrupt or stale draft restored | M8 | `useDraft` takes a shape guard, discards and clears. |
| 23 | Submit never disabled in flight | M8 | `formState.isSubmitting`, not `isPending` — see the note below. |
| 24 | Error banner survives navigation | M7 | Cleared on route change. |
| 25 | Raw JS exceptions as user copy | M7 | Mapped. The honest wording — changed on screen, not stored — stays. |
| 26 | `/login` renders while signed in | M8 | Signed-in visitors are sent to their own surface. |
| 27 | High-precision decimals silently rounded | M6 | The form says what the column will store. |
| 28 | Phone accepts anything | M6 | A hint, no enforcement — the column is free text by design. |
| 29 | Drill links live while loading | M8 | A tile's drill is not a link until its figure arrives. |
| 30 | Sign-in lands on `/no-access` | M8 | Not a race. See below. |

---

## Where the fix differed from the finding

### #12 — there is no detach, and there should not be

The finding asked for a way to remove a wrongly attached supply line, and
flagged the right question: the schema has no DELETE policies by design.

The answer was in `docs/business-rules.md` §7 all along. `committed_kg` sums
supply on opportunities in `proposed`, `shared` or `accepted`, so declining or
lapsing returns every committed kilogram to `available_kg`. **The status change
IS the release.** No detach, no delete, no migration — the supply line is the
traceability record, and erasing it would erase the history of what was
offered.

Declined and lapsed are terminal, and that is load-bearing rather than tidy:
`opportunity_supply_guard` fires on supply writes only, never on a status
change, so re-opening a released opportunity would re-commit its lines with
nothing checking them against whatever was committed meanwhile.

### #11 — six files, two real cases

The finding lists six action screens. "Enter does nothing in a text field"
only exists where text fields feed one action: the demand create form and
attach-supply. The review screen's only field is a textarea, where Enter is
correctly a newline; the other two are single buttons in table cells. Both real
cases became `<form onSubmit>`; the other four were left alone rather than
converted for symmetry.

### #23 — the cause was not the one measured

`disabled={submit.isPending}` was already there. It read `false` after three
clicks because react-hook-form validates asynchronously: the mutation has not
started on the tick the officer clicks again. `formState.isSubmitting` is set
synchronously and is what the fix uses.

### #30 — not a race, a cached `null`

Five sightings across M5–M8, always the first test of a cold worker, always
green on retry, never in a full run. It looked like a database race.

Every route guard calls `ensureSession`, so by the time the login form is
submitted the session query already holds `null` — the correct answer for a
signed-out visitor. `invalidateQueries` marks it stale and STARTS a refetch
without waiting; `ensureQueryData` returns cached data whenever there is any,
and `null` is data. `resolveLanding([])` therefore ran on the signed-out
answer. `fetchQuery` ignores the cache. It now reproduces deterministically in
a unit test, and the `/no-access` signature has not recurred since.

One unrelated flake remains and is worth separating from it: the FIRST test of
a run can fail `toHaveURL` while still on `/login`. Vite serves `index.html`
immediately and compiles the module graph on the first request, so that one
sign-in pays for the app's first build on top of a round trip to a remote
database. The expect timeout is now 10s rather than 5s. That is a cold-start
cost, not a logic defect — and it is a different symptom from #30, which
always reached `/no-access` rather than staying put.

---

## Open

### #2 · Swahili — the only calendar risk

**Not an engineering task.** 559 strings, of which 2 carry Swahili — the
language switch's own labels, which are attested terms rather than invented
copy. The other 557 render English through i18next's fallback, cleanly: no key
renders as its own path, and `src/i18n/bundles.test.ts` asserts that.

The string list is frozen and exported to `docs/i18n-handover.md`, which marks
the **323 strings on the farmer and officer surfaces** that CLAUDE.md specifies
must ship Swahili, and carries the labelling rules a translator needs.

This waits on a native reviewer. 30 September does not move, and this is the
only item on the board bounded by a person's availability rather than by how
fast code gets written.

### #14 · Vite HMR 404s — dev-only

Three route paths the TanStack plugin generates without physical files. No
effect on the built bundle or any screen. Left alone.

---

## What the remediation added to the suite

- `e2e/nav.spec.ts` — every role's landing page and nav destination
- `e2e/opportunity.spec.ts` — the status machine, and supply released and returned
- `e2e/bad-id.spec.ts` — all eight `$id` routes, malformed and absent
- `e2e/responsive.spec.ts` — the ops surface at 375px
- `e2e/draft-request.spec.ts` — the farmer's half of the request machine

The last one closes a gap recorded during M4: a farmer has no route to a
draft, so the only draft in the system was seeded and one-way. Each test now
inserts its own marked draft through `sql()`, which `cleanup.sql` already
matches on. The rule that produced the gap is worth restating: **the marker
discipline covers rows, not columns on seeded rows.**
