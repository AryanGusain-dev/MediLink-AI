import {
  Activity,
  Apple,
  Bot,
  Building2,
  CalendarDays,
  CreditCard,
  Dumbbell,
  FlaskConical,
  HeartPulse,
  Watch,
  Pill,
  ShieldCheck,
  Siren,
  Stethoscope,
  Users,
  Video,
  BookOpen,
} from "lucide-react";
import type { ComingSoonProps } from "@/components/shared/coming-soon";

export type PlaceholderSlug =
  | "ai-assistant"
  | "appointments"
  | "doctors"
  | "hospitals"
  | "telemedicine"
  | "emergency"
  | "medicine-reminder"
  | "health-analytics"
  | "diet-planner"
  | "fitness-planner"
  | "laboratory"
  | "pharmacy"
  | "insurance"
  | "billing"
  | "wearables"
  | "research"
  | "community";

export const placeholderPages: Record<PlaceholderSlug, ComingSoonProps> = {
  "ai-assistant": {
    icon: Bot,
    title: "AI Medical Assistant",
    tagline: "A clinically-grounded assistant that understands your entire record.",
    description:
      "The assistant will read your structured health record and answer questions in plain language, always citing the source document behind every answer.",
    capabilities: [
      "Conversational answers about your reports",
      "Plain-language explanation of lab values",
      "Medication interaction warnings",
      "Question prompts to take to your doctor",
      "Source citation for every response",
      "Multilingual support",
    ],
    timeline: "Targeted for the Q2 platform release",
  },
  appointments: {
    icon: CalendarDays,
    title: "Appointments",
    tagline: "Book, reschedule and track every consultation in one calendar.",
    description:
      "A unified scheduling surface across clinics and hospitals, with automatic record attachment so your doctor sees the right documents before you arrive.",
    capabilities: [
      "Real-time clinic availability",
      "One-tap rescheduling",
      "Pre-visit document attachment",
      "Reminder notifications",
      "Follow-up scheduling",
      "Calendar sync",
    ],
    timeline: "Targeted for the Q2 platform release",
  },
  doctors: {
    icon: Stethoscope,
    title: "Doctors Directory",
    tagline: "Find verified specialists and keep your care team connected.",
    description:
      "A verified directory of physicians with specialties, affiliations and the ability to grant time-boxed access to your record.",
    capabilities: [
      "Verified specialist profiles",
      "Care-team management",
      "Time-boxed record access",
      "Referral tracking",
      "Consultation history",
      "Ratings and reviews",
    ],
    timeline: "Targeted for the Q3 platform release",
  },
  hospitals: {
    icon: Building2,
    title: "Hospital Network",
    tagline: "Connected facilities that can receive your record instantly.",
    description:
      "Browse partner hospitals, view departments and pre-register for admission with your consented health summary already attached.",
    capabilities: [
      "Partner hospital directory",
      "Department and service listings",
      "Pre-admission record transfer",
      "Bed and emergency availability",
      "Cashless insurance indicators",
      "Discharge summary sync",
    ],
    timeline: "Targeted for the Q3 platform release",
  },
  telemedicine: {
    icon: Video,
    title: "Telemedicine",
    tagline: "Secure video consultations with your record on screen.",
    description:
      "Encrypted video visits where the clinician sees only the fields you consented to share, with notes written straight back into your record.",
    capabilities: [
      "End-to-end encrypted video",
      "In-call record viewer",
      "Digital prescriptions",
      "Consultation notes sync",
      "Waiting-room queue",
      "Session recordings with consent",
    ],
    timeline: "Targeted for the Q3 platform release",
  },
  emergency: {
    icon: Siren,
    title: "Emergency Services",
    tagline: "One tap between an incident and the right responders.",
    description:
      "Emergency dispatch integration that shares your critical fields — blood group, allergies, conditions and contacts — with responding medics.",
    capabilities: [
      "One-tap SOS dispatch",
      "Live location sharing",
      "Critical field broadcast",
      "Automatic contact alerts",
      "Nearest trauma centre routing",
      "Responder access audit trail",
    ],
    timeline: "Targeted for the Q4 platform release",
  },
  "medicine-reminder": {
    icon: Pill,
    title: "Medicine Reminder",
    tagline: "Adherence tracking that actually fits your routine.",
    description:
      "Schedule doses from your prescriptions, get smart reminders and share adherence reports with your physician.",
    capabilities: [
      "Prescription-driven schedules",
      "Smart dose reminders",
      "Adherence streaks and reports",
      "Refill alerts",
      "Caregiver notifications",
      "Missed-dose guidance",
    ],
    timeline: "Targeted for the Q2 platform release",
  },
  "health-analytics": {
    icon: Activity,
    title: "Health Analytics",
    tagline: "Trends across every report you have ever uploaded.",
    description:
      "Longitudinal charts of your lab values with reference ranges, so a slow drift becomes visible long before it becomes a diagnosis.",
    capabilities: [
      "Longitudinal lab trends",
      "Reference-range overlays",
      "Risk indicators",
      "Comparative period reports",
      "Exportable summaries",
      "Doctor-shareable dashboards",
    ],
    timeline: "Targeted for the Q3 platform release",
  },
  "diet-planner": {
    icon: Apple,
    title: "Diet Planner",
    tagline: "Nutrition guidance aligned to your conditions.",
    description:
      "Meal planning that respects your allergies, conditions and medication interactions, built with registered dietitians.",
    capabilities: [
      "Condition-aware meal plans",
      "Allergy-safe recipes",
      "Nutrient tracking",
      "Grocery list export",
      "Dietitian review",
      "Cultural cuisine options",
    ],
    timeline: "Targeted for the Q4 platform release",
  },
  "fitness-planner": {
    icon: Dumbbell,
    title: "Fitness Planner",
    tagline: "Movement plans safe for your medical history.",
    description:
      "Activity programmes calibrated to your cardiac, orthopaedic and metabolic profile, with progress written back to your record.",
    capabilities: [
      "Condition-safe workout plans",
      "Physiotherapy programmes",
      "Progress tracking",
      "Wearable integration",
      "Recovery guidance",
      "Clinician-approved templates",
    ],
    timeline: "Targeted for the Q4 platform release",
  },
  laboratory: {
    icon: FlaskConical,
    title: "Laboratory",
    tagline: "Book tests and receive results straight into your vault.",
    description:
      "Order lab panels, schedule home sample collection and have structured results delivered directly to your record.",
    capabilities: [
      "Lab panel booking",
      "Home sample collection",
      "Direct structured results",
      "Price comparison",
      "Repeat-test scheduling",
      "Historical result linking",
    ],
    timeline: "Targeted for the Q3 platform release",
  },
  pharmacy: {
    icon: Pill,
    title: "Pharmacy",
    tagline: "Fulfil prescriptions without retyping a thing.",
    description:
      "Send digital prescriptions to partner pharmacies, compare prices and track delivery — all linked back to your medication list.",
    capabilities: [
      "Digital prescription fulfilment",
      "Partner pharmacy network",
      "Price comparison",
      "Delivery tracking",
      "Automatic refills",
      "Generic alternatives",
    ],
    timeline: "Targeted for the Q4 platform release",
  },
  insurance: {
    icon: ShieldCheck,
    title: "Insurance",
    tagline: "Policies, claims and coverage in one place.",
    description:
      "Manage policies, submit claims with the supporting documents auto-attached, and track settlement status end to end.",
    capabilities: [
      "Policy vault",
      "Guided claim submission",
      "Auto-attached documents",
      "Claim status tracking",
      "Coverage explanations",
      "Renewal reminders",
    ],
    timeline: "Targeted for the Q3 platform release",
  },
  billing: {
    icon: CreditCard,
    title: "Billing",
    tagline: "Every medical bill, reconciled and searchable.",
    description:
      "Consolidated medical spending across hospitals, labs and pharmacies with tax-ready exports.",
    capabilities: [
      "Consolidated bill vault",
      "Spend analytics",
      "Insurance reconciliation",
      "Tax-ready exports",
      "Payment reminders",
      "Family account rollup",
    ],
    timeline: "Targeted for the Q4 platform release",
  },
  wearables: {
    icon: Watch,
    title: "Wearables",
    tagline: "Continuous signals joined to your clinical record.",
    description:
      "Sync heart rate, sleep, SpO₂ and activity from your devices so clinicians see context, not just a single snapshot.",
    capabilities: [
      "Multi-device sync",
      "Continuous vitals timeline",
      "Sleep and recovery insights",
      "Anomaly alerts",
      "Clinician-shareable trends",
      "Offline backfill",
    ],
    timeline: "Targeted for the Q4 platform release",
  },
  research: {
    icon: BookOpen,
    title: "Research Participation",
    tagline: "Contribute to medical research on your own terms.",
    description:
      "Opt in to de-identified research programmes with granular, revocable consent and full transparency on how data is used.",
    capabilities: [
      "De-identified data contribution",
      "Granular revocable consent",
      "Study matching",
      "Transparency reports",
      "Trial eligibility alerts",
      "Contribution history",
    ],
    timeline: "Under ethics review",
  },
  community: {
    icon: Users,
    title: "Community",
    tagline: "Moderated peer support for people like you.",
    description:
      "Condition-specific communities moderated by clinicians, where lived experience is shared without compromising privacy.",
    capabilities: [
      "Condition-specific groups",
      "Clinician moderation",
      "Anonymous participation",
      "Verified expert AMAs",
      "Resource libraries",
      "Local support meetups",
    ],
    timeline: "Under design research",
  },
};

export const placeholderNav: { slug: PlaceholderSlug; label: string; icon: typeof HeartPulse }[] = (
  Object.keys(placeholderPages) as PlaceholderSlug[]
).map((slug) => ({ slug, label: placeholderPages[slug].title, icon: placeholderPages[slug].icon }));
