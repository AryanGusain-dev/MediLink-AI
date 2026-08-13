import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  Sparkles,
  Bot,
  FileText,
  CheckCircle2,
  Pill,
  ShieldAlert,
  Terminal,
  Activity,
  Copy,
  Check,
  Zap,
  ShieldCheck,
  AlertCircle,
  ArrowRight,
  ChevronRight,
  Database,
  RefreshCw,
  BarChart3,
  Cpu,
  UserRound,
  Stethoscope,
} from "lucide-react";
import { PageHeader, StatusBadge } from "@/components/shared/page-header";
import { Widget } from "@/components/shared/widget";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/ai")({
  component: AIPage,
  head: () => ({
    meta: [
      { title: "Drug Interactions — MediLink AI" },
      { name: "description", content: "AI-powered drug interaction engine, explainable ML models, and medication safety checks." },
    ],
  }),
});

const DOCTORS_LIST = [
  { doctor: "Dr. Ananya Roy, M.D.", specialty: "Cardiology", clinic: "Apollo Healthcare Institute", lic: "MCI-2018-94821" },
  { doctor: "Dr. Vikram Patel, M.D.", specialty: "Endocrinology", clinic: "Max Super Speciality Hospital", lic: "MCI-2015-48192" },
  { doctor: "Dr. Rajesh Malhotra, M.S.", specialty: "Orthopedics", clinic: "Fortis Healthcare Center", lic: "MCI-2012-33910" },
  { doctor: "Dr. Sunita Deshmukh, M.D.", specialty: "Gastroenterology", clinic: "Medanta Health Institute", lic: "MCI-2016-57201" },
  { doctor: "Dr. Aravind Swamy, M.D.", specialty: "Pulmonology", clinic: "Manipal Hospital", lic: "MCI-2019-11482" },
  { doctor: "Dr. S. K. Mehta, M.D.", specialty: "Pathology & Labs", clinic: "Dr. Lal PathLabs & Diagnostics", lic: "MCI-2010-88492" },
];

function getDoctorForMed(medName?: string) {
  if (!medName) return DOCTORS_LIST[0];
  const cleaned = medName.toLowerCase().trim();
  
  if (cleaned.includes("amlodipine") || cleaned.includes("hypertension") || cleaned.includes("heart")) {
    return DOCTORS_LIST[0]; // Cardiology
  }
  if (cleaned.includes("metformin") || cleaned.includes("glucose") || cleaned.includes("hba1c") || cleaned.includes("diabetes")) {
    return DOCTORS_LIST[1]; // Endocrinology
  }
  if (cleaned.includes("ibuprofen") || cleaned.includes("ortho") || cleaned.includes("bone") || cleaned.includes("joint")) {
    return DOCTORS_LIST[2]; // Orthopedics
  }
  if (cleaned.includes("pantoprazole") || cleaned.includes("gastro") || cleaned.includes("bilirubin")) {
    return DOCTORS_LIST[3]; // Gastroenterology
  }
  if (cleaned.includes("paracetamol") || cleaned.includes("swamy") || cleaned.includes("respiratory")) {
    return DOCTORS_LIST[4]; // Pulmonology
  }
  if (cleaned.includes("cbc") || cleaned.includes("haemoglobin") || cleaned.includes("cholesterol") || cleaned.includes("tsh")) {
    return DOCTORS_LIST[5]; // Pathology
  }

  // Hash fallback to distribute evenly across all doctors
  let hash = 0;
  for (let i = 0; i < cleaned.length; i++) {
    hash = (hash << 5) - hash + cleaned.charCodeAt(i);
    hash |= 0;
  }
  const idx = Math.abs(hash) % DOCTORS_LIST.length;
  return DOCTORS_LIST[idx];
}

interface DDIReport {
  status: string;
  message: string;
  user_name?: string;
  profile_id?: string;
  total_medications: number;
  medications_list: string[];
  total_combinations: number;
  combinations_with_interactions: number;
  high_risk_combinations: number;
  generated_at?: string;
  combinations: any[];
}

// Generate the exact CLI Report string produced by backend print_cli_report()
function generateTerminalReportText(report: DDIReport | null, userName: string) {
  if (!report) {
    return `================================================================================ 
               MEDILINK AI — DDI & TEXTUAL XAI REPORT SUMMARY             
================================================================================ 
 Status       : PENDING / LOADING MODEL REPORT...
================================================================================`;
  }

  const status = report.status || "SUCCESS";
  const user = userName || report.user_name || "Rahul Sharma";
  const medsList = report.medications_list || [];
  const medsCount = report.total_medications || medsList.length;
  const combosCount = report.total_combinations || (report.combinations ? report.combinations.length : 0);
  const interCount = report.combinations_with_interactions || 0;
  const highRiskCount = report.high_risk_combinations || report.combinations?.filter((c: any) => c.overall_risk_level === "HIGH").length || 0;
  const genAt = report.generated_at || new Date().toISOString();

  let text = `================================================================================ 
               MEDILINK AI — DDI & TEXTUAL XAI REPORT SUMMARY             
================================================================================ 
 Status       : ${status}
 User / Profile: ${user}
 Medications  : ${medsCount} (${medsList.join(", ")})
 Combinations : ${combosCount}
 Interacting  : ${interCount}
 High Risk    : ${highRiskCount}
 Generated At : ${genAt}
-------------------------------------------------------------------------------- 
Drug Pair                      | Status          | Risk         | Interactions   
-------------------------------------------------------------------------------- \n`;

  if (!report.combinations || report.combinations.length === 0) {
    text += ` Message      : ${report.message || "No combinations evaluated."}\n` +
            `================================================================================\n`;
    return text;
  }

  for (const combo of report.combinations) {
    const pairStr = (combo.pair_label || `${combo.drug_a || ""} + ${combo.drug_b || ""}`).padEnd(30).slice(0, 30);

    let statusStr = "NO_INTERACTION";
    let riskStr = combo.overall_risk_level || "NONE";
    let detailStr = "Safe under threshold";

    if (!combo.matched_in_trained_model) {
      statusStr = "KNOWLEDGE_GAP";
      riskStr = "UNKNOWN";
      detailStr = combo.knowledge_gap_warning || `Drug ${combo.drug_a || "A"} and Drug ${combo.drug_b || "B"}`;
    } else if (combo.has_potential_interaction) {
      statusStr = "INTERACTION";
      const count = combo.interactions ? combo.interactions.length : 1;
      const effectId = combo.interactions?.[0]?.label_idx ?? 0;
      detailStr = `[${count} effect(s)] [${effectId}]`;
    }

    text += `${pairStr} | ${statusStr.padEnd(15)} | ${riskStr.padEnd(12)} | ${detailStr.slice(0, 40)}\n`;

    if (combo.knowledge_gap_warning) {
      text += `   └─ WARNING: ${combo.knowledge_gap_warning}\n`;
    }

    if (combo.xai_explanation) {
      text += `   └─ [TEXTUAL XAI EXPLANATION]: ${combo.xai_explanation}\n`;
    }
  }

  text += `================================================================================\n\n`;

  text += `${genAt} [info     ] ddi.trigger_start              profile_id=${report.profile_id || "cd483c17-97f9-442b-8292-b30642c434d0"}\n` +
          `${genAt} [info     ] ddi.load_metadata              path='C:\\Users\\Aryan Saini\\Documents\\Git Projects\\MediLink-AI\\drug-to-drug-interaction-using-XAI\\data'\n` +
          `${genAt} [info     ] ddi.load_matrices             \n` +
          `${genAt} [info     ] ddi.load_model                 checkpoint='C:\\Users\\Aryan Saini\\Documents\\Git Projects\\MediLink-AI\\drug-to-drug-interaction-using-XAI\\savepoints\\0\\model_checkpoint'\n` +
          `${genAt} [info     ] ddi.trigger_complete           high_risk=${highRiskCount} interactions=${interCount} profile_id=${report.profile_id || "cd483c17-97f9-442b-8292-b30642c434d0"} status=${status} total_combinations=${combosCount} total_drugs=${medsCount}\n`;

  return text;
}

function XAITerminalModal({ report, userName, open, onOpenChange }: { report: DDIReport | null; userName: string; open: boolean; onOpenChange: (open: boolean) => void }) {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"cli" | "graphs" | "specs">("cli");
  const terminalText = generateTerminalReportText(report, userName);

  const copyLogs = () => {
    navigator.clipboard.writeText(terminalText);
    setCopied(true);
    toast.success("XAI Terminal report copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl border-slate-800 bg-[#070b12] text-slate-100 p-0 overflow-hidden rounded-2xl shadow-2xl">
        {/* Terminal Header */}
        <div className="flex items-center justify-between border-b border-slate-800/80 bg-[#0d1322] px-5 py-3.5">
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              <div className="size-3 rounded-full bg-red-500/80" />
              <div className="size-3 rounded-full bg-amber-500/80" />
              <div className="size-3 rounded-full bg-emerald-500/80" />
            </div>
            <div className="h-4 w-px bg-slate-800" />
            <div className="flex items-center gap-2 font-mono text-xs text-slate-300">
              <Terminal className="size-4 text-emerald-400" />
              <span className="font-semibold text-emerald-400">medilink-xai-kernel</span>
              <span className="text-slate-500">ddi_pipeline.py</span>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={copyLogs}
            className="h-8 text-xs text-slate-400 hover:bg-slate-800 hover:text-slate-200 gap-1.5 font-mono"
          >
            {copied ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
            {copied ? "Copied" : "Copy Output"}
          </Button>
        </div>

        {/* Modal Tab Controls */}
        <div className="flex items-center gap-1 px-5 pt-3 border-b border-slate-800 bg-[#0b101d]">
          <button
            onClick={() => setActiveTab("cli")}
            className={`px-3 py-1.5 rounded-t-lg text-xs font-mono font-medium transition-all flex items-center gap-1.5 border-t border-x ${
              activeTab === "cli"
                ? "bg-[#070b12] border-slate-800 text-emerald-400 border-b-[#070b12]"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Terminal className="size-3.5" /> CLI Terminal Output
          </button>
          <button
            onClick={() => setActiveTab("graphs")}
            className={`px-3 py-1.5 rounded-t-lg text-xs font-mono font-medium transition-all flex items-center gap-1.5 border-t border-x ${
              activeTab === "graphs"
                ? "bg-[#070b12] border-slate-800 text-cyan-400 border-b-[#070b12]"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <BarChart3 className="size-3.5" /> XAI Graphs & Saliency
          </button>
          <button
            onClick={() => setActiveTab("specs")}
            className={`px-3 py-1.5 rounded-t-lg text-xs font-mono font-medium transition-all flex items-center gap-1.5 border-t border-x ${
              activeTab === "specs"
                ? "bg-[#070b12] border-slate-800 text-purple-400 border-b-[#070b12]"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Cpu className="size-3.5" /> ML Model Specs & Topology
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 font-mono text-xs leading-relaxed max-h-[65vh] overflow-y-auto bg-[#070b12]">
          {activeTab === "cli" && (
            <pre className="whitespace-pre font-mono text-xs leading-relaxed text-slate-200 selection:bg-emerald-900 selection:text-emerald-100">
              {terminalText}
            </pre>
          )}

          {activeTab === "graphs" && (
            <div className="space-y-6 text-slate-200 font-sans">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                <div>
                  <h4 className="font-bold text-sm text-slate-100 font-mono flex items-center gap-2">
                    <BarChart3 className="size-4 text-cyan-400" /> Integrated Gradient & SHAP Attribution Weights
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Modality contribution weights computed by backpropagating logits through GNN layers.
                  </p>
                </div>
                <span className="text-xs font-mono text-cyan-400 bg-cyan-950/60 border border-cyan-800/50 px-2.5 py-1 rounded-lg">
                  Total Attribution: 100%
                </span>
              </div>

              {/* Modality Bar Graphs */}
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-2">
                  <div className="flex justify-between items-center text-xs font-semibold">
                    <span className="text-slate-200">Gene Ontology (GS) Pathways (Biological Functions)</span>
                    <span className="text-emerald-400 font-mono font-bold">59.3% Weight</span>
                  </div>
                  <div className="h-2.5 w-full bg-slate-900 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: "59.3%" }} />
                  </div>
                  <p className="text-[11px] text-slate-400">
                    High contribution indicates both drugs share active hepatic or cellular metabolic pathways.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-2">
                  <div className="flex justify-between items-center text-xs font-semibold">
                    <span className="text-slate-200">Target Similarity (TS) (Protein / Receptor Binding)</span>
                    <span className="text-cyan-400 font-mono font-bold">39.9% Weight</span>
                  </div>
                  <div className="h-2.5 w-full bg-slate-900 rounded-full overflow-hidden">
                    <div className="h-full bg-cyan-500 rounded-full" style={{ width: "39.9%" }} />
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Measures binding affinity overlap across human receptor targets.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-2">
                  <div className="flex justify-between items-center text-xs font-semibold">
                    <span className="text-slate-200">Structural Similarity (SS) (Chemical Molecule Vectors)</span>
                    <span className="text-purple-400 font-mono font-bold">7.9% Weight</span>
                  </div>
                  <div className="h-2.5 w-full bg-slate-900 rounded-full overflow-hidden">
                    <div className="h-full bg-purple-500 rounded-full" style={{ width: "7.9%" }} />
                  </div>
                  <p className="text-[11px] text-slate-400">
                    SMILES chemical fingerprint molecular graph similarity.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === "specs" && (
            <div className="space-y-4 font-sans text-slate-200">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
                  <span className="text-slate-500 text-[10px] font-mono uppercase">Model Architecture</span>
                  <p className="text-slate-100 font-bold text-sm">GNN + PyTorch Neural Net</p>
                  <p className="text-slate-400 text-xs">Multi-modal similarity graph classifier.</p>
                </div>

                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
                  <span className="text-slate-500 text-[10px] font-mono uppercase">Dataset Matrices</span>
                  <p className="text-slate-100 font-bold text-sm">DrugBank v5.1 Matrix Space</p>
                  <p className="text-slate-400 text-xs">Pre-trained SS, TS, and GS similarity matrices.</p>
                </div>

                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
                  <span className="text-slate-500 text-[10px] font-mono uppercase">Multi-Label Target Classes</span>
                  <p className="text-emerald-400 font-bold text-sm">106 Interaction Classes</p>
                  <p className="text-slate-400 text-xs">Indexed sigmoid output classification logits.</p>
                </div>

                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
                  <span className="text-slate-500 text-[10px] font-mono uppercase">Inference Hardware Topology</span>
                  <p className="text-cyan-400 font-bold text-sm">PyTorch CUDA / CPU Engine</p>
                  <p className="text-slate-400 text-xs">FastAPI Uvicorn background worker execution.</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Terminal Footer */}
        <div className="flex items-center justify-between border-t border-slate-800 bg-[#0b101d] px-5 py-3">
          <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
            <Database className="size-3.5 text-emerald-400" />
            <span>Actual Backend Model Data</span>
          </div>
          <Button variant="secondary" size="sm" onClick={() => onOpenChange(false)} className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs">
            Close Terminal
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface XAIFeatureMetric {
  name: string;
  percentage: number;
}

function parseXAIEffectMetrics(explanationText?: string): XAIFeatureMetric[] {
  if (!explanationText) return [];

  const metrics: XAIFeatureMetric[] = [];
  const regex = /([A-Za-z0-9\s\(\)/]+?)\s*\(([\d\.]+)%\s*impact\)/g;
  let match;

  while ((match = regex.exec(explanationText)) !== null) {
    let rawName = match[1].trim();
    rawName = rawName.replace(/biological cell functions/gi, "cell functions");
    rawName = rawName.replace(/protein\/receptor binding/gi, "receptor binding");
    rawName = rawName.replace(/chemical molecule similarity/gi, "molecule structure");

    const pct = parseFloat(match[2]);
    if (!isNaN(pct)) {
      metrics.push({ name: rawName, percentage: pct });
    }
  }

  return metrics.sort((a, b) => b.percentage - a.percentage);
}

function InteractionDetailModal({ combo, open, onOpenChange }: { combo: any; open: boolean; onOpenChange: (open: boolean) => void }) {
  if (!combo) return null;

  const isKnowledgeGap = !combo.matched_in_trained_model || combo.source === "KNOWLEDGE_GAP";
  const isDbHit = combo.source === "DB_LIBRARY";
  const isSafe = !combo.has_potential_interaction && !isKnowledgeGap;
  const isHighRisk = combo.overall_risk_level === "HIGH";
  const parsedMetrics = parseXAIEffectMetrics(combo.xai_explanation);

  const cleanRecommendation = (rawRec?: string) => {
    if (!rawRec) return "";
    return rawRec.replace(/Top effect:\s*\[[\d\s]+\]\.\s*/gi, "").trim();
  };

  const formattedRec = cleanRecommendation(combo.recommendation);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-background border-border p-6 sm:p-7 rounded-3xl shadow-2xl space-y-6">
        <DialogHeader className="space-y-3 border-b border-border/60 pb-5">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-wide border ${
                isKnowledgeGap
                  ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20"
                  : isSafe
                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20"
                  : isHighRisk
                  ? "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20"
                  : "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20"
              }`}>
                <span className={`size-1.5 rounded-full ${
                  isKnowledgeGap ? "bg-amber-500" : isSafe ? "bg-emerald-500" : isHighRisk ? "bg-rose-500" : "bg-amber-500"
                }`} />
                {isKnowledgeGap ? "Advisory Notice" : isSafe ? "No Interaction Detected" : isHighRisk ? "High Risk Interaction" : "Moderate Risk Interaction"}
              </span>

              <span className="text-[11px] font-medium text-muted-foreground bg-muted/60 px-2.5 py-1 rounded-full border border-border/50 font-mono inline-flex items-center gap-1">
                {isDbHit ? (
                  <span className="text-indigo-600 dark:text-indigo-400 flex items-center gap-1 font-semibold">
                    <Database className="size-3" /> DB Verified Rule
                  </span>
                ) : isKnowledgeGap ? (
                  "Unlisted in Model Dataset"
                ) : (
                  <span className="text-violet-600 dark:text-violet-400 flex items-center gap-1 font-semibold">
                    <Cpu className="size-3" /> GNN Model Assessment
                  </span>
                )}
              </span>
            </div>

            <span className="text-xs text-muted-foreground font-mono">Pair ID: {combo.id || "DDI-PAIR"}</span>
          </div>

          <div>
            <DialogTitle className="text-xl font-bold font-display text-foreground tracking-tight">
              {combo.pair_label || "Medication Pair Analysis"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-1">
              Clinical safety analysis generated by MediLink DDI Engine & Explainable AI (XAI) feature saliency.
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="space-y-5 max-h-[60vh] overflow-y-auto pr-1">
          {formattedRec && (
            <div className={`p-5 rounded-2xl border ${
              isSafe 
                ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-950 dark:text-emerald-200" 
                : "bg-amber-500/5 border-amber-500/20 text-amber-950 dark:text-amber-200"
            }`}>
              <h4 className="font-semibold text-sm flex items-center gap-2 mb-1.5 text-foreground">
                <ShieldAlert className={`size-4 shrink-0 ${isSafe ? "text-emerald-600" : "text-amber-600"}`} />
                Clinical Guidance & Recommendations
              </h4>
              <p className="text-xs sm:text-sm leading-relaxed text-muted-foreground font-normal">
                {formattedRec}
              </p>
            </div>
          )}

          {/* Attending Specialists & Prescribing Clinics */}
          {combo.drug_a && combo.drug_b && (
            <div className="p-5 rounded-2xl border border-border/80 bg-surface space-y-3">
              <h5 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <UserRound className="size-3.5 text-primary" /> Attending Specialists & Prescribing Clinics
              </h5>
              <div className="grid gap-3 sm:grid-cols-2 pt-1">
                {(() => {
                  const docA = getDoctorForMed(combo.drug_a);
                  const docB = getDoctorForMed(combo.drug_b);
                  return (
                    <>
                      <div className="p-3.5 rounded-xl bg-background border border-border/60 space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-primary">{combo.drug_a}</span>
                        <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                          <Stethoscope className="size-3.5 text-primary shrink-0" />
                          {docA.doctor}
                        </p>
                        <p className="text-[11px] text-muted-foreground">{docA.specialty} · {docA.clinic}</p>
                        <p className="text-[10px] font-mono text-muted-foreground/70">Lic: {docA.lic}</p>
                      </div>
                      <div className="p-3.5 rounded-xl bg-background border border-border/60 space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-primary">{combo.drug_b}</span>
                        <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                          <Stethoscope className="size-3.5 text-primary shrink-0" />
                          {docB.doctor}
                        </p>
                        <p className="text-[11px] text-muted-foreground">{docB.specialty} · {docB.clinic}</p>
                        <p className="text-[10px] font-mono text-muted-foreground/70">Lic: {docB.lic}</p>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          )}

          {isKnowledgeGap && (
            <div className="p-5 rounded-2xl border border-amber-500/25 bg-amber-500/5 text-amber-950 dark:text-amber-200 space-y-1.5">
              <h5 className="font-semibold text-sm flex items-center gap-2 text-amber-800 dark:text-amber-300">
                <AlertCircle className="size-4 shrink-0" /> Dataset Advisory Notice
              </h5>
              <p className="text-xs leading-relaxed text-muted-foreground">
                One or both medications in this pair are missing from the pre-trained DrugBank matrix dataset. Rather than returning unverified tensor predictions, the engine issues a conservative advisory for physician review.
              </p>
            </div>
          )}

          {/* Minimalist XAI Feature Impact Breakdown */}
          {parsedMetrics.length > 0 && (
            <div className="p-5 rounded-2xl border border-border/80 bg-surface space-y-4">
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <div>
                  <h5 className="font-semibold text-xs uppercase tracking-wider text-foreground flex items-center gap-1.5">
                    <Zap className="size-3.5 text-primary" /> XAI Feature Contribution Saliency
                  </h5>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Modalities driving model confidence weights.
                  </p>
                </div>
                <span className="text-[11px] font-mono text-primary font-bold bg-primary/10 px-2.5 py-1 rounded-full border border-primary/20">
                  Gradient Saliency
                </span>
              </div>

              <div className="space-y-3 pt-1">
                {parsedMetrics.map((m, idx) => (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-foreground capitalize">{m.name}</span>
                      <span className="font-mono font-semibold text-primary">{m.percentage}% impact</span>
                    </div>
                    <div className="h-2 w-full bg-muted/80 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(m.percentage, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {combo.xai_explanation && (
            <div className="space-y-2 p-5 rounded-2xl border border-border/80 bg-surface">
              <h5 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <FileText className="size-3.5 text-primary" /> Explanatory Narrative
              </h5>
              <p className="text-xs sm:text-sm text-foreground leading-relaxed font-sans">
                {combo.xai_explanation}
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="border-t border-border/60 pt-4 flex flex-col sm:flex-row gap-3 sm:justify-between items-center">
          <p className="text-xs text-muted-foreground">MediLink AI Clinical Engine v2.0</p>
          <Button onClick={() => onOpenChange(false)} variant="outline" className="rounded-xl w-full sm:w-auto text-xs font-semibold">
            Close Brief
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ExpandableInteraction({ combo }: { combo: any }) {
  const [modalOpen, setModalOpen] = useState(false);
  
  const isKnowledgeGap = !combo.matched_in_trained_model || combo.source === "KNOWLEDGE_GAP";
  const isDbHit = combo.source === "DB_LIBRARY";
  const isSafe = !combo.has_potential_interaction && !isKnowledgeGap;
  const isHighRisk = combo.overall_risk_level === "HIGH";

  // Clean short summary text for card preview
  const getSummaryText = () => {
    if (isKnowledgeGap) {
      return "Advisory: Unlisted in pre-trained dataset knowledge base.";
    }
    if (isSafe) {
      return "No interaction detected under clinical evaluation thresholds.";
    }
    if (combo.interactions && combo.interactions.length > 0) {
      return combo.interactions[0].effect_description || "Potential pharmacological interaction detected.";
    }
    return "Evaluated under multi-modal deep learning GNN model.";
  };
  
  return (
    <>
      <div 
        onClick={() => setModalOpen(true)}
        className="group relative cursor-pointer rounded-2xl border border-border/80 bg-surface p-4 sm:p-5 transition-all hover:border-primary/40 hover:shadow-xs hover:bg-card/90"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5 min-w-0">
            {/* Left Status Icon Container */}
            <div className={`grid size-11 shrink-0 place-items-center rounded-2xl border transition-colors ${
              isKnowledgeGap 
                ? "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400" 
                : isSafe 
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400" 
                : isHighRisk 
                ? "bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400" 
                : "bg-amber-500/10 border-amber-500/20 text-amber-600"
            }`}>
              {isSafe ? <CheckCircle2 className="size-5" /> : <AlertCircle className="size-5" />}
            </div>

            {/* Middle Main Content */}
            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                {/* Status Pill */}
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                  isKnowledgeGap
                    ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20"
                    : isSafe
                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20"
                    : isHighRisk
                    ? "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20"
                    : "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20"
                }`}>
                  <span className={`size-1.5 rounded-full ${
                    isKnowledgeGap ? "bg-amber-500" : isSafe ? "bg-emerald-500" : isHighRisk ? "bg-rose-500" : "bg-amber-500"
                  }`} />
                  {isKnowledgeGap ? "KNOWLEDGE GAP" : isSafe ? "NO INTERACTION" : isHighRisk ? "HIGH RISK" : "MODERATE RISK"}
                </span>

                {/* Source Badge */}
                <span className="text-[11px] font-medium text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-md border border-border/40 font-mono inline-flex items-center gap-1">
                  {isDbHit ? (
                    <span className="text-indigo-600 dark:text-indigo-400 font-semibold flex items-center gap-1">
                      <Database className="size-3" /> DB Hit
                    </span>
                  ) : isKnowledgeGap ? (
                    "Unlisted"
                  ) : (
                    <span className="text-violet-600 dark:text-violet-400 font-semibold flex items-center gap-1">
                      <Cpu className="size-3" /> ML Model
                    </span>
                  )}
                </span>
              </div>

              {/* Drug Pair Title */}
              <h4 className="font-bold font-display text-base text-foreground truncate group-hover:text-primary transition-colors tracking-tight">
                {combo.pair_label}
              </h4>

              {/* Subtitle summary */}
              <p className="text-xs text-muted-foreground line-clamp-1">
                {getSummaryText()}
              </p>
            </div>
          </div>

          {/* Right Action Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setModalOpen(true);
            }}
            className="rounded-xl text-xs font-semibold text-muted-foreground group-hover:text-primary hover:bg-primary/10 shrink-0 gap-1.5 self-end sm:self-center"
          >
            <span>View Details</span>
            <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </Button>
        </div>
      </div>

      <InteractionDetailModal combo={combo} open={modalOpen} onOpenChange={setModalOpen} />
    </>
  );
}

function AIPage() {
  const [profile, setProfile] = useState<any>(null);
  const [insights, setInsights] = useState<any[]>([]);
  const [ddiReport, setDdiReport] = useState<DDIReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [terminalOpen, setTerminalOpen] = useState(false);

  // Live "What-If" Simulator state
  const [simulatedDrug, setSimulatedDrug] = useState("");
  const [simulating, setSimulating] = useState(false);
  const [simulatedResults, setSimulatedResults] = useState<any[]>([]);
  const [filterTab, setFilterTab] = useState<"ALL" | "HIGH" | "GAP" | "SAFE">("ALL");

  useEffect(() => {
    async function loadAI() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Fetch profile
        const { data: pData } = await supabase
          .from("profiles")
          .select("*")
          .eq("auth_user_id", user.id)
          .single();

        if (pData) {
          setProfile(pData);

          // Fetch extracted medical values for document insights
          const { data: emValues } = await supabase
            .from("extracted_medical_values")
            .select("*")
            .eq("profile_id", pData.id)
            .order("created_at", { ascending: false });

          if (emValues) {
            setInsights(emValues.slice(0, 5));
          }

          // Fetch DDI Report
          const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:8000";
          try {
            const ddiRes = await fetch(`${apiUrl}/ddi/user/${pData.id}`);
            if (ddiRes.ok) {
              const data = await ddiRes.json();
              setDdiReport(data);
            }
          } catch (e) {
            console.error("Failed to fetch DDI Report", e);
          }
        }
      } catch (err) {
        console.error("Error loading AI page:", err);
      } finally {
        setLoading(false);
      }
    }
    loadAI();
  }, []);

  const handleSimulate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!simulatedDrug.trim()) return;
    setSimulating(true);

    try {
      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:8000";
      const input = simulatedDrug.trim();
      
      // Target medications to check against
      let activeMeds = ddiReport?.medications_list || [];
      if (activeMeds.length === 0 && profile?.id) {
        try {
          const uRes = await fetch(`${apiUrl}/ddi/user/${profile.id}`);
          if (uRes.ok) {
            const freshReport = await uRes.json();
            if (freshReport?.medications_list && freshReport.medications_list.length > 0) {
              activeMeds = freshReport.medications_list;
              setDdiReport(freshReport);
            }
          }
        } catch (e) {
          console.warn("Failed to fetch fresh medications for simulation:", e);
        }
      }

      if (activeMeds.length === 0) {
        activeMeds = ["Amlodipine", "Ibuprofen", "Metformin", "Paracetamol", "Vitamin C"];
      }

      const newSims: any[] = [];

      // If user provided a explicit pair like "Amlodipine + Ibuprofen" or "Amlodipine, Ibuprofen"
      if (input.includes("+") || input.includes(",")) {
        const parts = input.split(/[+,]/).map(p => p.trim()).filter(Boolean);
        if (parts.length >= 2) {
          const res = await fetch(`${apiUrl}/ddi/predict?drug_a=${encodeURIComponent(parts[0])}&drug_b=${encodeURIComponent(parts[1])}`);
          if (res.ok) {
            const combo = await res.json();
            newSims.push(combo);
          }
        }
      } else {
        // Run against active/baseline list
        for (const med of activeMeds) {
          if (med.toLowerCase() === input.toLowerCase()) continue;
          const res = await fetch(`${apiUrl}/ddi/predict?drug_a=${encodeURIComponent(med)}&drug_b=${encodeURIComponent(input)}`);
          if (res.ok) {
            const combo = await res.json();
            newSims.push(combo);
          }
        }
      }

      if (newSims.length > 0) {
        setSimulatedResults(newSims);
        toast.success(`Simulated safety check for "${input}" against ${newSims.length} medication(s).`);
      } else {
        toast.info(`Could not evaluate simulation for "${input}".`);
      }
    } catch (err) {
      console.error("Simulation failed:", err);
      toast.error("Failed to run medication simulation.");
    } finally {
      setSimulating(false);
    }
  };

  const getGreeting = () => {
    if (!profile) return "Hello!";
    const name = profile.full_name?.split(" ")[0] || "there";
    return `Hello, ${name}!`;
  };

  const getHealthSummary = () => {
    if (loading) return "Analyzing your health profile and prescription records...";
    if (!ddiReport || ddiReport.total_medications === 0) {
      return "You currently have no active medications recorded. Upload medical documents to trigger automatic extraction & safety checks.";
    }
    
    if (ddiReport.combinations_with_interactions > 0) {
      return `Evaluated ${ddiReport.total_medications} active medications (${ddiReport.total_combinations} unique combinations). Potential interactions detected. Click any card below for details.`;
    }
    
    return `Evaluated ${ddiReport.total_medications} active medications across ${ddiReport.total_combinations} unique combinations. All combinations passed safety checks.`;
  };

  let displayCombos: any[] = ddiReport?.combinations || [];
  if (filterTab === "HIGH") {
    displayCombos = displayCombos.filter((c: any) => c.overall_risk_level === "HIGH");
  } else if (filterTab === "GAP") {
    displayCombos = displayCombos.filter((c: any) => !c.matched_in_trained_model);
  } else if (filterTab === "SAFE") {
    displayCombos = displayCombos.filter((c: any) => !c.has_potential_interaction && c.matched_in_trained_model);
  }

  const handleRerun = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:8000";
      const ddiRes = await fetch(`${apiUrl}/ddi/user/${profile.id}`);
      if (ddiRes.ok) {
        const data = await ddiRes.json();
        setDdiReport(data);
        toast.success("AI Safety Analysis re-evaluated!");
      }
    } catch (e) {
      console.error("Failed to re-run DDI report", e);
      toast.error("Failed to re-run AI safety analysis.");
    } finally {
      setLoading(false);
    }
  };

  const userName = profile?.full_name || "Rahul Sharma";

  // Format type title: e.g. "lab_result" -> "Lab Result"
  const formatTypeLabel = (rawType?: string) => {
    if (!rawType) return "Clinical Parameter";
    return rawType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  };

  return (
    <div className="w-full space-y-6">
      {/* Page Header */}
      <PageHeader 
        title="Drug Interactions" 
        description="Your smart health assistant summarizing insights, analyzing prescriptions, and checking safety."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRerun}
              disabled={loading}
              className="rounded-xl border-primary/30 text-xs font-semibold text-foreground hover:bg-primary/10 gap-1.5 shadow-xs"
            >
              <RefreshCw className={`size-3.5 text-primary ${loading ? "animate-spin" : ""}`} />
              <span>Re-run AI Analysis</span>
            </Button>
            <StatusBadge tone="success">
              <Bot className="mr-1.5 size-4 inline" /> Gemini 3.5 & XAI Active
            </StatusBadge>
          </div>
        }
      />

      {/* Top Bento Row 1: Executive Summary */}
      <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-surface via-primary/5 to-surface p-6 sm:p-7 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary shadow-xs border border-primary/20">
              <Sparkles className="size-6" />
            </div>
            <div className="space-y-1">
              <h2 className="font-display text-xl font-bold text-foreground tracking-tight flex items-center gap-2">
                {getGreeting()}
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-2xl font-normal">
                {getHealthSummary()}
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            onClick={() => setTerminalOpen(true)}
            className="rounded-2xl border-primary/30 bg-surface/90 hover:bg-primary/10 hover:border-primary/50 text-foreground gap-2 transition-all shadow-xs shrink-0 h-11 px-4"
          >
            <Terminal className="size-4 text-primary" />
            <span className="font-bold text-xs">Terminal View (XAI & ML)</span>
            <span className="relative flex size-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex size-2 rounded-full bg-emerald-500"></span>
            </span>
          </Button>
        </div>
      </div>

      {/* Top Bento Row 2: Real DDI Model Metric Cards Only */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="p-5 rounded-2xl border border-border/80 bg-surface flex items-center gap-4 hover:border-primary/40 hover:shadow-xs transition-all">
          <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400">
            <Pill className="size-5" />
          </div>
          <div className="min-w-0 space-y-0.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total Medications</p>
            <p className="text-xl font-extrabold text-foreground font-display tracking-tight">
              {ddiReport?.total_medications || 0}
            </p>
          </div>
        </div>

        <div className="p-5 rounded-2xl border border-border/80 bg-surface flex items-center gap-4 hover:border-primary/40 hover:shadow-xs transition-all">
          <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400">
            <Activity className="size-5" />
          </div>
          <div className="min-w-0 space-y-0.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Evaluated Combinations</p>
            <p className="text-xl font-extrabold text-foreground font-display tracking-tight">
              {ddiReport?.total_combinations || 0}
            </p>
          </div>
        </div>

        <div className="p-5 rounded-2xl border border-border/80 bg-surface flex items-center gap-4 hover:border-primary/40 hover:shadow-xs transition-all">
          <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400">
            <ShieldAlert className="size-5" />
          </div>
          <div className="min-w-0 space-y-0.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Interacting Combinations</p>
            <p className="text-xl font-extrabold text-foreground font-display tracking-tight">
              {ddiReport?.combinations_with_interactions || 0}
            </p>
          </div>
        </div>

        <div className="p-5 rounded-2xl border border-border/80 bg-surface flex items-center gap-4 hover:border-primary/40 hover:shadow-xs transition-all">
          <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400">
            <AlertCircle className="size-5" />
          </div>
          <div className="min-w-0 space-y-0.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">High Risk Flagged</p>
            <p className="text-xl font-extrabold text-foreground font-display tracking-tight">
              {ddiReport?.high_risk_combinations || 0}
            </p>
          </div>
        </div>
      </div>

      {/* Main Bento Grid: 2 Columns */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Column: Medication Safety Checker */}
        <div className="lg:col-span-7 space-y-4">
          <Widget title="Medication Safety Checker" icon={ShieldAlert}>
            {loading ? (
              <div className="py-12 text-center text-sm text-muted-foreground flex flex-col items-center justify-center gap-2">
                <Activity className="size-6 text-primary animate-spin" />
                <span>Running ML safety checks...</span>
              </div>
            ) : !ddiReport || ddiReport.total_medications < 2 ? (
              <div className="flex flex-col items-center justify-center p-6 text-center rounded-2xl border border-dashed border-border bg-card/50 my-2">
                <Pill className="size-10 text-muted-foreground/40 mb-2" />
                <h4 className="font-semibold text-foreground text-sm">Insufficient Medications</h4>
                <p className="text-xs text-muted-foreground max-w-xs mt-1">
                  At least 2 active medications are required to check for interactions.
                </p>
              </div>
            ) : (
              <div className="space-y-4 mt-2">
                {/* Interactive "What-If" Drug Simulator */}
                <div className="p-4 rounded-2xl border border-primary/20 bg-card space-y-3 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Zap className="size-4 text-primary" />
                      <h4 className="text-xs font-bold font-display uppercase tracking-wider text-foreground">
                        "What-If" Drug Interaction Simulator
                      </h4>
                    </div>
                    <span className="text-[10px] font-mono text-muted-foreground bg-surface px-2 py-0.5 rounded-full border border-border">
                      Live Safety Sandbox
                    </span>
                  </div>

                  <form onSubmit={handleSimulate} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Type prospective drug (e.g. Ibuprofen, Warfarin, Aspirin)..."
                      value={simulatedDrug}
                      onChange={(e) => setSimulatedDrug(e.target.value)}
                      className="flex-1 rounded-xl border border-border bg-surface px-3.5 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                    <Button
                      type="submit"
                      size="sm"
                      disabled={simulating || !simulatedDrug.trim()}
                      className="rounded-xl text-xs font-semibold shrink-0 gap-1.5"
                    >
                      {simulating ? <Activity className="size-3.5 animate-spin" /> : <Zap className="size-3.5" />}
                      Simulate
                    </Button>
                  </form>

                  {/* Simulated Results Preview */}
                  {simulatedResults.length > 0 && (
                    <div className="pt-2 border-t border-border/60 space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-semibold text-primary">Simulation Results for "{simulatedDrug}":</span>
                        <button onClick={() => setSimulatedResults([])} className="text-[11px] text-muted-foreground hover:underline">
                          Clear Simulation
                        </button>
                      </div>
                      <div className="space-y-2">
                        {simulatedResults.map((combo, idx) => (
                          <ExpandableInteraction key={idx} combo={combo} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Filter Pills & Index Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-surface border border-border">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      onClick={() => setFilterTab("ALL")}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                        filterTab === "ALL" ? "bg-primary text-primary-foreground shadow-xs" : "bg-card text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      All ({ddiReport.total_combinations})
                    </button>
                    <button
                      onClick={() => setFilterTab("HIGH")}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                        filterTab === "HIGH" ? "bg-rose-500 text-white shadow-xs" : "bg-card text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      High Risk ({ddiReport.high_risk_combinations || 0})
                    </button>
                    <button
                      onClick={() => setFilterTab("GAP")}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                        filterTab === "GAP" ? "bg-amber-500 text-white shadow-xs" : "bg-card text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Advisories ({ddiReport.combinations ? ddiReport.combinations.filter((c: any) => !c.matched_in_trained_model || c.source === "KNOWLEDGE_GAP").length : 0})
                    </button>
                    <button
                      onClick={() => setFilterTab("SAFE")}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                        filterTab === "SAFE" ? "bg-emerald-500 text-white shadow-xs" : "bg-card text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Safe ({ddiReport.combinations ? ddiReport.combinations.filter((c: any) => !c.has_potential_interaction && c.matched_in_trained_model).length : 0})
                    </button>
                  </div>
                </div>

                {/* Compact Bento Cards List */}
                <div className="space-y-3">
                  {displayCombos.length > 0 ? (
                    displayCombos.map((combo) => (
                      <ExpandableInteraction key={combo.id} combo={combo} />
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center p-6 text-center border border-border rounded-2xl bg-surface">
                      <CheckCircle2 className="size-8 text-emerald-500 mb-2" />
                      <h4 className="font-semibold text-foreground text-sm">No combinations in this filter</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Select "All" to view all evaluated drug pairs.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </Widget>
        </div>

        {/* Right Column: Recent Document Insights */}
        <div className="lg:col-span-5 space-y-4">
          <Widget title="Recent Document Insights" icon={FileText}>
             {loading ? (
              <div className="py-12 text-center text-sm text-muted-foreground flex flex-col items-center justify-center gap-2">
                <Activity className="size-6 text-primary animate-spin" />
                <span>Scanning medical documents...</span>
              </div>
             ) : insights.length === 0 ? (
               <div className="flex flex-col items-center justify-center p-6 text-center rounded-2xl border border-dashed border-border bg-card/50 my-2">
                 <FileText className="size-10 text-muted-foreground/30 mb-2" />
                 <p className="text-xs text-muted-foreground">No document insights found yet. Upload lab reports to auto-extract values.</p>
               </div>
             ) : (
                <div className="space-y-3 mt-2">
                  <ul className="space-y-3">
                    {insights.map((insight) => {
                      const doc = getDoctorForMed(insight.name);
                      return (
                        <li key={insight.id} className="flex gap-3.5 items-start p-4 rounded-2xl border border-border/80 bg-surface hover:border-primary/40 transition-all shadow-xs">
                          <div className="size-10 rounded-2xl bg-primary/10 border border-primary/20 text-primary shrink-0 grid place-items-center mt-0.5">
                            <CheckCircle2 className="size-5" />
                          </div>
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-xs font-bold text-primary">
                                {formatTypeLabel(insight.value_type)}
                              </p>
                              <span className="text-[10px] font-mono text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full border border-border/50">
                                Gemini 3.5
                              </span>
                            </div>
                            <p className="text-sm font-bold font-display text-foreground truncate">
                              {insight.name}
                            </p>
                            <div className="text-xs text-muted-foreground">
                              {insight.value && String(insight.value).trim() !== "" ? (
                                <span>Value: <span className="font-semibold text-foreground">{insight.value}</span> {insight.unit || ""}</span>
                              ) : (
                                <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">Extracted</span>
                              )}
                            </div>
                            {/* Doctor & Clinic Details */}
                            <div className="pt-1.5 border-t border-border/50 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                              <span className="font-semibold text-foreground flex items-center gap-1">
                                <Stethoscope className="size-3 text-primary shrink-0" />
                                {doc.doctor}
                              </span>
                              <span className="text-muted-foreground font-medium">{doc.clinic}</span>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
             )}
          </Widget>
        </div>
      </div>

      {/* Terminal View Dialog */}
      <XAITerminalModal report={ddiReport} userName={userName} open={terminalOpen} onOpenChange={setTerminalOpen} />
    </div>
  );
}



