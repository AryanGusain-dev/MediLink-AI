import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import {
  ArrowRight,
  Brain,
  CheckCircle2,
  FileScan,
  HeartPulse,
  Lock,
  QrCode,
  ScanLine,
  ShieldCheck,
  Share2,
  Siren,
  Sparkles,
  Star,
  Upload,
  Video,
} from "lucide-react";
import heroImage from "@/assets/hero-health.jpg";
import { MarketingNav } from "@/components/layout/marketing-nav";
import { MarketingFooter } from "@/components/layout/marketing-footer";
import { SectionHeading, Reveal } from "@/components/shared/section";
import { StatBlock } from "@/components/shared/animated-counter";
import { StatusBadge } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { healthStats } from "@/data/mock";
import { useAuth } from "@/contexts/auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MediLink AI — Secure AI-Ready Digital Health Records" },
      {
        name: "description",
        content:
          "Store medical reports, scan documents and share a consent-controlled health profile by secure link or QR code. Built for patients and clinicians.",
      },
      { property: "og:title", content: "MediLink AI — Secure AI-Ready Digital Health Records" },
      {
        property: "og:description",
        content:
          "One encrypted home for every medical record, with consent-first sharing via secure links and QR codes.",
      },
    ],
  }),
  component: LandingPage,
});

const features = [
  {
    icon: HeartPulse,
    title: "AI Health Records",
    description:
      "A structured, longitudinal record built from every document you upload — ready for FHIR export.",
    status: "live" as const,
  },
  {
    icon: FileScan,
    title: "Medical Report Scanner",
    description: "Capture reports with your camera and file them in the right category in seconds.",
    status: "live" as const,
  },
  {
    icon: ShieldCheck,
    title: "Secure Sharing",
    description:
      "Field-level consent. Share only blood group and allergies, or a full clinical picture.",
    status: "live" as const,
  },
  {
    icon: QrCode,
    title: "QR Medical Profile",
    description: "Printable QR codes that reveal exactly the fields you selected — nothing more.",
    status: "live" as const,
  },
  {
    icon: Brain,
    title: "AI Assistant",
    description: "Ask questions about your record and get cited, plain-language answers.",
    status: "soon" as const,
  },
  {
    icon: Video,
    title: "Telemedicine",
    description: "Encrypted video consultations with your consented record on screen.",
    status: "soon" as const,
  },
  {
    icon: Siren,
    title: "Emergency Services",
    description: "Broadcast critical fields to responders with a single tap.",
    status: "soon" as const,
  },
];

const steps = [
  {
    icon: Upload,
    title: "Upload your records",
    text: "Drag in PDFs, lab reports and scans. Everything is encrypted at rest and organised by category.",
  },
  {
    icon: ScanLine,
    title: "Build your health profile",
    text: "Conditions, allergies, medications, vaccinations and insurance — one canonical source of truth.",
  },
  {
    icon: Share2,
    title: "Choose what to share",
    text: "Create share profiles with field-level toggles for emergencies, doctors, insurers or family.",
  },
  {
    icon: QrCode,
    title: "Share by link or QR",
    text: "Generate expiring links and printable QR codes. Revoke access at any moment.",
  },
];

const testimonials = [
  {
    quote:
      "During an ER visit the team scanned my wallet QR and had my allergies and medication list before I finished the paperwork.",
    name: "Priya Raghavan",
    role: "Patient, Bengaluru",
  },
  {
    quote:
      "Patients arriving with a structured MediLink summary cut my intake time roughly in half. The consent model is genuinely well thought out.",
    name: "Dr. Arun Menon",
    role: "Internal Medicine, Fortis",
  },
  {
    quote:
      "We moved a family of five off a shoebox of paper reports. Insurance claims now take minutes instead of a weekend.",
    name: "Nikhil Bose",
    role: "Caregiver",
  },
];

const faqs = [
  {
    q: "Who can see my medical information?",
    a: "Only the people you hand a share link or QR code to, and only the fields you explicitly enabled for that share profile. Every share can be PIN-protected, given an expiry date and revoked instantly.",
  },
  {
    q: "How is my data protected?",
    a: "Records are encrypted in transit and at rest with AES-256. Access is logged per share profile so you can see exactly when and where each link was opened.",
  },
  {
    q: "Does the report scanner read my documents automatically?",
    a: "Not yet. Today the scanner captures and files your reports. Automated extraction into structured FHIR resources is on the roadmap and clearly marked as under development inside the app.",
  },
  {
    q: "Can I use MediLink AI for my whole family?",
    a: "Family access profiles let you share a curated view with relatives today, and full multi-member accounts are part of the planned platform release.",
  },
  {
    q: "What happens if I lose access to my account?",
    a: "Account recovery runs through your verified email and registered emergency contact, with a mandatory cool-off window before any access change takes effect.",
  },
];

function LandingPage() {
  const { session } = useAuth();

  return (
    <div className="min-h-dvh bg-background">
      <MarketingNav />

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="surface-grid absolute inset-0 opacity-60" aria-hidden />
          <div
            className="absolute -left-32 top-0 size-96 rounded-full bg-primary/10 blur-3xl"
            aria-hidden
          />
          <div
            className="absolute -right-24 top-32 size-80 rounded-full bg-teal/15 blur-3xl"
            aria-hidden
          />

          <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pt-6 pb-16 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:pt-10 lg:pb-24">
            <div>
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-xs font-semibold text-primary shadow-soft">
                  <Sparkles className="size-3.5" aria-hidden />
                  AI-ready health records
                </span>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.05 }}
                className="mt-6 font-display text-4xl font-extrabold leading-[1.08] text-foreground sm:text-5xl lg:text-6xl"
              >
                Your entire medical history,{" "}
                <span className="gradient-text">secure and shareable</span> in seconds.
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.12 }}
                className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground"
              >
                MediLink AI keeps every report, prescription and scan in one encrypted vault — then
                lets you share precisely the right fields with a doctor, hospital or first
                responder.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.18 }}
                className="mt-8 flex flex-wrap gap-3"
              >
                {session ? (
                  <Button asChild size="lg" className="rounded-xl shadow-glow">
                    <Link to="/dashboard">
                      Go to Dashboard
                      <ArrowRight className="size-4" aria-hidden />
                    </Link>
                  </Button>
                ) : (
                  <>
                    <Button asChild size="lg" className="rounded-xl shadow-glow">
                      <Link to="/register">
                        Create your health vault
                        <ArrowRight className="size-4" aria-hidden />
                      </Link>
                    </Button>
                    <Button asChild size="lg" variant="outline" className="rounded-xl">
                      <Link to="/dashboard">Explore the dashboard</Link>
                    </Button>
                  </>
                )}
              </motion.div>

              <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
                {["AES-256 encrypted", "Consent-first sharing", "Revoke access anytime"].map(
                  (item) => (
                    <li key={item} className="flex items-center gap-2">
                      <CheckCircle2 className="size-4 text-success" aria-hidden />
                      {item}
                    </li>
                  ),
                )}
              </ul>
            </div>

            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="relative"
            >
              <img
                src={heroImage}
                width={1200}
                height={912}
                alt="MediLink AI health record dashboard with encrypted sharing and QR access"
                className="w-full rounded-3xl border border-border bg-card shadow-lift"
              />
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -bottom-6 -left-4 hidden items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-lift sm:flex"
              >
                <span className="grid size-10 place-items-center rounded-xl bg-success/12 text-success">
                  <Lock className="size-5" aria-hidden />
                </span>
                <div>
                  <p className="text-sm font-semibold text-foreground">Emergency QR active</p>
                  <p className="text-xs text-muted-foreground">7 fields shared · PIN protected</p>
                </div>
              </motion.div>
            </motion.div>
          </div>

          <div className="relative mx-auto grid max-w-6xl gap-4 px-4 pb-16 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
            {healthStats.map((stat, i) => (
              <StatBlock
                key={stat.label}
                label={stat.label}
                value={stat.value}
                suffix={stat.suffix}
                decimals={stat.label === "Uptime" ? 2 : 0}
                delay={i * 0.08}
              />
            ))}
          </div>
        </section>

        {/* Features */}
        <section id="features" className="scroll-mt-20 border-y border-border bg-card py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <SectionHeading
              eyebrow="Platform"
              title="Everything your health record needs — nothing it doesn't"
              description="Modular capabilities that work today, with a clearly signposted roadmap for what's coming next."
            />

            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature, i) => (
                <Reveal key={feature.title} delay={i * 0.05}>
                  <Card className="card-hover h-full rounded-2xl border-border p-6 shadow-soft">
                    <div className="flex items-start justify-between gap-3">
                      <span className="grid size-11 place-items-center rounded-2xl bg-accent text-accent-foreground">
                        <feature.icon className="size-5" aria-hidden />
                      </span>
                      {feature.status === "soon" ? (
                        <StatusBadge tone="warning">Coming soon</StatusBadge>
                      ) : null}
                    </div>
                    <h3 className="mt-6 font-display text-lg font-semibold text-foreground">
                      {feature.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {feature.description}
                    </p>
                  </Card>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="scroll-mt-20 py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <SectionHeading
              eyebrow="How it works"
              title="From a shoebox of paper to a live health profile"
              description="Four steps, about ten minutes, and your record is ready for any clinic in the country."
            />

            <ol className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {steps.map((step, i) => (
                <Reveal key={step.title} delay={i * 0.07}>
                  <li className="card-hover relative h-full list-none rounded-2xl border border-border bg-card p-6 shadow-soft">
                    <span className="font-display text-xs font-bold uppercase tracking-[0.18em] text-primary">
                      Step {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="mt-4 grid size-11 place-items-center rounded-2xl bg-teal/15 text-teal">
                      <step.icon className="size-5" aria-hidden />
                    </span>
                    <h3 className="mt-4 font-display text-base font-semibold text-foreground">
                      {step.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {step.text}
                    </p>
                  </li>
                </Reveal>
              ))}
            </ol>
          </div>
        </section>

        {/* Testimonials */}
        <section id="testimonials" className="scroll-mt-20 border-y border-border bg-card py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <SectionHeading
              eyebrow="Testimonials"
              title="Trusted by patients and the clinicians who treat them"
            />
            <div className="mt-12 grid gap-6 lg:grid-cols-3">
              {testimonials.map((t, i) => (
                <Reveal key={t.name} delay={i * 0.07}>
                  <figure className="card-hover flex h-full flex-col rounded-2xl border border-border bg-background p-6 shadow-soft">
                    <div className="flex gap-1 text-warning" aria-label="Rated 5 out of 5">
                      {Array.from({ length: 5 }).map((_, s) => (
                        <Star key={s} className="size-4 fill-current" aria-hidden />
                      ))}
                    </div>
                    <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-foreground">
                      "{t.quote}"
                    </blockquote>
                    <figcaption className="mt-6 flex items-center gap-3">
                      <Avatar className="size-9">
                        <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                          {t.name
                            .split(" ")
                            .map((p) => p[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-foreground">
                          {t.name}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {t.role}
                        </span>
                      </span>
                    </figcaption>
                  </figure>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="scroll-mt-20 py-20">
          <div className="mx-auto max-w-3xl px-4 sm:px-6">
            <SectionHeading
              eyebrow="FAQ"
              title="Questions people ask before trusting us with their records"
            />
            <Accordion type="single" collapsible className="mt-10 space-y-3">
              {faqs.map((faq, i) => (
                <AccordionItem
                  key={faq.q}
                  value={`item-${i}`}
                  className="rounded-2xl border border-border bg-card px-6 shadow-soft last:border-b"
                >
                  <AccordionTrigger className="text-left font-display text-base font-semibold hover:no-underline">
                    {faq.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                    {faq.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        {/* CTA */}
        <section className="px-4 pb-20 sm:px-6">
          <Reveal className="mx-auto max-w-6xl">
            <div className="gradient-brand relative overflow-hidden rounded-3xl px-6 py-16 text-center shadow-glow sm:px-12">
              <div className="surface-grid absolute inset-0 opacity-20" aria-hidden />
              <div className="relative mx-auto max-w-2xl">
                <h2 className="font-display text-3xl font-bold text-primary-foreground sm:text-4xl">
                  Bring your health records into one secure place
                </h2>
                <p className="mt-4 text-base text-primary-foreground/85">
                  Free to start. No card required. Your data stays yours, always.
                </p>
                <div className="mt-8 flex flex-wrap justify-center gap-3">
                  {session ? (
                    <Button asChild size="lg" variant="secondary" className="rounded-xl">
                      <Link to="/dashboard">Go to Dashboard</Link>
                    </Button>
                  ) : (
                    <>
                      <Button asChild size="lg" variant="secondary" className="rounded-xl">
                        <Link to="/register">Create free account</Link>
                      </Button>
                      <Button
                        asChild
                        size="lg"
                        variant="outline"
                        className="rounded-xl border-primary-foreground/40 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
                      >
                        <Link to="/login">Sign in</Link>
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </Reveal>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
