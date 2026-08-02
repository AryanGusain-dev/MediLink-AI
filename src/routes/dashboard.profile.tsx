import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import {
  Building2, Camera, CheckCircle2, ChevronRight, CircleAlert, ClipboardList, Droplets, Ellipsis, FileText, Heart, HeartPulse, Home, Hospital, Pill, QrCode, Save, Share2, ShieldAlert, ShieldCheck, Stethoscope, Syringe, TriangleAlert, UserCheck, UserRound,
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { documents, healthProfile, currentUser, qrCodes } from "@/data/mock";
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
  const bmi = (p.weightKg / (p.heightCm / 100) ** 2).toFixed(1);
  const activeQr = qrCodes.some((item) => item.status === "active");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Patient Passport"
        description="Your essential health information at a glance"
        icon={UserRound}
        actions={
          <><Button className="rounded-xl" onClick={() => toast.success("Passport share link copied")}><Share2 className="size-4" aria-hidden /> Share Passport</Button><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="rounded-xl" aria-label="Passport actions"><Ellipsis className="size-5" aria-hidden /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem asChild><Link to="/dashboard/profile" search={{ mode: "edit" }}>Edit profile</Link></DropdownMenuItem></DropdownMenuContent></DropdownMenu></>
        }
      />

      <Widget title="Patient Information" icon={UserRound} delay={0}>
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.45fr)_minmax(16rem,0.8fr)]"><dl className="grid gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-3"><div><dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Full name</dt><dd className="mt-1 flex items-center gap-2 text-base font-semibold text-foreground">{p.fullName}<StatusBadge tone="success">Verified</StatusBadge></dd></div><PassportDetail label="Patient ID" value={`ML-${p.userId.replace("usr_", "")}`} /><PassportDetail label="Age" value={`${p.age} years`} /><PassportDetail label="Gender" value={p.gender} /><PassportDetail label="Date of birth" value="14 May 1994" /><PassportDetail label="Blood group" value={p.bloodGroup} /><PassportDetail label="Location" value="Bengaluru, Karnataka" /><PassportDetail label="Phone" value={currentUser.phone} /><PassportDetail label="Email" value={currentUser.email} /></dl><dl className="grid content-start gap-y-5 border-t border-border pt-5 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0"><PassportDetail label="Insurance provider" value={p.insurance.provider} /><PassportDetail label="Policy number" value={p.insurance.policyNumber} /><PassportDetail label="Last updated" value="18 Jul 2026" /></dl></div>
      </Widget>

      <Widget title="Emergency Summary" icon={ShieldAlert} delay={0.05} action={<Button variant="ghost" size="sm" className="rounded-lg text-xs">View Full</Button>} className="[&>div]:border-primary/25 [&>div]:bg-primary/[0.025]">
        <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><EmergencyDetail label="Blood Group" value={p.bloodGroup} icon={Droplets} /><EmergencyDetail label="Allergies" value={p.allergies.map((item) => item.allergen).join(", ")} icon={CircleAlert} /><EmergencyDetail label="Chronic Conditions" value={p.conditions.map((item) => item.name).join(", ")} icon={HeartPulse} /><EmergencyDetail label="Current Medications" value={`${p.medications.length} active`} icon={Pill} /><EmergencyDetail label="Surgeries" value="No surgical history" icon={ClipboardList} /><EmergencyDetail label="Organ Donor Status" value="Not registered" icon={Heart} /><EmergencyDetail label="Emergency QR Status" value={activeQr ? "Active" : "Inactive"} icon={QrCode} status={activeQr ? "success" : "neutral"} /><EmergencyDetail label="Emergency Contact" value={`${p.emergencyContacts[0]?.name} · ${p.emergencyContacts[0]?.phone}`} icon={UserCheck} /></dl>
        <div className="mt-6 border-t border-border pt-5">
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

      <div className="grid gap-6 xl:grid-cols-2">
        <Widget title="Health Overview" icon={HeartPulse} delay={0.12}><div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{[["Blood Pressure", "118/76"], ["Blood Sugar", "96"], ["Heart Rate", "72"], ["BMI", bmi]].map(([label, value]) => <div key={label} className="rounded-xl border border-border bg-surface p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-2 font-display text-lg font-bold text-foreground">{value}</p></div>)}</div></Widget>
        <Widget title="Medical Conditions" icon={HeartPulse} delay={0.14}><div className="flex flex-wrap gap-2">{[...p.conditions.map((item) => item.name), "No Known Heart Disease"].map((condition) => <span key={condition} className="rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-foreground">{condition}</span>)}</div></Widget>
        <Widget title="Current Medications" icon={Pill} delay={0.16}><div className="overflow-x-auto"><table className="w-full min-w-[34rem] text-left text-sm"><thead className="border-b border-border text-xs text-muted-foreground"><tr><th className="pb-3">Medication</th><th className="pb-3">Dosage</th><th className="pb-3">Frequency</th><th className="pb-3">Prescribed By</th></tr></thead><tbody className="divide-y divide-border">{p.medications.map((m) => <tr key={m.id}><td className="py-3 font-medium text-foreground">{m.name}</td><td>{m.dosage}</td><td>{m.frequency}</td><td>{m.prescribedBy}</td></tr>)}</tbody></table></div></Widget>
        <Widget title="Recent Records" icon={FileText} delay={0.18} action={<Button variant="ghost" size="sm" className="text-xs">View All</Button>}><ul className="divide-y divide-border">{documents.slice(0, 3).map((d) => <li key={d.id} className="flex items-center gap-3 py-3 first:pt-0"><FileText className="size-4 text-primary" aria-hidden /><div><p className="text-sm font-medium text-foreground">{d.name}</p><p className="text-xs text-muted-foreground">{formatDate(d.uploadedAt)} · {d.category}</p></div></li>)}</ul></Widget>
        <Widget title="AI Health Insights" icon={CheckCircle2} delay={0.2}><ul className="space-y-3">{["Thyroid levels are within range.", "Your influenza vaccine is due this month.", "Blood pressure and BMI are in a healthy range."].map((insight, i) => <li key={insight} className="flex items-center gap-3 rounded-xl border border-border p-3"><CheckCircle2 className="size-4 text-success" aria-hidden /><p className="flex-1 text-sm text-foreground">{insight}</p><StatusBadge tone={i === 1 ? "warning" : "success"}>Status</StatusBadge></li>)}</ul><Button variant="ghost" size="sm" className="mt-4 px-0 text-primary">Explain with AI <ChevronRight className="size-4" /></Button></Widget>
        <Widget title="Health Risk Score" icon={ShieldCheck} delay={0.22}><div className="flex items-center gap-6"><div className="grid size-28 place-items-center rounded-full border-8 border-primary/20 text-center"><span className="font-display text-2xl font-bold text-primary">82</span></div><dl className="flex-1 space-y-3">{[["Cardiovascular Risk", "success"], ["Diabetes Risk", "success"], ["Lifestyle Risk", "warning"]].map(([label, tone]) => <div key={label} className="flex justify-between"><dt className="text-sm text-muted-foreground">{label}</dt><StatusBadge tone={tone as "success" | "warning"}>Risk</StatusBadge></div>)}</dl></div></Widget>
        <Widget title="Immunization Status" icon={Syringe} delay={0.24}><ul className="divide-y divide-border">{p.vaccinations.map((v) => <li key={v.id} className="flex items-center gap-3 py-3 first:pt-0"><div className="flex-1"><p className="text-sm font-medium text-foreground">{v.name}</p><p className="text-xs text-muted-foreground">Dose {v.doses}</p></div><StatusBadge tone={v.status === "complete" ? "success" : "warning"}>{v.status}</StatusBadge></li>)}</ul></Widget>
        <Widget title="Active Shares & Access" icon={Share2} delay={0.26}><ul className="divide-y divide-border">{[[Stethoscope, p.doctors[0]?.name ?? "Doctor", p.doctors[0]?.specialty ?? "Care team"], [Hospital, p.doctors[0]?.hospital ?? "Hospital", "Hospital access"], [UserRound, "Family Access", "Family member"]].map(([Icon, name, role]) => <li key={String(role)} className="flex items-center gap-3 py-3 first:pt-0"><Icon className="size-4 text-primary" /><div className="flex-1"><p className="text-sm font-medium text-foreground">{String(name)}</p><p className="text-xs text-muted-foreground">{String(role)}</p></div><StatusBadge tone="success">Active</StatusBadge></li>)}</ul><Button asChild variant="ghost" size="sm" className="mt-3 px-0 text-primary"><Link to="/dashboard/share">View all shared profiles <ChevronRight className="size-4" /></Link></Button></Widget>
      </div>
      <div className="flex items-center gap-3 rounded-2xl border border-border bg-card px-5 py-4 shadow-soft"><ShieldCheck className="size-5 shrink-0 text-success" /><p className="text-sm text-muted-foreground">Your data is secure and encrypted. You are in control of your health information.</p></div>
    </div>
  );
}

function EmergencyDetail({ label, value, icon: Icon, status }: { label: string; value: string; icon: typeof Droplets; status?: "success" | "neutral" }) {
  return <div className="rounded-xl border border-border bg-card p-4"><div className="flex justify-between gap-3"><Icon className="size-4 text-primary" />{status ? <StatusBadge tone={status}>{value}</StatusBadge> : null}</div><dt className="mt-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt><dd className="mt-1 text-sm font-medium text-foreground">{value}</dd></div>;
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
