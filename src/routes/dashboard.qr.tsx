import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import { QRCodeCanvas } from "qrcode.react";
import { Copy, CopyPlus, Download, Pencil, Power, Printer, QrCode, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, EmptyState, StatusBadge } from "@/components/shared/page-header";
import { Widget } from "@/components/shared/widget";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDate } from "@/lib/format";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/auth";
import type { DBQRCode, DBShareProfile } from "./dashboard.share";

export const Route = createFileRoute("/dashboard/qr")({
  head: () => ({
    meta: [
      { title: "QR Code Management — MediLink AI" },
      { name: "description", content: "Generate, print and manage unlimited QR codes that open a consent-scoped view of your health record." },
      { property: "og:title", content: "QR Code Management — MediLink AI" },
      { property: "og:description", content: "Printable medical QR codes tied to your share profiles." },
    ],
  }),
  component: QRPage,
});

function QRPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [profileId, setProfileId] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<DBShareProfile[]>([]);
  const [codes, setCodes] = useState<DBQRCode[]>([]);
  
  const [renaming, setRenaming] = useState<DBQRCode | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const BASE_URL = typeof window !== 'undefined' ? `${window.location.origin}/s/` : 'https://medilink.ai/s/';

  useEffect(() => {
    async function loadData() {
      if (!user) return;
      const { data: pData } = await supabase.from("profiles").select("id").eq("auth_user_id", user.id).single();
      if (pData) {
        setProfileId(pData.id);
        const [profRes, qrRes] = await Promise.all([
          supabase.from("share_profiles").select("*").eq("profile_id", pData.id),
          supabase.from("qr_codes").select("*").eq("profile_id", pData.id).order('created_at', { ascending: false })
        ]);
        if (profRes.data) setProfiles(profRes.data);
        if (qrRes.data) setCodes(qrRes.data);
      }
      setIsLoading(false);
    }
    loadData();
  }, [user]);

  const linkFor = (item: DBQRCode) => {
    return `${BASE_URL}${item.token}`;
  };

  const triggerCreateProfile = () => {
    navigate({ to: "/dashboard/share", search: { create: true } });
  };

  const duplicate = async (item: DBQRCode) => {
    const newToken = Math.random().toString(36).slice(2, 10);
    const newCode: DBQRCode = {
      id: crypto.randomUUID(),
      profile_id: item.profile_id,
      share_profile_id: item.share_profile_id,
      label: `${item.label} (copy)`,
      token: newToken,
      scan_count: 0,
      status: 'active',
      created_at: new Date().toISOString()
    };

    try {
      const { error } = await supabase.from("qr_codes").insert(newCode);
      if (error) throw error;
      setCodes([newCode, ...codes]);
      toast.success("QR code duplicated");
    } catch (err: any) {
      toast.error(err.message || "Failed to duplicate QR code");
    }
  };

  const toggleStatus = async (item: DBQRCode) => {
    const newStatus = item.status === "active" ? "inactive" : "active";
    try {
      const { error } = await supabase.from("qr_codes").update({ status: newStatus }).eq("id", item.id);
      if (error) throw error;
      setCodes(codes.map((c) => (c.id === item.id ? { ...c, status: newStatus } : c)));
      toast.success(`QR code ${newStatus}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to update status");
    }
  };

  const remove = async (id: string) => {
    try {
      const { error } = await supabase.from("qr_codes").delete().eq("id", id);
      if (error) throw error;
      setCodes(codes.filter((c) => c.id !== id));
      toast.success("QR code deleted");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete QR code");
    }
  };

  const download = (item: DBQRCode) => {
    const canvas = document.getElementById(`qr-${item.id}`) as HTMLCanvasElement | null;
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = url;
    link.download = `${item.label.replace(/\\s+/g, "-").toLowerCase()}.png`;
    link.click();
    toast.success("QR image downloaded");
  };

  const confirmRename = async () => {
    if (!renaming) return;
    try {
      const { error } = await supabase.from("qr_codes").update({ label: renameValue }).eq("id", renaming.id);
      if (error) throw error;
      
      setCodes(codes.map((c) => (c.id === renaming.id ? { ...c, label: renameValue } : c)));
      setRenaming(null);
      toast.success("QR code renamed");
    } catch (err: any) {
      toast.error(err.message || "Failed to rename QR code");
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Loading QR codes...</div>;
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="QR Codes"
        description="Printable codes that open exactly the fields in their share profile."
        icon={QrCode}
        actions={
          <Button className="rounded-xl" onClick={triggerCreateProfile}>
            <QrCode className="size-4" aria-hidden /> Generate QR code
          </Button>
        }
      />

      {codes.length === 0 ? (
        <EmptyState
          icon={QrCode}
          title="No QR codes yet"
          description="Generate a code from any share profile and keep it in your wallet or on your fridge."
          action={
            <Button className="rounded-xl" onClick={triggerCreateProfile}>
              Generate your first QR
            </Button>
          }
        />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {codes.map((item, i) => {
              const profile = profiles.find((p) => p.id === item.share_profile_id);
              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.25, delay: Math.min(i * 0.04, 0.2) }}
                >
                  <Widget delay={0} className="h-full">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-display text-base font-semibold text-foreground">{item.label}</p>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {profile?.name ?? "Unlinked profile"} · {profile?.allowed_fields?.length ?? 0} fields
                        </p>
                      </div>
                      <StatusBadge tone={item.status === "active" ? "success" : "neutral"}>{item.status}</StatusBadge>
                    </div>

                    <div className="mt-4 grid place-items-center rounded-2xl border border-border bg-card p-6">
                      <div className={item.status === "inactive" ? "opacity-35" : undefined}>
                        <QRCodeCanvas id={`qr-${item.id}`} value={linkFor(item)} size={148} level="M" marginSize={2} />
                      </div>
                    </div>

                    <dl className="mt-4 grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-xl border border-border bg-surface p-3">
                        <dt className="text-[11px] text-muted-foreground">Created</dt>
                        <dd className="mt-0.5 font-medium text-foreground">{formatDate(item.created_at)}</dd>
                      </div>
                      <div className="rounded-xl border border-border bg-surface p-3">
                        <dt className="text-[11px] text-muted-foreground">Scans</dt>
                        <dd className="mt-0.5 font-medium text-foreground">{item.scan_count}</dd>
                      </div>
                    </dl>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" className="rounded-lg" onClick={() => download(item)}>
                        <Download className="size-3.5" aria-hidden /> Download
                      </Button>
                      <Button variant="outline" size="sm" className="rounded-lg" onClick={() => window.print()}>
                        <Printer className="size-3.5" aria-hidden /> Print
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-lg"
                        aria-label={`Copy link for ${item.label}`}
                        onClick={() => {
                          navigator.clipboard.writeText(linkFor(item)).then(
                            () => toast.success("Link copied"),
                            () => toast.error("Couldn't access the clipboard"),
                          );
                        }}
                      >
                        <Copy className="size-4" aria-hidden />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-lg"
                        aria-label={`Rename ${item.label}`}
                        onClick={() => {
                          setRenaming(item);
                          setRenameValue(item.label);
                        }}
                      >
                        <Pencil className="size-4" aria-hidden />
                      </Button>
                      <Button variant="ghost" size="icon" className="rounded-lg" aria-label={`Duplicate ${item.label}`} onClick={() => duplicate(item)}>
                        <CopyPlus className="size-4" aria-hidden />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-lg"
                        aria-label={`${item.status === "active" ? "Deactivate" : "Activate"} ${item.label}`}
                        onClick={() => toggleStatus(item)}
                      >
                        <Power className="size-4" aria-hidden />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-lg text-destructive hover:text-destructive"
                        aria-label={`Delete ${item.label}`}
                        onClick={() => remove(item.id)}
                      >
                        <Trash2 className="size-4" aria-hidden />
                      </Button>
                    </div>
                  </Widget>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      <Dialog open={renaming !== null} onOpenChange={(open) => !open && setRenaming(null)}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rename QR code</DialogTitle>
            <DialogDescription>Labels help you tell printed codes apart.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="qr-name">QR label</Label>
            <Input id="qr-name" value={renameValue} onChange={(e) => setRenameValue(e.target.value)} className="rounded-xl" />
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setRenaming(null)}>
              Cancel
            </Button>
            <Button className="rounded-xl" onClick={confirmRename}>
              Save label
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
