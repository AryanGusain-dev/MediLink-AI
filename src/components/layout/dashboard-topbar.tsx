import { Link } from "@tanstack/react-router";
import { Bell, LogOut, Moon, Search, Settings, Sun, UserRound } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "@/hooks/use-theme";
import { currentUser, notifications } from "@/data/mock";
import { StatusBadge } from "@/components/shared/page-header";
import { formatRelative } from "@/lib/format";

export function DashboardTopbar() {
  const { theme, toggle } = useTheme();
  const unread = notifications.filter((n) => !n.read).length;

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-card/85 px-3 backdrop-blur sm:px-6">
      <SidebarTrigger className="shrink-0" />

      <div className="relative hidden min-w-0 flex-1 sm:block">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          type="search"
          placeholder="Search records, documents, share links…"
          aria-label="Search your health workspace"
          className="h-10 max-w-md rounded-xl pl-10"
        />
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-2">
        <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle colour theme">
          {theme === "dark" ? <Sun className="size-4.5" aria-hidden /> : <Moon className="size-4.5" aria-hidden />}
        </Button>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="relative" aria-label={`Notifications, ${unread} unread`}>
              <Bell className="size-4.5" aria-hidden />
              {unread > 0 ? (
                <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-destructive ring-2 ring-card" />
              ) : null}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 rounded-2xl p-0">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <p className="font-display text-sm font-semibold">Notifications</p>
              <StatusBadge tone="info">{unread} new</StatusBadge>
            </div>
            <ul className="max-h-80 divide-y divide-border overflow-y-auto">
              {notifications.map((n) => (
                <li key={n.id} className="px-4 py-3 transition-colors hover:bg-muted/60">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-foreground">{n.title}</p>
                    <span className="shrink-0 text-[11px] text-muted-foreground">{formatRelative(n.createdAt)}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">{n.message}</p>
                </li>
              ))}
            </ul>
            <div className="border-t border-border p-2">
              <Button asChild variant="ghost" size="sm" className="w-full">
                <Link to="/dashboard/notifications">View all notifications</Link>
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-10 gap-2 rounded-xl px-2">
              <Avatar className="size-7">
                <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">AS</AvatarFallback>
              </Avatar>
              <span className="hidden text-sm font-medium md:inline">{currentUser.name.split(" ")[0]}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 rounded-2xl">
            <DropdownMenuLabel>
              <p className="text-sm font-semibold">{currentUser.name}</p>
              <p className="text-xs font-normal text-muted-foreground">{currentUser.email}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/dashboard/profile" search={{ mode: "edit" }}>
                <UserRound className="size-4" aria-hidden /> Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/dashboard/settings">
                <Settings className="size-4" aria-hidden /> Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/login">
                <LogOut className="size-4" aria-hidden /> Sign out
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
