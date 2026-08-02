import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CheckCircle2, Clock, Upload, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth";

export const Route = createFileRoute("/dashboard/onboarding/")({
  head: () => ({
    meta: [
      { title: "Set up your health profile — MediLink AI" },
      { name: "description", content: "Set up your health profile on MediLink AI." },
    ],
  }),
  component: OnboardingPage,
});

function OnboardingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleUploadReport = () => {
    if (user?.id) {
      localStorage.setItem(`medilink_onboarding_done_${user.id}`, "true");
    }
    navigate({ to: "/dashboard/documents" });
  };

  const handleFillManually = () => {
    navigate({ to: "/dashboard/onboarding/fill" });
  };

  const handleSkip = () => {
    if (user?.id) {
      localStorage.setItem(`medilink_onboarding_done_${user.id}`, "true");
    }
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="flex min-h-[calc(100dvh-4rem)] items-center justify-center px-4 py-10">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="mb-10 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/8 px-3 py-1 text-xs font-medium text-primary">
            Welcome to MediLink AI
          </span>
          <h1 className="mt-4 font-display text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Let&apos;s set up your{" "}
            <span className="text-primary">health profile</span>
          </h1>
          <p className="mt-3 text-base text-muted-foreground">
            You can create your profile in a way that suits you best.
            <br />
            This helps us personalize your experience.
          </p>
        </div>

        {/* Cards */}
        <div className="grid gap-5 sm:grid-cols-3">
          {/* Upload Report — Recommended */}
          <div className="relative flex flex-col rounded-2xl border-2 border-primary/30 bg-card p-6 shadow-sm transition-shadow hover:shadow-md">
            <span className="absolute right-4 top-4 rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
              Recommended
            </span>

            <div className="mb-5 flex h-20 w-20 items-center justify-center self-center rounded-2xl bg-primary/8">
              <UploadReportIllustration />
            </div>

            <h2 className="text-center text-lg font-semibold text-primary">
              Upload a medical report
            </h2>
            <p className="mt-2 text-center text-sm text-muted-foreground">
              Our AI will automatically extract your medical information and create your profile.
            </p>

            <ul className="mt-4 space-y-2">
              {[
                "Auto-extract details using AI",
                "Includes lab results, medicines & more",
                "Saves time and effort",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="size-4 shrink-0 text-primary" aria-hidden />
                  {item}
                </li>
              ))}
            </ul>

            <Button
              id="onboarding-upload-report"
              size="lg"
              className="mt-6 w-full rounded-xl"
              onClick={handleUploadReport}
            >
              <Upload className="size-4" aria-hidden />
              Upload report
            </Button>
          </div>

          {/* Fill Manually */}
          <div className="flex flex-col rounded-2xl border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md">
            <div className="mb-5 flex h-20 w-20 items-center justify-center self-center rounded-2xl bg-teal/10">
              <FillManuallyIllustration />
            </div>

            <h2 className="text-center text-lg font-semibold text-teal">
              Fill information manually
            </h2>
            <p className="mt-2 text-center text-sm text-muted-foreground">
              Enter your basic details manually to create your health profile.
            </p>

            <ul className="mt-4 space-y-2">
              {[
                "Quick and easy form",
                "You're in control",
                "Can be updated anytime",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="size-4 shrink-0 text-teal" aria-hidden />
                  {item}
                </li>
              ))}
            </ul>

            <Button
              id="onboarding-fill-manually"
              size="lg"
              variant="outline"
              className="mt-6 w-full rounded-xl border-teal/40 text-teal hover:bg-teal/5 hover:text-teal"
              onClick={handleFillManually}
            >
              <ClipboardList className="size-4" aria-hidden />
              Fill manually
            </Button>
          </div>

          {/* Skip for now */}
          <div className="flex flex-col rounded-2xl border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md">
            <div className="mb-5 flex h-20 w-20 items-center justify-center self-center rounded-2xl bg-warning/10">
              <SkipIllustration />
            </div>

            <h2 className="text-center text-lg font-semibold text-warning">
              Skip for now
            </h2>
            <p className="mt-2 text-center text-sm text-muted-foreground">
              Explore the app first and complete your profile later.
            </p>

            <ul className="mt-4 space-y-2">
              {[
                "Go to dashboard instantly",
                "You'll be reminded later",
                "No information will be saved",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="size-4 shrink-0 text-warning" aria-hidden />
                  {item}
                </li>
              ))}
            </ul>

            <Button
              id="onboarding-skip"
              size="lg"
              variant="outline"
              className="mt-6 w-full rounded-xl border-warning/40 text-warning hover:bg-warning/5 hover:text-warning"
              onClick={handleSkip}
            >
              <Clock className="size-4" aria-hidden />
              Skip for now
            </Button>
          </div>
        </div>

        {/* Footer note */}
        <p className="mt-8 text-center text-xs text-muted-foreground">
          🔒 Your data is private and secure. We only use it to enhance your health experience.
        </p>
      </div>
    </div>
  );
}

/* ── Inline SVG Illustrations ── */

function UploadReportIllustration() {
  return (
    <svg width="52" height="52" viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="8" y="4" width="28" height="36" rx="4" fill="#E0E8FF" />
      <rect x="13" y="12" width="18" height="2.5" rx="1.25" fill="#6B8EF8" />
      <rect x="13" y="18" width="12" height="2.5" rx="1.25" fill="#A5B8FC" />
      <rect x="13" y="24" width="15" height="2.5" rx="1.25" fill="#A5B8FC" />
      <circle cx="36" cy="36" r="13" fill="#3B6CFF" />
      <path d="M36 41v-10M31 35l5-5 5 5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function FillManuallyIllustration() {
  return (
    <svg width="52" height="52" viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="8" y="8" width="30" height="38" rx="4" fill="#E0F5F0" />
      <rect x="17" y="4" width="12" height="8" rx="2" fill="#B2E8DC" />
      <rect x="13" y="20" width="20" height="2.5" rx="1.25" fill="#3DC6A4" />
      <rect x="13" y="26" width="14" height="2.5" rx="1.25" fill="#8ADDC8" />
      <rect x="13" y="32" width="17" height="2.5" rx="1.25" fill="#8ADDC8" />
      <circle cx="16" cy="16" r="3" fill="#3DC6A4" />
      <circle cx="38" cy="38" r="10" fill="#3DC6A4" />
      <path d="M34 42l2-6 4-4 4 4-4 4-6 2z" fill="#fff" />
      <path d="M38 32l4 4" stroke="#3DC6A4" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function SkipIllustration() {
  return (
    <svg width="52" height="52" viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="26" cy="28" r="18" fill="#FEF3C7" stroke="#F59E0B" strokeWidth="2" />
      <line x1="26" y1="28" x2="26" y2="17" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="26" y1="28" x2="34" y2="32" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M15 14c2-3 4-4 6-4" stroke="#FBBF24" strokeWidth="2" strokeLinecap="round" />
      <path d="M37 14c-2-3-4-4-6-4" stroke="#FBBF24" strokeWidth="2" strokeLinecap="round" />
      <circle cx="26" cy="28" r="2" fill="#F59E0B" />
    </svg>
  );
}
