import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { DashboardTopbar } from "@/components/layout/dashboard-topbar";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/dashboard")({
  beforeLoad: async ({ location }) => {
    // In SSR environment this will need cookies, but for this client-side 
    // integration we'll rely on the local session.
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw redirect({
        to: "/login",
        search: {
          redirect: location.pathname,
        },
      });
    }
  },
  component: DashboardLayout,
});

function DashboardLayout() {
  return (
    <SidebarProvider>
      <div className="flex min-h-dvh w-full bg-background">
        <AppSidebar />
        <SidebarInset className="min-w-0 bg-background">
          <DashboardTopbar />
          <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            <Outlet />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
