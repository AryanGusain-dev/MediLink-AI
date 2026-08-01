import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState, type ChangeEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Camera, FileScan, ImagePlus, RotateCcw, ScanLine, Sparkles } from "lucide-react";
import { PageHeader, StatusBadge } from "@/components/shared/page-header";
import { Widget } from "@/components/shared/widget";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

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
  const [phase, setPhase] = useState<Phase>("idle");
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [progress, setProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const onPick = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setPreview(URL.createObjectURL(file));
    setPhase("preview");
  };

  const startScan = () => {
    setPhase("scanning");
    setProgress(0);
    const timer = setInterval(() => {
      setProgress((prev) => {
        const next = prev + 8;
        if (next >= 100) {
          clearInterval(timer);
          setTimeout(() => setPhase("result"), 400);
          return 100;
        }
        return next;
      });
    }, 120);
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
          <div className="mt-6 rounded-xl border border-warning/30 bg-warning/10 p-4">
            <p className="text-xs font-semibold text-warning">Analysis in development</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Automated extraction is not active yet. Scans are captured and filed, not interpreted.
            </p>
          </div>
        </Widget>
      </div>

      <AnimatePresence>
        {phase === "result" ? (
          <motion.section
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="overflow-hidden rounded-3xl border border-border bg-card shadow-soft"
          >
            <div className="gradient-brand grid place-items-center px-6 py-10">
              <span className="grid size-20 place-items-center rounded-3xl bg-card/95 shadow-lift">
                <FileScan className="size-9 text-primary" aria-hidden />
              </span>
            </div>
            <div className="space-y-8 p-6 sm:p-10">
              <StatusBadge tone="warning">Feature Under Development</StatusBadge>
              <h2 className="font-display text-2xl font-bold text-foreground">Medical Report Analysis</h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                This feature is currently under development. Future versions of MediLink AI will automatically:
              </p>
              <ul className="grid gap-3 sm:grid-cols-2">
                {[
                  "Extract medical information",
                  "Detect important values",
                  "Convert reports into structured FHIR resources",
                  "Organize health records",
                  "Enable AI-powered medical insights",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="mt-2 size-1.5 shrink-0 rounded-full bg-teal" aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>
              <p className="text-sm font-medium text-primary">Thank you for supporting MediLink AI.</p>
              <div className="flex flex-wrap gap-2">
                <Button className="rounded-xl" onClick={reset}>
                  Scan another report
                </Button>
              </div>
            </div>
          </motion.section>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
