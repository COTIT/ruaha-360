import { existsSync, readFileSync } from 'node:fs'

import { describe, expect, test } from 'vitest'

/**
 * What a static host has to be told, and what it does when it is not.
 *
 * `https://ruaha360.netlify.app` served a blank page: with no build command
 * and no publish directory, Netlify published the REPOSITORY ROOT, so the
 * browser got the dev `index.html` and asked for `/src/main.tsx` — delivered
 * as `application/octet-stream`, which a module script may not be. Nothing
 * rendered and nothing said why.
 *
 * The second failure is quieter and was still ahead of us. This is an SPA
 * with no SSR: the server has one file. Without a catch-all rewrite, `/` works
 * and every deep link — the URL an officer bookmarks, the one in a reset
 * email, anything reached by reload — is a 404 from the host that never
 * reaches the router. The rewrite must be 200, not a redirect: the address
 * has to stay the address the user typed.
 */
const CONFIG = 'netlify.toml'

describe('the static host is told how to build and how to route', () => {
  const config = existsSync(CONFIG) ? readFileSync(CONFIG, 'utf8') : ''

  test('there is a config at all', () => {
    expect(config, `${CONFIG} is missing, so the host publishes the repo root`).not.toBe('')
  })

  test('it builds and publishes the bundle, not the sources', () => {
    expect(config).toMatch(/command\s*=\s*"pnpm build"/)
    expect(config).toMatch(/publish\s*=\s*"dist"/)
  })

  test('every deep link falls back to the one HTML file, with a rewrite not a redirect', () => {
    expect(config).toMatch(/from\s*=\s*"\/\*"/)
    expect(config).toMatch(/to\s*=\s*"\/index\.html"/)
    expect(config, 'a 30x would change the address the user is looking at').toMatch(
      /status\s*=\s*200/,
    )
  })

  test('no key is written into it — the host holds those, not the repository', () => {
    expect(config).not.toMatch(/eyJ[A-Za-z0-9_-]{10}/)
    expect(config).not.toMatch(/https:\/\/[a-z0-9]{20}\.supabase\.co/)
    expect(config, 'a service-role key may not exist in this app at all').not.toMatch(
      /SERVICE_ROLE/i,
    )
  })
})

/**
 * The same rule again, in the one place a hand-dropped deploy can still see it.
 *
 * `netlify.toml` is read from the root of what is PUBLISHED. A site built from
 * git publishes `dist/`, and the toml at the repository root is read before
 * that build — fine. But dragging `dist/` onto Netlify publishes a folder the
 * toml is not in, and the rewrite silently disappears with it: `/` works,
 * `/login` is a 404, and nothing explains why.
 *
 * `public/` is copied verbatim into `dist/`, so `_redirects` travels with the
 * bundle however it gets there. Two files saying the same thing is the point.
 */
describe('the SPA fallback survives a hand-dropped deploy', () => {
  const REDIRECTS = 'public/_redirects'

  test('public/_redirects carries the same rewrite', () => {
    expect(existsSync(REDIRECTS), `${REDIRECTS} is missing`).toBe(true)
    expect(readFileSync(REDIRECTS, 'utf8')).toMatch(/^\/\*\s+\/index\.html\s+200\b/m)
  })
})
