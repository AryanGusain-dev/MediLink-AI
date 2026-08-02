import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import type { ReactNode } from "react";
import {
  Activity as ActivityIcon,
  ArrowUpRight,
  Bell,
  Brain,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Clock3,
  FileText,
  FileScan,
  HardDrive,
  Lightbulb,
  Link as LinkIcon,
  LoaderCircle,
  Pill,
  QrCode,
  ScanLine,
  Share2,
  Shield,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  TrendingUp,
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

export const Route = createFileRoute("/dashboard/")({
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
  { label: "Upload Document", to: "/dashboard/documents", icon: Upload },
  { label: "Scan Report", to: "/dashboard/scanner", icon: ScanLine },
  { label: "Generate Share Link", to: "/dashboard/share", icon: Share2 },
  { label: "Create QR Code", to: "/dashboard/qr", icon: QrCode },
  { label: "AI Cite & Explain", to: "/dashboard/documents", icon: Sparkles },
  { label: "Voice to FHIR Scribe", to: "/dashboard/scanner", icon: Stethoscope },
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

const aiTools = [
  { label: "AI Cite & Explain", description: "Get AI explanations with cited sources", icon: Sparkles },
  { label: "OCR Scan to Text", description: "Extract text from scanned reports", icon: FileScan },
  { label: "Medical Records to FHIR", description: "Convert records into FHIR format", icon: Stethoscope },
  { label: "Drug Interaction Checker", description: "Detect potential medication interactions", icon: Pill },
  { label: "Health Trend Prediction", description: "Predict future health trends", icon: TrendingUp },
] as const;

function StatusIcon({ status }: { status: string }) {
  const Icon = status === "security" || status === "verified" ? ShieldCheck : status === "scan" ? ScanLine : status === "share" ? LinkIcon : status === "profile" ? UserRound : status === "upload" || status === "uploaded" || status === "active" ? CheckCircle2 : status === "processing" ? LoaderCircle : status === "expired" ? Clock3 : CircleAlert;
  const tone = status === "security" || status === "verified" || status === "uploaded" || status === "active" ? "bg-success/12 text-success" : status === "scan" || status === "processing" ? "bg-warning/15 text-warning" : status === "share" ? "bg-teal/15 text-teal" : "bg-primary/10 text-primary";

  return <span title={status} aria-label={status} className={`grid size-8 place-items-center rounded-lg shadow-soft ${tone}`}><Icon className="size-4" aria-hidden /></span>;
}

function OverviewColumn({
  title,
  icon: Icon,
  rows,
  footer,
  chipRows,
}: {
  title: string;
  icon: typeof ShieldCheck;
  rows: [string, string][];
  footer?: ReactNode;
  chipRows?: number[];
}) {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-border p-5 shadow-soft">
      <div className="flex items-center gap-2">
        <Icon className="size-4 text-primary" aria-hidden />
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      <dl className="mt-4 divide-y divide-border">
        {rows.map(([label, value], index) => (
          <div key={label} className="flex items-center justify-between gap-3 py-2.5 text-xs first:pt-0 last:pb-0">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className={chipRows?.includes(index) === false ? "font-medium text-foreground" : value === "Enabled" ? "rounded-lg bg-success/12 px-2 py-1 font-semibold text-success" : "rounded-lg bg-primary/10 px-2 py-1 font-semibold text-primary"}>
              {value}
            </dd>
          </div>
        ))}
      </dl>
      {footer ? <div className="mt-auto pt-4 text-xs font-medium text-primary">{footer}</div> : null}
    </div>
  );
}

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
        <MetricCard label="Active Shares" value={String(activeShares.length)} hint="1 expired" icon={Share2} tone="teal" delay={0.05} />
        <MetricCard label="Reports Scanned" value={String(documents.filter((document) => document.category === "Blood Test").length)} hint="This month" icon={ScanLine} tone="success" delay={0.1} />
        <MetricCard label="AI Analyses" value="12" hint="Ready to review" icon={Brain} tone="warning" delay={0.15} />
      </section>

      <section className="grid gap-8 lg:grid-cols-[2.3fr_1.1fr_1.2fr] lg:items-stretch">
        <Widget title="Recent activity" icon={ActivityIcon} delay={0.05} className="order-1">
          <ol className="relative space-y-8 border-l border-border pl-6">
            {activities.map((item) => (
              <li key={item.id} className="relative">
                <span className="absolute -left-8 top-1 size-3 rounded-full border-2 border-card bg-primary" aria-hidden />
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium text-foreground">{item.title}</p>
                  <StatusIcon status={item.kind} />
                </div>
                <p className="text-xs text-muted-foreground">{item.detail} · {formatRelative(item.createdAt)}</p>
              </li>
            ))}
          </ol>
        </Widget>

        <Widget title="Quick actions" icon={ActivityIcon} delay={0.1} className="order-3 h-full">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            {quickActions.map((action) => (
              <Button key={action.label} asChild variant="outline" className="h-11 justify-start rounded-xl px-3">
                <Link to={action.to}>
                  <action.icon className="size-4 text-primary" aria-hidden />
                  {action.label}
                </Link>
              </Button>
            ))}
          </div>
        </Widget>

        <Widget title="AI & Medical Tools" icon={Brain} delay={0.15} className="order-2 h-full">
          <ul className="divide-y divide-border">
            {aiTools.map((tool) => (
              <li key={tool.label} className="group flex min-w-0 cursor-pointer items-center gap-3 py-3 first:pt-0 last:pb-0">
                <tool.icon className="size-4 shrink-0 text-primary transition-colors duration-200 group-hover:text-primary" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground transition-colors duration-200 group-hover:text-primary">{tool.label}</p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">{tool.description}</p>
                </div>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-colors duration-200 group-hover:text-primary" aria-hidden />
              </li>
            ))}
          </ul>
        </Widget>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <Widget title="Recent Shared Profiles" icon={Share2} delay={0.16} action={<Button asChild variant="ghost" size="sm" className="text-xs"><Link to="/dashboard/share">Manage</Link></Button>}>
          <ul className="space-y-3">
            {shareProfiles.slice(0, 3).map((profile) => (
              <li key={profile.id} className="flex items-start gap-3 rounded-xl border border-border p-3">
                <StatusIcon status={profile.status} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{profile.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{profile.fields.length} fields · expires {formatDate(profile.expiresAt)}</p>
                </div>
              </li>
            ))}
          </ul>
        </Widget>

        <Widget title="Generated QR Codes" icon={QrCode} delay={0.18} action={<Button asChild variant="ghost" size="sm" className="text-xs"><Link to="/dashboard/qr">Open</Link></Button>}>
          <ul className="space-y-3">
            {qrCodes.slice(0, 3).map((qr) => (
              <li key={qr.id} className="flex items-center gap-3 rounded-xl border border-border p-3">
                <StatusIcon status={qr.status} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{qr.label}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{qr.scans} scans</p>
                </div>
              </li>
            ))}
          </ul>
        </Widget>

        <Widget title="Notifications" icon={Bell} delay={0.2} action={<Button asChild variant="ghost" size="sm" className="text-xs"><Link to="/dashboard/notifications">All</Link></Button>}>
          <ul className="space-y-3">
            {notifications.slice(0, 3).map((notification) => (
              <li key={notification.id} className="rounded-xl border border-border p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 truncate text-sm font-medium text-foreground">{notification.title}</p>
                  <StatusIcon status={notification.read ? "verified" : "warning"} />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{notification.message}</p>
              </li>
            ))}
          </ul>
        </Widget>
      </section>

      <Widget title="Health & Security Overview" icon={ShieldCheck} delay={0.2}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <OverviewColumn title="Shared Profiles" icon={Share2} rows={[
            ["Active Shares", String(activeShares.length)],
            ["Expired Shares", String(shareProfiles.length - activeShares.length)],
          ]} footer={<Link to="/dashboard/share" className="inline-flex items-center gap-1">Manage <ArrowUpRight className="size-3" aria-hidden /></Link>} />
          <OverviewColumn title="Generated QR Codes" icon={QrCode} rows={[
            ["Active QR Codes", String(qrCodes.filter((code) => code.status === "active").length)],
            ["Total Scans", String(qrCodes.reduce((total, code) => total + code.scans, 0))],
          ]} footer={<Link to="/dashboard/qr" className="inline-flex items-center gap-1">Open <ArrowUpRight className="size-3" aria-hidden /></Link>} />
          <OverviewColumn title="Health Record Status" icon={UserRound} rows={[
            ["Conditions", String(healthProfile.conditions.length)],
            ["Allergies", String(healthProfile.allergies.length)],
            ["Medications", String(healthProfile.medications.length)],
            ["Vaccinations", String(healthProfile.vaccinations.length)],
          ]} />
          <OverviewColumn title="Security Status" icon={Shield} rows={[
            ["Two-factor Authentication", "Enabled"],
            ["Active Sessions", "3"],
            ["Password Changed", "62 days ago"],
          ]} chipRows={[0]} />
          <div className="rounded-xl border border-border p-4 shadow-soft">
            <div className="flex items-center gap-2">
              <Lightbulb className="size-4 text-primary" aria-hidden />
              <h3 className="text-sm font-semibold text-foreground">Health Tips</h3>
            </div>
            <ul className="mt-3 space-y-2.5 text-xs text-muted-foreground">
              {tips.map((tip) => <li key={tip} className="flex gap-2"><span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-teal" />{tip}</li>)}
            </ul>
          </div>
        </div>
      </Widget>

      <section className="hidden grid gap-6 lg:grid-cols-3">
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
