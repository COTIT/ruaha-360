/**
 * Session 1 scaffold marker. Every route renders one of these.
 *
 * Deleted route by route as the real screens land — see the tier order in
 * CLAUDE.md. Nothing here reads the database.
 */
export function Placeholder({ route, tier }: { route: string; tier: string }) {
  return (
    <section className="space-y-1">
      <h2 className="font-medium text-deep">{route}</h2>
      <p className="text-sm text-deep/60">
        Session 1 placeholder — built in {tier}.
      </p>
    </section>
  )
}
