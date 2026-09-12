#!/usr/bin/env node
/**
 * Builds the Swahili handover file — `docs/i18n-handover.md`.
 *
 * CLAUDE.md: "Farmer and Officer surfaces ship complete Swahili. Ops and Tower
 * may ship English for the demo. **Swahili strings do not exist yet and need a
 * native reviewer** — flag any string you invent rather than shipping machine
 * translation to Tanzanian stakeholders."
 *
 * So this is the deliverable a translator receives, not a translation. It
 * exists because the string list is now frozen: every screen is built, and the
 * keys will not move under the reviewer while they work.
 *
 *   node scripts/i18n-handover.mjs        # writes docs/i18n-handover.md
 *
 * The pure functions are exported and unit-tested in src/i18n/handover.test.ts.
 */

/** Nested namespaces to dotted keys, which is how i18next addresses them. */
export function flatten(source, prefix = '') {
  const out = {}
  for (const [key, value] of Object.entries(source)) {
    const path = prefix ? `${prefix}.${key}` : key
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(out, flatten(value, path))
    } else {
      out[path] = value
    }
  }
  return out
}

/**
 * Namespaces that render on the Ops and Tower surfaces ONLY.
 *
 * Everything else — the farmer and officer screens, and the chrome both of
 * them render — is required, and so is anything unrecognised: a new
 * farmer-facing namespace must not fall off the reviewer's list by being
 * forgotten here.
 */
const OPTIONAL_NAMESPACES = new Set([
  'ops',
  'opsHome',
  'demand',
  'demandStatus',
  'opportunity',
  'opportunityStatus',
  'buyers',
  'villages',
  'catalogue',
  'coverage',
  'tower',
])

export function SURFACE_OF(key) {
  return OPTIONAL_NAMESPACES.has(key.split('.')[0]) ? 'optional' : 'required'
}

/**
 * CLAUDE.md's "Language and labelling" section, attached to the strings it
 * governs.
 *
 * These are product requirements, not copy preferences — "getting them wrong
 * misrepresents the programme" — and a reviewer who has not read CLAUDE.md
 * will render "estimate" as something confident and "indicative price" as a
 * quotation. Matched on the key path, so a note follows its string.
 */
const NOTES = [
  [
    /estimate|Estimate/,
    'Always labelled an ESTIMATE. Not a measurement, not a commitment.',
  ],
  [
    /indicative|price|Price/,
    'Prices are INDICATIVE, never quotations. Must not read as a firm offer.',
  ],
  [
    /^capacityBasis|capacity|Capacity|basis/,
    'Capacity is PLANNED or NAMEPLATE, never measured. Always shown with its basis.',
  ],
  [
    /notASale|opportunity/,
    'An opportunity is NOT a sale, a delivery or a payment. "Accepted" means both sides agreed to keep talking.',
  ],
  [
    /plantedArea|cycleArea|areaAcross/,
    'This is planted area ACROSS CYCLES, never "land area": intercropping means it can exceed the village’s hectares.',
  ],
  [
    /prospective|approved.*peak|peak/,
    'Prospective and approved demand are separate figures and are NEVER summed.',
  ],
  [/provenance|source|verification/, 'Provenance wording: where a record came from, and who verified it.'],
  [/confidence/, 'Confidence level recorded with a figure. Low / medium / high.'],
]

function noteFor(key) {
  for (const [pattern, note] of NOTES) {
    if (pattern.test(key)) return note
  }
  return ''
}

/** i18next interpolation, which has to survive translation intact. */
function placeholdersIn(value) {
  return String(value).match(/\{\{[^}]+\}\}/g) ?? []
}

/**
 * One row per English key.
 *
 * Required rows first: a reviewer's time is the scarce resource here, and the
 * farmer and officer surfaces are the ones that block the demo.
 */
export function buildHandover(en, sw) {
  const english = flatten(en)
  const swahili = flatten(sw)

  const rows = Object.entries(english).map(([key, value]) => ({
    key,
    surface: SURFACE_OF(key),
    english: String(value),
    swahili: swahili[key] === undefined ? '' : String(swahili[key]),
    translated: swahili[key] !== undefined,
    placeholders: placeholdersIn(value),
    note: noteFor(key),
  }))

  return rows.sort((a, b) => {
    if (a.surface !== b.surface) return a.surface === 'required' ? -1 : 1
    return a.key.localeCompare(b.key)
  })
}

/** A pipe would otherwise close the column it sits in. */
function cell(text) {
  return String(text).replace(/\|/g, '\\|').replace(/\n/g, ' ')
}

export function renderHandover(rows, { generated }) {
  const required = rows.filter((r) => r.surface === 'required')
  const optional = rows.filter((r) => r.surface === 'optional')
  const done = rows.filter((r) => r.translated).length

  const section = (title, subset) =>
    [
      `## ${title}`,
      '',
      '| Key | English | Swahili | Notes |',
      '| --- | --- | --- | --- |',
      ...subset.map((r) => {
        const notes = [r.note, r.placeholders.length ? `Keep ${r.placeholders.join(' ')}` : '']
          .filter(Boolean)
          .join(' ')
        return `| \`${r.key}\` | ${cell(r.english)} | ${cell(r.swahili)} | ${cell(notes)} |`
      }),
      '',
    ].join('\n')

  return [
    '# Swahili handover — Ruaha 360',
    '',
    `Generated ${generated} from \`src/i18n/en/common.json\`. Do not edit by hand;`,
    'regenerate with `pnpm i18n:handover`.',
    '',
    '## What this is',
    '',
    'Every user-facing string in the application, for a **native Kiswahili',
    'reviewer** to translate. The string list is frozen: every screen is built,',
    'so the keys will not move while the work is under way.',
    '',
    '**Nothing here may be machine translated.** CLAUDE.md is explicit that',
    'machine translation must not be shipped to Tanzanian stakeholders, and the',
    'two strings that already carry Swahili are attested terms rather than',
    'invented product copy. An unreviewed guess is worse than English, because',
    'English is visibly untranslated and a wrong Swahili string is not.',
    '',
    '## Priority',
    '',
    '- **Required** — the farmer and officer surfaces, and the chrome both of',
    `  them render. ${required.length} strings. CLAUDE.md specifies these ship`,
    '  complete Swahili.',
    `- **Optional** — Ops and Tower. ${optional.length} strings. These may ship`,
    '  English for the demo.',
    '',
    `${rows.length} strings in total, of which ${done} already have Swahili.`,
    '',
    '## How to read the table',
    '',
    '- `{{value}}` and its siblings are placeholders. They must appear in the',
    '  translation exactly as written, or the string will render broken.',
    '- The Notes column carries product requirements from CLAUDE.md, not style',
    '  advice. "Estimate", "indicative" and "planned capacity" are claims about',
    '  what the programme does and does not promise; a translation that',
    '  strengthens them misrepresents it.',
    '- Leave a cell blank rather than guessing, and flag anything whose meaning',
    '  is unclear. A gap is a question; a wrong string is a defect nobody sees.',
    '',
    section('Required — farmer and officer surfaces', required),
    section('Optional — ops and tower surfaces', optional),
  ].join('\n')
}

// ── CLI ──────────────────────────────────────────────────────────────
// Only when run directly, so importing the pure functions writes nothing.
if (process.argv[1] && process.argv[1].endsWith('i18n-handover.mjs')) {
  const { readFileSync, writeFileSync } = await import('node:fs')
  const { resolve, dirname } = await import('node:path')
  const { fileURLToPath } = await import('node:url')

  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
  const read = (path) => JSON.parse(readFileSync(resolve(root, path), 'utf8'))

  const rows = buildHandover(read('src/i18n/en/common.json'), read('src/i18n/sw/common.json'))
  const out = resolve(root, 'docs/i18n-handover.md')
  writeFileSync(
    out,
    renderHandover(rows, { generated: new Date().toISOString().slice(0, 10) }) + '\n',
  )

  const required = rows.filter((r) => r.surface === 'required').length
  console.log(`wrote ${out} — ${rows.length} strings, ${required} required`)
}
