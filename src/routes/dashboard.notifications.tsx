import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "motion/react";
import { Bell, CheckCheck } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, EmptyState, StatusBadge } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { notifications as seedNotifications } from "@/data/mock";
import type { Notification } from "@/types";
import { formatRelative } from "@/lib/format";

export const Route = createFileRoute("/dashboard/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — MediLink AI" },
      { name: "description", content: "Security alerts, document processing updates and health reminders from MediLink AI." },
      { property: "og:title", content: "Notifications — MediLink AI" },
      { property: "og:description", content: "Everything that happened in your health vault, in one feed." },
    ],
  }),
  component: NotificationsPage,
});

const tone = { info: "info", success: "success", warning: "warning", danger: "danger" } as const;

function NotificationsPage() {
  const [items, setItems] = useState<Notification[]>(seedNotifications);
  const unread = items.filter((n) => !n.read).length;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Notifications"
        description={`${unread} unread of ${items.length} total`}
        icon={Bell}
        actions={
          <Button
            variant="outline"
            className="rounded-xl"
            onClick={() => {
              setItems((prev) => prev.map((n) => ({ ...n, read: true })));
              toast.success("All notifications marked as read");
            }}
          >
            <CheckCheck className="size-4" aria-hidden /> Mark all read
          </Button>
        }
      />

      {items.length === 0 ? (
        <EmptyState icon={Bell} title="You're all caught up" description="New alerts about your records will appear here." />
      ) : (
        <ul className="space-y-3">
          {items.map((n, i) => (
            <motion.li
              key={n.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
              className={`card-hover rounded-2xl border bg-card p-4 shadow-soft ${
                n.read ? "border-border" : "border-primary/35"
              }`}
            >
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">{n.title}</p>
                    <StatusBadge tone={tone[n.type]}>{n.type}</StatusBadge>
                    {!n.read ? <StatusBadge tone="info">New</StatusBadge> : null}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{n.message}</p>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">{formatRelative(n.createdAt)}</span>
              </div>
            </motion.li>
          ))}
        </ul>
      )}
    </div>
  );
}
