import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Laptop, Lock, Moon, Bell, ShieldCheck, Smartphone, Sun, Trash2, UserRound, Settings as SettingsIcon } from "lucide-react";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useTheme } from "@/hooks/use-theme";
import { currentUser } from "@/data/mock";

export const Route = createFileRoute("/dashboard/settings")({
  head: () => ({
    meta: [
      { title: "Settings — MediLink AI" },
      { name: "description", content: "Manage your MediLink AI profile, privacy, notifications, theme, security, devices and sessions." },
      { property: "og:title", content: "Settings — MediLink AI" },
      { property: "og:description", content: "Account, privacy and security controls for your health vault." },
    ],
  }),
  component: SettingsPage,
});

const privacyToggles = [
  { id: "discoverable", label: "Allow clinicians to look me up by policy number", defaultOn: false },
  { id: "audit", label: "Log every share-link open in my activity feed", defaultOn: true },
  { id: "expiry", label: "Require an expiry date on every new share link", defaultOn: true },
  { id: "research", label: "Contribute de-identified data to research", defaultOn: false },
];

const notificationToggles = [
  { id: "n-share", label: "Someone opens a share link", defaultOn: true },
  { id: "n-upload", label: "Document processing finishes", defaultOn: true },
  { id: "n-security", label: "New device sign-in", defaultOn: true },
  { id: "n-health", label: "Vaccination and medication reminders", defaultOn: true },
  { id: "n-product", label: "Product updates and new modules", defaultOn: false },
];

const devices = [
  { id: "d1", name: "MacBook Pro · Chrome", location: "Bengaluru, IN", lastActive: "Active now", current: true, icon: Laptop },
  { id: "d2", name: "iPhone 15 · MediLink app", location: "Bengaluru, IN", lastActive: "2 hours ago", current: false, icon: Smartphone },
  { id: "d3", name: "iPad Air · Safari", location: "Mysuru, IN", lastActive: "6 days ago", current: false, icon: Laptop },
];

function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [saving, setSaving] = useState(false);

  const save = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      toast.success("Settings saved");
    }, 700);
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Settings"
        description="Account, privacy, security and appearance controls."
        icon={SettingsIcon}
        actions={
          <Button className="rounded-xl" onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
        }
      />

      <Tabs defaultValue="profile">
        <TabsList className="flex h-auto flex-wrap justify-start rounded-xl">
          {["profile", "privacy", "notifications", "appearance", "security"].map((tab) => (
            <TabsTrigger key={tab} value={tab} className="rounded-lg capitalize">
              {tab}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="profile" className="mt-6 grid gap-6 lg:grid-cols-2">
          <Widget title="Account details" icon={UserRound} delay={0}>
            <div className="space-y-4">
              {[
                { id: "s-name", label: "Full name", value: currentUser.name, type: "text" },
                { id: "s-email", label: "Email", value: currentUser.email, type: "email" },
                { id: "s-phone", label: "Phone", value: currentUser.phone, type: "tel" },
              ].map((f) => (
                <div key={f.id} className="space-y-2">
                  <Label htmlFor={f.id}>{f.label}</Label>
                  <Input id={f.id} type={f.type} defaultValue={f.value} className="h-10 rounded-xl" />
                </div>
              ))}
            </div>
          </Widget>

          <Widget title="Danger zone" icon={Trash2} delay={0.05}>
            <p className="text-sm text-muted-foreground">
              Deleting your account permanently erases every record, document, share profile and QR code. This cannot
              be undone.
            </p>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="mt-4 rounded-xl">
                  <Trash2 className="size-4" aria-hidden /> Delete account
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="rounded-2xl">
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete your MediLink AI account?</AlertDialogTitle>
                  <AlertDialogDescription>
                    All medical records, documents and active share links will be destroyed immediately. Anyone holding
                    a QR code will lose access.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="rounded-xl">Keep my account</AlertDialogCancel>
                  <AlertDialogAction
                    className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={() => toast.success("Deletion scheduled — 7 day cool-off applies")}
                  >
                    Delete permanently
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </Widget>
        </TabsContent>

        <TabsContent value="privacy" className="mt-6">
          <Widget title="Privacy controls" icon={ShieldCheck} delay={0}>
            <ul className="divide-y divide-border">
              {privacyToggles.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-4 py-4">
                  <Label htmlFor={item.id} className="text-sm font-normal text-foreground">
                    {item.label}
                  </Label>
                  <Switch id={item.id} defaultChecked={item.defaultOn} />
                </li>
              ))}
            </ul>
          </Widget>
        </TabsContent>

        <TabsContent value="notifications" className="mt-6">
          <Widget title="Notification preferences" icon={Bell} delay={0}>
            <ul className="divide-y divide-border">
              {notificationToggles.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-4 py-4">
                  <Label htmlFor={item.id} className="text-sm font-normal text-foreground">
                    {item.label}
                  </Label>
                  <Switch id={item.id} defaultChecked={item.defaultOn} />
                </li>
              ))}
            </ul>
          </Widget>
        </TabsContent>

        <TabsContent value="appearance" className="mt-6">
          <Widget title="Theme" icon={theme === "dark" ? Moon : Sun} delay={0}>
            <div className="grid gap-3 sm:grid-cols-2">
              {(["light", "dark"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setTheme(mode)}
                  aria-pressed={theme === mode}
                  className={`rounded-2xl border p-4 text-left transition-colors ${
                    theme === mode ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                  }`}
                >
                  <span className="flex items-center gap-2 font-display text-sm font-semibold capitalize text-foreground">
                    {mode === "dark" ? <Moon className="size-4" aria-hidden /> : <Sun className="size-4" aria-hidden />}
                    {mode} mode
                  </span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {mode === "dark" ? "Low-light friendly clinical palette" : "Bright, high-contrast default"}
                  </span>
                </button>
              ))}
            </div>
          </Widget>
        </TabsContent>

        <TabsContent value="security" className="mt-6 grid gap-6 lg:grid-cols-2">
          <Widget title="Password" icon={Lock} delay={0}>
            <div className="space-y-4">
              {[
                { id: "cur", label: "Current password" },
                { id: "new", label: "New password" },
                { id: "conf", label: "Confirm new password" },
              ].map((f) => (
                <div key={f.id} className="space-y-2">
                  <Label htmlFor={f.id}>{f.label}</Label>
                  <Input id={f.id} type="password" placeholder="••••••••" className="h-10 rounded-xl" />
                </div>
              ))}
              <Button className="w-full rounded-xl" onClick={() => toast.success("Password updated")}>
                Update password
              </Button>
            </div>
          </Widget>

          <Widget title="Two-factor & sessions" icon={ShieldCheck} delay={0.05}>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-foreground">Two-factor authentication</p>
                <p className="text-xs text-muted-foreground">Authenticator app · enabled 62 days ago</p>
              </div>
              <Switch defaultChecked aria-label="Two-factor authentication" />
            </div>
            <Separator className="my-4" />
            <ul className="space-y-3">
              {devices.map((device) => (
                <li key={device.id} className="flex items-center gap-3 rounded-xl border border-border p-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground">
                    <device.icon className="size-4" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{device.name}</p>
                    <p className="text-xs text-muted-foreground">{device.location} · {device.lastActive}</p>
                  </div>
                  {device.current ? (
                    <StatusBadge tone="success">This device</StatusBadge>
                  ) : (
                    <Button variant="ghost" size="sm" className="rounded-lg" onClick={() => toast.success("Session revoked")}>
                      Revoke
                    </Button>
                  )}
                </li>
              ))}
            </ul>
            <Button variant="outline" className="mt-4 w-full rounded-xl" onClick={() => toast.success("All other sessions signed out")}>
              Sign out of all other sessions
            </Button>
          </Widget>
        </TabsContent>
      </Tabs>
    </div>
  );
}
