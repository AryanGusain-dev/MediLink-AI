import { createFileRoute, Outlet } from "@tanstack/react-router";

// This is the layout parent for /dashboard/onboarding and /dashboard/onboarding/fill.
// It must render <Outlet /> so child routes can mount.
export const Route = createFileRoute("/dashboard/onboarding")({
  component: OnboardingLayout,
});

function OnboardingLayout() {
  return <Outlet />;
}
