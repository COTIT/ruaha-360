import i18next from 'i18next'
import { initReactI18next } from 'react-i18next'

import enCommon from './en/common.json'
import swCommon from './sw/common.json'

// Only `common` exists in session 1. Per-feature namespaces are added with
// their features.
//
// CLAUDE.md: Farmer and Officer surfaces ship complete Swahili; Ops and Tower
// may ship English for the demo. Swahili product strings DO NOT EXIST YET and
// need a native reviewer — the only Swahili here is the language switch's own
// labels, which are standard terms rather than invented product copy. Do not
// add machine-translated strings to sw/.
//
// Reference data (crop, equipment, equipment_category names) is translated in
// the database via name_en / name_sw, never here: those rows are created at
// runtime and a repo file cannot translate them.
export const supportedLanguages = ['en', 'sw'] as const
export type SupportedLanguage = (typeof supportedLanguages)[number]

void i18next.use(initReactI18next).init({
  resources: {
    en: { common: enCommon },
    sw: { common: swCommon },
  },
  lng: 'en',
  fallbackLng: 'en',
  defaultNS: 'common',
  ns: ['common'],
  interpolation: { escapeValue: false },
})

export default i18next
