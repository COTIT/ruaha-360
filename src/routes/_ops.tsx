import { Outlet, createFileRoute } from '@tanstack/react-router'

// Pathless layout route for the ops surface.
//
// Tier 1 adds beforeLoad: read the session's memberships and redirect when the
// role does not match. Route guards are UX only — RLS is the security
// boundary, and a farmer who hand-types an ops URL correctly gets the page
// shell and zero rows.
export const Route = createFileRoute('/_ops')({
  component: () => <Outlet />,
})
