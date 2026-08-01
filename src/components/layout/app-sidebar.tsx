import { Link, useRouterState } from "@tanstack/react-router";
import {
  Bell,
  FileText,
  Gauge,
  LayoutDashboard,
  QrCode,
  ScanLine,
  Share2,
  UserRound,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Logo } from "@/components/shared/logo";
import { Progress } from "@/components/ui/progress";
import { storage } from "@/data/mock";

const mainNav = [
  { label: "Overview", to: "/dashboard", icon: LayoutDashboard, exact: true },
  { label: "Patient Passport", to: "/dashboard/profile", icon: UserRound },
  { label: "Documents", to: "/dashboard/documents", icon: FileText },
  { label: "Report Scanner", to: "/dashboard/scanner", icon: ScanLine },
  { label: "Share Profiles", to: "/dashboard/share", icon: Share2 },
  { label: "QR Codes", to: "/dashboard/qr", icon: QrCode },
  { label: "Notifications", to: "/dashboard/notifications", icon: Bell },
] as const;

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (r) => r.location.pathname });

  const isActive = (to: string, exact?: boolean) =>
    exact ? pathname === to : pathname === to || pathname.startsWith(`${to}/`);

  const percent = Math.round((storage.usedGb / storage.totalGb) * 100);

  return (
    <Sidebar collapsible="icon" className="border-sidebar-border">
      <SidebarHeader className="px-3 py-4">
        <Link to="/" className="flex items-center gap-2">
          <Logo compact={collapsed} />
        </Link>
      </SidebarHeader>

      <SidebarContent className="gap-0">
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNav.map((item) => (
                <SidebarMenuItem key={item.to}>
                  <SidebarMenuButton asChild isActive={isActive(item.to, "exact" in item ? item.exact : false)} tooltip={item.label}>
                    <Link to={item.to} className="flex items-center gap-2">
                      <item.icon className="size-4 shrink-0" aria-hidden />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {!collapsed ? (
        <SidebarFooter className="p-3">
          <div className="rounded-xl border border-sidebar-border bg-sidebar-accent/50 p-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-sidebar-foreground">
              <Gauge className="size-3.5" aria-hidden />
              Storage
            </div>
            <Progress value={percent} className="mt-2 h-1.5" />
            <p className="mt-2 text-[11px] text-muted-foreground">
              {storage.usedGb} GB of {storage.totalGb} GB used
            </p>
          </div>
        </SidebarFooter>
      ) : null}
    </Sidebar>
  );
}
