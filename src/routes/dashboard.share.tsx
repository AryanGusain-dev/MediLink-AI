import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Copy,
  Eye,
  Link2,
  Pencil,
  Plus,
  RefreshCw,
  Share2,
  Sliders,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader, StatusBadge } from "@/components/shared/page-header";
import { Widget } from "@/components/shared/widget";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { shareFields } from "@/data/mock";
import type { ShareFieldKey } from "@/types";
import { formatDate } from "@/lib/format";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/auth";

type ShareSearchParams = {
  create?: boolean;
};

export const Route = createFileRoute("/dashboard/share")({
  validateSearch: (search: Record<string, unknown>): ShareSearchParams => ({
    create: search.create === "true" || search.create === true || undefined,
  }),
  head: () => ({
    meta: [
      { title: "Share Profiles & Links — MediLink AI" },
      { name: "description", content: "Create consent-scoped share profiles and secure links that expose only the health fields you choose." },
      { property: "og:title", content: "Share Profiles & Links — MediLink AI" },
      { property: "og:description", content: "Field-level consent for every person who needs your medical information." },
    ],
  }),
  component: SharePage,
});

const visibilityLabel = {
  "public-link": "Anyone with the link",
  "pin-protected": "PIN protected",
  private: "Private / invite only",
};

// Map DB row types
export type DBShareProfile = {
  id: string;
  profile_id: string;
  name: string;
  description: string;
  allowed_fields: ShareFieldKey[];
  expires_at: string | null;
  is_active: boolean;
};

export type DBQRCode = {
  id: string;
  profile_id: string;
  share_profile_id: string;
  label: string;
  token: string;
  scan_count: number;
  status: string;
  created_at: string;
};

function SharePage() {
  const { create: shouldCreate } = Route.useSearch();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [profileId, setProfileId] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<DBShareProfile[]>([]);
  const [links, setLinks] = useState<DBQRCode[]>([]);
  const [editing, setEditing] = useState<DBShareProfile | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Use dynamic base URL
  const BASE_URL = typeof window !== 'undefined' ? `${window.location.origin}/s/` : 'https://medilink.ai/s/';

  useEffect(() => {
    async function loadData() {
      if (!user) return;
      const { data: pData } = await supabase.from("profiles").select("id").eq("auth_user_id", user.id).single();
      if (pData) {
        setProfileId(pData.id);
        const [profRes, linkRes] = await Promise.all([
          supabase.from("share_profiles").select("*").eq("profile_id", pData.id).order('name'),
          supabase.from("qr_codes").select("*").eq("profile_id", pData.id).order('created_at', { ascending: false })
        ]);
        if (profRes.data) setProfiles(profRes.data);
        if (linkRes.data) setLinks(linkRes.data);
      }
    }
    loadData();
  }, [user]);

  const toggleField = (key: ShareFieldKey) => {
    if (!editing) return;
    setEditing({
      ...editing,
      allowed_fields: editing.allowed_fields.includes(key) 
        ? editing.allowed_fields.filter((f) => f !== key) 
        : [...editing.allowed_fields, key],
    });
  };

  const createProfile = () => {
    if (!profileId) {
      toast.error("Profile not loaded yet.");
      return;
    }
    setEditing({
      id: crypto.randomUUID(),
      profile_id: profileId,
      name: "New share profile",
      description: "Custom selection of health fields.",
      allowed_fields: ["name", "bloodGroup", "allergies"] as ShareFieldKey[],
      expires_at: null,
      is_active: true,
    });
  };

  useEffect(() => {
    if (shouldCreate && profileId) {
      createProfile();
      navigate({ search: { create: undefined } as any, replace: true });
    }
  }, [shouldCreate, profileId]);

  const saveEditing = async () => {
    if (!editing || !profileId) return;
    setIsSaving(true);
    
    try {
      const exists = profiles.some((p) => p.id === editing.id);
      
      if (exists) {
        // Update
        const { error } = await supabase.from("share_profiles").update({
          name: editing.name,
          description: editing.description,
          allowed_fields: editing.allowed_fields,
          is_active: editing.is_active
        }).eq("id", editing.id);
        
        if (error) throw error;
        
        setProfiles(profiles.map((p) => (p.id === editing.id ? editing : p)));
        toast.success("Share profile updated");
      } else {
        // Insert new share profile
        const { error: spError } = await supabase.from("share_profiles").insert(editing);
        if (spError) throw spError;
        
        // Automatically generate a primary QR code / link for the new profile
        const newToken = Math.random().toString(36).slice(2, 10);
        const newLink: DBQRCode = {
          id: crypto.randomUUID(),
          profile_id: profileId,
          share_profile_id: editing.id,
          label: `${editing.name} Link`,
          token: newToken,
          scan_count: 0,
          status: 'active',
          created_at: new Date().toISOString()
        };
        
        const { error: qrError } = await supabase.from("qr_codes").insert(newLink);
        if (qrError) throw qrError;

        setProfiles([...profiles, editing].sort((a, b) => a.name.localeCompare(b.name)));
        setLinks([newLink, ...links]);
        toast.success("Share profile created");
      }
      setEditing(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to save profile");
    } finally {
      setIsSaving(false);
    }
  };

  const removeProfile = async (id: string) => {
    try {
      const { error } = await supabase.from("share_profiles").delete().eq("id", id);
      if (error) throw error;
      setProfiles(profiles.filter((p) => p.id !== id));
      setLinks(links.filter((l) => l.share_profile_id !== id));
      toast.success("Share profile deleted");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete profile");
    }
  };

  const removeLink = async (id: string) => {
    try {
      const { error } = await supabase.from("qr_codes").delete().eq("id", id);
      if (error) throw error;
      setLinks(links.filter((l) => l.id !== id));
      toast.success("Link deleted");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete link");
    }
  };

  const regenerateLink = async (link: DBQRCode) => {
    try {
      const newToken = Math.random().toString(36).slice(2, 10);
      const { error } = await supabase.from("qr_codes").update({ token: newToken }).eq("id", link.id);
      if (error) throw error;
      
      setLinks(links.map(l => l.id === link.id ? { ...l, token: newToken } : l));
      toast.success("Link regenerated — the previous URL no longer works");
    } catch (err: any) {
      toast.error(err.message || "Failed to regenerate link");
    }
  };

  const copyLink = async (token: string) => {
    try {
      await navigator.clipboard.writeText(`${BASE_URL}${token}`);
      toast.success("Share link copied");
    } catch {
      toast.error("Couldn't access the clipboard");
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Share Management"
        description="Decide exactly which fields each person or institution can see."
        icon={Share2}
        actions={
          <Button className="rounded-xl" onClick={createProfile}>
            <Plus className="size-4" aria-hidden /> New share profile
          </Button>
        }
      />

      <Tabs defaultValue="profiles">
        <TabsList className="rounded-xl">
          <TabsTrigger value="profiles" className="rounded-lg">
            Share profiles
          </TabsTrigger>
          <TabsTrigger value="links" className="rounded-lg">
            Share links
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profiles" className="mt-6">
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            <AnimatePresence mode="popLayout">
              {profiles.map((profile, i) => (
                <motion.div
                  key={profile.id}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.25, delay: Math.min(i * 0.04, 0.2) }}
                >
                  <Widget delay={0} className="h-full">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-display text-base font-semibold text-foreground">{profile.name}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">Custom preset</p>
                      </div>
                      <StatusBadge tone={profile.is_active ? "success" : "neutral"}>
                        {profile.is_active ? "active" : "inactive"}
                      </StatusBadge>
                    </div>

                    <p className="mt-3 text-sm text-muted-foreground">{profile.description}</p>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {profile.allowed_fields.slice(0, 4).map((key) => (
                        <span key={key} className="rounded-full bg-accent px-3 py-0.5 text-[11px] font-medium text-accent-foreground">
                          {shareFields.find((f) => f.key === key)?.label}
                        </span>
                      ))}
                      {profile.allowed_fields.length > 4 ? (
                        <span className="rounded-full bg-muted px-3 py-0.5 text-[11px] font-medium text-muted-foreground">
                          +{profile.allowed_fields.length - 4} more
                        </span>
                      ) : null}
                    </div>

                    <Separator className="my-4" />

                    <dl className="space-y-2 text-xs text-muted-foreground">
                      <div className="flex justify-between"><dt>Visibility</dt><dd className="font-medium text-foreground">Anyone with link</dd></div>
                      <div className="flex justify-between"><dt>Expires</dt><dd>{profile.expires_at ? formatDate(profile.expires_at) : 'Never'}</dd></div>
                    </dl>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" className="rounded-lg" onClick={() => setEditing(profile)}>
                        <Sliders className="size-3.5" aria-hidden /> Fields
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-lg text-destructive hover:text-destructive"
                        aria-label={`Delete ${profile.name}`}
                        onClick={() => removeProfile(profile.id)}
                      >
                        <Trash2 className="size-4" aria-hidden />
                      </Button>
                    </div>
                  </Widget>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </TabsContent>

        <TabsContent value="links" className="mt-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {links.map((link, i) => {
              const relatedProfile = profiles.find(p => p.id === link.share_profile_id);
              
              return (
                <Widget key={link.id} delay={i * 0.04}>
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-display text-base font-semibold text-foreground">{link.label}</p>
                      <p className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                        <Link2 className="size-3.5 shrink-0" aria-hidden />
                        <span className="truncate">{BASE_URL}{link.token}</span>
                      </p>
                      {relatedProfile && (
                        <p className="mt-1 text-xs text-muted-foreground">Linked to profile: <strong>{relatedProfile.name}</strong></p>
                      )}
                    </div>
                    <StatusBadge tone={link.status === "active" ? "success" : "danger"}>{link.status}</StatusBadge>
                  </div>

                  <dl className="mt-4 grid grid-cols-2 gap-3 text-xs sm:grid-cols-3">
                    {[
                      { label: "Created", value: formatDate(link.created_at) },
                      { label: "Visibility", value: "Anyone with link" },
                      { label: "Scans/Views", value: String(link.scan_count) },
                    ].map((cell) => (
                      <div key={cell.label} className="rounded-xl border border-border bg-surface p-3">
                        <dt className="text-[11px] text-muted-foreground">{cell.label}</dt>
                        <dd className="mt-0.5 truncate text-xs font-medium text-foreground">{cell.value}</dd>
                      </div>
                    ))}
                  </dl>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" className="rounded-lg" onClick={() => copyLink(link.token)}>
                      <Copy className="size-3.5" aria-hidden /> Copy
                    </Button>
                    <Button variant="outline" size="sm" className="rounded-lg" onClick={() => window.open(`${BASE_URL}${link.token}`, '_blank')}>
                      <Eye className="size-3.5" aria-hidden /> Open
                    </Button>
                    <Button variant="ghost" size="sm" className="rounded-lg" onClick={() => regenerateLink(link)}>
                      <RefreshCw className="size-3.5" aria-hidden /> Regenerate
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="rounded-lg text-destructive hover:text-destructive"
                      onClick={() => removeLink(link.id)}
                    >
                      <Trash2 className="size-3.5" aria-hidden /> Delete
                    </Button>
                  </div>
                </Widget>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* Field selection dialog */}
      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto rounded-2xl sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Configure share profile</DialogTitle>
            <DialogDescription>Toggle exactly which parts of your record this profile reveals.</DialogDescription>
          </DialogHeader>

          {editing ? (
            <div className="space-y-8">
              <div className="space-y-2">
                <Label htmlFor="profile-name">Profile name</Label>
                <Input
                  id="profile-name"
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="profile-desc">Description</Label>
                <Input
                  id="profile-desc"
                  value={editing.description || ""}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">
                  Shared fields <span className="text-muted-foreground">({editing.allowed_fields.length}/{shareFields.length})</span>
                </p>
                <ul className="divide-y divide-border rounded-xl border border-border">
                  {shareFields.map((field) => (
                    <li key={field.key} className="flex items-center justify-between gap-3 p-3">
                      <div className="min-w-0">
                        <Label htmlFor={`f-${field.key}`} className="text-sm font-medium text-foreground">
                          {field.label}
                        </Label>
                        <p className="text-xs text-muted-foreground">{field.description}</p>
                      </div>
                      <Switch
                        id={`f-${field.key}`}
                        checked={editing.allowed_fields.includes(field.key)}
                        onCheckedChange={() => toggleField(field.key)}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setEditing(null)} disabled={isSaving}>
              Cancel
            </Button>
            <Button className="rounded-xl" onClick={saveEditing} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save profile"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
