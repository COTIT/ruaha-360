# Swahili handover — Ruaha 360

Generated 2026-09-12 from `src/i18n/en/common.json`. Do not edit by hand;
regenerate with `pnpm i18n:handover`.

## What this is

Every user-facing string in the application, for a **native Kiswahili
reviewer** to translate. The string list is frozen: every screen is built,
so the keys will not move while the work is under way.

**Nothing here may be machine translated.** CLAUDE.md is explicit that
machine translation must not be shipped to Tanzanian stakeholders, and the
two strings that already carry Swahili are attested terms rather than
invented product copy. An unreviewed guess is worse than English, because
English is visibly untranslated and a wrong Swahili string is not.

## Priority

- **Required** — the farmer and officer surfaces, and the chrome both of
  them render. 323 strings. CLAUDE.md specifies these ship
  complete Swahili.
- **Optional** — Ops and Tower. 236 strings. These may ship
  English for the demo.

559 strings in total, of which 2 already have Swahili.

## How to read the table

- `{{value}}` and its siblings are placeholders. They must appear in the
  translation exactly as written, or the string will render broken.
- The Notes column carries product requirements from CLAUDE.md, not style
  advice. "Estimate", "indicative" and "planned capacity" are claims about
  what the programme does and does not promise; a translation that
  strengthens them misrepresents it.
- Leave a cell blank rather than guessing, and flag anything whose meaning
  is unclear. A gap is a question; a wrong string is a defect nobody sees.

## Required — farmer and officer surfaces

| Key | English | Swahili | Notes |
| --- | --- | --- | --- |
| `a11y.language` | Language |  |  |
| `a11y.primaryNav` | Primary navigation |  |  |
| `capacityBasis.nameplate` | Nameplate |  | Capacity is PLANNED or NAMEPLATE, never measured. Always shown with its basis. |
| `capacityBasis.planned` | Planned |  | Capacity is PLANNED or NAMEPLATE, never measured. Always shown with its basis. |
| `common.loading` | Loading… |  |  |
| `common.no` | No |  |  |
| `common.yes` | Yes |  |  |
| `confidence.high` | High |  | Confidence level recorded with a figure. Low / medium / high. |
| `confidence.low` | Low |  | Confidence level recorded with a figure. Low / medium / high. |
| `confidence.medium` | Medium |  | Confidence level recorded with a figure. Low / medium / high. |
| `cycleDetail.harvests` | Harvest figures |  |  |
| `cycleDetail.measure` | Planted |  |  |
| `cycleDetail.noHarvestsDetail` | Nobody has recorded an expected or actual figure for this cycle. |  |  |
| `cycleDetail.noHarvestsTitle` | No harvest figure yet |  |  |
| `cycleDetail.notFoundDetail` | It may not exist, or it may be outside your villages. |  |  |
| `cycleDetail.notFoundTitle` | Crop cycle not found |  |  |
| `cycleDetail.season` | Season |  |  |
| `cycleDetail.seriesNote` | A harvest figure is a series. A revised estimate does not erase the one it replaced. |  |  |
| `cycleDetail.status` | Status |  |  |
| `cycleDetail.superseded` | superseded |  |  |
| `cycleDetail.trees_one` | 1 tree |  |  |
| `cycleDetail.trees_other` | {{count}} trees |  | Keep {{count}} |
| `cycleDetail.units_one` | 1 unit |  |  |
| `cycleDetail.units_other` | {{count}} units |  | Keep {{count}} |
| `cycleDetail.window` | Harvest window |  |  |
| `cycleStatus.abandoned` | Abandoned |  |  |
| `cycleStatus.growing` | Growing |  |  |
| `cycleStatus.harvested` | Harvested |  |  |
| `cycleStatus.planned` | Planned |  |  |
| `demoBanner.detail` | Every figure here is invented. Nothing is a measured Ruaha result. |  |  |
| `demoBanner.label` | Demo data |  |  |
| `draft.notSubmitted` | Not yet submitted |  |  |
| `empty.noAccessDetail` | You may not have access to these records, or there are none yet. |  |  |
| `empty.noAccessToThis` | Nothing to show |  |  |
| `equipment.days` | Days per week |  |  |
| `equipment.daysRange` | Days per week run from 0 to 7. |  |  |
| `equipment.estimateBlockedDetail` | Fill in how many, hours per day and days per week, and the estimate appears here. |  | Always labelled an ESTIMATE. Not a measurement, not a commitment. |
| `equipment.estimateBlockedTitle` | No estimate yet |  | Always labelled an ESTIMATE. Not a measurement, not a commitment. |
| `equipment.hours` | Hours per day |  |  |
| `equipment.hoursRange` | Hours per day run from 0 to 24. |  |  |
| `equipment.indicative` | indicative |  | Prices are INDICATIVE, never quotations. Must not read as a firm offer. |
| `equipment.indicativePrice` | Indicative price |  | Prices are INDICATIVE, never quotations. Must not read as a firm offer. |
| `equipment.intro` | Powered equipment available through the programme. |  |  |
| `equipment.moreThanZero` | This must be more than zero. |  |  |
| `equipment.noneDetail` | Equipment appears here once the programme adds it. |  |  |
| `equipment.noneTitle` | No equipment listed yet |  |  |
| `equipment.notANumber` | Enter a number. |  |  |
| `equipment.notAQuotation` | Prices are indicative, not quotations. |  |  |
| `equipment.notFoundDetail` | It may no longer be listed, or you may not have access to it. |  |  |
| `equipment.notFoundTitle` | Equipment not found |  |  |
| `equipment.purpose` | What will you use it for? |  |  |
| `equipment.quantity` | How many |  |  |
| `equipment.ratedPower` | Rated power |  |  |
| `equipment.requestThis` | Request this |  |  |
| `equipment.required` | This is required. |  |  |
| `equipment.submit` | Submit request |  |  |
| `equipment.submitting` | Submitting… |  |  |
| `equipment.successDetail` | Ops will review it. You can follow it under Requests. |  |  |
| `equipment.successTitle` | Request submitted |  |  |
| `equipment.title` | Equipment |  |  |
| `equipment.viewRequest` | View the request |  |  |
| `equipment.wholeNumber` | Enter a whole number. |  |  |
| `error.badId` | That record reference is not valid. |  |  |
| `error.badReference` | That refers to a record that does not exist. |  |  |
| `error.contributionPositive` | A contribution must be more than zero. |  |  |
| `error.daysRange` | Days per week must be between 0 and 7. |  |  |
| `error.duplicate` | That record already exists. |  |  |
| `error.duplicateBuyer` | A buyer with that name already exists in this project. |  |  |
| `error.duplicateEquipmentCode` | That equipment code is already in use in this project. |  |  |
| `error.duplicateSupply` | That harvest figure is already attached to this opportunity. |  |  |
| `error.hoursRange` | Hours per day must be between 0 and 24. |  |  |
| `error.invalidValue` | One of the values is not allowed here. Check the form and try again. |  |  |
| `error.missingValue` | A required value is missing. |  |  |
| `error.network` | Could not reach the server. Check your connection and try again. |  |  |
| `error.notAllowed` | You do not have permission to do that. |  |  |
| `error.numericOverflow` | One of the numbers is too large for the field it was typed into. Check the figures and try again. |  |  |
| `error.oneCurrentHarvest` | A crop cycle can only have one current harvest figure. Supersede the existing one instead. |  |  |
| `error.quantityNotNegative` | The quantity cannot be negative. |  |  |
| `error.quantityPositive` | The quantity must be more than zero. |  |  |
| `error.retry` | Try again |  |  |
| `error.title` | Something went wrong |  |  |
| `error.unexpected` | Something went wrong that should not have. Try again, and tell the programme team if it keeps happening. |  |  |
| `error.windowBackwards` | The window must end on or after it starts. |  |  |
| `estimate.basis` | Calculated from rated power and the operating assumptions below (Level 1). |  | Always labelled an ESTIMATE. Not a measurement, not a commitment. |
| `estimate.days` | Days per week |  | Always labelled an ESTIMATE. Not a measurement, not a commitment. |
| `estimate.hours` | Hours per day |  | Always labelled an ESTIMATE. Not a measurement, not a commitment. |
| `estimate.isEstimate` | This is an estimate, not a measurement. |  | Always labelled an ESTIMATE. Not a measurement, not a commitment. |
| `estimate.peak` | Estimated peak |  | Always labelled an ESTIMATE. Not a measurement, not a commitment. |
| `estimate.peakNote` | Peak power does not change with hours of use. |  | Always labelled an ESTIMATE. Not a measurement, not a commitment. |
| `estimate.perDay` | Estimated per day |  | Always labelled an ESTIMATE. Not a measurement, not a commitment. |
| `estimate.perWeek` | Estimated per week |  | Always labelled an ESTIMATE. Not a measurement, not a commitment. |
| `estimate.quantity` | Quantity |  | Always labelled an ESTIMATE. Not a measurement, not a commitment. |
| `estimate.ratedPower` | Rated power |  | Always labelled an ESTIMATE. Not a measurement, not a commitment. |
| `estimate.title` | Energy estimate |  | Always labelled an ESTIMATE. Not a measurement, not a commitment. |
| `farmDetail.gps` | GPS point |  |  |
| `farmDetail.noGps` | Not captured |  |  |
| `farmDetail.noPlotsDetail` | This farm has no plots yet. |  |  |
| `farmDetail.noPlotsTitle` | No plots recorded |  |  |
| `farmDetail.notFoundDetail` | It may not exist, or it may be outside your villages. |  |  |
| `farmDetail.notFoundTitle` | Farm not found |  |  |
| `farmDetail.plotCount` | Plots |  |  |
| `farmDetail.plots` | Plots |  |  |
| `farmerOpportunities.buyerWithOps` | Your field officer holds the buyer details. |  |  |
| `farmerOpportunities.noneDetail` | None of your harvest has been put forward to a buyer yet. |  |  |
| `farmerOpportunities.noneTitle` | No opportunities yet |  |  |
| `farmerOpportunities.notASale` | An opportunity is not a sale, a delivery or a payment. It records that your harvest has been put forward to a buyer. Nothing has moved and nothing is owed. |  | An opportunity is NOT a sale, a delivery or a payment. "Accepted" means both sides agreed to keep talking. |
| `farmerOpportunities.opportunityTotal` | Opportunity total |  | An opportunity is NOT a sale, a delivery or a payment. "Accepted" means both sides agreed to keep talking. |
| `farmerOpportunities.title` | Opportunities |  |  |
| `farmerOpportunities.yourShare` | Your share |  |  |
| `farmHome.browseEquipment` | Browse equipment |  |  |
| `farmHome.cycles` | Crops growing |  |  |
| `farmHome.farms` | Farms |  |  |
| `farmHome.latestRequest` | Latest equipment request |  |  |
| `farmHome.noFarmDetail` | Your field officer has not registered your farm yet. Ask them to add it. |  |  |
| `farmHome.noFarmTitle` | No farm recorded yet |  |  |
| `farmHome.noOpportunities` | None of your harvest has been put forward to a buyer yet. |  |  |
| `farmHome.noRequests` | You have not asked for any equipment yet. |  |  |
| `farmHome.notASale` | An opportunity is not a sale, a delivery or a payment. |  | An opportunity is NOT a sale, a delivery or a payment. "Accepted" means both sides agreed to keep talking. |
| `farmHome.openMyFarm` | See my records |  |  |
| `farmHome.openOpportunities` | See opportunities |  |  |
| `farmHome.opportunities` | Opportunities |  |  |
| `farmHome.opportunityCount_one` | Your harvest is in 1 opportunity. |  | An opportunity is NOT a sale, a delivery or a payment. "Accepted" means both sides agreed to keep talking. |
| `farmHome.opportunityCount_other` | Your harvest is in {{count}} opportunities. |  | An opportunity is NOT a sale, a delivery or a payment. "Accepted" means both sides agreed to keep talking. Keep {{count}} |
| `farmHome.plots` | Plots |  |  |
| `farmHome.title` | My farm |  |  |
| `harvestKind.actual` | Actual |  |  |
| `harvestKind.expected` | Expected |  |  |
| `language.en` | English | Kiingereza |  |
| `language.notSaved` | Language changed for now, but could not be saved. |  |  |
| `language.sw` | Kiswahili | Kiswahili |  |
| `login.email` | Email address |  |  |
| `login.emailInvalid` | That does not look like an email address. |  |  |
| `login.emailRequired` | Enter your email address. |  |  |
| `login.invalid` | That email and password do not match an account. |  |  |
| `login.network` | Could not reach the server. Check your connection and try again. |  |  |
| `login.password` | Password |  |  |
| `login.passwordRequired` | Enter your password. |  |  |
| `login.submit` | Sign in |  |  |
| `login.submitting` | Signing in… |  |  |
| `login.title` | Sign in |  |  |
| `login.unexpected` | Something went wrong signing in. |  |  |
| `myFarm.expected` | Expected harvest |  |  |
| `myFarm.noCycles` | No crops recorded on this plot yet |  |  |
| `myFarm.noFarmDetail` | A field officer will register your farm and it will appear here. |  |  |
| `myFarm.noFarmTitle` | No farm recorded yet |  |  |
| `myFarm.noPlots` | No plots recorded on this farm yet |  |  |
| `myFarm.plots` | Plots |  |  |
| `myFarm.readOnly` | This is a record of what has been registered. Ask your field officer to change anything. |  |  |
| `myFarm.title` | My farm |  |  |
| `myFarm.window` | Harvest window |  |  |
| `nav.buyers` | Buyers |  |  |
| `nav.catalogue` | Catalogue |  |  |
| `nav.demand` | Demand |  |  |
| `nav.equipment` | Equipment |  |  |
| `nav.myFarm` | My farm |  |  |
| `nav.opportunities` | Opportunities |  |  |
| `nav.people` | People |  |  |
| `nav.register` | Register |  |  |
| `nav.requests` | Requests |  |  |
| `nav.signingOut` | Signing out… |  |  |
| `nav.signOut` | Sign out |  |  |
| `nav.tower` | Control Tower |  |  |
| `nav.verify` | Verify |  |  |
| `nav.villages` | Villages |  |  |
| `noAccess.detail` | Your account is not attached to a project yet. Ask your programme manager to add you. |  |  |
| `noAccess.signOut` | Sign out |  |  |
| `noAccess.title` | No access yet |  |  |
| `notFound.detail` | The link may be out of date. |  |  |
| `notFound.home` | Go to your home screen |  |  |
| `notFound.title` | That page does not exist |  |  |
| `officerHome.farms` | Farms |  |  |
| `officerHome.nothingOutstanding` | Every record in your villages is verified. |  |  |
| `officerHome.noVillagesDetail` | Your account is on the project but not yet attached to a village. Ask your programme manager to assign one. |  |  |
| `officerHome.noVillagesTitle` | No village assigned yet |  |  |
| `officerHome.openVerifyQueue` | Open the verify queue |  |  |
| `officerHome.outstanding_one` | 1 record still needs verifying. |  |  |
| `officerHome.outstanding_other` | {{count}} records still need verifying. |  | Keep {{count}} |
| `officerHome.people` | People |  |  |
| `officerHome.register` | Register a farmer |  |  |
| `officerHome.requests` | Equipment requests |  |  |
| `officerHome.title` | Your villages |  |  |
| `officerHome.villageOutstanding_one` | 1 record here still needs verifying |  |  |
| `officerHome.villageOutstanding_other` | {{count}} records here still need verifying |  | Keep {{count}} |
| `officerHome.villages` | Assigned villages |  |  |
| `people.allVerifications` | All |  |  |
| `people.colName` | Name |  |  |
| `people.colPhone` | Phone |  |  |
| `people.colProvenance` | Provenance |  |  |
| `people.colVillage` | Village |  |  |
| `people.filterVerification` | Verification |  |  |
| `people.noneDetail` | Try a different name or clear the verification filter. |  |  |
| `people.noneTitle` | No people match |  |  |
| `people.search` | Search by name |  |  |
| `people.searchPlaceholder` | Given or family name |  |  |
| `people.title` | People |  |  |
| `person.actual` | Actual |  |  |
| `person.allVerified` | Every record here is verified |  |  |
| `person.cycles` | Crop cycles |  |  |
| `person.expected` | Expected |  |  |
| `person.farms` | Farms |  |  |
| `person.harvests` | Harvest figures |  |  |
| `person.households` | Households |  |  |
| `person.members` | Members |  |  |
| `person.noFarms` | No farms recorded yet |  |  |
| `person.noFarmsDetail` | Farms appear here once one is registered. |  |  |
| `person.noHouseholds` | No household recorded |  |  |
| `person.notFoundDetail` | This record may not exist, or you may not have access to it. |  |  |
| `person.notFoundTitle` | Person not found |  |  |
| `person.plantedArea` | Planted area |  | This is planted area ACROSS CYCLES, never "land area": intercropping means it can exceed the village’s hectares. |
| `person.plots` | Plots |  |  |
| `person.superseded` | Superseded |  |  |
| `person.trees` | Trees |  |  |
| `person.units` | Units |  |  |
| `person.unverifiedCount_one` | {{count}} record still needs verifying |  | Keep {{count}} |
| `person.unverifiedCount_other` | {{count}} records still need verifying |  | Keep {{count}} |
| `person.verified` | Verified |  |  |
| `person.verify` | Verify |  |  |
| `person.verifying` | Verifying… |  |  |
| `person.window` | Harvest window |  |  |
| `provenance.capturedAt` | Captured |  | Provenance wording: where a record came from, and who verified it. |
| `provenance.capturedBy` | by |  | Provenance wording: where a record came from, and who verified it. |
| `provenance.confidenceLabel` | Confidence |  | Provenance wording: where a record came from, and who verified it. |
| `register.chooseCrop` | Choose a crop |  |  |
| `register.confidence` | Confidence |  | Confidence level recorded with a figure. Low / medium / high. |
| `register.crop` | Crop |  |  |
| `register.cycleArea` | Planted area (ha) |  | This is planted area ACROSS CYCLES, never "land area": intercropping means it can exceed the village’s hectares. |
| `register.familyName` | Family name |  |  |
| `register.farmLabel` | Farm name |  |  |
| `register.givenName` | First name |  |  |
| `register.harvestEnd` | Harvest window ends |  |  |
| `register.harvestKg` | Expected harvest (kg) |  |  |
| `register.harvestStart` | Harvest window starts |  |  |
| `register.householdLabel` | Household name (optional) |  |  |
| `register.intro` | One page, one submit. Everything below is created together. |  |  |
| `register.isHead` | This person heads the household |  |  |
| `register.latitude` | Latitude (optional) |  |  |
| `register.latitudeRange` | Latitude runs from -90 to 90. |  |  |
| `register.longitude` | Longitude (optional) |  |  |
| `register.longitudeRange` | Longitude runs from -180 to 180. |  |  |
| `register.notANumber` | Enter a number. |  |  |
| `register.notNegative` | This cannot be negative. |  |  |
| `register.noVillage` | No village to register into |  |  |
| `register.noVillageDetail` | Registration needs a village assignment. Ask your programme manager. |  |  |
| `register.phone` | Phone (optional) |  |  |
| `register.phoneHint` | Include the country code, for example +255700000101. |  |  |
| `register.plantedOn` | Planted on (optional) |  |  |
| `register.plotArea` | Plot area (ha) |  |  |
| `register.plotLabel` | Plot name |  |  |
| `register.provenanceNote` | Recorded as field-verified, captured by you. This is not a choice. |  | Provenance wording: where a record came from, and who verified it. |
| `register.registerAnother` | Register another |  |  |
| `register.required` | This is required. |  |  |
| `register.roundedNote` | This will be stored as {{value}}. |  | Keep {{value}} |
| `register.sections.cycle` | Crop cycle |  |  |
| `register.sections.farm` | Farm |  |  |
| `register.sections.harvest` | Expected harvest |  |  |
| `register.sections.household` | Household |  |  |
| `register.sections.person` | Person |  |  |
| `register.sections.plot` | Plot |  |  |
| `register.submit` | Register |  |  |
| `register.submitting` | Registering… |  |  |
| `register.successDetail` | The records were created together. |  |  |
| `register.successTitle` | Registered |  |  |
| `register.title` | Register a farmer |  |  |
| `register.tooLarge` | This number is too large for the field. |  |  |
| `register.treeCount` | Number of trees |  |  |
| `register.unitCount` | Number of units |  |  |
| `register.viewPerson` | Open the record |  |  |
| `register.wholeNumber` | Enter a whole number. |  |  |
| `register.windowBackwards` | The harvest window must end on or after it starts. |  |  |
| `requests.action.submit` | Send this request |  |  |
| `requests.action.withdraw` | Withdraw |  |  |
| `requests.assumptions` | Assumptions |  |  |
| `requests.decision` | Decision |  |  |
| `requests.draftNote` | This request has not been sent yet. Nobody is reviewing it until you send it. |  |  |
| `requests.frozen` | A submitted request cannot be changed. Ask your field officer if something needs correcting. |  |  |
| `requests.noEstimate` | No estimate stored for this request |  | Always labelled an ESTIMATE. Not a measurement, not a commitment. |
| `requests.noEstimateDetail` | This equipment has no rated power recorded, so no estimate could be calculated. |  | Always labelled an ESTIMATE. Not a measurement, not a commitment. |
| `requests.noneDetail` | Requests you submit will appear here. |  |  |
| `requests.noneTitle` | No requests yet |  |  |
| `requests.notFoundDetail` | It may not exist, or you may not have access to it. |  |  |
| `requests.notFoundTitle` | Request not found |  |  |
| `requests.storedEstimate` | Stored estimate |  | Always labelled an ESTIMATE. Not a measurement, not a commitment. |
| `requests.submittedOn` | Submitted |  |  |
| `requests.title` | My requests |  |  |
| `requestStatus.approved` | Approved |  |  |
| `requestStatus.draft` | Draft |  |  |
| `requestStatus.rejected` | Rejected |  |  |
| `requestStatus.submitted` | Submitted |  |  |
| `requestStatus.under_review` | Under review |  |  |
| `requestStatus.withdrawn` | Withdrawn |  |  |
| `role.admin` | Administrator |  |  |
| `role.farmer` | Farmer |  |  |
| `role.field_officer` | Field officer |  |  |
| `role.ops` | Operations |  |  |
| `selectRole.continue` | Continue |  |  |
| `selectRole.detail` | You hold more than one role. Pick the one you want to work in. |  |  |
| `selectRole.noneDetail` | Your access may have changed. Ask your programme manager. |  |  |
| `selectRole.noneTitle` | No roles to choose from |  |  |
| `selectRole.title` | Choose a role |  |  |
| `selectRole.wholeProject` | Whole project |  |  |
| `source.farmer_reported` | Farmer reported |  | Provenance wording: where a record came from, and who verified it. |
| `source.field_verified` | Field verified |  | Provenance wording: where a record came from, and who verified it. |
| `source.model_estimated` | Estimated |  | Always labelled an ESTIMATE. Not a measurement, not a commitment. |
| `source.sensor_derived` | Sensor measured |  | Provenance wording: where a record came from, and who verified it. |
| `source.transaction_derived` | From a transaction |  | Provenance wording: where a record came from, and who verified it. |
| `table.emptyDetail` | No records match. |  |  |
| `table.emptyTitle` | Nothing to show |  |  |
| `verification.disputed` | Disputed |  | Provenance wording: where a record came from, and who verified it. |
| `verification.pending` | Pending |  | Provenance wording: where a record came from, and who verified it. |
| `verification.unverified` | Unverified |  | Provenance wording: where a record came from, and who verified it. |
| `verification.verified` | Verified |  | Provenance wording: where a record came from, and who verified it. |
| `verifyQueue.intro` | Records captured in your villages that nobody has checked yet. Verifying attaches your name to the record. |  |  |
| `verifyQueue.noneDetail` | Every record in your villages has been checked. |  |  |
| `verifyQueue.noneTitle` | Nothing waiting to be verified |  |  |
| `verifyQueue.outstanding_one` | 1 record waiting |  |  |
| `verifyQueue.outstanding_other` | {{count}} records waiting |  | Keep {{count}} |
| `verifyQueue.table.crop_cycle` | Crop cycle |  |  |
| `verifyQueue.table.farm` | Farm |  |  |
| `verifyQueue.table.harvest_report` | Harvest figure |  |  |
| `verifyQueue.table.household` | Household |  |  |
| `verifyQueue.table.person` | Person |  |  |
| `verifyQueue.table.plot` | Plot |  |  |
| `verifyQueue.title` | Verify |  |  |

## Optional — ops and tower surfaces

| Key | English | Swahili | Notes |
| --- | --- | --- | --- |
| `buyers.channel.afm` | AFM |  |  |
| `buyers.channel.direct` | Direct |  |  |
| `buyers.channel.other` | Other |  |  |
| `buyers.channelNote` | Channel is a label describing how the buyer was reached. 'AFM' records that origin only — there is no integration and no partnership implied. |  |  |
| `buyers.colActive` | Active |  |  |
| `buyers.colChannel` | Channel |  |  |
| `buyers.colContact` | Contact note |  |  |
| `buyers.colName` | Buyer |  |  |
| `buyers.create` | Add buyer |  |  |
| `buyers.createTitle` | Add a buyer |  |  |
| `buyers.creating` | Adding… |  |  |
| `buyers.nameRequired` | A buyer needs a name. |  |  |
| `buyers.noneDetail` | Add the first buyer to record demand against them. |  |  |
| `buyers.noneTitle` | No buyers yet |  |  |
| `buyers.title` | Buyers |  |  |
| `catalogue.colCategory` | Category |  |  |
| `catalogue.colDays` | Typical days/week |  |  |
| `catalogue.colHours` | Typical h/day |  |  |
| `catalogue.colName` | Equipment |  |  |
| `catalogue.colPower` | Rated power |  |  |
| `catalogue.colPrice` | Indicative price |  | Prices are INDICATIVE, never quotations. Must not read as a firm offer. |
| `catalogue.title` | Equipment catalogue |  |  |
| `coverage.available` | Available |  |  |
| `coverage.committed` | Already committed |  |  |
| `coverage.committedNote` | Committed supply is promised to a live opportunity and is not available again. |  |  |
| `coverage.demand` | Demand |  |  |
| `coverage.label` | Coverage |  |  |
| `demand.buyer` | Buyer |  |  |
| `demand.chooseBuyer` | Choose a buyer |  |  |
| `demand.chooseCrop` | Choose a crop |  |  |
| `demand.colAvailable` | Available |  |  |
| `demand.colBuyer` | Buyer |  |  |
| `demand.colCoverable` | Coverable |  |  |
| `demand.colCoverage` | Coverage |  |  |
| `demand.colCrop` | Crop |  |  |
| `demand.colOpportunity` | Opportunity |  |  |
| `demand.colPrice` | Indicative price/kg |  | Prices are INDICATIVE, never quotations. Must not read as a firm offer. |
| `demand.colQuantity` | Quantity |  |  |
| `demand.colStatus` | Status |  |  |
| `demand.colVillage` | Village |  |  |
| `demand.colWindow` | Window |  |  |
| `demand.create` | Record demand |  |  |
| `demand.createOpportunity` | Create opportunity |  |  |
| `demand.createTitle` | Record a demand |  |  |
| `demand.creating` | Recording… |  |  |
| `demand.creatingOpportunity` | Creating… |  |  |
| `demand.crop` | Crop |  |  |
| `demand.deliveryPoint` | Delivery point |  |  |
| `demand.matches` | Villages that could supply this |  |  |
| `demand.noneDetail` | Record a buyer requirement above and it will appear here. |  |  |
| `demand.noneTitle` | No demand recorded yet |  |  |
| `demand.noSupplyDetail` | No village has available supply of this crop in this window. That is an honest zero, not a missing row. |  |  |
| `demand.noSupplyTitle` | No matching supply |  |  |
| `demand.notASale` | An opportunity is not a sale, a delivery or a payment. It records that a village could supply a buyer. |  | An opportunity is NOT a sale, a delivery or a payment. "Accepted" means both sides agreed to keep talking. |
| `demand.notFoundDetail` | It may not exist, or you may not have access to it. |  |  |
| `demand.notFoundTitle` | Demand not found |  |  |
| `demand.pricePerKg` | Indicative price per kg |  | Prices are INDICATIVE, never quotations. Must not read as a firm offer. |
| `demand.qualityNote` | Quality note |  |  |
| `demand.quantity` | Quantity (kg) |  |  |
| `demand.required` | This is required. |  |  |
| `demand.title` | Buyer demand |  |  |
| `demand.window` | Window |  |  |
| `demand.windowEnd` | Window ends |  |  |
| `demand.windowStart` | Window starts |  |  |
| `demandStatus.cancelled` | Cancelled |  |  |
| `demandStatus.closed` | Closed |  |  |
| `demandStatus.matched` | Matched |  |  |
| `demandStatus.open` | Open |  |  |
| `opportunity.actionAccept` | Buyer accepted |  | An opportunity is NOT a sale, a delivery or a payment. "Accepted" means both sides agreed to keep talking. |
| `opportunity.actionDecline` | Buyer declined |  | An opportunity is NOT a sale, a delivery or a payment. "Accepted" means both sides agreed to keep talking. |
| `opportunity.actionLapse` | Mark lapsed |  | An opportunity is NOT a sale, a delivery or a payment. "Accepted" means both sides agreed to keep talking. |
| `opportunity.actionShare` | Share with buyer |  | An opportunity is NOT a sale, a delivery or a payment. "Accepted" means both sides agreed to keep talking. |
| `opportunity.attach` | Attach |  | An opportunity is NOT a sale, a delivery or a payment. "Accepted" means both sides agreed to keep talking. |
| `opportunity.attachClosedDetail` | This opportunity is closed, so its supply no longer counts as committed. A line attached here would record a commitment against nothing. |  | An opportunity is NOT a sale, a delivery or a payment. "Accepted" means both sides agreed to keep talking. |
| `opportunity.attachClosedTitle` | Nothing more can be attached |  | An opportunity is NOT a sale, a delivery or a payment. "Accepted" means both sides agreed to keep talking. |
| `opportunity.attachHarvest` | Available harvest |  | An opportunity is NOT a sale, a delivery or a payment. "Accepted" means both sides agreed to keep talking. |
| `opportunity.attaching` | Attaching… |  | An opportunity is NOT a sale, a delivery or a payment. "Accepted" means both sides agreed to keep talking. |
| `opportunity.attachKg` | Contribute (kg) |  | An opportunity is NOT a sale, a delivery or a payment. "Accepted" means both sides agreed to keep talking. |
| `opportunity.attachTitle` | Attach supply |  | An opportunity is NOT a sale, a delivery or a payment. "Accepted" means both sides agreed to keep talking. |
| `opportunity.chooseHarvest` | Choose a harvest figure |  | An opportunity is NOT a sale, a delivery or a payment. "Accepted" means both sides agreed to keep talking. |
| `opportunity.chooseHarvestRequired` | Choose a harvest figure to attach. |  | An opportunity is NOT a sale, a delivery or a payment. "Accepted" means both sides agreed to keep talking. |
| `opportunity.colContributed` | Contributed |  | An opportunity is NOT a sale, a delivery or a payment. "Accepted" means both sides agreed to keep talking. |
| `opportunity.colCycle` | Crop cycle |  | An opportunity is NOT a sale, a delivery or a payment. "Accepted" means both sides agreed to keep talking. |
| `opportunity.colFarmer` | Farmer |  | An opportunity is NOT a sale, a delivery or a payment. "Accepted" means both sides agreed to keep talking. |
| `opportunity.colPlot` | Plot |  | An opportunity is NOT a sale, a delivery or a payment. "Accepted" means both sides agreed to keep talking. |
| `opportunity.demandQuantity` | Buyer's demand |  | An opportunity is NOT a sale, a delivery or a payment. "Accepted" means both sides agreed to keep talking. |
| `opportunity.harvestOption` | {{expected}} expected · {{available}} available |  | An opportunity is NOT a sale, a delivery or a payment. "Accepted" means both sides agreed to keep talking. Keep {{expected}} {{available}} |
| `opportunity.kgMoreThanZero` | A contribution has to be more than zero. |  | An opportunity is NOT a sale, a delivery or a payment. "Accepted" means both sides agreed to keep talking. |
| `opportunity.kgNotANumber` | Enter a number. |  | An opportunity is NOT a sale, a delivery or a payment. "Accepted" means both sides agreed to keep talking. |
| `opportunity.kgRequired` | Enter how many kilograms. |  | An opportunity is NOT a sale, a delivery or a payment. "Accepted" means both sides agreed to keep talking. |
| `opportunity.kgTooLarge` | This number is too large for the field. |  | An opportunity is NOT a sale, a delivery or a payment. "Accepted" means both sides agreed to keep talking. |
| `opportunity.moving` | Saving… |  | An opportunity is NOT a sale, a delivery or a payment. "Accepted" means both sides agreed to keep talking. |
| `opportunity.noneAvailableDetail` | Every current harvest figure for this village, crop and window is already committed. |  | An opportunity is NOT a sale, a delivery or a payment. "Accepted" means both sides agreed to keep talking. |
| `opportunity.noneAvailableTitle` | Nothing available to attach |  | An opportunity is NOT a sale, a delivery or a payment. "Accepted" means both sides agreed to keep talking. |
| `opportunity.noSupplyDetail` | Attach available harvest figures below. |  | An opportunity is NOT a sale, a delivery or a payment. "Accepted" means both sides agreed to keep talking. |
| `opportunity.noSupplyTitle` | No supply attached yet |  | An opportunity is NOT a sale, a delivery or a payment. "Accepted" means both sides agreed to keep talking. |
| `opportunity.notASale` | An opportunity is not a sale, a delivery or a payment. Accepted means both sides agreed to keep talking; nothing has moved. |  | An opportunity is NOT a sale, a delivery or a payment. "Accepted" means both sides agreed to keep talking. |
| `opportunity.notFoundDetail` | It may not exist, or you may not have access to it. |  | An opportunity is NOT a sale, a delivery or a payment. "Accepted" means both sides agreed to keep talking. |
| `opportunity.notFoundTitle` | Opportunity not found |  | An opportunity is NOT a sale, a delivery or a payment. "Accepted" means both sides agreed to keep talking. |
| `opportunity.offered` | Offered |  | An opportunity is NOT a sale, a delivery or a payment. "Accepted" means both sides agreed to keep talking. |
| `opportunity.offeredNote` | This total is re-summed by the database from the supply lines below. It cannot drift from them. |  | An opportunity is NOT a sale, a delivery or a payment. "Accepted" means both sides agreed to keep talking. |
| `opportunity.releaseDetail` | {{kg}} returns to available supply for this village, and the buyer's coverage falls. This cannot be undone: a declined or lapsed opportunity cannot be reopened. |  | An opportunity is NOT a sale, a delivery or a payment. "Accepted" means both sides agreed to keep talking. Keep {{kg}} |
| `opportunity.releasedNote` | Closed. Its {{kg}} has gone back to available supply for this village. The supply lines below stay on the record — nothing was deleted. |  | An opportunity is NOT a sale, a delivery or a payment. "Accepted" means both sides agreed to keep talking. Keep {{kg}} |
| `opportunity.releaseNo` | Cancel |  | An opportunity is NOT a sale, a delivery or a payment. "Accepted" means both sides agreed to keep talking. |
| `opportunity.releaseTitle` | Release the committed supply? |  | An opportunity is NOT a sale, a delivery or a payment. "Accepted" means both sides agreed to keep talking. |
| `opportunity.releaseYes` | Yes, release the supply |  | An opportunity is NOT a sale, a delivery or a payment. "Accepted" means both sides agreed to keep talking. |
| `opportunity.supplyLines` | Supply |  | An opportunity is NOT a sale, a delivery or a payment. "Accepted" means both sides agreed to keep talking. |
| `opportunity.title` | Opportunity |  | An opportunity is NOT a sale, a delivery or a payment. "Accepted" means both sides agreed to keep talking. |
| `opportunityStatus.accepted` | Accepted |  | An opportunity is NOT a sale, a delivery or a payment. "Accepted" means both sides agreed to keep talking. |
| `opportunityStatus.declined` | Declined |  | An opportunity is NOT a sale, a delivery or a payment. "Accepted" means both sides agreed to keep talking. |
| `opportunityStatus.lapsed` | Lapsed |  | An opportunity is NOT a sale, a delivery or a payment. "Accepted" means both sides agreed to keep talking. |
| `opportunityStatus.proposed` | Proposed |  | An opportunity is NOT a sale, a delivery or a payment. "Accepted" means both sides agreed to keep talking. |
| `opportunityStatus.shared` | Shared |  | An opportunity is NOT a sale, a delivery or a payment. "Accepted" means both sides agreed to keep talking. |
| `ops.allStatuses` | All statuses |  |  |
| `ops.allVillages` | All villages |  |  |
| `ops.applicant` | Applicant |  |  |
| `ops.approve` | Approve |  |  |
| `ops.approvedPeak` | Approved peak |  |  |
| `ops.capacity` | Planned capacity |  | Capacity is PLANNED or NAMEPLATE, never measured. Always shown with its basis. |
| `ops.capacityBasis` | Basis |  | Capacity is PLANNED or NAMEPLATE, never measured. Always shown with its basis. |
| `ops.colApplicant` | Applicant |  |  |
| `ops.colEquipment` | Equipment |  |  |
| `ops.colEstKw` | Est. kW |  |  |
| `ops.colStatus` | Status |  |  |
| `ops.colSubmitted` | Submitted |  |  |
| `ops.colVillage` | Village |  |  |
| `ops.decisionNote` | Decision note |  |  |
| `ops.decisionNoteRequired` | A decision needs a note explaining it. |  |  |
| `ops.farm` | Farm |  |  |
| `ops.filterStatus` | Status |  |  |
| `ops.filterVillage` | Village |  |  |
| `ops.headroom` | Village headroom |  |  |
| `ops.neverSummed` | Prospective and approved demand are separate figures and are never added together. |  |  |
| `ops.noActions` | No actions are available in this state. |  |  |
| `ops.noHeadroom` | No capacity recorded for this village |  |  |
| `ops.noHeadroomDetail` | A current village_capacity row is needed before headroom can be shown. |  |  |
| `ops.noRequestsDetail` | Try a different status or village. |  |  |
| `ops.noRequestsTitle` | No requests match |  |  |
| `ops.notFoundDetail` | It may not exist, or you may not have access to it. |  |  |
| `ops.notFoundTitle` | Request not found |  |  |
| `ops.prospectivePeak` | Prospective peak |  | Prospective and approved demand are separate figures and are NEVER summed. |
| `ops.reject` | Reject |  |  |
| `ops.requestsTitle` | Request pipeline |  |  |
| `ops.reviewTitle` | Review request |  |  |
| `ops.simultaneity` | Simultaneity factor |  |  |
| `ops.snapshotted` | Snapshotted inputs |  |  |
| `ops.snapshottedNote` | These are the assumptions as they were when the estimate was calculated. |  |  |
| `ops.startReview` | Start review |  |  |
| `ops.village` | Village |  |  |
| `ops.working` | Working… |  |  |
| `opsHome.awaitingReview` | Requests awaiting review |  |  |
| `opsHome.awaitingReviewDetail` | Submitted or under review |  |  |
| `opsHome.openDemands` | Open buyer demands |  |  |
| `opsHome.openDemandsDetail` | Still looking for supply |  |  |
| `opsHome.outstandingRecords` | Records to verify |  |  |
| `opsHome.outstandingRecordsDetail` | Captured but not yet checked |  |  |
| `opsHome.title` | Today |  |  |
| `tower.actual` | Actual |  |  |
| `tower.approvedNote` | Decided yes. Still not measured consumption. |  |  |
| `tower.approvedPeak` | Approved peak |  |  |
| `tower.available` | Available |  |  |
| `tower.backToTower` | Back to the Tower |  |  |
| `tower.basis` | Basis |  | Capacity is PLANNED or NAMEPLATE, never measured. Always shown with its basis. |
| `tower.capacity` | Planned capacity |  | Capacity is PLANNED or NAMEPLATE, never measured. Always shown with its basis. |
| `tower.chooseVillage` | Choose a village |  |  |
| `tower.colActual` | Actual |  |  |
| `tower.colApplicant` | Applicant |  |  |
| `tower.colAvailable` | Available |  |  |
| `tower.colBuyer` | Buyer |  |  |
| `tower.colCoverage` | Coverage |  |  |
| `tower.colCrop` | Crop |  |  |
| `tower.colCycles` | Cycles |  |  |
| `tower.colDemand` | Demand |  |  |
| `tower.colEquipment` | Equipment |  |  |
| `tower.colExpected` | Expected |  |  |
| `tower.colOpportunity` | Opportunity |  |  |
| `tower.colPeak` | Est. peak |  |  |
| `tower.colStatus` | Status |  |  |
| `tower.colVerified` | Verified cycles |  |  |
| `tower.colWindow` | Window |  |  |
| `tower.coverage` | Coverage |  |  |
| `tower.cycles` | Cycles |  |  |
| `tower.cyclesWithEstimate` | Cycles with an estimate |  | Always labelled an ESTIMATE. Not a measurement, not a commitment. |
| `tower.drill` | See the records |  |  |
| `tower.energy` | Energy |  |  |
| `tower.energyDrill` | Requests behind the energy figures |  |  |
| `tower.excludedFromFigures_one` | 1 more request in this village is draft, rejected or withdrawn. It feeds neither figure — the equipment pipeline tile counts every status. |  |  |
| `tower.excludedFromFigures_other` | {{count}} more requests in this village are draft, rejected or withdrawn. They feed neither figure — the equipment pipeline tile counts every status. |  | Keep {{count}} |
| `tower.expected` | Expected |  |  |
| `tower.farmsWithGps` | Farms with GPS |  |  |
| `tower.headroom` | Headroom |  |  |
| `tower.indicativeValue` | Indicative value |  | Prices are INDICATIVE, never quotations. Must not read as a firm offer. |
| `tower.indicativeValueNote` | Catalogue price times quantity. Not financed value and not a loan book. |  | Prices are INDICATIVE, never quotations. Must not read as a firm offer. |
| `tower.market` | Market |  |  |
| `tower.marketDrill` | Demand against available supply |  |  |
| `tower.marketNote` | Open demand against supply that is still available. |  |  |
| `tower.neverSummed` | Prospective and approved are separate figures and are never added together. |  |  |
| `tower.noCapacityDetail` | A current village_capacity row is needed before energy figures can be shown. |  | Capacity is PLANNED or NAMEPLATE, never measured. Always shown with its basis. |
| `tower.noCapacityTitle` | No capacity recorded |  | Capacity is PLANNED or NAMEPLATE, never measured. Always shown with its basis. |
| `tower.noDataDetail` | This tile fills in as records are created. |  |  |
| `tower.noDataTitle` | Nothing recorded yet |  |  |
| `tower.noneInFigure` | No requests in this figure. |  |  |
| `tower.noVillageDetail` | The Tower reports on one village at a time. |  |  |
| `tower.noVillageTitle` | Choose a village |  |  |
| `tower.openDemand` | Open demand |  |  |
| `tower.personsVerified` | Persons verified |  |  |
| `tower.plantedArea` | Planted area across cycles |  | This is planted area ACROSS CYCLES, never "land area": intercropping means it can exceed the village’s hectares. |
| `tower.plantedAreaNote` | The sum of cycle areas. Intercropping means several cycles share a plot, so this can exceed the village’s hectares. It is not land area. |  | This is planted area ACROSS CYCLES, never "land area": intercropping means it can exceed the village’s hectares. |
| `tower.production` | Production |  |  |
| `tower.productionDrill` | Production by crop and window |  |  |
| `tower.productionNote` | Expected and actual harvest by crop and window. |  |  |
| `tower.prospectiveNote` | Requests submitted or under review. An application, not a load. |  | Prospective and approved demand are separate figures and are NEVER summed. |
| `tower.prospectivePeak` | Prospective peak |  | Prospective and approved demand are separate figures and are NEVER summed. |
| `tower.pue` | Equipment pipeline |  |  |
| `tower.pueNote` | Requests by status, with the catalogue value they represent. |  |  |
| `tower.quality` | Data quality |  |  |
| `tower.qualityNote` | How much of what has been recorded has been checked. |  |  |
| `tower.requests` | Requests |  |  |
| `tower.simultaneity` | Simultaneity factor |  |  |
| `tower.simultaneityNote` | Applied to the peaks above. Village peak is not the sum of rated power. |  |  |
| `tower.sumOfPeaks` | Sum of estimated peaks |  |  |
| `tower.timesFactor` | × {{factor}} simultaneity = |  | Keep {{factor}} |
| `tower.title` | Control Tower |  |  |
| `tower.trees` | Trees |  |  |
| `tower.village` | Village |  |  |
| `villages.colBasis` | Basis |  |  |
| `villages.colCapacity` | Planned capacity |  | Capacity is PLANNED or NAMEPLATE, never measured. Always shown with its basis. |
| `villages.colCode` | Code |  |  |
| `villages.colEffectiveFrom` | Effective from |  |  |
| `villages.colName` | Village |  |  |
| `villages.colSimultaneity` | Simultaneity factor |  |  |
| `villages.noneDetail` | No villages are visible for this project. |  |  |
| `villages.noneTitle` | No villages |  |  |
| `villages.plannedNote` | Capacity is planned, never measured. Every figure is shown with the basis it was planned on. |  |  |
| `villages.simultaneityNote` | The simultaneity factor is applied to village peaks. Village peak is not the sum of rated power. |  |  |
| `villages.title` | Villages |  |  |

