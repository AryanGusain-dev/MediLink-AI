import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, Check, Info } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/auth";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/dashboard/onboarding/fill")({
  head: () => ({
    meta: [
      { title: "Fill Health Profile — MediLink AI" },
      { name: "description", content: "Fill in your health profile information manually." },
    ],
  }),
  component: FillManuallyPage,
});

const STEPS = [
  { id: 1, label: "Basic information" },
  { id: 2, label: "Health information" },
  { id: 3, label: "Emergency contact" },
  { id: 4, label: "Review & finish" },
];

const GENDER_OPTIONS = ["Male", "Female", "Non-binary", "Prefer not to say"];
const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "Unknown"];
const HEIGHT_UNITS = ["cm", "ft"];
const WEIGHT_UNITS = ["kg", "lbs"];

interface FormData {
  // Step 1 — Basic
  full_name: string;
  dob: string;
  gender: string;
  blood_group: string;
  // Step 2 — Health
  height: string;
  height_unit: string;
  weight: string;
  weight_unit: string;
  conditions: string;
  allergies: string;
  medications: string;
  // Step 3 — Emergency contact
  ec_name: string;
  ec_relationship: string;
  ec_phone: string;
}

const initialForm: FormData = {
  full_name: "",
  dob: "",
  gender: "",
  blood_group: "",
  height: "",
  height_unit: "cm",
  weight: "",
  weight_unit: "kg",
  conditions: "",
  allergies: "",
  medications: "",
  ec_name: "",
  ec_relationship: "",
  ec_phone: "",
};

function FillManuallyPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>(initialForm);
  const [saving, setSaving] = useState(false);

  const set = (field: keyof FormData, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleBack = () => {
    if (step === 1) {
      navigate({ to: "/dashboard/onboarding" });
    } else {
      setStep((s) => s - 1);
    }
  };

  const handleContinue = () => {
    if (step < 4) setStep((s) => s + 1);
  };

  const handleFinish = async () => {
    setSaving(true);
    try {
      if (user) {
        await supabase.from("profiles").upsert({
          auth_user_id: user.id,
          full_name: form.full_name,
          email: user.email ?? "",
          dob: form.dob || null,
          gender: form.gender || null,
          blood_group: form.blood_group || null,
          height_cm:
            form.height
              ? form.height_unit === "ft"
                ? parseFloat(form.height) * 30.48
                : parseFloat(form.height)
              : null,
          weight_kg:
            form.weight
              ? form.weight_unit === "lbs"
                ? parseFloat(form.weight) * 0.453592
                : parseFloat(form.weight)
              : null,
          health_summary:
            [
              form.conditions && `Conditions: ${form.conditions}`,
              form.allergies && `Allergies: ${form.allergies}`,
              form.medications && `Medications: ${form.medications}`,
            ]
              .filter(Boolean)
              .join("\n") || null,
        });

        // emergency contact
        if (form.ec_name && form.ec_phone) {
          await supabase.from("emergency_contacts").insert({
            profile_id: null, // will need a profile_id fetch ideally
            name: form.ec_name,
            relationship: form.ec_relationship || null,
            phone: form.ec_phone,
            is_primary: true,
          });
        }

        localStorage.setItem(`medilink_onboarding_done_${user.id}`, "true");
      }

      toast.success("Health profile saved successfully!");
      navigate({ to: "/dashboard" });
    } catch {
      toast.error("Failed to save profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-2xl py-8">
      {/* Back button */}
      <button
        onClick={handleBack}
        className="mb-6 flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Back
      </button>

      {/* Step progress bar */}
      <div className="mb-10">
        <div className="relative flex items-start justify-between">
          {/* connecting line */}
          <div className="absolute left-0 right-0 top-[18px] h-0.5 bg-border" aria-hidden />
          <div
            className="absolute left-0 top-[18px] h-0.5 bg-primary transition-all duration-500"
            style={{ width: `${((step - 1) / (STEPS.length - 1)) * 100}%` }}
            aria-hidden
          />

          {STEPS.map((s) => {
            const done = step > s.id;
            const active = step === s.id;
            return (
              <div key={s.id} className="relative z-10 flex flex-col items-center gap-2">
                <div
                  className={[
                    "flex size-9 items-center justify-center rounded-full border-2 text-sm font-semibold transition-all",
                    done
                      ? "border-primary bg-primary text-primary-foreground"
                      : active
                        ? "border-primary bg-primary text-primary-foreground shadow-md"
                        : "border-border bg-card text-muted-foreground",
                  ].join(" ")}
                >
                  {done ? <Check className="size-4" aria-hidden /> : s.id}
                </div>
                <span
                  className={[
                    "text-center text-xs font-medium leading-tight",
                    active ? "text-primary" : done ? "text-foreground" : "text-muted-foreground",
                  ].join(" ")}
                >
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Step content */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
        {step === 1 && <Step1 form={form} set={set} />}
        {step === 2 && <Step2 form={form} set={set} />}
        {step === 3 && <Step3 form={form} set={set} />}
        {step === 4 && <Step4 form={form} />}
      </div>

      {/* Footer actions */}
      <div className="mt-6 flex items-center justify-between">
        <Button
          id="fill-cancel"
          variant="outline"
          className="rounded-xl"
          onClick={handleBack}
        >
          {step === 1 ? "Cancel" : "Back"}
        </Button>
        {step < 4 ? (
          <Button
            id="fill-continue"
            className="min-w-32 rounded-xl"
            onClick={handleContinue}
          >
            Continue
            <ArrowRight className="size-4" aria-hidden />
          </Button>
        ) : (
          <Button
            id="fill-finish"
            className="min-w-40 rounded-xl"
            onClick={handleFinish}
            disabled={saving}
          >
            {saving ? "Saving…" : "Finish & save"}
            {!saving && <Check className="size-4" aria-hidden />}
          </Button>
        )}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────
   Step 1: Basic Information
──────────────────────────────────────────── */
function Step1({ form, set }: { form: FormData; set: (f: keyof FormData, v: string) => void }) {
  return (
    <div>
      <h2 className="font-display text-2xl font-bold text-foreground">
        Let&apos;s start with your basic information
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        This helps us create your health profile.
      </p>

      <div className="mt-7 grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="full_name">
            Full name <span className="text-destructive">*</span>
          </Label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              <UserIcon />
            </span>
            <Input
              id="full_name"
              className="pl-9 rounded-xl"
              placeholder="Aryan Sharma"
              value={form.full_name}
              onChange={(e) => set("full_name", e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="dob">
            Date of birth <span className="text-destructive">*</span>
          </Label>
          <Input
            id="dob"
            type="date"
            className="rounded-xl"
            value={form.dob}
            onChange={(e) => set("dob", e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="gender">
            Gender <span className="text-destructive">*</span>
          </Label>
          <div className="relative">
            <GenderIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <select
              id="gender"
              className="w-full appearance-none rounded-xl border border-input bg-background py-2 pl-9 pr-8 text-sm text-foreground outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
              value={form.gender}
              onChange={(e) => set("gender", e.target.value)}
            >
              <option value="">Select gender</option>
              {GENDER_OPTIONS.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
            <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="blood_group">Blood group <span className="text-muted-foreground text-xs font-normal">(optional)</span></Label>
          <div className="relative">
            <DropletIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <select
              id="blood_group"
              className="w-full appearance-none rounded-xl border border-input bg-background py-2 pl-9 pr-8 text-sm text-foreground outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
              value={form.blood_group}
              onChange={(e) => set("blood_group", e.target.value)}
            >
              <option value="">Select blood group</option>
              {BLOOD_GROUPS.map((bg) => (
                <option key={bg} value={bg}>{bg}</option>
              ))}
            </select>
            <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          </div>
        </div>
      </div>

      {/* Why we ask */}
      <WhyWeAsk text="This basic information helps our AI provide more accurate insights and build a personalized health timeline for you." />
    </div>
  );
}

/* ────────────────────────────────────────────
   Step 2: Health Information
──────────────────────────────────────────── */
function Step2({ form, set }: { form: FormData; set: (f: keyof FormData, v: string) => void }) {
  return (
    <div>
      <h2 className="font-display text-2xl font-bold text-foreground">
        Tell us about your health
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        This information helps personalize your health records and insights.
      </p>

      <div className="mt-7 grid gap-5 sm:grid-cols-2">
        {/* Height */}
        <div className="space-y-2">
          <Label htmlFor="height">Height <span className="text-muted-foreground text-xs font-normal">(optional)</span></Label>
          <div className="flex gap-2">
            <Input
              id="height"
              type="number"
              min="1"
              placeholder={form.height_unit === "cm" ? "e.g. 175" : "e.g. 5.9"}
              className="rounded-xl flex-1"
              value={form.height}
              onChange={(e) => set("height", e.target.value)}
            />
            <select
              className="rounded-xl border border-input bg-background px-3 text-sm text-foreground outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
              value={form.height_unit}
              onChange={(e) => set("height_unit", e.target.value)}
            >
              {HEIGHT_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
        </div>

        {/* Weight */}
        <div className="space-y-2">
          <Label htmlFor="weight">Weight <span className="text-muted-foreground text-xs font-normal">(optional)</span></Label>
          <div className="flex gap-2">
            <Input
              id="weight"
              type="number"
              min="1"
              placeholder={form.weight_unit === "kg" ? "e.g. 70" : "e.g. 154"}
              className="rounded-xl flex-1"
              value={form.weight}
              onChange={(e) => set("weight", e.target.value)}
            />
            <select
              className="rounded-xl border border-input bg-background px-3 text-sm text-foreground outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
              value={form.weight_unit}
              onChange={(e) => set("weight_unit", e.target.value)}
            >
              {WEIGHT_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
        </div>

        {/* Conditions */}
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="conditions">Known medical conditions <span className="text-muted-foreground text-xs font-normal">(optional)</span></Label>
          <Textarea
            id="conditions"
            className="rounded-xl resize-none"
            placeholder="e.g. Type 2 Diabetes, Hypertension, Asthma…"
            rows={3}
            value={form.conditions}
            onChange={(e) => set("conditions", e.target.value)}
          />
        </div>

        {/* Allergies */}
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="allergies">Allergies <span className="text-muted-foreground text-xs font-normal">(optional)</span></Label>
          <Textarea
            id="allergies"
            className="rounded-xl resize-none"
            placeholder="e.g. Penicillin, Peanuts, Latex…"
            rows={3}
            value={form.allergies}
            onChange={(e) => set("allergies", e.target.value)}
          />
        </div>

        {/* Medications */}
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="medications">Current medications <span className="text-muted-foreground text-xs font-normal">(optional)</span></Label>
          <Textarea
            id="medications"
            className="rounded-xl resize-none"
            placeholder="e.g. Metformin 500mg twice daily, Aspirin 75mg once daily…"
            rows={3}
            value={form.medications}
            onChange={(e) => set("medications", e.target.value)}
          />
        </div>
      </div>

      <WhyWeAsk text="Your health details help our AI flag important patterns, medication interactions and surface relevant insights in your dashboard." />
    </div>
  );
}

/* ────────────────────────────────────────────
   Step 3: Emergency Contact
──────────────────────────────────────────── */
function Step3({ form, set }: { form: FormData; set: (f: keyof FormData, v: string) => void }) {
  return (
    <div>
      <h2 className="font-display text-2xl font-bold text-foreground">
        Add an emergency contact
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        This person will be contacted in case of a medical emergency. You can always update it later.
      </p>

      <div className="mt-7 grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="ec_name">
            Contact name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="ec_name"
            className="rounded-xl"
            placeholder="e.g. Priya Sharma"
            value={form.ec_name}
            onChange={(e) => set("ec_name", e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="ec_relationship">Relationship <span className="text-muted-foreground text-xs font-normal">(optional)</span></Label>
          <Input
            id="ec_relationship"
            className="rounded-xl"
            placeholder="e.g. Mother, Spouse, Friend"
            value={form.ec_relationship}
            onChange={(e) => set("ec_relationship", e.target.value)}
          />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="ec_phone">
            Phone number <span className="text-destructive">*</span>
          </Label>
          <Input
            id="ec_phone"
            type="tel"
            className="rounded-xl"
            placeholder="+91 98765 43210"
            value={form.ec_phone}
            onChange={(e) => set("ec_phone", e.target.value)}
          />
        </div>
      </div>

      <WhyWeAsk text="Emergency contacts are displayed on your QR medical ID and can be accessed by first responders to contact your family when needed." />
    </div>
  );
}

/* ────────────────────────────────────────────
   Step 4: Review & Finish
──────────────────────────────────────────── */
function Step4({ form }: { form: FormData }) {
  const ReviewRow = ({ label, value }: { label: string; value?: string }) =>
    value ? (
      <div className="flex flex-col gap-0.5 py-2.5 sm:flex-row sm:gap-4">
        <span className="w-36 shrink-0 text-xs font-medium text-muted-foreground">{label}</span>
        <span className="text-sm font-medium text-foreground">{value}</span>
      </div>
    ) : null;

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="mb-6">
      <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
      <div className="divide-y divide-border rounded-xl border border-border bg-muted/30 px-4">
        {children}
      </div>
    </div>
  );

  return (
    <div>
      <h2 className="font-display text-2xl font-bold text-foreground">
        Review your information
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Please review the details below before saving your health profile.
      </p>

      <div className="mt-7">
        <Section title="Basic Information">
          <ReviewRow label="Full name" value={form.full_name || "—"} />
          <ReviewRow label="Date of birth" value={form.dob || "—"} />
          <ReviewRow label="Gender" value={form.gender || "—"} />
          <ReviewRow label="Blood group" value={form.blood_group || "—"} />
        </Section>

        <Section title="Health Information">
          <ReviewRow label="Height" value={form.height ? `${form.height} ${form.height_unit}` : "—"} />
          <ReviewRow label="Weight" value={form.weight ? `${form.weight} ${form.weight_unit}` : "—"} />
          <ReviewRow label="Conditions" value={form.conditions || "—"} />
          <ReviewRow label="Allergies" value={form.allergies || "—"} />
          <ReviewRow label="Medications" value={form.medications || "—"} />
        </Section>

        <Section title="Emergency Contact">
          <ReviewRow label="Name" value={form.ec_name || "—"} />
          <ReviewRow label="Relationship" value={form.ec_relationship || "—"} />
          <ReviewRow label="Phone" value={form.ec_phone || "—"} />
        </Section>
      </div>

      <div className="flex items-start gap-3 rounded-xl border border-info/25 bg-info/8 p-4">
        <Info className="mt-0.5 size-4 shrink-0 text-info" aria-hidden />
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">Ready to go!</span> This data is encrypted and stored securely. You can always update or delete it from your profile settings.
        </p>
      </div>
    </div>
  );
}

/* ── Shared components ── */

function WhyWeAsk({ text }: { text: string }) {
  return (
    <div className="mt-6 flex gap-3 rounded-xl border border-border bg-muted/30 p-4">
      <Info className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
      <div>
        <p className="text-sm font-semibold text-primary">Why we ask for this?</p>
        <p className="mt-0.5 text-sm text-muted-foreground">{text}</p>
      </div>
    </div>
  );
}

/* Micro SVG icons */
function UserIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M20 21a8 8 0 1 0-16 0" />
    </svg>
  );
}

function GenderIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="10" cy="14" r="5" />
      <line x1="19" y1="5" x2="10" y2="14" />
      <polyline points="15 5 19 5 19 9" />
    </svg>
  );
}

function DropletIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
    </svg>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}
