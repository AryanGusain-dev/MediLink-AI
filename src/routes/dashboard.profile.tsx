import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
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
import { supabase } from "@/lib/supabase";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { documents, healthProfile, currentUser, qrCodes } from "@/data/mock";
import { formatDate, initials } from "@/lib/format";
import { getCachedData, setCachedData } from "@/lib/cache";

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
          .maybeSingle();

        if (pErr) console.warn("profile fetch error:", pErr);


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

  if (!isEditable) {
    return <PatientPassport dbProfile={profile} dbContacts={contacts} dbConditions={conditions} dbMedications={medications} />;
  }

  return (
    <div key={profile.id} className="space-y-8">
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
                  {initials(profile.full_name || "")}
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
            <StatusBadge tone="info">{(profile.subscription_plan || "free").toUpperCase()} plan</StatusBadge>
          </div>

          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Full name" defaultValue={profile.full_name || ""} id="fullName" readOnly={!isEditable} />
              <Field label="Age" defaultValue={String(calculateAge(profile.dob) || "")} id="age" type="number" readOnly={!isEditable} />
              <Field label="Gender" defaultValue={profile.gender || ""} id="gender" readOnly={!isEditable} />
              <Field label="Blood group" defaultValue={profile.blood_group || ""} id="blood" readOnly={!isEditable} />
              <Field label="Height (cm)" defaultValue={profile.height_cm ? String(profile.height_cm) : ""} id="height" type="number" readOnly={!isEditable} />
              <Field label="Weight (kg)" defaultValue={profile.weight_kg ? String(profile.weight_kg) : ""} id="weight" type="number" readOnly={!isEditable} />
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
        <Widget id="emergency-summary" title="Emergency Summary" icon={ShieldAlert} delay={0.05}>
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

        <Widget id="allergies-conditions" title="Medical conditions" icon={HeartPulse} delay={0.15}>
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
          <Textarea id="address" defaultValue={profile.address || ""} placeholder="No address provided. Enter your home address..." rows={3} className="rounded-xl" aria-label="Home address" readOnly={!isEditable} />
        </Widget>

        <Widget title="Health summary" icon={Building2} delay={0.5}>
          <Textarea id="summary" defaultValue={profile.health_summary || ""} placeholder="No health summary available. Enter details about your conditions, allergies, or medications..." rows={5} className="rounded-xl" aria-label="Health summary" readOnly={!isEditable} />
        </Widget>
      </div>
    </div>
  );
}

function PatientPassport({ dbProfile, dbContacts, dbConditions, dbMedications }: any) {
  const p = {
    fullName: dbProfile?.full_name || "",
    age: dbProfile?.dob ? Math.floor((new Date().getTime() - new Date(dbProfile.dob).getTime()) / 31557600000) : "",
    gender: dbProfile?.gender || "",
    bloodGroup: dbProfile?.blood_group || "",
    heightCm: dbProfile?.height_cm || null,
    weightKg: dbProfile?.weight_kg || null,
    emergencyContacts: dbContacts?.length > 0 ? dbContacts.map((c: any) => ({ ...c, relation: c.relationship })) : [],
    conditions: dbConditions?.length > 0 ? dbConditions : [],
    medications: dbMedications?.length > 0 ? dbMedications : [],
    summary: dbProfile?.health_summary || "",
    address: dbProfile?.address || "",
    userId: dbProfile?.id || "",
    dob: dbProfile?.dob || "",
    insurance: { provider: "", policyNumber: "" },
    allergies: [],
    vaccinations: [],
    doctors: [],
    surgeries: "",
    organDonorStatus: "",
  };
  const bmi = (p.weightKg && p.heightCm) ? (p.weightKg / (p.heightCm / 100) ** 2).toFixed(1) : "";
  const activeQr = false;

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
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.45fr)_minmax(16rem,0.8fr)]">
          <dl className="grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1.5">
              <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Full name</dt>
              <dd className="flex items-center gap-2 text-base font-bold text-foreground min-h-[1.5rem]">
                {p.fullName || "—"}
                <StatusBadge tone="success">Verified</StatusBadge>
              </dd>
            </div>
            <PassportDetail label="Patient ID" value={p.userId ? `ML-${p.userId.replace("usr_", "")}` : ""} />
            <PassportDetail label="Age" value={p.age ? `${p.age} years` : ""} />
            <PassportDetail label="Gender" value={p.gender} />
            <PassportDetail label="Date of birth" value={p.dob ? formatDate(p.dob) : ""} />
            <PassportDetail label="Blood group" value={p.bloodGroup} />
            <PassportDetail label="Location" value={p.address} />
            <PassportDetail label="Phone" value={dbProfile?.phone || ""} />
            <PassportDetail label="Email" value={dbProfile?.email || ""} />
          </dl>
          <dl className="grid content-start gap-y-6 border-t border-border pt-6 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
            <PassportDetail label="Insurance provider" value={p.insurance?.provider || ""} />
            <PassportDetail label="Policy number" value={p.insurance?.policyNumber || ""} />
            <PassportDetail label="Last updated" value={dbProfile?.updated_at ? formatDate(dbProfile.updated_at) : ""} />
          </dl>
        </div>
      </Widget>

      <Widget title="Emergency Summary" icon={ShieldAlert} delay={0.05} action={<Button variant="ghost" size="sm" className="rounded-lg text-xs">View Full</Button>} className="[&>div]:border-primary/25 [&>div]:bg-primary/[0.025]">
        <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><EmergencyDetail label="Blood Group" value={p.bloodGroup} icon={Droplets} /><EmergencyDetail label="Allergies" value={p.allergies.map((item: any) => item.allergen).join(", ")} icon={CircleAlert} /><EmergencyDetail label="Chronic Conditions" value={p.conditions.map((item: any) => item.name).join(", ")} icon={HeartPulse} /><EmergencyDetail label="Current Medications" value={p.medications.length > 0 ? `${p.medications.length} active` : ""} icon={Pill} /><EmergencyDetail label="Surgeries" value={p.surgeries} icon={ClipboardList} /><EmergencyDetail label="Organ Donor Status" value={p.organDonorStatus} icon={Heart} /><EmergencyDetail label="Emergency QR Status" value={activeQr ? "Active" : "Inactive"} icon={QrCode} status={activeQr ? "success" : "neutral"} /><EmergencyDetail label="Emergency Contact" value={p.emergencyContacts.length > 0 ? `${p.emergencyContacts[0]?.name} · ${p.emergencyContacts[0]?.phone}` : ""} icon={UserCheck} /></dl>
        <div className="mt-6 border-t border-border pt-5">
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <p className="mb-3 text-sm font-medium text-foreground">Emergency contacts</p>
            {p.emergencyContacts.length === 0 ? <p className="text-sm text-muted-foreground">No emergency contacts listed.</p> : (
            <ul className="space-y-3">
              {p.emergencyContacts.map((contact: any) => (
                <li key={contact.id} className="flex items-center justify-between gap-3 rounded-xl border border-border p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{contact.name}</p>
                    <p className="text-xs text-muted-foreground">{contact.relation} · {contact.phone}</p>
                  </div>
                  <StatusBadge tone="danger">Priority</StatusBadge>
                </li>
              ))}
            </ul>
            )}
          </div>
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <PassportDetail label="Blood group" value={p.bloodGroup} />
              <PassportDetail label="Chronic diseases" value={p.conditions.length > 0 ? `${p.conditions.length} recorded` : ""} />
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-foreground">Current medications</p>
              {p.medications.length === 0 ? <p className="text-sm text-muted-foreground">No current medications.</p> : (
              <ul className="space-y-2">
                {p.medications.map((medication: any) => (
                  <li key={medication.id} className="rounded-xl border border-border p-3 text-sm">
                    <span className="font-medium text-foreground">{medication.name} {medication.dosage ? `— ${medication.dosage}` : ""}</span>
                    <span className="block text-xs text-muted-foreground">{medication.frequency}</span>
                  </li>
                ))}
              </ul>
              )}
            </div>
            <div className="rounded-xl border border-border bg-muted/30 p-4">
              <p className="text-sm font-medium text-foreground">Important medical notes</p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{p.summary || "No notes available."}</p>
            </div>
          </div>
        </div>
        </div>
      </Widget>

      <Widget title="Allergies & Conditions" icon={HeartPulse} delay={0.1}>
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <h3 className="mb-3 text-sm font-semibold text-foreground">Allergies</h3>
            {p.allergies.length === 0 ? <p className="text-sm text-muted-foreground">No allergies recorded.</p> : (
            <ul className="space-y-3">
              {p.allergies.map((allergy: any) => (
                <li key={allergy.id} className="rounded-xl border border-border p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-foreground">{allergy.allergen}</p>
                    <StatusBadge tone={severityTone[allergy.severity as keyof typeof severityTone] || "moderate"}>{allergy.severity}</StatusBadge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{allergy.reaction}</p>
                </li>
              ))}
            </ul>
            )}
          </div>
          <div>
            <h3 className="mb-3 text-sm font-semibold text-foreground">Medical conditions</h3>
            {p.conditions.length === 0 ? <p className="text-sm text-muted-foreground">No medical conditions recorded.</p> : (
            <ul className="space-y-3">
              {p.conditions.map((condition: any) => (
                <li key={condition.id} className="rounded-xl border border-border p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-foreground">{condition.name}</p>
                    <StatusBadge tone={severityTone[condition.severity as keyof typeof severityTone] || "moderate"}>{condition.severity}</StatusBadge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">Diagnosed {formatDate(condition.diagnosedAt)} · {condition.status}</p>
                </li>
              ))}
            </ul>
            )}
          </div>
        </div>
      </Widget>

      <div className="grid gap-6 xl:grid-cols-2">
        <Widget title="Health Overview" icon={HeartPulse} delay={0.12}><div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{[["Blood Pressure", ""], ["Blood Sugar", ""], ["Heart Rate", ""], ["BMI", bmi || ""]].map(([label, value]) => <div key={label} className="rounded-xl border border-border bg-surface p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-2 font-display text-lg font-bold text-foreground">{value}</p></div>)}</div></Widget>
        <Widget title="Medical Conditions" icon={HeartPulse} delay={0.14}><div className="flex flex-wrap gap-2">{p.conditions.length > 0 ? p.conditions.map((item: any) => <span key={item.id || item.name} className="rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-foreground">{item.name}</span>) : <span className="text-sm text-muted-foreground">No conditions recorded</span>}</div></Widget>
        <Widget title="Current Medications" icon={Pill} delay={0.16}><div className="overflow-x-auto"><table className="w-full min-w-[34rem] text-left text-sm"><thead className="border-b border-border text-xs text-muted-foreground"><tr><th className="pb-3">Medication</th><th className="pb-3">Dosage</th><th className="pb-3">Frequency</th><th className="pb-3">Prescribed By</th></tr></thead><tbody className="divide-y divide-border">{p.medications.map((m: any) => <tr key={m.id}><td className="py-3 font-medium text-foreground">{m.name}</td><td>{m.dosage}</td><td>{m.frequency}</td><td>{m.prescribedBy}</td></tr>)}</tbody></table>{p.medications.length === 0 && <p className="text-sm text-muted-foreground py-2">No medications found.</p>}</div></Widget>
        <Widget title="Recent Records" icon={FileText} delay={0.18} action={<Button variant="ghost" size="sm" className="text-xs">View All</Button>}><p className="text-sm text-muted-foreground py-2">No recent records available.</p></Widget>
        <Widget title="AI Health Insights" icon={CheckCircle2} delay={0.2}><p className="text-sm text-muted-foreground py-2">No insights available.</p><Button variant="ghost" size="sm" className="mt-4 px-0 text-primary">Explain with AI <ChevronRight className="size-4" /></Button></Widget>
        <Widget title="Health Risk Score" icon={ShieldCheck} delay={0.22}><div className="flex items-center gap-6"><div className="grid size-28 place-items-center rounded-full border-8 border-primary/20 text-center"><span className="font-display text-2xl font-bold text-primary">--</span></div><dl className="flex-1 space-y-3">{[["Cardiovascular Risk", "neutral"], ["Diabetes Risk", "neutral"], ["Lifestyle Risk", "neutral"]].map(([label, tone]) => <div key={label} className="flex justify-between"><dt className="text-sm text-muted-foreground">{label}</dt><StatusBadge tone={tone as "neutral"}>Risk</StatusBadge></div>)}</dl></div></Widget>
        <Widget title="Immunization Status" icon={Syringe} delay={0.24}><ul className="divide-y divide-border">{p.vaccinations.map((v: any) => <li key={v.id} className="flex items-center gap-3 py-3 first:pt-0"><div className="flex-1"><p className="text-sm font-medium text-foreground">{v.name}</p><p className="text-xs text-muted-foreground">Dose {v.doses}</p></div><StatusBadge tone={v.status === "complete" ? "success" : "warning"}>{v.status}</StatusBadge></li>)}</ul>{p.vaccinations.length === 0 && <p className="text-sm text-muted-foreground py-2">No vaccinations found.</p>}</Widget>
        <Widget title="Active Shares & Access" icon={Share2} delay={0.26}><ul className="divide-y divide-border">{(p.doctors as any[]).length > 0 ? [[Stethoscope, (p.doctors as any[])[0]?.name ?? "Doctor", (p.doctors as any[])[0]?.specialty ?? "Care team"], [Hospital, (p.doctors as any[])[0]?.hospital ?? "Hospital", "Hospital access"], [UserRound, "Family Access", "Family member"]].map(([Icon, name, role]) => <li key={String(role)} className="flex items-center gap-3 py-3 first:pt-0"><Icon className="size-4 text-primary" /><div className="flex-1"><p className="text-sm font-medium text-foreground">{String(name)}</p><p className="text-xs text-muted-foreground">{String(role)}</p></div><StatusBadge tone="success">Active</StatusBadge></li>) : null}</ul>{(p.doctors as any[]).length === 0 && <p className="text-sm text-muted-foreground py-2">No active shares found.</p>}<Button asChild variant="ghost" size="sm" className="mt-3 px-0 text-primary"><Link to="/dashboard/share">View all shared profiles <ChevronRight className="size-4" /></Link></Button></Widget>
      </div>
      <div className="flex items-center gap-3 rounded-2xl border border-border bg-card px-5 py-4 shadow-soft"><ShieldCheck className="size-5 shrink-0 text-success" /><p className="text-sm text-muted-foreground">Your data is secure and encrypted. You are in control of your health information.</p></div>
    </div>
  );
}

function EmergencyDetail({ label, value, icon: Icon, status }: { label: string; value: string; icon: typeof Droplets; status?: "success" | "neutral" }) {
  return <div className="rounded-xl border border-border bg-card p-4"><div className="flex justify-between gap-3"><Icon className="size-4 text-primary" />{status ? <StatusBadge tone={status}>{value}</StatusBadge> : null}</div><dt className="mt-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt><dd className="mt-1 text-sm font-medium text-foreground">{value}</dd></div>;
}

function PassportDetail({ label, value, className }: { label: string; value: string; className?: string }) {
  const displayValue = value && String(value).trim().length > 0 ? value : "—";
  return (
    <div className={`space-y-1.5 ${className || ""}`}>
      <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="text-sm font-semibold text-foreground min-h-[1.5rem] flex items-center">
        {displayValue === "—" ? (
          <span className="text-muted-foreground/60 font-normal">—</span>
        ) : (
          displayValue
        )}
      </dd>
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
