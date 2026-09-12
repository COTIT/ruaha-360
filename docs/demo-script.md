# Demo script — Ruaha 360

The eight-step walkthrough, in the order the acceptance journey runs it. Every
figure below is asserted by `e2e/journey.spec.ts`, so if the demo shows
something else, the demo is wrong rather than the number.

**Open with the caveats.** They take twenty seconds and they prevent every
misunderstanding that follows.

> Everything on screen is invented demo data — the banner says so on every
> page. Nothing here is a measured Ruaha result. The farmer and officer
> screens are specified to be in Kiswahili and are not yet: that is waiting on
> a native reviewer, not on engineering.

---

## Sign-ins

| role | email | password |
| --- | --- | --- |
| Field officer, Ilundo | `officer.ilundo@demo.ruaha360.test` | `demo1234` |
| Farmer (Neema) | `neema@demo.ruaha360.test` | `demo1234` |
| Ops | `ops@demo.ruaha360.test` | `demo1234` |

Switching accounts means signing out first — a signed-in visitor is sent away
from `/login`.

---

## 1 · The officer registers a farmer

`/officer/register`, as the Ilundo officer.

One page, one submit, one RPC — not five chained inserts. **Say why:** a phone
that loses signal halfway through five inserts leaves orphan rows across five
tables. This is one transaction, and it is idempotent on a client reference,
so a retry after a timeout cannot create a second farmer.

Worth showing: type three spaces into First name and submit. It is refused
inline. The database would have accepted `'   '` as a name, and there is no
rename screen.

## 2 · The officer verifies the records

`/officer/verify`. The queue is everything unverified or pending in their
villages.

**Say why:** verification is one-way and only `app_verify` can do it — no
screen writes those columns directly. The officer is asserting they saw it.

## 3 · The farmer sees the same records

Sign out, sign in as Neema. `/farm/my-farm`.

Every record carries a provenance badge: where it came from, who captured it,
whether it is verified. **Say why:** a figure with no provenance is a claim
nobody can check.

## 4 · The farmer requests equipment

`/farm/equipment`, open the mill. The estimate moves as the hours change.

Worth showing: type 99 hours per day. The estimate disappears rather than
confidently reporting 1,485 kWh. **Say why:** an impossible input should not
produce a plausible-looking answer.

The estimate is always labelled an estimate, and the price is always labelled
indicative. Neither is a quotation.

## 5 · Ops reviews and approves

Sign out, sign in as ops. `/ops/requests` → the request → start review →
approve with a note.

**Say why:** the status machine lives in a database trigger, not in this
screen. The screen only decides which buttons to draw.

## 6 · Ops opens the maize demand

`/ops/demand` → Iringa Grain Traders.

```
Ilundo:  5,600 kg available   62.2% coverage
```

**Say why:** 12,000 kg expected, 6,400 already committed. The superseded 3,200
kg estimate is excluded — a revised figure never reaches a total, and the old
one stays auditable.

## 7 · Ops creates an opportunity and attaches supply

From the coverage row. Then attach a harvest figure.

Worth showing: attach a quantity already committed elsewhere. The refusal
names the actual kilograms. **Say why:** that message is written to be read,
and it is shown exactly as the database wrote it.

**Say clearly:** an opportunity is not a sale, not a delivery, not a payment.
"Accepted" means both sides agreed to keep talking.

## 8 · The Tower reflects all of it

`/ops/tower`, Ilundo.

```
production   12,000.00 kg expected
energy       500.000 kW planned capacity, basis: planned
             prospective peak  7.200 kW
             approved peak    10.800 kW
             headroom        489.200 kW
market       9,000 kg demand · 5,600 kg available · 62.2%
```

**Say why, and this is the point of the whole demo:** prospective and approved
demand are never summed — one is an application, the other is a decision.
Capacity is planned, never measured. And every headline drills to the records
underneath it: production → a crop cycle → the farmer registered in step 1, in
three clicks.

---

## Questions worth expecting

**"Can we put real farmers in?"** Not yet. Consent and registration are open
research items, and this instance holds demo data only. The demo instance and
any live instance would be different databases — there is no flag to flip.

**"Why is it in English?"** It should not be, on the farmer and officer
screens. `docs/i18n-handover.md` is the translator's file; 323 strings block
that. The two Swahili strings present are attested terms. We will not ship
machine translation to Tanzanian stakeholders.

**"What does it cost to run?"** Out of scope for this demo: finance terms,
interest, deposits and repayment are unresolved, and Bank of Tanzania Tier 2
classification is an open research item.

**"Can it work offline?"** Partly, and honestly. An interrupted registration
survives a reload with every field intact and a visible "not yet submitted"
badge. There is no background sync queue — that is deferred until field
testing proves it necessary, rather than built on a guess.
