import { render, screen } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    to,
    ...rest
  }: { children: React.ReactNode; to: string } & Record<string, unknown>) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
}))

const { SurfaceNav } = await import('@/app/SurfaceNav')
const { navItemsFor } = await import('@/app/nav')
await import('@/i18n')

const OPS = navItemsFor('ops', [{ role: 'ops', revoked_at: null }] as never)
const FARMER = navItemsFor('farmer', [{ role: 'farmer', revoked_at: null }] as never)

/**
 * Icon plus label, never icon alone. The label carries the meaning for a
 * first-time user and survives translation; the icon carries recognition on the
 * tenth visit. Which also means the icon must contribute nothing to the text —
 * `shell.spec.ts` asserts the tab labels as an exact array, and an icon that
 * leaked a text node would break it for a reason unrelated to navigation.
 */
describe('SurfaceNav marks its destinations', () => {
  test('every ops sidebar item carries an icon beside its label', () => {
    render(<SurfaceNav layout="sidebar" items={OPS} />)
    const links = screen.getByTestId('nav-sidebar').querySelectorAll('a')

    expect(links).toHaveLength(OPS.length)
    for (const link of links) {
      expect(link.querySelector('svg'), link.textContent ?? '').not.toBeNull()
    }
  })

  test('every field tab carries an icon above its label', () => {
    render(<SurfaceNav layout="tabs" items={FARMER} />)
    const links = screen.getByTestId('nav-tabs').querySelectorAll('a')

    expect(links).toHaveLength(FARMER.length)
    for (const link of links) {
      expect(link.querySelector('svg'), link.textContent ?? '').not.toBeNull()
    }
  })

  test('the icons add no text of their own', () => {
    render(<SurfaceNav layout="tabs" items={FARMER} />)
    const labels = [...screen.getByTestId('nav-tabs').querySelectorAll('a')].map(
      (link) => link.textContent,
    )

    expect(labels).toEqual(['My farm', 'Equipment', 'Requests', 'Opportunities'])
  })

  test('every icon is hidden from assistive tech, since the label already says it', () => {
    render(<SurfaceNav layout="sidebar" items={OPS} />)
    for (const svg of screen.getByTestId('nav-sidebar').querySelectorAll('svg')) {
      expect(svg.getAttribute('aria-hidden')).toBe('true')
    }
  })
})

describe('SurfaceNav touch targets', () => {
  // 44px on ops, 60px on a field surface, and `min-height` rather than
  // `height`: a Kiswahili label runs longer and has to be allowed to wrap.
  test('a field tab is 60px and does not fix its height', () => {
    render(<SurfaceNav layout="tabs" items={FARMER} />)
    const style = screen.getByTestId('nav-tabs').querySelector('a')?.getAttribute('style') ?? ''

    expect(style).toMatch(/min-height:\s*60px/)
    expect(style).not.toMatch(/(^|;)\s*height:/)
  })

  test('an ops item is 44px and does not fix its height', () => {
    render(<SurfaceNav layout="sidebar" items={OPS} />)
    const style = screen.getByTestId('nav-sidebar').querySelector('a')?.getAttribute('style') ?? ''

    expect(style).toMatch(/min-height:\s*44px/)
    expect(style).not.toMatch(/(^|;)\s*height:/)
  })
})
