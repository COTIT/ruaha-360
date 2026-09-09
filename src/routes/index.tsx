import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: () => (
    <section className="space-y-2">
      <h2 className="font-medium">Scaffold</h2>
      <p className="max-w-prose text-sm text-deep/70">
        Session 1: routing, providers, brand tokens, i18n and PWA shell only.
        Tier 1 replaces this with login and membership routing.
      </p>
    </section>
  ),
})
