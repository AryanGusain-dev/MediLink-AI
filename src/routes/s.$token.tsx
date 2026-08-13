import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ShieldAlert, User, ShieldCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/s/$token")({
  component: PublicShareView,
});

function PublicShareView() {
  const { token } = Route.useParams();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [profileData, setProfileData] = useState<any>(null);
  const [shareConfig, setShareConfig] = useState<any>(null);

  useEffect(() => {
    async function fetchSharedData() {
      try {
        setLoading(true);
        // 1. Resolve token to a QR code
        const { data: qrData, error: qrError } = await supabase
          .from("qr_codes")
          .select("*")
          .eq("token", token)
          .single();

        if (qrError || !qrData) {
          throw new Error("Invalid or expired link.");
        }

        if (qrData.status !== "active") {
          throw new Error("This link has been deactivated by the owner.");
        }

        // Increment scan count in the background
        supabase.rpc('increment_scan_count', { row_id: qrData.id }).catch(() => {
          // Fallback if rpc is not set up
          supabase.from("qr_codes").update({ scan_count: qrData.scan_count + 1 }).eq("id", qrData.id).then();
        });

        // 2. Fetch Share Profile rules
        const { data: shareProfile, error: spError } = await supabase
          .from("share_profiles")
          .select("*")
          .eq("id", qrData.share_profile_id)
          .single();

        if (spError || !shareProfile) {
          throw new Error("The share configuration was not found.");
        }

        if (!shareProfile.is_active) {
          throw new Error("This share profile is no longer active.");
        }

        if (shareProfile.expires_at && new Date(shareProfile.expires_at) < new Date()) {
          throw new Error("This link has expired.");
        }

        setShareConfig(shareProfile);

        // 3. Fetch Patient Data based on allowed_fields
        const allowedFields = shareProfile.allowed_fields || [];
        
        // Always fetch base profile to get basic identity
        const { data: profile, error: pError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", shareProfile.profile_id)
          .single();

        if (pError || !profile) {
          throw new Error("Patient profile not found.");
        }

        const data: any = {
          name: profile.full_name,
        };

        if (allowedFields.includes("age") && profile.dob) {
          // Calculate age roughly
          const diffMs = Date.now() - new Date(profile.dob).getTime();
          const ageDt = new Date(diffMs); 
          data.age = Math.abs(ageDt.getUTCFullYear() - 1970);
        }
        
        if (allowedFields.includes("gender")) data.gender = profile.gender;
        if (allowedFields.includes("bloodGroup")) data.bloodGroup = profile.blood_group;
        if (allowedFields.includes("summary")) data.summary = profile.health_summary;
        
        // Fetch emergency contacts if permitted
        if (allowedFields.includes("emergencyContacts")) {
          const { data: ec } = await supabase.from("emergency_contacts").select("*").eq("profile_id", profile.id);
          data.emergencyContacts = ec;
        }

        setProfileData(data);
      } catch (err: any) {
        setError(err.message || "Something went wrong.");
      } finally {
        setLoading(false);
      }
    }
    fetchSharedData();
  }, [token]);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 text-muted-foreground">
          <div className="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p>Loading medical profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-background p-6">
        <div className="max-w-md w-full rounded-2xl border border-destructive/20 bg-destructive/5 p-8 text-center">
          <ShieldAlert className="mx-auto size-12 text-destructive mb-4" />
          <h2 className="text-xl font-bold text-foreground mb-2">Access Denied</h2>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-12">
      <div className="bg-primary/5 border-b border-primary/10 py-6 px-4">
        <div className="mx-auto max-w-2xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-5 text-primary" />
            <span className="font-semibold text-primary">MediLink Secure Share</span>
          </div>
          <span className="text-xs text-muted-foreground bg-white/50 px-2 py-1 rounded-full border border-border">
            View-Only Access
          </span>
        </div>
      </div>

      <main className="mx-auto mt-8 max-w-2xl px-4 space-y-6">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="size-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <User className="size-10 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">{profileData.name}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            This profile is shared via <strong>{shareConfig.name}</strong>
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {profileData.age !== undefined && (
            <div className="rounded-xl border border-border bg-surface p-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Age</p>
              <p className="text-lg font-semibold text-foreground">{profileData.age} years</p>
            </div>
          )}
          {profileData.gender && (
            <div className="rounded-xl border border-border bg-surface p-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Gender</p>
              <p className="text-lg font-semibold text-foreground capitalize">{profileData.gender}</p>
            </div>
          )}
          {profileData.bloodGroup && (
            <div className="rounded-xl border border-border bg-surface p-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Blood Group</p>
              <p className="text-lg font-semibold text-destructive">{profileData.bloodGroup}</p>
            </div>
          )}
        </div>

        {profileData.summary && (
          <div className="rounded-2xl border border-border bg-surface p-6">
            <h2 className="text-lg font-semibold text-foreground mb-3">Health Summary</h2>
            <p className="text-muted-foreground leading-relaxed text-sm whitespace-pre-wrap">
              {profileData.summary}
            </p>
          </div>
        )}

        {profileData.emergencyContacts && profileData.emergencyContacts.length > 0 && (
          <div className="rounded-2xl border border-border bg-surface p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Emergency Contacts</h2>
            <div className="space-y-4">
              {profileData.emergencyContacts.map((contact: any) => (
                <div key={contact.id} className="flex items-center justify-between border-b border-border/50 pb-4 last:border-0 last:pb-0">
                  <div>
                    <p className="font-medium text-foreground">{contact.name}</p>
                    <p className="text-sm text-muted-foreground">{contact.relationship}</p>
                  </div>
                  <a href={`tel:${contact.phone}`} className="text-primary hover:underline text-sm font-medium">
                    {contact.phone}
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* We can expand on other fields like medications, allergies, etc. as needed based on shareConfig.allowed_fields */}
        
        <div className="text-center pt-8">
          <p className="text-xs text-muted-foreground">
            Provided securely by MediLink AI. This link may expire or be revoked at any time by the patient.
          </p>
        </div>
      </main>
    </div>
  );
}
