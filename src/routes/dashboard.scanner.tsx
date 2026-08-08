import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useRef, useState, type ChangeEvent, useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Camera, FileScan, ImagePlus, RotateCcw, ScanLine, Sparkles } from "lucide-react";
import { PageHeader, StatusBadge } from "@/components/shared/page-header";
import { Widget } from "@/components/shared/widget";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { useAuth } from "@/contexts/auth";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/dashboard/scanner")({
  head: () => ({
    meta: [
      { title: "Report Scanner — MediLink AI" },
      { name: "description", content: "Capture or upload a medical report and file it into your MediLink AI health record." },
      { property: "og:title", content: "Report Scanner — MediLink AI" },
      { property: "og:description", content: "Scan medical reports straight into your encrypted health vault." },
    ],
  }),
  component: ScannerPage,
});

type Phase = "idle" | "preview" | "scanning" | "result";

const scanSteps = ["Preparing image", "Detecting document edges", "Enhancing contrast", "Preparing structured record"];

function ScannerPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>("idle");
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function fetchProfile() {
      if (!user) return;
      const { data } = await supabase.from("profiles").select("id").eq("auth_user_id", user.id).maybeSingle();
      if (data) setProfileId(data.id);
    }
    fetchProfile();
  }, [user]);

  const onPick = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setSelectedFile(file);
    setPreview(URL.createObjectURL(file));
    setPhase("preview");
  };

  const startScan = async () => {
    if (!selectedFile) return;
    if (!user || !profileId) {
      toast.error("Please wait or sign in to scan documents.");
      return;
    }
    setPhase("scanning");
    setProgress(0);
    
    const timer = setInterval(() => {
      setProgress((prev) => {
        const next = prev + 8;
        if (next >= 90) return 90;
        return next;
      });
    }, 120);

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("profile_id", profileId);

    try {
      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:8000";
      const response = await fetch(`${apiUrl}/documents/upload`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed with status ${response.status}`);
      }
      
      clearInterval(timer);
      setProgress(100);
      toast.success("Document scanned and sent for analysis!");
      
      setTimeout(() => {
        navigate({ to: "/dashboard/documents" });
      }, 600);

    } catch (err) {
      console.error("Scan error:", err);
      toast.error("Failed to upload scan. Please try again.");
      clearInterval(timer);
      setPhase("preview");
      setProgress(0);
    }
  };

  const reset = () => {
    setPhase("idle");
    setPreview(null);
    setProgress(0);
    setFileName("");
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Report Scanner"
        description="Capture a report with your camera or upload an existing image."
        icon={ScanLine}
        actions={
          phase !== "idle" ? (
            <Button variant="outline" className="rounded-xl" onClick={reset}>
              <RotateCcw className="size-4" aria-hidden /> Start over
            </Button>
          ) : null
        }
      />

      <input ref={inputRef} type="file" accept="image/*,.pdf" className="sr-only" onChange={onPick} aria-label="Upload a report image" />
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="sr-only" onChange={onPick} aria-label="Capture a report with the camera" />

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <Widget title="Capture area" icon={FileScan} delay={0}>
          <div className="relative aspect-4/3 overflow-hidden rounded-2xl border border-border bg-surface">
            {preview ? (
              <img src={preview} alt={`Preview of ${fileName}`} className="size-full object-contain" />
            ) : (
              <div className="grid size-full place-items-center px-6 text-center">
                <div>
                  <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-accent text-accent-foreground">
                    <Camera className="size-7" aria-hidden />
                  </span>
                  <p className="mt-4 font-display text-base font-semibold text-foreground">No report selected</p>
                  <p className="mt-1 text-sm text-muted-foreground">Use your camera or pick an image to begin.</p>
                </div>
              </div>
            )}

            {/* Corner guides */}
            <span className="pointer-events-none absolute inset-5 rounded-xl border-2 border-dashed border-primary/40" aria-hidden />

            <AnimatePresence>
              {phase === "scanning" ? (
                <motion.span
                  key="beam"
                  initial={{ top: "0%" }}
                  animate={{ top: ["0%", "100%", "0%"] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  className="pointer-events-none absolute inset-x-0 h-1 bg-teal shadow-glow"
                  aria-hidden
                />
              ) : null}
            </AnimatePresence>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button className="rounded-xl" onClick={() => cameraRef.current?.click()}>
              <Camera className="size-4" aria-hidden /> Use camera
            </Button>
            <Button variant="outline" className="rounded-xl" onClick={() => inputRef.current?.click()}>
              <ImagePlus className="size-4" aria-hidden /> Upload image
            </Button>
            <Button
              variant="secondary"
              className="rounded-xl"
              disabled={phase !== "preview"}
              onClick={startScan}
            >
              <ScanLine className="size-4" aria-hidden /> Scan Report
            </Button>
          </div>

          {phase === "scanning" ? (
            <div className="mt-6 rounded-2xl border border-border bg-surface p-4">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{scanSteps[Math.min(Math.floor(progress / 25), scanSteps.length - 1)]}…</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="mt-2 h-2" />
            </div>
          ) : null}
        </Widget>

        <Widget title="Scan guidance" icon={Sparkles} delay={0.08}>
          <ul className="space-y-3 text-sm text-muted-foreground">
            {[
              "Lay the report flat on a dark, non-reflective surface.",
              "Fill the frame edge to edge — avoid cropping values.",
              "Use even lighting; avoid direct flash on glossy paper.",
              "Scan multi-page reports one page at a time.",
            ].map((tip) => (
              <li key={tip} className="flex gap-3">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                {tip}
              </li>
            ))}
          </ul>
        </Widget>
      </div>

      <AnimatePresence>
      </AnimatePresence>
    </div>
  );
}
