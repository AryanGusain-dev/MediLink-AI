import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
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
import { shareFields, shareProfiles as seedProfiles } from "@/data/mock";
import type { ShareFieldKey, ShareProfile } from "@/types";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/dashboard/share")({
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

const BASE_URL = "https://medilink.ai/s/";

const visibilityLabel: Record<ShareProfile["visibility"], string> = {
  "public-link": "Anyone with the link",
  "pin-protected": "PIN protected",
  private: "Private / invite only",
};

function SharePage() {
  const [profiles, setProfiles] = useState<ShareProfile[]>(seedProfiles);
  const [editing, setEditing] = useState<ShareProfile | null>(null);

  const toggleField = (key: ShareFieldKey) => {
    if (!editing) return;
    setEditing({
      ...editing,
      fields: editing.fields.includes(key) ? editing.fields.filter((f) => f !== key) : [...editing.fields, key],
    });
  };

  const saveEditing = () => {
    if (!editing) return;
    setProfiles((prev) => {
      const exists = prev.some((p) => p.id === editing.id);
      return exists ? prev.map((p) => (p.id === editing.id ? editing : p)) : [editing, ...prev];
    });
    setEditing(null);
    toast.success("Share profile saved");
  };

  const createProfile = () => {
    setEditing({
      id: `sp_${Date.now()}`,
      name: "New share profile",
      preset: "Custom",
      description: "Custom selection of health fields.",
      fields: ["name", "bloodGroup", "allergies"],
      createdAt: new Date().toISOString(),
      expiresAt: null,
      visibility: "pin-protected",
      status: "active",
      views: 0,
      token: Math.random().toString(36).slice(2, 10),
    });
  };

  const remove = (id: string) => {
    setProfiles((prev) => prev.filter((p) => p.id !== id));
    toast.success("Share profile deleted");
  };

  const regenerate = (id: string) => {
    setProfiles((prev) =>
      prev.map((p) => (p.id === id ? { ...p, token: Math.random().toString(36).slice(2, 10), status: "active" } : p)),
    );
    toast.success("Link regenerated — the previous URL no longer works");
  };

  const copyLink = async (profile: ShareProfile) => {
    try {
      await navigator.clipboard.writeText(`${BASE_URL}${profile.token}`);
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
                        <p className="mt-0.5 text-xs text-muted-foreground">{profile.preset} preset</p>
                      </div>
                      <StatusBadge tone={profile.status === "active" ? "success" : profile.status === "expired" ? "danger" : "neutral"}>
                        {profile.status}
                      </StatusBadge>
                    </div>

                    <p className="mt-3 text-sm text-muted-foreground">{profile.description}</p>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {profile.fields.slice(0, 4).map((key) => (
                        <span key={key} className="rounded-full bg-accent px-3 py-0.5 text-[11px] font-medium text-accent-foreground">
                          {shareFields.find((f) => f.key === key)?.label}
                        </span>
                      ))}
                      {profile.fields.length > 4 ? (
                        <span className="rounded-full bg-muted px-3 py-0.5 text-[11px] font-medium text-muted-foreground">
                          +{profile.fields.length - 4} more
                        </span>
                      ) : null}
                    </div>

                    <Separator className="my-4" />

                    <dl className="space-y-2 text-xs text-muted-foreground">
                      <div className="flex justify-between"><dt>Visibility</dt><dd className="font-medium text-foreground">{visibilityLabel[profile.visibility]}</dd></div>
                      <div className="flex justify-between"><dt>Created</dt><dd>{formatDate(profile.createdAt)}</dd></div>
                      <div className="flex justify-between"><dt>Expires</dt><dd>{formatDate(profile.expiresAt)}</dd></div>
                      <div className="flex justify-between"><dt>Views</dt><dd>{profile.views}</dd></div>
                    </dl>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" className="rounded-lg" onClick={() => setEditing(profile)}>
                        <Sliders className="size-3.5" aria-hidden /> Fields
                      </Button>
                      <Button variant="ghost" size="icon" className="rounded-lg" aria-label={`Copy link for ${profile.name}`} onClick={() => copyLink(profile)}>
                        <Copy className="size-4" aria-hidden />
                      </Button>
                      <Button variant="ghost" size="icon" className="rounded-lg" aria-label={`Regenerate link for ${profile.name}`} onClick={() => regenerate(profile.id)}>
                        <RefreshCw className="size-4" aria-hidden />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-lg text-destructive hover:text-destructive"
                        aria-label={`Delete ${profile.name}`}
                        onClick={() => remove(profile.id)}
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
            {profiles.map((profile, i) => (
              <Widget key={profile.id} delay={i * 0.04}>
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-display text-base font-semibold text-foreground">{profile.name}</p>
                    <p className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      <Link2 className="size-3.5 shrink-0" aria-hidden />
                      <span className="truncate">{BASE_URL}{profile.token}</span>
                    </p>
                  </div>
                  <StatusBadge tone={profile.status === "active" ? "success" : "danger"}>{profile.status}</StatusBadge>
                </div>

                <dl className="mt-4 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
                  {[
                    { label: "Created", value: formatDate(profile.createdAt) },
                    { label: "Expiry", value: formatDate(profile.expiresAt) },
                    { label: "Visibility", value: visibilityLabel[profile.visibility] },
                    { label: "Views", value: String(profile.views) },
                  ].map((cell) => (
                    <div key={cell.label} className="rounded-xl border border-border bg-surface p-3">
                      <dt className="text-[11px] text-muted-foreground">{cell.label}</dt>
                      <dd className="mt-0.5 truncate text-xs font-medium text-foreground">{cell.value}</dd>
                    </div>
                  ))}
                </dl>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" className="rounded-lg" onClick={() => copyLink(profile)}>
                    <Copy className="size-3.5" aria-hidden /> Copy
                  </Button>
                  <Button variant="outline" size="sm" className="rounded-lg" onClick={() => toast.info("Opening the recipient view in the connected build")}>
                    <Eye className="size-3.5" aria-hidden /> Open
                  </Button>
                  <Button variant="ghost" size="sm" className="rounded-lg" onClick={() => setEditing(profile)}>
                    <Pencil className="size-3.5" aria-hidden /> Edit
                  </Button>
                  <Button variant="ghost" size="sm" className="rounded-lg" onClick={() => regenerate(profile.id)}>
                    <RefreshCw className="size-3.5" aria-hidden /> Regenerate
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="rounded-lg text-destructive hover:text-destructive"
                    onClick={() => remove(profile.id)}
                  >
                    <Trash2 className="size-3.5" aria-hidden /> Delete
                  </Button>
                </div>
              </Widget>
            ))}
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
                <p className="text-sm font-medium text-foreground">
                  Shared fields <span className="text-muted-foreground">({editing.fields.length}/{shareFields.length})</span>
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
                        checked={editing.fields.includes(field.key)}
                        onCheckedChange={() => toggleField(field.key)}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button className="rounded-xl" onClick={saveEditing}>
              Save profile
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
