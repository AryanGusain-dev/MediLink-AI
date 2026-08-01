import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import {
  Building2,
  Camera,
  Droplets,
  HeartPulse,
  Home,
  Pill,
  Save,
  ShieldAlert,
  ShieldCheck,
  Stethoscope,
  Syringe,
  TriangleAlert,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader, StatusBadge } from "@/components/shared/page-header";
import { Widget } from "@/components/shared/widget";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { healthProfile, currentUser } from "@/data/mock";
import { formatDate, initials } from "@/lib/format";

export const Route = createFileRoute("/dashboard/profile")({
  validateSearch: z.object({ mode: z.enum(["passport", "edit"]).optional() }),
  head: () => ({
    meta: [
      { title: "Health Profile — MediLink AI" },
      { name: "description", content: "Manage your medical profile: blood group, conditions, allergies, medications, insurance and care team." },
      { property: "og:title", content: "Health Profile — MediLink AI" },
      { property: "og:description", content: "A single canonical source of truth for your medical information." },
    ],
  }),
  component: ProfilePage,
});

const severityTone = { mild: "success", moderate: "warning", severe: "danger" } as const;

function ProfilePage() {
  const [saving, setSaving] = useState(false);
  const { mode = "passport" } = Route.useSearch();
  const isEditable = mode === "edit";
  const p = healthProfile;

  const save = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      toast.success("Health profile saved");
    }, 800);
  };

  if (!isEditable) {
    return <PatientPassport />;
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title={isEditable ? "Health Profile" : "Patient Passport"}
        description={isEditable ? "Your canonical medical record. Every share profile draws from these fields." : "A read-only summary of your essential health information."}
        icon={UserRound}
        actions={
          isEditable ? <Button onClick={save} className="rounded-xl" disabled={saving}>
            <Save className="size-4" aria-hidden />
            {saving ? "Saving…" : "Save changes"}
          </Button> : undefined
        }
      />

      {/* Identity */}
      <Widget id="personal-information" delay={0}>
        <div className="grid gap-6 lg:grid-cols-[auto_1fr]">
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              <Avatar className="size-24 border-2 border-border">
                <AvatarFallback className="bg-primary/10 font-display text-xl font-bold text-primary">
                  {initials(p.fullName)}
                </AvatarFallback>
              </Avatar>
              {isEditable ? <button
                type="button"
                onClick={() => toast.info("Photo upload is available in the connected build")}
                className="absolute -bottom-1 -right-1 grid size-8 place-items-center rounded-full bg-primary text-primary-foreground shadow-soft transition-transform hover:scale-105"
                aria-label="Change profile photo"
              >
                <Camera className="size-4" aria-hidden />
              </button> : null}
            </div>
            <StatusBadge tone="info">{currentUser.plan.toUpperCase()} plan</StatusBadge>
          </div>

          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Full name" defaultValue={p.fullName} id="fullName" readOnly={!isEditable} />
              <Field label="Age" defaultValue={String(p.age)} id="age" type="number" readOnly={!isEditable} />
              <Field label="Gender" defaultValue={p.gender} id="gender" readOnly={!isEditable} />
              <Field label="Blood group" defaultValue={p.bloodGroup} id="blood" readOnly={!isEditable} />
              <Field label="Height (cm)" defaultValue={String(p.heightCm)} id="height" type="number" readOnly={!isEditable} />
              <Field label="Weight (kg)" defaultValue={String(p.weightKg)} id="weight" type="number" readOnly={!isEditable} />
            </div>
            <div>
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-foreground">Profile completion</span>
                <span className="font-display font-bold text-primary">{p.completion}%</span>
              </div>
              <Progress value={p.completion} className="mt-2 h-2" />
            </div>
          </div>
        </div>
      </Widget>

      <div className="grid gap-6 lg:grid-cols-2">
        <Widget id="emergency-summary" title="Emergency Summary" icon={ShieldAlert} delay={0.05}>
          <ul className="space-y-3">
            {p.emergencyContacts.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 rounded-xl border border-border p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{c.relation} · {c.phone}</p>
                </div>
                <StatusBadge tone="danger">Priority</StatusBadge>
              </li>
            ))}
          </ul>
        </Widget>

        <Widget title="Blood group & vitals" icon={Droplets} delay={0.1}>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Blood group", value: p.bloodGroup },
              { label: "Height", value: `${p.heightCm} cm` },
              { label: "Weight", value: `${p.weightKg} kg` },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-border bg-surface p-3 text-center">
                <p className="font-display text-lg font-bold text-foreground">{item.value}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">{item.label}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            BMI {(p.weightKg / (p.heightCm / 100) ** 2).toFixed(1)} — within the healthy range.
          </p>
        </Widget>

        <Widget id="allergies-conditions" title="Medical conditions" icon={HeartPulse} delay={0.15}>
          <ul className="space-y-3">
            {p.conditions.map((c) => (
              <li key={c.id} className="rounded-xl border border-border p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 truncate text-sm font-medium text-foreground">{c.name}</p>
                  <StatusBadge tone={severityTone[c.severity]}>{c.severity}</StatusBadge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Diagnosed {formatDate(c.diagnosedAt)} · {c.status}
                </p>
              </li>
            ))}
          </ul>
        </Widget>

        <Widget title="Allergies" icon={TriangleAlert} delay={0.2}>
          <ul className="space-y-3">
            {p.allergies.map((a) => (
              <li key={a.id} className="rounded-xl border border-border p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 truncate text-sm font-medium text-foreground">{a.allergen}</p>
                  <StatusBadge tone={severityTone[a.severity]}>{a.severity}</StatusBadge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{a.reaction}</p>
              </li>
            ))}
          </ul>
        </Widget>

        <Widget title="Current medications" icon={Pill} delay={0.25}>
          <ul className="space-y-3">
            {p.medications.map((m) => (
              <li key={m.id} className="rounded-xl border border-border p-3">
                <p className="text-sm font-medium text-foreground">{m.name} · {m.dosage}</p>
                <p className="mt-1 text-xs text-muted-foreground">{m.frequency} · {m.prescribedBy}</p>
              </li>
            ))}
          </ul>
        </Widget>

        <Widget title="Vaccination status" icon={Syringe} delay={0.3}>
          <ul className="space-y-3">
            {p.vaccinations.map((v) => (
              <li key={v.id} className="flex items-center justify-between gap-3 rounded-xl border border-border p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{v.name}</p>
                  <p className="text-xs text-muted-foreground">{v.doses} dose(s) · last {formatDate(v.lastDoseAt)}</p>
                </div>
                <StatusBadge tone={v.status === "complete" ? "success" : v.status === "due" ? "warning" : "danger"}>
                  {v.status}
                </StatusBadge>
              </li>
            ))}
          </ul>
        </Widget>

        <Widget title="Insurance" icon={ShieldCheck} delay={0.35}>
          <dl className="space-y-3 text-sm">
            <Row label="Provider" value={p.insurance.provider} />
            <Row label="Policy number" value={p.insurance.policyNumber} />
            <Row label="Coverage" value={p.insurance.coverage} />
            <Row label="Valid until" value={formatDate(p.insurance.validUntil)} />
          </dl>
        </Widget>

        <Widget title="Doctor information" icon={Stethoscope} delay={0.4}>
          <ul className="space-y-3">
            {p.doctors.map((d) => (
              <li key={d.id} className="rounded-xl border border-border p-3">
                <p className="text-sm font-medium text-foreground">{d.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {d.specialty} · {d.hospital}
                </p>
                <p className="text-xs text-muted-foreground">{d.phone}</p>
              </li>
            ))}
          </ul>
        </Widget>

        <Widget title="Address" icon={Home} delay={0.45}>
          <Textarea defaultValue={p.address} rows={3} className="rounded-xl" aria-label="Home address" readOnly={!isEditable} />
        </Widget>

        <Widget title="Health summary" icon={Building2} delay={0.5}>
          <Textarea defaultValue={p.summary} rows={5} className="rounded-xl" aria-label="Health summary" readOnly={!isEditable} />
        </Widget>
      </div>
    </div>
  );
}

function PatientPassport() {
  const p = healthProfile;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Patient Passport"
        description="Your essential health information in one clear, read-only view."
        icon={UserRound}
        actions={
          <Button asChild className="rounded-xl">
            <Link to="/dashboard/profile" search={{ mode: "edit" }}>Edit Profile</Link>
          </Button>
        }
      />

      <Widget title="Personal Information" icon={UserRound} delay={0}>
        <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
          <PassportDetail label="Full name" value={p.fullName} />
          <PassportDetail label="Age" value={`${p.age} years`} />
          <PassportDetail label="Gender" value={p.gender} />
          <PassportDetail label="Blood group" value={p.bloodGroup} />
          <PassportDetail label="Height" value={`${p.heightCm} cm`} />
          <PassportDetail label="Weight" value={`${p.weightKg} kg`} />
          <PassportDetail label="Address" value={p.address} className="sm:col-span-2 lg:col-span-3" />
        </dl>
      </Widget>

      <Widget title="Emergency Summary" icon={ShieldAlert} delay={0.05}>
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <p className="mb-3 text-sm font-medium text-foreground">Emergency contacts</p>
            <ul className="space-y-3">
              {p.emergencyContacts.map((contact) => (
                <li key={contact.id} className="flex items-center justify-between gap-3 rounded-xl border border-border p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{contact.name}</p>
                    <p className="text-xs text-muted-foreground">{contact.relation} · {contact.phone}</p>
                  </div>
                  <StatusBadge tone="danger">Priority</StatusBadge>
                </li>
              ))}
            </ul>
          </div>
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <PassportDetail label="Blood group" value={p.bloodGroup} />
              <PassportDetail label="Chronic diseases" value={`${p.conditions.length} recorded`} />
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-foreground">Current medications</p>
              <ul className="space-y-2">
                {p.medications.map((medication) => (
                  <li key={medication.id} className="rounded-xl border border-border p-3 text-sm">
                    <span className="font-medium text-foreground">{medication.name} — {medication.dosage}</span>
                    <span className="block text-xs text-muted-foreground">{medication.frequency}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-border bg-muted/30 p-4">
              <p className="text-sm font-medium text-foreground">Important medical notes</p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{p.summary}</p>
            </div>
          </div>
        </div>
      </Widget>

      <Widget title="Allergies & Conditions" icon={HeartPulse} delay={0.1}>
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <h3 className="mb-3 text-sm font-semibold text-foreground">Allergies</h3>
            <ul className="space-y-3">
              {p.allergies.map((allergy) => (
                <li key={allergy.id} className="rounded-xl border border-border p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-foreground">{allergy.allergen}</p>
                    <StatusBadge tone={severityTone[allergy.severity]}>{allergy.severity}</StatusBadge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{allergy.reaction}</p>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="mb-3 text-sm font-semibold text-foreground">Medical conditions</h3>
            <ul className="space-y-3">
              {p.conditions.map((condition) => (
                <li key={condition.id} className="rounded-xl border border-border p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-foreground">{condition.name}</p>
                    <StatusBadge tone={severityTone[condition.severity]}>{condition.severity}</StatusBadge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">Diagnosed {formatDate(condition.diagnosedAt)} · {condition.status}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Widget>
    </div>
  );
}

function PassportDetail({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={className}>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm font-medium text-foreground">{value}</dd>
    </div>
  );
}

function Field({ label, id, defaultValue, type = "text", readOnly = false }: { label: string; id: string; defaultValue: string; type?: string; readOnly?: boolean }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        {label}
      </Label>
      <Input id={id} defaultValue={defaultValue} type={type} className="h-10 rounded-xl" readOnly={readOnly} />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border pb-2 last:border-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="truncate font-medium text-foreground">{value}</dd>
    </div>
  );
}
