import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useState, useEffect } from "react";
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
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import type { QRCodeItem, ShareProfile } from "@/types";
import { formatDate, formatRelative, formatSize, initials } from "@/lib/format";
import { supabase } from "@/lib/supabase";
import { getCachedData, setCachedData } from "@/lib/cache";
import { QRCodeCanvas } from "qrcode.react";

export const Route = createFileRoute("/dashboard/")({
  beforeLoad: async () => {
    // Check if first-time user; redirect to onboarding if onboarding not yet completed.
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const key = `medilink_onboarding_done_${session.user.id}`;
      const done = localStorage.getItem(key);
      if (!done) {
        throw redirect({ to: "/dashboard/onboarding" });
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
    <div className="flex h-full flex-col rounded-2xl border border-border/80 bg-surface p-5 sm:p-6 shadow-xs hover:border-primary/30 transition-all">
      <div className="flex items-center gap-2.5">
        <div className="size-8 rounded-xl bg-primary/10 border border-primary/20 text-primary grid place-items-center">
          <Icon className="size-4" aria-hidden />
        </div>
        <h3 className="text-sm font-bold font-display text-foreground tracking-tight">{title}</h3>
      </div>
      <dl className="mt-4 divide-y divide-border/60">
        {rows.map(([label, value], index) => (
          <div key={label} className="flex items-center justify-between gap-3 py-3 text-xs first:pt-0 last:pb-0">
            <dt className="text-muted-foreground font-medium">{label}</dt>
            <dd className={chipRows?.includes(index) === false ? "font-semibold text-foreground" : value === "Enabled" ? "rounded-full bg-emerald-500/10 px-2.5 py-0.5 font-semibold text-emerald-700 dark:text-emerald-300 border border-emerald-500/20" : "rounded-full bg-primary/10 px-2.5 py-0.5 font-semibold text-primary border border-primary/20"}>
              {value}
            </dd>
          </div>
        ))}
      </dl>
      {footer ? <div className="mt-auto pt-4 text-xs font-semibold text-primary">{footer}</div> : null}
    </div>
  );
}

function DashboardOverview() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [isCardOpen, setIsCardOpen] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
  const [documents, setDocuments] = useState<any[]>([]);
  const [dbShareProfiles, setDbShareProfiles] = useState<any[]>([]);
  const [dbQrCodes, setDbQrCodes] = useState<any[]>([]);
  const [dbNotifications, setDbNotifications] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [conditions, setConditions] = useState<any[]>([]);
  const [medications, setMedications] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);

  // LocalStorage fallbacks for Share and QR (since these aren't connected to DB yet)
  const [localProfiles] = useState<ShareProfile[]>(() => {
    const saved = localStorage.getItem("medi-link-share-profiles");
    return saved ? JSON.parse(saved) : [];
  });
  const [localCodes] = useState<QRCodeItem[]>(() => {
    const saved = localStorage.getItem("medi-link-qr-codes");
    return saved ? JSON.parse(saved) : [];
  });

  const mapDbShareProfile = (sp: any): ShareProfile => ({
    id: sp.id,
    name: sp.name,
    preset: "Custom",
    description: sp.description || "",
    fields: sp.allowed_fields || [],
    createdAt: sp.created_at || new Date().toISOString(),
    expiresAt: sp.expires_at,
    visibility: "public-link" as const,
    status: sp.is_active ? ("active" as const) : ("expired" as const),
    views: 0,
    token: sp.id,
  });

  const mapDbQrCode = (qr: any): QRCodeItem => ({
    id: qr.id,
    shareProfileId: qr.share_profile_id,
    label: qr.label,
    createdAt: qr.created_at,
    scans: qr.scan_count || 0,
    status: qr.status as "active" | "inactive",
  });

  const mapDbNotification = (n: any) => ({
    id: n.id,
    title: n.title,
    message: n.message,
    type: n.type as "info" | "warning" | "success" | "danger",
    createdAt: n.created_at,
    read: n.is_read || false,
  });

  useEffect(() => {
    async function loadOverviewData() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Try loading from cache first
        const cachedProfile = getCachedData<any>("profile");
        const cachedDocs = getCachedData<any[]>("documents");
        const cachedShares = getCachedData<any[]>("share_profiles");
        const cachedQr = getCachedData<any[]>("qr_codes");
        const cachedNotif = getCachedData<any[]>("notifications");
        const cachedSettings = getCachedData<any>("settings");
        const cachedContacts = getCachedData<any[]>("contacts");
        const cachedConditions = getCachedData<any[]>("conditions_brief");
        const cachedMeds = getCachedData<any[]>("medications_brief");

        if (cachedProfile) {
          setProfile(cachedProfile);
          if (cachedDocs) setDocuments(cachedDocs);
          if (cachedShares) setDbShareProfiles(cachedShares);
          if (cachedQr) setDbQrCodes(cachedQr);
          if (cachedNotif) setDbNotifications(cachedNotif);
          if (cachedSettings) setSettings(cachedSettings);
          if (cachedContacts) setContacts(cachedContacts);
          if (cachedConditions) setConditions(cachedConditions);
          if (cachedMeds) setMedications(cachedMeds);
          setLoading(false);
        }

        // 1. Fetch profile
        const { data: pData, error: pErr } = await supabase
          .from("profiles")
          .select("*")
          .eq("auth_user_id", user.id)
          .maybeSingle();

        if (pErr) console.warn("fetchDashboardData.profile error:", pErr);


        if (pData) {
          setProfile(pData);
          setCachedData("profile", pData);

          // 2. Fetch documents
          const { data: docsData } = await supabase
            .from("documents")
            .select("*")
            .eq("profile_id", pData.id)
            .order("uploaded_at", { ascending: false });
          setDocuments(docsData || []);
          setCachedData("documents", docsData || []);

          // 3. Fetch share profiles
          const { data: sharesData } = await supabase
            .from("share_profiles")
            .select("*")
            .eq("profile_id", pData.id);
          if (sharesData) {
            const mappedShares = sharesData.map(mapDbShareProfile);
            setDbShareProfiles(mappedShares);
            setCachedData("share_profiles", mappedShares);
          }

          // 4. Fetch qr codes
          const { data: qrData } = await supabase
            .from("qr_codes")
            .select("*")
            .eq("profile_id", pData.id);
          if (qrData) {
            const mappedQr = qrData.map(mapDbQrCode);
            setDbQrCodes(mappedQr);
            setCachedData("qr_codes", mappedQr);
          }

          // 5. Fetch notifications
          const { data: notifData } = await supabase
            .from("notifications")
            .select("*")
            .eq("profile_id", pData.id)
            .order("created_at", { ascending: false });
          if (notifData) {
            const mappedNotif = notifData.map(mapDbNotification);
            setDbNotifications(mappedNotif);
            setCachedData("notifications", mappedNotif);
          }

          // 6. Fetch settings
          const { data: settingsData } = await supabase
            .from("settings")
            .select("*")
            .eq("profile_id", pData.id)
            .maybeSingle();
          if (settingsData) {
            setSettings(settingsData);
            setCachedData("settings", settingsData);
          }


          // 7. Fetch emergency contacts
          const { data: ecData } = await supabase
            .from("emergency_contacts")
            .select("*")
            .eq("profile_id", pData.id);
          setContacts(ecData || []);
          setCachedData("contacts", ecData || []);

          // 8. Fetch extracted medical values
          const { data: emValues } = await supabase
            .from("extracted_medical_values")
            .select("*")
            .eq("profile_id", pData.id);
          if (emValues) {
            const mappedConditions = emValues
              .filter((v: any) => v.value_type === "diagnosis")
              .map((v: any) => ({ id: v.id, name: v.name }));
            setConditions(mappedConditions);
            setCachedData("conditions_brief", mappedConditions);

            const mappedMeds = emValues
              .filter((v: any) => v.value_type === "medication")
              .map((v: any) => ({ id: v.id, name: v.name }));
            setMedications(mappedMeds);
            setCachedData("medications_brief", mappedMeds);
          }
        }
      } catch (err) {
        console.error("Error loading overview data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadOverviewData();
  }, []);

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <p className="text-muted-foreground">Loading dashboard overview...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="space-y-8">
        <Widget>
          <div className="text-center py-8">
            <TriangleAlert className="size-12 text-warning mx-auto" />
            <h3 className="mt-4 font-display text-lg font-semibold text-foreground">No profile found</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Please complete onboarding to get started.
            </p>
            <Button asChild className="mt-4 rounded-xl">
              <Link to="/dashboard/onboarding">Go to Onboarding</Link>
            </Button>
          </div>
        </Widget>
      </div>
    );
  }

  // Calculate completion percentage based on core profile fields filled
  const fieldsToCheck = [
    profile.full_name,
    profile.dob,
    profile.gender,
    profile.blood_group,
    profile.height_cm,
    profile.weight_kg,
    profile.address,
    profile.health_summary,
  ];
  const filledFields = fieldsToCheck.filter(Boolean).length;
  const completion = Math.round((filledFields / fieldsToCheck.length) * 100);

  // Dynamic values
  const finalProfiles = dbShareProfiles.length > 0 ? dbShareProfiles : localProfiles;
  const finalCodes = dbQrCodes.length > 0 ? dbQrCodes : localCodes;
  const activeShares = finalProfiles.filter((p) => p.status === "active");

  const totalStorageSize = documents.reduce((acc, doc) => acc + (doc.file_size || 0), 0);
  const usedGb = parseFloat((totalStorageSize / (1024 * 1024 * 1024)).toFixed(2));
  const totalGb = 10;
  const storagePercent = Math.round((usedGb / totalGb) * 100);

  const dynamicActivities = documents.map((doc) => ({
    id: doc.id,
    title: `Uploaded ${doc.title || doc.file_name}`,
    detail: `${doc.category || "Report"} · ${formatSize(Math.round(doc.file_size / 1024))}`,
    kind: "upload" as const,
    createdAt: doc.uploaded_at,
  })).slice(0, 5);

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
        <div className="relative grid gap-6 lg:grid-cols-[1.2fr_1fr] lg:items-center">
          <div>
            <p className="text-sm font-medium text-primary-foreground/80">
              {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
            </p>
            <h1 className="mt-2 font-display text-2xl font-bold text-primary-foreground sm:text-3xl">
              Good to see you, {profile.full_name?.split(" ")[0] || "User"}
            </h1>
            <p className="mt-2 max-w-xl text-sm text-primary-foreground/85">
              Your record is {completion}% complete. Ensure your emergency contact numbers and medical history are up to date.
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

          {/* Health Card */}
          <div className="relative overflow-hidden rounded-[24px] border border-slate-200/80 bg-white text-slate-800 shadow-lift flex flex-col w-full min-h-[250px]">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-2.5 border-b border-slate-100 bg-[#FCFDFD]">
              <div className="flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-lg bg-[#1E56A0] text-white">
                  <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    <path d="M8 11h8" />
                    <path d="M12 7v8" />
                  </svg>
                </span>
                <span className="font-display font-bold text-[#1E56A0] text-sm">MediLink <span className="text-slate-900">AI</span></span>
              </div>
              <div className="text-[10px] font-bold text-slate-400 tracking-[0.2em] font-mono">HEALTH CARD</div>
              <div className="flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-600">
                <svg className="size-3 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Verified
              </div>
            </div>

            {/* Body */}
            <div className="relative px-6 py-3 flex-1 flex flex-col justify-center">
              <div className="absolute right-0 bottom-0 w-1/3 h-1/2 bg-gradient-to-tr from-[#1E56A0]/10 to-transparent rounded-bl-full pointer-events-none" />

              <div className="flex items-center justify-between gap-6 relative z-10">
                {/* Left Section: Details & Grid */}
                <div className="flex-1 flex flex-col gap-3">
                  {/* Top Details */}
                  <div className="flex items-center gap-4">
                    {/* Avatar Initials */}
                    <div className="flex size-16 shrink-0 items-center justify-center rounded-full bg-[#1E56A0]/10 border border-[#1E56A0]/20 text-[#1E56A0] font-display text-lg font-bold">
                      {initials(profile.full_name || "User")}
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">NAME</div>
                      <div className="text-base font-bold text-slate-800 leading-tight mt-0.5">{profile.full_name || "N/A"}</div>
                      
                      <div className="text-[10px] font-bold text-slate-400 tracking-wider uppercase mt-2.5">Health ID</div>
                      <div className="text-xs font-bold text-[#1E56A0] tracking-wide mt-0.5">
                        {`ML-${profile.id.replace(/-/g, "").substring(0, 12).toUpperCase().match(/.{1,4}/g)?.join("-") || "XXXX-XXXX-XXXX"}`}
                      </div>
                    </div>
                  </div>

                  {/* 2x2 Info Grid */}
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 border-t border-slate-100 pt-2.5 text-xs">
                    {/* Blood Group */}
                    <div className="flex items-center gap-2.5">
                      <span className="flex size-7 shrink-0 place-items-center justify-center rounded-full bg-rose-50 text-rose-500 border border-rose-100">
                        <svg className="size-3.5" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
                        </svg>
                      </span>
                      <div>
                        <div className="text-[9px] font-medium text-slate-400">Blood Group</div>
                        <div className="font-semibold text-slate-800 mt-0.5">{profile.blood_group || "N/A"}</div>
                      </div>
                    </div>

                    {/* Date of Birth */}
                    <div className="flex items-center gap-2.5 pl-2.5 border-l border-slate-100">
                      <span className="flex size-7 shrink-0 place-items-center justify-center rounded-full bg-blue-50 text-blue-500 border border-blue-100">
                        <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                          <line x1="16" y1="2" x2="16" y2="6" />
                          <line x1="8" y1="2" x2="8" y2="6" />
                          <line x1="3" y1="10" x2="21" y2="10" />
                        </svg>
                      </span>
                      <div>
                        <div className="text-[9px] font-medium text-slate-400">Date of Birth</div>
                        <div className="font-semibold text-slate-800 mt-0.5">{profile.dob ? formatDate(profile.dob) : "N/A"}</div>
                      </div>
                    </div>

                    {/* Conditions */}
                    <div className="flex items-center gap-2.5">
                      <span className="flex size-7 shrink-0 place-items-center justify-center rounded-full bg-indigo-50 text-indigo-500 border border-indigo-100">
                        <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                        </svg>
                      </span>
                      <div>
                        <div className="text-[9px] font-medium text-slate-400">Medical Conditions</div>
                        <div className="font-semibold text-slate-800 truncate max-w-[100px] mt-0.5" title={conditions.map(c => c.name).join(', ')}>
                          {conditions.length > 0 ? conditions[0].name : "N/A"}
                        </div>
                      </div>
                    </div>

                    {/* Allergies */}
                    <div className="flex items-center gap-2.5 pl-2.5 border-l border-slate-100">
                      <span className="flex size-7 shrink-0 place-items-center justify-center rounded-full bg-amber-50 text-amber-500 border border-amber-100">
                        <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                          <line x1="12" y1="9" x2="12" y2="13" />
                          <line x1="12" y1="17" x2="12.01" y2="17" />
                        </svg>
                      </span>
                      <div>
                        <div className="text-[9px] font-medium text-slate-400">Allergies</div>
                        <div className="font-semibold text-slate-800 mt-0.5">N/A</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Section: Large QR Code */}
                <div className="shrink-0 flex items-center justify-center">
                  <div className="border-2 border-[#1E56A0] rounded-[20px] p-3 bg-white shadow-soft flex items-center justify-center">
                    <QRCodeCanvas
                      value={`${window.location.origin}/share/view/${profile.id}`}
                      size={100}
                      level="H"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-[#1E56A0] px-5 py-2.5 flex items-center justify-between text-white text-[10px] rounded-b-[23px] gap-2 mt-auto">
              <div className="flex items-center gap-1 font-medium min-w-0">
                <svg className="size-3.5 shrink-0 text-white/85" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
                <span className="truncate">Scan QR to view public profile</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="h-6 px-2 rounded-lg border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white text-[9px] gap-1 font-normal" 
                  onClick={() => {
                    setIsCardOpen(true);
                    setIsFlipped(false);
                  }}
                >
                  <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                  View card
                </Button>
                <Button size="sm" className="h-6 px-2 rounded-lg bg-white text-[#1E56A0] hover:bg-white/90 hover:text-[#1E56A0] text-[9px] gap-1 font-semibold" onClick={() => toast.success("Card downloaded successfully")}>
                  <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Download card
                </Button>
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      {/* Metrics */}
      <section className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Documents" value={String(documents.length)} hint={`${documents.filter(d => new Date(d.uploaded_at).getMonth() === new Date().getMonth()).length} added this month`} icon={FileText} delay={0} />
        <MetricCard label="Active shares" value={String(activeShares.length)} hint={`${finalProfiles.filter(p => p.status === "expired").length} expired`} icon={Share2} tone="teal" delay={0.05} />
        <MetricCard label="Reports Scanned" value={String(documents.filter((d) => d.category === "Blood Test" || d.category === "Report").length)} hint="This month" icon={ScanLine} tone="success" delay={0.1} />
        <MetricCard label="AI Analyses" value="12" hint="Ready to review" icon={Brain} tone="warning" delay={0.15} />
      </section>

      <section className="grid gap-8 lg:grid-cols-[2.3fr_1.1fr_1.2fr] lg:items-stretch">
        <Widget title="Recent activity" icon={ActivityIcon} delay={0.05} className="order-1">
          <ol className="relative space-y-8 border-l border-border pl-6">
            {dynamicActivities.map((item) => (
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
            {finalProfiles.slice(0, 3).map((profile: any) => (
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
            {finalCodes.slice(0, 3).map((qr: any) => (
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
            {dbNotifications.slice(0, 3).map((notification: any) => (
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
            ["Expired Shares", String(finalProfiles.length - activeShares.length)],
          ]} footer={<Link to="/dashboard/share" className="inline-flex items-center gap-1">Manage <ArrowUpRight className="size-3" aria-hidden /></Link>} />
          <OverviewColumn title="Generated QR Codes" icon={QrCode} rows={[
            ["Active QR Codes", String(finalCodes.filter((code: any) => code.status === "active").length)],
            ["Total Scans", String(finalCodes.reduce((total: any, code: any) => total + code.scans, 0))],
          ]} footer={<Link to="/dashboard/qr" className="inline-flex items-center gap-1">Open <ArrowUpRight className="size-3" aria-hidden /></Link>} />
          <OverviewColumn title="Health Record Status" icon={UserRound} rows={[
            ["Conditions", String(conditions.length)],
            ["Allergies", String(0)],
            ["Medications", String(medications.length)],
            ["Vaccinations", String(0)],
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
          {documents.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No documents uploaded yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {documents.slice(0, 4).map((doc) => (
                <li key={doc.id} className="flex items-center gap-3 py-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground">
                    <FileText className="size-4" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{doc.title || doc.file_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {doc.category || "Report"} · {formatSize(Math.round(doc.file_size / 1024))} · {formatRelative(doc.uploaded_at)}
                    </p>
                  </div>
                  <StatusBadge tone={doc.status === "uploaded" ? "success" : doc.status === "processing" ? "warning" : "danger"}>
                    {doc.status}
                  </StatusBadge>
                </li>
              ))}
            </ul>
          )}
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
          {finalProfiles.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No shared profiles yet.</p>
          ) : (
            <ul className="space-y-3">
              {finalProfiles.slice(0, 3).map((profile) => (
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
          )}
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
          {finalCodes.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No QR codes generated yet.</p>
          ) : (
            <ul className="space-y-3">
              {finalCodes.slice(0, 3).map((qr) => (
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
          )}
        </Widget>

        {/* Storage */}
        <Widget title="Storage usage" icon={HardDrive} delay={0.25}>
          <p className="font-display text-2xl font-bold text-foreground">
            {usedGb} GB <span className="text-sm font-medium text-muted-foreground">/ {totalGb} GB</span>
          </p>
          <Progress value={storagePercent} className="mt-3 h-2" />
          <Separator className="my-4" />
          <ul className="space-y-2 text-xs text-muted-foreground">
            <li className="flex justify-between">
              <span>Reports & labs</span>
              <span>{parseFloat((documents.filter(d => d.category?.toLowerCase().includes("report") || d.category?.toLowerCase().includes("test") || d.category?.toLowerCase().includes("lab")).reduce((acc, d) => acc + (d.file_size || 0), 0) / (1024 * 1024 * 1024)).toFixed(2))} GB</span>
            </li>
            <li className="flex justify-between">
              <span>Imaging</span>
              <span>{parseFloat((documents.filter(d => d.category?.toLowerCase().includes("x-ray") || d.category?.toLowerCase().includes("mri") || d.category?.toLowerCase().includes("scan")).reduce((acc, d) => acc + (d.file_size || 0), 0) / (1024 * 1024 * 1024)).toFixed(2))} GB</span>
            </li>
            <li className="flex justify-between">
              <span>Other documents</span>
              <span>{parseFloat((documents.filter(d => !d.category?.toLowerCase().includes("report") && !d.category?.toLowerCase().includes("test") && !d.category?.toLowerCase().includes("lab") && !d.category?.toLowerCase().includes("x-ray") && !d.category?.toLowerCase().includes("mri") && !d.category?.toLowerCase().includes("scan")).reduce((acc, d) => acc + (d.file_size || 0), 0) / (1024 * 1024 * 1024)).toFixed(2))} GB</span>
            </li>
          </ul>
        </Widget>

        {/* Activity timeline */}
        <Widget title="Recent activity" icon={ActivityIcon} delay={0.3} className="lg:col-span-2">
          {dynamicActivities.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No recent activity recorded.</p>
          ) : (
            <ol className="relative space-y-8 border-l border-border pl-6">
              {dynamicActivities.map((item) => (
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
          )}
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
          {dbNotifications.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No new notifications.</p>
          ) : (
            <ul className="space-y-3">
              {dbNotifications.slice(0, 4).map((n) => (
                <li key={n.id} className="rounded-xl border border-border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="min-w-0 truncate text-sm font-medium text-foreground">{n.title}</p>
                    <span className="shrink-0 text-[11px] text-muted-foreground">{formatRelative(n.createdAt)}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">{n.message}</p>
                </li>
              ))}
            </ul>
          )}
        </Widget>

        {/* Health record status */}
        <Widget title="Health record status" icon={UserRound} delay={0.4}>
          <ul className="space-y-3 text-sm">
            {[
              { label: "Conditions", value: `${conditions.length} recorded`, tone: "success" as const },
              { label: "Allergies", value: "0 recorded", tone: "success" as const },
              { label: "Medications", value: `${medications.length} active`, tone: "info" as const },
              { label: "Vaccinations", value: "0 due", tone: "warning" as const },
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
            <p className="font-display text-sm font-semibold text-success">
              {settings?.two_factor_enabled ? "Strong" : "Standard"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {settings?.two_factor_enabled
                ? "Two-factor authentication is on and all shares are consent-scoped."
                : "Enable two-factor authentication in settings for maximum account security."}
            </p>
          </div>
          <ul className="mt-4 space-y-2 text-xs text-muted-foreground">
            <li className="flex justify-between">
              <span>Two-factor auth</span>
              <span className={settings?.two_factor_enabled ? "text-success" : "text-warning"}>
                {settings?.two_factor_enabled ? "Enabled" : "Disabled"}
              </span>
            </li>
            <li className="flex justify-between"><span>Active sessions</span><span>1 device</span></li>
            <li className="flex justify-between"><span>Last password change</span><span>Recently</span></li>
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

      {/* Floating ID Card Modal */}
      {isCardOpen && (
        <div 
          onClick={() => setIsCardOpen(false)}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm p-4 transition-opacity duration-300"
        >
          {/* Close button */}
          <button
            onClick={() => setIsCardOpen(false)}
            className="absolute top-4 right-4 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-2.5 rounded-full transition-colors cursor-pointer z-50"
            aria-label="Close modal"
          >
            <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>

          {/* 3D Flip Card Container */}
          <div 
            onClick={(e) => {
              e.stopPropagation(); // Prevents clicking card from closing the modal
              setIsFlipped(!isFlipped);
            }} 
            className="cursor-pointer select-none"
            style={{ perspective: "1000px" }}
          >
            <div
              style={{
                width: "350px",
                height: "525px",
                transition: "transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
                transformStyle: "preserve-3d",
                transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
              }}
              className="relative shadow-2xl rounded-[24px]"
            >
              {/* FRONT FACE */}
              <div
                style={{
                  backfaceVisibility: "hidden",
                  WebkitBackfaceVisibility: "hidden",
                }}
                className="absolute inset-0 w-full h-full bg-white text-slate-800 rounded-[24px] overflow-hidden border border-slate-100 flex flex-col justify-between"
              >
                {/* Top Header */}
                <div className="flex items-center justify-between px-6 py-4">
                  <div className="flex items-center gap-1.5">
                    <span className="flex size-7 items-center justify-center rounded-lg bg-[#1E56A0] text-white">
                      <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                        <path d="M8 11h8" />
                        <path d="M12 7v8" />
                      </svg>
                    </span>
                    <span className="font-display font-bold text-[#1E56A0] text-sm">MediLink <span className="text-slate-900">AI</span></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="size-6 text-[#1E56A0]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                      <polyline points="9 11 11 13 15 9" />
                    </svg>
                    <div className="text-[8px] font-bold text-slate-500 leading-tight">
                      Verified<br />Health ID
                    </div>
                  </div>
                </div>

                {/* Profile Section */}
                <div className="px-6 py-2 flex items-start gap-4">
                  {/* Profile Image box */}
                  <div className="size-20 bg-slate-100 border border-slate-200/60 rounded-[18px] flex items-center justify-center shrink-0">
                    <svg className="size-10 text-slate-400" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">NAME</div>
                    <div className="text-base font-bold text-slate-800 truncate leading-tight mt-0.5">{profile.full_name || "N/A"}</div>
                    
                    <div className="text-[10px] font-bold text-slate-400 tracking-wider uppercase mt-2.5">MediLink Health ID</div>
                    <div className="text-xs font-bold text-[#1E56A0] tracking-wide mt-0.5">
                      {`ML-${profile.id.replace(/-/g, "").substring(0, 12).toUpperCase().match(/.{1,4}/g)?.join("-") || "XXXX-XXXX-XXXX"}`}
                    </div>
                  </div>
                </div>

                {/* Vital parameters list */}
                <div className="px-6 py-4 flex flex-col gap-4 flex-1 justify-center">
                  {/* DOB */}
                  <div className="flex items-center gap-3">
                    <span className="flex size-7 shrink-0 place-items-center justify-center rounded-full bg-[#1E56A0] text-white border border-[#1E56A0]">
                      <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                      </svg>
                    </span>
                    <div>
                      <div className="text-[9px] font-medium text-slate-400">Date of Birth</div>
                      <div className="font-semibold text-slate-800">{profile.dob ? formatDate(profile.dob) : "N/A"}</div>
                    </div>
                  </div>

                  {/* Blood Group */}
                  <div className="flex items-center gap-3">
                    <span className="flex size-7 shrink-0 place-items-center justify-center rounded-full bg-rose-500 text-white border border-rose-500">
                      <svg className="size-3.5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
                      </svg>
                    </span>
                    <div>
                      <div className="text-[9px] font-medium text-slate-400">Blood Group</div>
                      <div className="font-semibold text-slate-800">{profile.blood_group || "N/A"}</div>
                    </div>
                  </div>

                  {/* Conditions */}
                  <div className="flex items-center gap-3">
                    <span className="flex size-7 shrink-0 place-items-center justify-center rounded-full bg-[#1E56A0] text-white border border-[#1E56A0]">
                      <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                      </svg>
                    </span>
                    <div>
                      <div className="text-[9px] font-medium text-slate-400">Critical Medical Alert</div>
                      <div className="font-semibold text-slate-800 truncate max-w-[200px]" title={conditions.map(c => c.name).join(', ')}>
                        {conditions.length > 0 ? conditions[0].name : "No critical alert"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Wave Footer Section */}
                <div className="relative bg-[#1E56A0] text-white p-5 rounded-b-[24px] flex items-center justify-between overflow-hidden min-h-[90px]">
                  {/* Background wave shape */}
                  <div className="absolute inset-0 bg-[#0F3057] opacity-35 pointer-events-none" />
                  <svg className="absolute inset-0 size-full pointer-events-none" viewBox="0 0 350 120" preserveAspectRatio="none">
                    <path d="M0,60 C120,100 220,20 350,60 L350,120 L0,120 Z" fill="#1E56A0" />
                  </svg>

                  <div className="relative flex items-center gap-2.5 z-10">
                    <span className="flex size-7 items-center justify-center rounded-lg border border-white/30 bg-white/10 text-white shrink-0">
                      <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                        <line x1="12" y1="8" x2="12" y2="16" />
                        <line x1="8" y1="12" x2="16" y2="12" />
                      </svg>
                    </span>
                    <div className="text-[7px] font-bold tracking-wider leading-tight text-left">
                      YOUR HEALTH. SECURED.<br />SHARED WHEN IT MATTERS.
                    </div>
                  </div>

                  {/* QR Container */}
                  <div className="relative border border-slate-200/80 rounded-2xl p-1.5 bg-white text-slate-800 shadow-soft flex flex-col items-center justify-center shrink-0 z-10 w-[95px] -mt-16 mr-1">
                    <QRCodeCanvas
                      value={`${window.location.origin}/share/view/${profile.id}`}
                      size={64}
                      level="H"
                    />
                    <span className="text-[6px] text-slate-500 font-bold mt-1 text-center leading-tight">
                      Scan to view public<br />health profile
                    </span>
                  </div>
                </div>
              </div>

              {/* BACK FACE */}
              <div
                style={{
                  backfaceVisibility: "hidden",
                  WebkitBackfaceVisibility: "hidden",
                  transform: "rotateY(180deg)",
                }}
                className="absolute inset-0 w-full h-full bg-white text-slate-800 rounded-[24px] overflow-hidden border border-slate-100 flex flex-col justify-between"
              >
                {/* Header: Dark Blue Bar */}
                <div className="bg-[#1E56A0] px-6 py-3 flex items-center gap-2 text-white">
                  <span className="flex size-5 items-center justify-center rounded bg-white/20 text-white">
                    <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                      <path d="M8 11h8" />
                      <path d="M12 7v8" />
                    </svg>
                  </span>
                  <span className="font-display font-semibold tracking-wider text-[10px]">MEDILINK AI HEALTH CARD</span>
                </div>

                {/* Body Info Items */}
                <div className="px-6 py-4 flex flex-col gap-3.5 flex-1 justify-center relative">
                  {/* Background Watermark Shield */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
                    <svg className="size-48 text-[#1E56A0]" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                  </div>

                  {/* 1. Emergency Contact */}
                  <div className="flex items-start gap-2.5 z-10">
                    <span className="flex size-6 shrink-0 place-items-center justify-center rounded-full bg-[#1E56A0]/10 text-[#1E56A0] mt-0.5">
                      <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                      </svg>
                    </span>
                    <div className="min-w-0 flex-1 text-left">
                      <div className="text-[8px] font-bold text-slate-400 uppercase tracking-wide">Emergency Contact</div>
                      <div className="text-xs font-semibold text-slate-800 truncate">
                        {contacts.length > 0 ? `${contacts[0].name} (${contacts[0].relationship})` : "N/A"}
                      </div>
                      <div className="text-[10px] text-slate-500 font-medium leading-none mt-0.5">
                        {contacts.length > 0 ? contacts[0].phone : ""}
                      </div>
                    </div>
                  </div>

                  {/* 2. Known Allergies */}
                  <div className="flex items-start gap-2.5 z-10">
                    <span className="flex size-6 shrink-0 place-items-center justify-center rounded-full bg-[#1E56A0]/10 text-[#1E56A0] mt-0.5">
                      <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                        <line x1="12" y1="9" x2="12" y2="13" />
                        <line x1="12" y1="17" x2="12.01" y2="17" />
                      </svg>
                    </span>
                    <div className="min-w-0 flex-1 text-left">
                      <div className="text-[8px] font-bold text-slate-400 uppercase tracking-wide">Known Allergies</div>
                      <div className="text-xs font-semibold text-slate-800 truncate">N/A</div>
                    </div>
                  </div>

                  {/* 3. Chronic Conditions */}
                  <div className="flex items-start gap-2.5 z-10">
                    <span className="flex size-6 shrink-0 place-items-center justify-center rounded-full bg-[#1E56A0]/10 text-[#1E56A0] mt-0.5">
                      <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                      </svg>
                    </span>
                    <div className="min-w-0 flex-1 text-left">
                      <div className="text-[8px] font-bold text-slate-400 uppercase tracking-wide">Chronic Conditions</div>
                      <div className="text-xs font-semibold text-slate-800 truncate max-w-[220px]" title={conditions.map(c => c.name).join(', ')}>
                        {conditions.length > 0 ? conditions.map(c => c.name).join(', ') : "N/A"}
                      </div>
                    </div>
                  </div>

                  {/* 4. Current Medications (Critical) */}
                  <div className="flex items-start gap-2.5 z-10">
                    <span className="flex size-6 shrink-0 place-items-center justify-center rounded-full bg-[#1E56A0]/10 text-[#1E56A0] mt-0.5">
                      <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                        <line x1="8" y1="11" x2="16" y2="11" />
                      </svg>
                    </span>
                    <div className="min-w-0 flex-1 text-left">
                      <div className="text-[8px] font-bold text-slate-400 uppercase tracking-wide">Current Medications (Critical)</div>
                      <div className="text-xs font-semibold text-slate-800 truncate max-w-[220px]" title={medications.map(m => m.name).join(', ')}>
                        {medications.length > 0 ? medications.map(m => m.name).join(', ') : "N/A"}
                      </div>
                    </div>
                  </div>

                  {/* 5. Organ Donor */}
                  <div className="flex items-start gap-2.5 z-10">
                    <span className="flex size-6 shrink-0 place-items-center justify-center rounded-full bg-[#1E56A0]/10 text-[#1E56A0] mt-0.5">
                      <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M12 8v8" />
                        <path d="M8 12h8" />
                      </svg>
                    </span>
                    <div className="min-w-0 flex-1 text-left">
                      <div className="text-[8px] font-bold text-slate-400 uppercase tracking-wide">Organ Donor</div>
                      <div className="text-xs font-semibold text-slate-800 truncate">N/A</div>
                    </div>
                  </div>

                  {/* 6. Emergency Instructions */}
                  <div className="flex items-start gap-2.5 z-10">
                    <span className="flex size-6 shrink-0 place-items-center justify-center rounded-full bg-[#1E56A0]/10 text-[#1E56A0] mt-0.5">
                      <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="16" x2="12" y2="12" />
                        <line x1="12" y1="8" x2="12.01" y2="8" />
                      </svg>
                    </span>
                    <div className="min-w-0 flex-1 text-left">
                      <div className="text-[8px] font-bold text-slate-400 uppercase tracking-wide">Emergency Instructions</div>
                      <div className="text-xs font-semibold text-slate-800 truncate max-w-[220px]" title={profile.ai_health_summary?.last_analysis_summary || profile.health_summary}>
                        {profile.ai_health_summary?.last_analysis_summary || profile.health_summary || "N/A"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Row Area */}
                <div className="border-t border-slate-100 mx-6 pt-3 pb-3 flex items-center justify-between z-10">
                  {/* Three trust badges column list */}
                  <div className="grid grid-cols-3 gap-2 flex-1 text-center pr-3">
                    <div className="flex flex-col items-center">
                      <span className="flex size-7 items-center justify-center rounded-full bg-[#1E56A0]/10 text-[#1E56A0] mb-1">
                        <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                          <polyline points="9 11 11 13 15 9" />
                        </svg>
                      </span>
                      <span className="text-[7px] text-slate-500 font-bold leading-tight">Secure<br />& Private</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="flex size-7 items-center justify-center rounded-full bg-[#1E56A0]/10 text-[#1E56A0] mb-1">
                        <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                      </span>
                      <span className="text-[7px] text-slate-500 font-bold leading-tight">Encrypted<br />Data</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="flex size-7 items-center justify-center rounded-full bg-[#1E56A0]/10 text-[#1E56A0] mb-1">
                        <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                          <circle cx="9" cy="7" r="4" />
                        </svg>
                      </span>
                      <span className="text-[7px] text-slate-500 font-bold leading-tight">You're in<br />Control</span>
                    </div>
                  </div>

                  {/* QR Container */}
                  <div className="border border-slate-200/80 rounded-xl p-1.5 bg-white text-slate-800 shadow-soft flex flex-col items-center justify-center shrink-0 w-[80px]">
                    <QRCodeCanvas
                      value={`${window.location.origin}/share/view/${profile.id}`}
                      size={54}
                      level="H"
                    />
                    <span className="text-[5px] text-slate-400 font-bold mt-1 text-center leading-tight">
                      Scan to view public<br />health profile
                    </span>
                  </div>
                </div>

                {/* Bottom strip message */}
                <div className="bg-[#1E56A0] px-6 py-2 flex items-center justify-between text-white text-[7px] font-medium leading-tight">
                  <span className="text-left">In case of emergency, scan QR code or contact emergency number.</span>
                  <span className="tracking-wide font-bold shrink-0">WWW.MEDILINK.AI</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Tap instruction badge */}
          <div className="text-white/60 text-xs mt-4 flex items-center gap-1.5 justify-center select-none bg-white/10 px-3 py-1.5 rounded-full hover:bg-white/15 transition-colors">
            <svg className="size-3.5 text-white/80 animate-spin" style={{ animationDuration: "3s" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
            </svg>
            Click card to flip
          </div>
        </div>
      )}
    </div>
  );
}

const TriangleAlert = ({ className, "aria-hidden": ariaHidden }: { className?: string; "aria-hidden"?: boolean }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden={ariaHidden}
  >
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);
