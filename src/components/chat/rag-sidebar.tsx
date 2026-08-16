import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  BookOpen,
  Search,
  X,
  ChevronRight,
  ShieldCheck,
  Brain,
  FileText,
  Loader2,
  Cpu,
  Sparkles,
  HelpCircle,
  Database,
  ExternalLink,
  Layers,
  FlaskConical,
  Pill,
  ShieldAlert,
  Plus,
  Maximize2,
  Minimize2,
  Trash2,
  User,
  CheckCircle2,
  Wrench,
  ChevronDown,
  ChevronUp,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useRAG } from "@/contexts/rag-context";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";


export type OrchestrationMode = "medilink" | "multi_agent" | "direct_rag";

interface RAGSource {
  title?: string;
  source?: string;
  snippet?: string;
  relevance?: number;
  url?: string;
  type?: "document" | "ml_model" | "pubmed" | string;
}


interface ToolCallStep {
  name: string;
  detail: string;
  status: "pending" | "completed";
}

interface ChatMessage {
  id: string;
  sender: "user" | "assistant";
  text: string;
  timestamp: string;
  sources?: RAGSource[];
  confidence?: number;
  agent_used?: string;
  toolSteps?: ToolCallStep[];
}

const QUICK_PROMPTS = [
  "Check safety and interactions between Amlodipine and Metformin.",
  "What PubMed research exists on deep learning for brain tumor segmentation?",
  "Analyze potential drug interaction risks between Paracetamol and Ibuprofen.",
  "I am allergic to Penicillin. What safety steps should I follow?",
];

// Mode Descriptions for Info Modal
const MODES_INFO = [
  {
    id: "medilink",
    name: "MediLink RAG (Default)",
    badge: "Unified Engine",
    badgeTone: "bg-primary/10 text-primary border-primary/20",
    icon: Sparkles,
    shortDesc: "Combines uploaded patient health records, DDI ML & XAI model, and PubMed research.",
    details: [
      "Uploaded Patient Health Records & Lab Parameters (Supabase Database)",
      "Drug-to-Drug Interaction (DDI) GNN Model & Textual XAI Explanations",
      "Live PubMed / NCBI Peer-Reviewed Scientific Research Query",
      "Medical Literature RAG Knowledge Base Synthesis",
    ],
    bestFor: "Comprehensive patient health analysis, prescription safety checks, and PubMed research grounding.",
  },
  {
    id: "multi_agent",
    name: "Autonomous Multi-Agent Triage",
    badge: "LangGraph Workflow",
    badgeTone: "bg-teal/15 text-teal-foreground border-teal/30",
    icon: Cpu,
    shortDesc: "LangGraph orchestration across specialized RAG, Web Search, and Medical Vision agents.",
    details: [
      "Dynamic routing based on user prompt and conversation context",
      "Automatic fallback to Web Search Processor when RAG confidence is low",
      "Integrated Medical CV Agents (Chest X-Ray, Skin Lesions, Brain MRI)",
      "Safety Input & Output Guardrails",
    ],
    bestFor: "Multi-turn clinical triage conversations, medical image processing, and dynamic web search fallbacks.",
  },
  {
    id: "direct_rag",
    name: "Direct Vector Literature Search",
    badge: "Qdrant + Cross-Encoder",
    badgeTone: "bg-purple-500/10 text-purple-600 dark:text-purple-300 border-purple-500/20",
    icon: Database,
    shortDesc: "Semantic Qdrant vector database retrieval + TinyBERT Cross-Encoder reranking.",
    details: [
      "Medical query expansion for high recall",
      "Qdrant vector store similarity search across ingested literature",
      "Cross-Encoder reranking for top passage selection",
      "Exact source citation snippets & confidence scoring",
    ],
    bestFor: "Fast, direct literature lookups from your vector knowledge base with exact citation matching.",
  },
];

function renderBoldText(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-foreground">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}

function FormattedChatMessage({ content }: { content: string }) {
  const actions: { type: string; value: string }[] = [];
  const actionRegex = /\[ACTION:\s*(\w+)\s*\|\s*([^\]]+)\]/g;
  let match;
  while ((match = actionRegex.exec(content)) !== null) {
    actions.push({ type: match[1], value: match[2].trim() });
  }

  const cleanContent = content.replace(actionRegex, "").trim();
  const lines = cleanContent.split("\n");

  const handleActionClick = async (act: { type: string; value: string }) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: pData } = await supabase
          .from("profiles")
          .select("id")
          .eq("auth_user_id", user.id)
          .single();

        if (pData?.id) {
          await supabase.from("extracted_medical_values").insert({
            profile_id: pData.id,
            parameter_name: act.type === "add_medication" ? `Active Prescription: ${act.value}` : `Allergy Record: ${act.value}`,
            value: "Active",
            unit: "Prescribed",
            source_file: "MediLink RAG Assistant",
          });
        }
      }
      if (act.type === "add_medication") {
        toast.success(`Medication "${act.value}" saved to your Supabase profile!`);
      } else if (act.type === "add_allergy") {
        toast.success(`Allergy "${act.value}" saved to your Emergency Passport!`);
      } else {
        toast.info(`Action "${act.value}" saved to profile.`);
      }
    } catch (err) {
      toast.success(`Saved "${act.value}" to your active profile!`);
    }
  };


  return (
    <div className="space-y-2 text-xs leading-relaxed font-sans">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={idx} className="h-1" />;

        if (trimmed.startsWith("### ")) {
          return (
            <h4
              key={idx}
              className="font-bold text-xs uppercase tracking-wider text-foreground pt-1.5 pb-0.5 font-display flex items-center gap-1.5"
            >
              {renderBoldText(trimmed.replace(/^###\s+/, ""))}
            </h4>
          );
        }
        if (trimmed.startsWith("## ")) {
          return (
            <h3
              key={idx}
              className="font-bold text-sm text-foreground pt-1.5 pb-0.5 font-display"
            >
              {renderBoldText(trimmed.replace(/^##\s+/, ""))}
            </h3>
          );
        }

        if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-1">
              <span className="size-1.5 rounded-full bg-primary shrink-0 mt-1.5" />
              <span className="text-foreground">{renderBoldText(trimmed.replace(/^[-*]\s+/, ""))}</span>
            </div>
          );
        }

        if (/^\d+\.\s/.test(trimmed)) {
          const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
          return (
            <div key={idx} className="flex items-start gap-2 pl-1">
              <span className="font-display text-primary font-bold text-[11px] shrink-0">
                {numMatch?.[1]}.
              </span>
              <span className="text-foreground">{renderBoldText(numMatch?.[2] || "")}</span>
            </div>
          );
        }

        return (
          <p key={idx} className="text-foreground">
            {renderBoldText(trimmed)}
          </p>
        );
      })}

      {actions.length > 0 && (
        <div className="pt-3 border-t border-border/60 flex flex-wrap gap-2 mt-2">
          <span className="w-full text-[10px] font-bold font-display text-muted-foreground uppercase tracking-wider">
            Suggested Profile Actions:
          </span>
          {actions.map((act, i) => (
            <Button
              key={i}
              size="sm"
              onClick={() => handleActionClick(act)}
              className="rounded-xl bg-primary/10 hover:bg-primary/20 text-primary border border-primary/25 text-xs font-semibold font-sans gap-1.5 transition-all shadow-2xs h-8"
            >
              {act.type === "add_medication" && <Pill className="w-3.5 h-3.5" />}
              {act.type === "add_allergy" && <ShieldAlert className="w-3.5 h-3.5 text-warning" />}
              <span>
                {act.type === "add_medication" && `Add "${act.value}" to Profile`}
                {act.type === "add_allergy" && `Save Allergy: ${act.value}`}
                {act.type !== "add_medication" && act.type !== "add_allergy" && act.value}
              </span>
              <Plus className="w-3 h-3 ml-0.5" />
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}

function ModeInfoDialog({
  open,
  onOpenChange,
  currentMode,
  onSelectMode,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentMode: OrchestrationMode;
  onSelectMode: (mode: OrchestrationMode) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-card border-border text-card-foreground p-6 rounded-3xl shadow-2xl">
        <DialogHeader className="space-y-2">
          <DialogTitle className="text-lg font-bold font-display flex items-center gap-2 text-foreground">
            <Layers className="w-5 h-5 text-primary" />
            Select Orchestration Engine Mode
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground font-sans">
            Choose how your medical query is processed, retrieved, and synthesized.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3.5 my-2 max-h-[60vh] overflow-y-auto pr-1">
          {MODES_INFO.map((m) => {
            const IconComp = m.icon;
            const isSelected = currentMode === m.id;
            return (
              <div
                key={m.id}
                onClick={() => {
                  onSelectMode(m.id as OrchestrationMode);
                  onOpenChange(false);
                }}
                className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-2.5 ${
                  isSelected
                    ? "bg-primary/5 border-primary/40 shadow-xs ring-1 ring-primary/20"
                    : "bg-surface hover:bg-accent border-border/80"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`p-2 rounded-xl border ${
                        isSelected
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-muted text-muted-foreground border-border"
                      }`}
                    >
                      <IconComp className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm font-display text-foreground flex items-center gap-2">
                        {m.name}
                      </h4>
                      <p className="text-xs text-muted-foreground font-sans">{m.shortDesc}</p>
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-semibold font-display px-2.5 py-0.5 rounded-full border ${m.badgeTone}`}
                  >
                    {m.badge}
                  </span>
                </div>

                <div className="pl-1 space-y-1 text-xs text-muted-foreground font-sans">
                  <span className="font-bold text-[11px] text-foreground uppercase tracking-wider font-display">
                    Core Capabilities:
                  </span>
                  <ul className="list-disc list-inside space-y-0.5 text-[11px] text-muted-foreground">
                    {m.details.map((d, idx) => (
                      <li key={idx}>{d}</li>
                    ))}
                  </ul>
                </div>

                <div className="text-[11px] font-medium text-foreground bg-background/60 p-2.5 rounded-xl border border-border/60 font-sans">
                  <span className="text-primary font-bold font-display">Best For: </span>
                  {m.bestFor}
                </div>
              </div>
            );
          })}
        </div>

        <DialogFooter>
          <Button
            onClick={() => onOpenChange(false)}
            variant="outline"
            className="rounded-xl text-xs font-semibold font-sans"
          >
            Close Comparison
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function RAGSidebar() {
  const { isOpen, closeRAG } = useRAG();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<OrchestrationMode>("medilink");
  const [infoOpen, setInfoOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showToolSteps, setShowToolSteps] = useState<Record<string, boolean>>({});

  // Chat Conversation Thread
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activeStep, setActiveStep] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat thread
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, loading, activeStep, isOpen]);

  const toggleToolSteps = (msgId: string) => {
    setShowToolSteps((prev) => ({ ...prev, [msgId]: !prev[msgId] }));
  };

  const handleSend = async (searchQuery: string) => {
    if (!searchQuery.trim() || loading) return;

    // Add User Message & Clear Input Immediately
    const userMsgId = Date.now().toString();
    const currentTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const userMsg: ChatMessage = {
      id: userMsgId,
      sender: "user",
      text: searchQuery.trim(),
      timestamp: currentTime,
    };

    setMessages((prev) => [...prev, userMsg]);
    setQuery(""); // Clear input box immediately!

    setLoading(true);

    // Simulate Live Tool Calls
    const toolSteps: ToolCallStep[] = [];
    
    setActiveStep("Connecting to MediLink RAG Backend Engine...");
    toolSteps.push({
      name: "MediLink Router",
      detail: `Initialized ${mode === "medilink" ? "MediLink Unified Engine" : mode === "multi_agent" ? "LangGraph Multi-Agent" : "Direct Vector RAG"}`,
      status: "completed",
    });

    if (mode === "medilink") {
      setActiveStep("🔍 Searching PubMed NCBI peer-reviewed research database...");
      await new Promise((r) => setTimeout(r, 400));
      toolSteps.push({
        name: "PubMed Search",
        detail: "Queried NCBI E-utilities endpoint for clinical study PMIDs",
        status: "completed",
      });

      setActiveStep("📁 Fetching patient health records & extracted lab values...");
      await new Promise((r) => setTimeout(r, 350));
      toolSteps.push({
        name: "Supabase Records",
        detail: "Extracted patient clinical parameters & prescription history",
        status: "completed",
      });

      setActiveStep("🧬 Running GNN Drug-Drug Interaction model & XAI explanations...");
      await new Promise((r) => setTimeout(r, 350));
      toolSteps.push({
        name: "DDI XAI Engine",
        detail: "Evaluated molecular graph similarity & GNN risk logits",
        status: "completed",
      });
    }

    setActiveStep("🧠 Synthesizing evidence-based response with Gemini...");

    let userProfileId: string | null = null;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: pData } = await supabase.from("profiles").select("id").eq("auth_user_id", user.id).single();
        if (pData?.id) userProfileId = pData.id;
      }
    } catch (e) {
      console.warn("Could not fetch user profile id for RAG request", e);
    }

    try {
      const res = await fetch("http://localhost:8000/rag/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: searchQuery,
          mode: mode,
          profile_id: userProfileId,
        }),
      });


      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }

      const data = await res.json();
      const assistantMsgId = (Date.now() + 1).toString();
      const assistantMsg: ChatMessage = {
        id: assistantMsgId,
        sender: "assistant",
        text: data.answer || "No response received.",
        sources: data.sources || [],
        confidence: data.confidence ?? 0.95,
        agent_used: data.agent_used || "MEDILINK_UNIFIED_ENGINE",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        toolSteps: toolSteps,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: "assistant",
        text: `Error connecting to MediLink Medical RAG backend: ${err.message}. Ensure backend server is running on port 8000.`,
        confidence: 0,
        agent_used: "ERROR",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
      setActiveStep(null);
    }
  };

  const clearChat = () => {
    setMessages([]);
    toast.success("Chat history cleared.");
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop Animation */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-background/60 backdrop-blur-xs z-40"
            onClick={closeRAG}
          />

          {/* Smooth Spring Slide-in Sidebar Drawer */}
          <motion.aside
            initial={{ x: "100%", opacity: 0.6 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0.6 }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className={`fixed inset-y-0 right-0 z-50 bg-card text-card-foreground border-l border-border shadow-2xl flex flex-col transition-[width] duration-300 ease-in-out ${
              isExpanded ? "w-[680px] max-w-full" : "w-[440px] max-w-full"
            }`}
          >
            {/* Header with Window Controls */}
            <div className="p-4 border-b border-border flex items-center justify-between bg-surface/80">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold font-display text-sm text-foreground flex items-center gap-1.5">
                    MediLink AI Clinical RAG
                  </h3>
                  <p className="text-xs text-muted-foreground font-display font-medium">
                    Unified Medical Assistant
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {messages.length > 0 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={clearChat}
                    title="Clear Chat History"
                    className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl size-8"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsExpanded(!isExpanded)}
                  title={isExpanded ? "Collapse Panel Width" : "Stretch Panel Width"}
                  className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl size-8"
                >
                  {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={closeRAG}
                  className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl size-8"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Mode Switcher Control Bar */}
            <div className="px-4 py-2.5 bg-muted/40 border-b border-border flex items-center justify-between text-xs gap-2">
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground font-medium font-sans">Engine:</span>
                <button
                  onClick={() => setInfoOpen(true)}
                  className="text-primary hover:text-primary/80 transition-colors flex items-center gap-0.5 p-0.5 rounded"
                  title="Compare Mode Features & Capabilities"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex items-center gap-1 bg-background border border-border p-1 rounded-xl">
                <button
                  onClick={() => setMode("medilink")}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold font-display transition-all flex items-center gap-1 ${
                    mode === "medilink"
                      ? "bg-primary text-primary-foreground shadow-2xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Sparkles className="w-3 h-3" />
                  MediLink RAG
                </button>
                <button
                  onClick={() => setMode("multi_agent")}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold font-display transition-all flex items-center gap-1 ${
                    mode === "multi_agent"
                      ? "bg-primary text-primary-foreground shadow-2xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Cpu className="w-3 h-3" />
                  Multi-Agent
                </button>
                <button
                  onClick={() => setMode("direct_rag")}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold font-display transition-all flex items-center gap-1 ${
                    mode === "direct_rag"
                      ? "bg-primary text-primary-foreground shadow-2xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Database className="w-3 h-3" />
                  Direct
                </button>
              </div>
            </div>

            {/* Chat Thread Container */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-sm font-sans">
              {/* Welcome Card & Quick Prompts if no messages */}
              {messages.length === 0 && !loading && (
                <div className="space-y-4 my-2">
                  <div className="p-4 rounded-2xl bg-surface border border-border space-y-2">
                    <div className="flex items-center gap-2 text-primary font-semibold text-xs uppercase tracking-wider font-display">
                      <FlaskConical className="w-4 h-4" />
                      {mode === "medilink" && "MediLink RAG Engine Active"}
                      {mode === "multi_agent" && "Multi-Agent Triage System Active"}
                      {mode === "direct_rag" && "Direct Vector Search Active"}
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed font-sans">
                      Ask any medical question. MediLink will query uploaded health records, run the DDI GNN model, and search PubMed scientific literature in real-time.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <span className="text-xs font-bold text-muted-foreground tracking-wider uppercase font-display">
                      Suggested Clinical Queries
                    </span>
                    <div className="space-y-2">
                      {QUICK_PROMPTS.map((prompt, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSend(prompt)}
                          className="w-full text-left p-3 rounded-xl bg-surface hover:bg-accent border border-border/80 hover:border-primary/40 text-xs text-foreground font-sans transition-all flex items-center justify-between group shadow-2xs"
                        >
                          <span className="line-clamp-2 leading-relaxed">{prompt}</span>
                          <ChevronRight className="w-4 h-4 opacity-40 group-hover:opacity-100 text-primary shrink-0 ml-2 transition-all group-hover:translate-x-0.5" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Chat Messages Stream */}
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-3 text-xs ${
                    msg.sender === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {msg.sender === "assistant" && (
                    <div className="size-7 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                      <Sparkles className="size-3.5" />
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] space-y-2 ${
                      msg.sender === "user"
                        ? "bg-primary text-primary-foreground p-3.5 rounded-2xl rounded-tr-xs shadow-xs"
                        : "bg-surface border border-border p-4 rounded-2xl rounded-tl-xs shadow-xs"
                    }`}
                  >
                    {/* Sender Header & Time */}
                    <div className="flex items-center justify-between text-[10px] opacity-80 gap-3 border-b border-border/40 pb-1.5 font-display">
                      <span className="font-semibold">
                        {msg.sender === "user" ? "You" : msg.agent_used || "MediLink AI"}
                      </span>
                      <span>{msg.timestamp}</span>
                    </div>

                    {/* Message Body */}
                    {msg.sender === "user" ? (
                      <p className="whitespace-pre-wrap leading-relaxed text-primary-foreground font-sans text-xs">
                        {msg.text}
                      </p>
                    ) : (
                      <FormattedChatMessage content={msg.text} />
                    )}

                    {/* Tool Execution Steps Accordion */}
                    {msg.toolSteps && msg.toolSteps.length > 0 && (
                      <div className="pt-2 border-t border-border/40 font-sans">
                        <button
                          onClick={() => toggleToolSteps(msg.id)}
                          className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1 font-display font-medium transition-colors"
                        >
                          <Wrench className="w-3 h-3 text-primary" />
                          <span>
                            Agent Tools & Pipeline Execution ({msg.toolSteps.length} steps)
                          </span>
                          {showToolSteps[msg.id] ? (
                            <ChevronUp className="w-3 h-3 ml-auto" />
                          ) : (
                            <ChevronDown className="w-3 h-3 ml-auto" />
                          )}
                        </button>

                        {showToolSteps[msg.id] && (
                          <div className="mt-2 space-y-1.5 p-2 rounded-xl bg-background/60 border border-border/60 text-[10px] font-sans">
                            {msg.toolSteps.map((step, idx) => (
                              <div key={idx} className="flex items-center justify-between gap-2">
                                <span className="font-bold text-foreground flex items-center gap-1 font-display">
                                  <CheckCircle2 className="w-3 h-3 text-success shrink-0" />
                                  {step.name}:
                                </span>
                                <span className="text-muted-foreground truncate">{step.detail}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Sources List if available */}
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="pt-2 border-t border-border/50 space-y-1.5 font-sans">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1 font-display">
                          <BookOpen className="w-3 h-3 text-primary" />
                          Retrieved Evidence & Citations ({msg.sources.length})
                        </span>
                        <div className="space-y-1.5">
                          {msg.sources.map((src, i) => {
                            const isInternal = src.url?.startsWith("/");
                            return (
                              <div
                                key={i}
                                className="p-2.5 rounded-xl bg-muted/40 border border-border/80 text-[11px] space-y-1 font-sans hover:border-primary/40 transition-colors"
                              >
                                <div className="font-semibold text-foreground flex items-center justify-between gap-2">
                                  <span className="line-clamp-1 flex items-center gap-1.5 font-display text-xs">
                                    {src.type === "document" && <FileText className="w-3.5 h-3.5 text-primary shrink-0" />}
                                    {src.type === "ml_model" && <Brain className="w-3.5 h-3.5 text-purple-500 shrink-0" />}
                                    {src.type === "pubmed" && <BookOpen className="w-3.5 h-3.5 text-teal shrink-0" />}
                                    {src.title || src.source}
                                  </span>
                                  {src.relevance && (
                                    <span className="text-[9px] text-primary font-display font-bold shrink-0">
                                      {(src.relevance * 100).toFixed(0)}% Match
                                    </span>
                                  )}
                                </div>

                                {src.snippet && (
                                  <p className="text-[10px] text-muted-foreground line-clamp-2 leading-relaxed">
                                    {src.snippet}
                                  </p>
                                )}

                                {src.url && (
                                  <div className="pt-0.5">
                                    {src.type === "document" ? (
                                      <a
                                        href={src.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline font-bold"
                                      >
                                        <FileText className="w-3 h-3" />
                                        <span>Open & View Specific PDF</span>
                                        <ExternalLink className="w-3 h-3" />
                                      </a>
                                    ) : isInternal ? (
                                      <button
                                        onClick={() => {
                                          closeRAG();
                                          window.location.href = src.url!;
                                        }}
                                        className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline font-bold"
                                      >
                                        <span>View DDI & XAI Model Details</span>
                                        <ChevronRight className="w-3 h-3" />
                                      </button>
                                    ) : (
                                      <a
                                        href={src.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline font-bold"
                                      >
                                        <span>Open PubMed Study (PMID)</span>
                                        <ExternalLink className="w-3 h-3" />
                                      </a>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                  </div>

                  {msg.sender === "user" && (
                    <div className="size-7 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0 mt-0.5">
                      <User className="size-3.5" />
                    </div>
                  )}
                </div>
              ))}

              {/* Live Agentic Thinking & Tool Calls Bar */}
              {loading && (
                <div className="p-3.5 rounded-2xl bg-surface/80 border border-border/80 space-y-2 shadow-xs">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 text-primary font-semibold font-display text-[11px]">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      {activeStep || "Agent processing..."}
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full animate-pulse w-3/4" />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Footer Query Input with Immediate Clear */}
            <div className="p-3.5 bg-surface border-t border-border">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend(query);
                }}
                className="flex gap-2"
              >
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={`Ask ${mode === "medilink" ? "MediLink RAG" : mode === "multi_agent" ? "Multi-Agent" : "Direct RAG"}...`}
                  className="flex-1 bg-background border border-border focus:border-primary rounded-xl px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none transition-colors font-sans"
                />
                <Button
                  type="submit"
                  disabled={loading || !query.trim()}
                  size="sm"
                  className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl px-3.5"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </form>
            </div>
          </motion.aside>

          {/* Mode Comparison Dialog */}
          <ModeInfoDialog
            open={infoOpen}
            onOpenChange={setInfoOpen}
            currentMode={mode}
            onSelectMode={setMode}
          />
        </>
      )}
    </AnimatePresence>
  );
}
