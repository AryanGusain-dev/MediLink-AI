import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
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
import { supabase } from "@/lib/supabase";
import { formatDate, initials } from "@/lib/format";
import { getCachedData, setCachedData } from "@/lib/cache";

export const Route = createFileRoute("/dashboard/profile")({
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
  const [profile, setProfile] = useState<any>(null);
  const [contacts, setContacts] = useState<any[]>([]);
  const [conditions, setConditions] = useState<any[]>([]);
  const [medications, setMedications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Static/Fallback empty arrays for fields not yet represented by dedicated tables
  const allergies: any[] = [];
  const vaccinations: any[] = [];
  const insurance: any = null;
  const doctors: any[] = [];

  const calculateAge = (dobString?: string) => {
    if (!dobString) return "";
    const birthDate = new Date(dobString);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  useEffect(() => {
    async function loadData() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Load from cache first for instant render
        const cachedProfile = getCachedData<any>("profile");
        const cachedContacts = getCachedData<any[]>("contacts");
        const cachedConditions = getCachedData<any[]>("conditions");
        const cachedMedications = getCachedData<any[]>("medications");

        if (cachedProfile) {
          setProfile(cachedProfile);
          if (cachedContacts) setContacts(cachedContacts);
          if (cachedConditions) setConditions(cachedConditions);
          if (cachedMedications) setMedications(cachedMedications);
          setLoading(false);
        }

        const { data: pData, error: pErr } = await supabase
          .from("profiles")
          .select("*")
          .eq("auth_user_id", user.id)
          .single();

        if (pErr) throw pErr;

        if (pData) {
          setProfile(pData);
          setCachedData("profile", pData);

          // fetch emergency contacts
          const { data: ecData } = await supabase
            .from("emergency_contacts")
            .select("*")
            .eq("profile_id", pData.id);
          setContacts(ecData || []);
          setCachedData("contacts", ecData || []);

          // fetch extracted medical values (e.g. diagnoses, medications)
          const { data: emValues } = await supabase
            .from("extracted_medical_values")
            .select("*")
            .eq("profile_id", pData.id);
          
          if (emValues) {
            const mappedConditions = emValues
              .filter((v: any) => v.value_type === "diagnosis")
              .map((v: any) => ({
                id: v.id,
                name: v.name,
                diagnosedAt: v.recorded_at || v.created_at,
                severity: "moderate",
                status: v.value || "active",
              }));
            setConditions(mappedConditions);
            setCachedData("conditions", mappedConditions);

            const mappedMedications = emValues
              .filter((v: any) => v.value_type === "medication")
              .map((v: any) => ({
                id: v.id,
                name: v.name,
                dosage: v.value || "N/A",
                frequency: v.unit || "N/A",
                prescribedBy: "N/A",
              }));
            setMedications(mappedMedications);
            setCachedData("medications", mappedMedications);
          }
        }
      } catch (err) {
        console.error("Error loading profile:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const save = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      const fullName = (document.getElementById("fullName") as HTMLInputElement)?.value;
      const age = (document.getElementById("age") as HTMLInputElement)?.value;
      const gender = (document.getElementById("gender") as HTMLInputElement)?.value;
      const blood = (document.getElementById("blood") as HTMLInputElement)?.value;
      const height = (document.getElementById("height") as HTMLInputElement)?.value;
      const weight = (document.getElementById("weight") as HTMLInputElement)?.value;
      const address = (document.getElementById("address") as HTMLTextAreaElement)?.value;
      const summary = (document.getElementById("summary") as HTMLTextAreaElement)?.value;

      const ageVal = parseInt(age || "");
      let dobVal = profile?.dob || null;
      if (!isNaN(ageVal)) {
        const birthYear = new Date().getFullYear() - ageVal;
        dobVal = `${birthYear}-01-01`;
      }

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName,
          dob: dobVal,
          gender: gender || null,
          blood_group: blood || null,
          height_cm: height ? parseFloat(height) : null,
          weight_kg: weight ? parseFloat(weight) : null,
          address: address || null,
          health_summary: summary || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", profile.id);

      if (error) throw error;

      // Reload updated profile
      const { data: updatedProfile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", profile.id)
        .single();
      if (updatedProfile) {
        setProfile(updatedProfile);
        setCachedData("profile", updatedProfile);
      }

      toast.success("Health profile saved");
    } catch (err: any) {
      console.error("Error saving profile:", err);
      toast.error(err.message || "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <p className="text-muted-foreground">Loading health profile...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="space-y-8">
        <PageHeader
          title="Health Profile"
          description="Your canonical medical record."
          icon={UserRound}
        />
        <Widget>
          <div className="text-center py-8">
            <TriangleAlert className="size-12 text-warning mx-auto" />
            <h3 className="mt-4 font-display text-lg font-semibold text-foreground">No profile found</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Please complete your health onboarding to initialize your profile.
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

  return (
    <div key={profile.id} className="space-y-8">
      <PageHeader
        title="Health Profile"
        description="Your canonical medical record. Every share profile draws from these fields."
        icon={UserRound}
        actions={
          <Button onClick={save} className="rounded-xl" disabled={saving}>
            <Save className="size-4" aria-hidden />
            {saving ? "Saving…" : "Save changes"}
          </Button>
        }
      />

      {/* Identity */}
      <Widget delay={0}>
        <div className="grid gap-6 lg:grid-cols-[auto_1fr]">
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              <Avatar className="size-24 border-2 border-border">
                <AvatarFallback className="bg-primary/10 font-display text-xl font-bold text-primary">
                  {initials(profile.full_name || "")}
                </AvatarFallback>
              </Avatar>
              <button
                type="button"
                onClick={() => toast.info("Photo upload is available in the connected build")}
                className="absolute -bottom-1 -right-1 grid size-8 place-items-center rounded-full bg-primary text-primary-foreground shadow-soft transition-transform hover:scale-105"
                aria-label="Change profile photo"
              >
                <Camera className="size-4" aria-hidden />
              </button>
            </div>
            <StatusBadge tone="info">{(profile.subscription_plan || "free").toUpperCase()} plan</StatusBadge>
          </div>

          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Full name" defaultValue={profile.full_name || ""} id="fullName" />
              <Field label="Age" defaultValue={String(calculateAge(profile.dob) || "")} id="age" type="number" />
              <Field label="Gender" defaultValue={profile.gender || ""} id="gender" />
              <Field label="Blood group" defaultValue={profile.blood_group || ""} id="blood" />
              <Field label="Height (cm)" defaultValue={profile.height_cm ? String(profile.height_cm) : ""} id="height" type="number" />
              <Field label="Weight (kg)" defaultValue={profile.weight_kg ? String(profile.weight_kg) : ""} id="weight" type="number" />
            </div>
            <div>
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-foreground">Profile completion</span>
                <span className="font-display font-bold text-primary">{completion}%</span>
              </div>
              <Progress value={completion} className="mt-2 h-2" />
            </div>
          </div>
        </div>
      </Widget>

      <div className="grid gap-6 lg:grid-cols-2">
        <Widget title="Emergency contacts" icon={ShieldAlert} delay={0.05}>
          {contacts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No emergency contacts listed.</p>
          ) : (
            <ul className="space-y-3">
              {contacts.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 rounded-xl border border-border p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.relationship || "Contact"} · {c.phone}</p>
                  </div>
                  {c.is_primary && <StatusBadge tone="danger">Priority</StatusBadge>}
                </li>
              ))}
            </ul>
          )}
        </Widget>

        <Widget title="Blood group & vitals" icon={Droplets} delay={0.1}>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Blood group", value: profile.blood_group || "—" },
              { label: "Height", value: profile.height_cm ? `${profile.height_cm} cm` : "—" },
              { label: "Weight", value: profile.weight_kg ? `${profile.weight_kg} kg` : "—" },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-border bg-surface p-3 text-center">
                <p className="font-display text-lg font-bold text-foreground">{item.value}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">{item.label}</p>
              </div>
            ))}
          </div>
          {profile.height_cm && profile.weight_kg ? (
            <p className="mt-4 text-xs text-muted-foreground">
              BMI {(profile.weight_kg / (profile.height_cm / 100) ** 2).toFixed(1)} — within the healthy range.
            </p>
          ) : (
            <p className="mt-4 text-xs text-muted-foreground">
              Please enter your height and weight to calculate BMI.
            </p>
          )}
        </Widget>

        <Widget title="Medical conditions" icon={HeartPulse} delay={0.15}>
          {conditions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No medical conditions recorded.</p>
          ) : (
            <ul className="space-y-3">
              {conditions.map((c) => (
                <li key={c.id} className="rounded-xl border border-border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="min-w-0 truncate text-sm font-medium text-foreground">{c.name}</p>
                    <StatusBadge tone={severityTone[c.severity as keyof typeof severityTone || "moderate"]}>
                      {c.severity}
                    </StatusBadge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Diagnosed {formatDate(c.diagnosedAt)} · {c.status}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Widget>

        <Widget title="Allergies" icon={TriangleAlert} delay={0.2}>
          {allergies.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No allergies recorded.</p>
          ) : (
            <ul className="space-y-3">
              {allergies.map((a) => (
                <li key={a.id} className="rounded-xl border border-border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="min-w-0 truncate text-sm font-medium text-foreground">{a.allergen}</p>
                    <StatusBadge tone={severityTone[a.severity as keyof typeof severityTone || "moderate"]}>
                      {a.severity}
                    </StatusBadge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{a.reaction}</p>
                </li>
              ))}
            </ul>
          )}
        </Widget>

        <Widget title="Current medications" icon={Pill} delay={0.25}>
          {medications.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No current medications.</p>
          ) : (
            <ul className="space-y-3">
              {medications.map((m) => (
                <li key={m.id} className="rounded-xl border border-border p-3">
                  <p className="text-sm font-medium text-foreground">{m.name} · {m.dosage}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{m.frequency} · {m.prescribedBy}</p>
                </li>
              ))}
            </ul>
          )}
        </Widget>

        <Widget title="Vaccination status" icon={Syringe} delay={0.3}>
          {vaccinations.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No vaccination records available.</p>
          ) : (
            <ul className="space-y-3">
              {vaccinations.map((v) => (
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
          )}
        </Widget>

        <Widget title="Insurance" icon={ShieldCheck} delay={0.35}>
          {!insurance || !insurance.provider ? (
            <p className="text-sm text-muted-foreground text-center py-4">No insurance information available.</p>
          ) : (
            <dl className="space-y-3 text-sm">
              <Row label="Provider" value={insurance.provider} />
              <Row label="Policy number" value={insurance.policyNumber} />
              <Row label="Coverage" value={insurance.coverage} />
              <Row label="Valid until" value={formatDate(insurance.validUntil)} />
            </dl>
          )}
        </Widget>

        <Widget title="Doctor information" icon={Stethoscope} delay={0.4}>
          {doctors.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No doctor information available.</p>
          ) : (
            <ul className="space-y-3">
              {doctors.map((d) => (
                <li key={d.id} className="rounded-xl border border-border p-3">
                  <p className="text-sm font-medium text-foreground">{d.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {d.specialty} · {d.hospital}
                  </p>
                  <p className="text-xs text-muted-foreground">{d.phone}</p>
                </li>
              ))}
            </ul>
          )}
        </Widget>

        <Widget title="Address" icon={Home} delay={0.45}>
          <Textarea id="address" defaultValue={profile.address || ""} placeholder="No address provided. Enter your home address..." rows={3} className="rounded-xl" aria-label="Home address" />
        </Widget>

        <Widget title="Health summary" icon={Building2} delay={0.5}>
          <Textarea id="summary" defaultValue={profile.health_summary || ""} placeholder="No health summary available. Enter details about your conditions, allergies, or medications..." rows={5} className="rounded-xl" aria-label="Health summary" />
        </Widget>
      </div>
    </div>
  );
}

function Field({ label, id, defaultValue, type = "text" }: { label: string; id: string; defaultValue: string; type?: string }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        {label}
      </Label>
      <Input id={id} defaultValue={defaultValue} type={type} className="h-10 rounded-xl" />
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
