import { Link, Outlet } from '@tanstack/react-router'

import { LanguageSwitch } from '@/app/LanguageSwitch'

// Session 1 shell. The real shell is tier 1: role-aware nav (bottom tabs for
// farmer and officer, a sidebar for ops), a DemoBanner driven by
// VITE_DATA_MODE, and sign out.
const surfaces = [
  { to: '/login', label: '(auth) /login' },
  { to: '/farm', label: '_farmer /farm' },
  { to: '/officer', label: '_officer /officer' },
  { to: '/ops', label: '_ops /ops' },
  { to: '/ops/tower', label: '_ops /ops/tower' },
] as const

export function RootLayout() {
  return (
    <div className="min-h-dvh bg-surface font-sans text-deep">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-deep/10 bg-white px-4 py-3">
        <Link to="/" className="font-semibold text-primary">
          Ruaha 360
        </Link>
        <LanguageSwitch />
      </header>

      <nav className="flex flex-wrap gap-3 border-b border-deep/10 px-4 py-2 text-sm">
        {surfaces.map((s) => (
          <Link
            key={s.to}
            to={s.to}
            className="text-deep/70 underline-offset-4 hover:underline data-[status=active]:font-medium data-[status=active]:text-primary"
          >
            {s.label}
          </Link>
        ))}
      </nav>

      <main className="p-4">
        <Outlet />
      </main>
    </div>
  )
}
