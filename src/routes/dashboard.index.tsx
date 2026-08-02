import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { motion } from "motion/react";
import {
  Activity as ActivityIcon,
  ArrowUpRight,
  Bell,
  FileText,
  HardDrive,
  Lightbulb,
  QrCode,
  ScanLine,
  Share2,
  ShieldCheck,
  Upload,
  UserRound,
} from "lucide-react";
import { MetricCard, Widget } from "@/components/shared/widget";
import { StatusBadge } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { activities, currentUser, documents, healthProfile, notifications, qrCodes, shareProfiles, storage } from "@/data/mock";
import { formatDate, formatRelative, formatSize } from "@/lib/format";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/dashboard/")({
  beforeLoad: async () => {
    // Check if first-time user; redirect to onboarding if onboarding not yet completed.
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const key = `medilink_onboarding_done_${session.user.id}`;
      const done = localStorage.getItem(key);
      if (!done) {
        throw redirect({ to: "/dashboard/onboarding/" });
      }
    }
  },
  head: () => ({
    meta: [
      { title: "Dashboard — MediLink AI" },
      { name: "description", content: "Your MediLink AI health overview: records, documents, share links, QR codes and security status." },
      { property: "og:title", content: "Dashboard — MediLink AI" },
      { property: "og:description", content: "Track your health record completeness, documents and active shares." },
    ],
  }),
  component: DashboardOverview,
});

const quickActions = [
  { label: "Upload document", to: "/dashboard/documents", icon: Upload },
  { label: "Scan a report", to: "/dashboard/scanner", icon: ScanLine },
  { label: "Generate share link", to: "/dashboard/share", icon: Share2 },
  { label: "Create QR code", to: "/dashboard/qr", icon: QrCode },
] as const;

const activityTone = {
  upload: "info",
  share: "success",
  scan: "warning",
  security: "danger",
  profile: "neutral",
} as const;

const tips = [
  "Add your emergency notes so responders know how to act in the first 60 seconds.",
  "Set an expiry on doctor-visit links — they rarely need to outlive the appointment.",
  "Print your emergency QR and keep it in your wallet, not just on your phone.",
];

function DashboardOverview() {
  const activeShares = shareProfiles.filter((p) => p.status === "active");
  const storagePercent = Math.round((storage.usedGb / storage.totalGb) * 100);

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="gradient-brand relative overflow-hidden rounded-3xl p-6 shadow-glow sm:p-8"
      >
        <div className="surface-grid absolute inset-0 opacity-20" aria-hidden />
        <div className="relative grid gap-6 lg:grid-cols-[1.4fr_1fr] lg:items-center">
          <div>
            <p className="text-sm font-medium text-primary-foreground/80">
              {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
            </p>
            <h1 className="mt-2 font-display text-2xl font-bold text-primary-foreground sm:text-3xl">
              Good to see you, {currentUser.name.split(" ")[0]}
            </h1>
            <p className="mt-2 max-w-xl text-sm text-primary-foreground/85">
              Your record is {healthProfile.completion}% complete. Two items need attention: an influenza booster and
              an expired insurance share link.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <Button asChild variant="secondary" className="rounded-xl">
                <Link to="/dashboard/documents">
                  <Upload className="size-4" aria-hidden /> Quick upload
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="rounded-xl border-primary-foreground/40 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
              >
                <Link to="/dashboard/scanner">
                  <ScanLine className="size-4" aria-hidden /> Quick scan
                </Link>
              </Button>
            </div>
          </div>

          <div className="rounded-2xl bg-primary-foreground/12 p-6 backdrop-blur-sm">
            <div className="flex items-center justify-between text-sm text-primary-foreground">
              <span className="font-medium">Health profile completion</span>
              <span className="font-display text-lg font-bold">{healthProfile.completion}%</span>
            </div>
            <Progress value={healthProfile.completion} className="mt-3 h-2 bg-primary-foreground/25" />
            <ul className="mt-4 space-y-2 text-xs text-primary-foreground/85">
              <li>• Vaccination records need one update</li>
              <li>• Add a second emergency contact number</li>
            </ul>
            <Button asChild size="sm" variant="secondary" className="mt-4 w-full rounded-lg">
              <Link to="/dashboard/profile">Complete profile</Link>
            </Button>
          </div>
        </div>
      </motion.section>

      {/* Metrics */}
      <section className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Documents" value={String(documents.length)} hint="2 added this month" icon={FileText} delay={0} />
        <MetricCard label="Active shares" value={String(activeShares.length)} hint="1 expired" icon={Share2} tone="teal" delay={0.05} />
        <MetricCard label="QR codes" value={String(qrCodes.length)} hint="64 total scans" icon={QrCode} tone="success" delay={0.1} />
        <MetricCard label="Storage used" value={`${storage.usedGb} GB`} hint={`${storagePercent}% of ${storage.totalGb} GB`} icon={HardDrive} tone="warning" delay={0.15} />
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        {/* Recent documents */}
        <Widget
          title="Recent documents"
          icon={FileText}
          delay={0.05}
          className="lg:col-span-2"
          action={
            <Button asChild variant="ghost" size="sm" className="gap-1 text-xs">
              <Link to="/dashboard/documents">
                View all <ArrowUpRight className="size-3.5" aria-hidden />
              </Link>
            </Button>
          }
        >
          <ul className="divide-y divide-border">
            {documents.slice(0, 4).map((doc) => (
              <li key={doc.id} className="flex items-center gap-3 py-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground">
                  <FileText className="size-4" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{doc.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {doc.category} · {formatSize(doc.sizeKb)} · {formatRelative(doc.uploadedAt)}
                  </p>
                </div>
                <StatusBadge tone={doc.status === "uploaded" ? "success" : doc.status === "processing" ? "warning" : "danger"}>
                  {doc.status}
                </StatusBadge>
              </li>
            ))}
          </ul>
        </Widget>

        {/* Quick actions */}
        <Widget title="Quick actions" icon={ActivityIcon} delay={0.1}>
          <div className="grid gap-2">
            {quickActions.map((action) => (
              <Button key={action.label} asChild variant="outline" className="h-10 justify-start rounded-xl">
                <Link to={action.to}>
                  <action.icon className="size-4 text-primary" aria-hidden />
                  {action.label}
                </Link>
              </Button>
            ))}
          </div>
        </Widget>

        {/* Shared profiles */}
        <Widget
          title="Recent shared profiles"
          icon={Share2}
          delay={0.15}
          action={
            <Button asChild variant="ghost" size="sm" className="gap-1 text-xs">
              <Link to="/dashboard/share">Manage</Link>
            </Button>
          }
        >
          <ul className="space-y-3">
            {shareProfiles.slice(0, 3).map((profile) => (
              <li key={profile.id} className="rounded-xl border border-border p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 truncate text-sm font-medium text-foreground">{profile.name}</p>
                  <StatusBadge tone={profile.status === "active" ? "success" : "danger"}>{profile.status}</StatusBadge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {profile.fields.length} fields · expires {formatDate(profile.expiresAt)}
                </p>
              </li>
            ))}
          </ul>
        </Widget>

        {/* QR codes */}
        <Widget
          title="Generated QR codes"
          icon={QrCode}
          delay={0.2}
          action={
            <Button asChild variant="ghost" size="sm" className="gap-1 text-xs">
              <Link to="/dashboard/qr">Open</Link>
            </Button>
          }
        >
          <ul className="space-y-3">
            {qrCodes.slice(0, 3).map((qr) => (
              <li key={qr.id} className="flex items-center gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-teal/15 text-teal">
                  <QrCode className="size-4" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{qr.label}</p>
                  <p className="text-xs text-muted-foreground">{qr.scans} scans</p>
                </div>
                <StatusBadge tone={qr.status === "active" ? "success" : "neutral"}>{qr.status}</StatusBadge>
              </li>
            ))}
          </ul>
        </Widget>

        {/* Storage */}
        <Widget title="Storage usage" icon={HardDrive} delay={0.25}>
          <p className="font-display text-2xl font-bold text-foreground">
            {storage.usedGb} GB <span className="text-sm font-medium text-muted-foreground">/ {storage.totalGb} GB</span>
          </p>
          <Progress value={storagePercent} className="mt-3 h-2" />
          <Separator className="my-4" />
          <ul className="space-y-2 text-xs text-muted-foreground">
            <li className="flex justify-between"><span>Reports & labs</span><span>1.8 GB</span></li>
            <li className="flex justify-between"><span>Imaging</span><span>1.2 GB</span></li>
            <li className="flex justify-between"><span>Other documents</span><span>0.4 GB</span></li>
          </ul>
        </Widget>

        {/* Activity timeline */}
        <Widget title="Recent activity" icon={ActivityIcon} delay={0.3} className="lg:col-span-2">
          <ol className="relative space-y-8 border-l border-border pl-6">
            {activities.map((item) => (
              <li key={item.id} className="relative">
                <span className="absolute -left-8 top-1 size-3 rounded-full border-2 border-card bg-primary" aria-hidden />
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium text-foreground">{item.title}</p>
                  <StatusBadge tone={activityTone[item.kind]}>{item.kind}</StatusBadge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {item.detail} · {formatRelative(item.createdAt)}
                </p>
              </li>
            ))}
          </ol>
        </Widget>

        {/* Notifications */}
        <Widget
          title="Notifications"
          icon={Bell}
          delay={0.35}
          action={
            <Button asChild variant="ghost" size="sm" className="gap-1 text-xs">
              <Link to="/dashboard/notifications">All</Link>
            </Button>
          }
        >
          <ul className="space-y-3">
            {notifications.slice(0, 4).map((n) => (
              <li key={n.id} className="rounded-xl border border-border p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 truncate text-sm font-medium text-foreground">{n.title}</p>
                  <span className="shrink-0 text-[11px] text-muted-foreground">{formatRelative(n.createdAt)}</span>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">{n.message}</p>
              </li>
            ))}
          </ul>
        </Widget>

        {/* Health record status */}
        <Widget title="Health record status" icon={UserRound} delay={0.4}>
          <ul className="space-y-3 text-sm">
            {[
              { label: "Conditions", value: `${healthProfile.conditions.length} recorded`, tone: "success" as const },
              { label: "Allergies", value: `${healthProfile.allergies.length} recorded`, tone: "success" as const },
              { label: "Medications", value: `${healthProfile.medications.length} active`, tone: "info" as const },
              { label: "Vaccinations", value: "1 due", tone: "warning" as const },
            ].map((row) => (
              <li key={row.label} className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">{row.label}</span>
                <StatusBadge tone={row.tone}>{row.value}</StatusBadge>
              </li>
            ))}
          </ul>
        </Widget>

        {/* Security */}
        <Widget title="Security status" icon={ShieldCheck} delay={0.45}>
          <div className="rounded-xl border border-success/30 bg-success/10 p-4">
            <p className="font-display text-sm font-semibold text-success">Strong</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Two-factor authentication is on and all shares are consent-scoped.
            </p>
          </div>
          <ul className="mt-4 space-y-2 text-xs text-muted-foreground">
            <li className="flex justify-between"><span>Two-factor auth</span><span className="text-success">Enabled</span></li>
            <li className="flex justify-between"><span>Active sessions</span><span>3 devices</span></li>
            <li className="flex justify-between"><span>Last password change</span><span>62 days ago</span></li>
          </ul>
        </Widget>

        {/* Tips */}
        <Widget title="Tips for a stronger record" icon={Lightbulb} delay={0.5}>
          <ul className="space-y-3">
            {tips.map((tip) => (
              <li key={tip} className="flex gap-3 text-sm text-muted-foreground">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-teal" aria-hidden />
                {tip}
              </li>
            ))}
          </ul>
        </Widget>
      </section>
    </div>
  );
}
