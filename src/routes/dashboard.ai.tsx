import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Sparkles, Bot, FileText, CheckCircle2, TriangleAlert, Pill, ShieldAlert, ChevronDown, ChevronUp } from "lucide-react";
import { PageHeader, StatusBadge } from "@/components/shared/page-header";
import { Widget } from "@/components/shared/widget";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/dashboard/ai")({
  component: AIPage,
  head: () => ({
    meta: [
      { title: "AI Intelligence — MediLink AI" },
      { name: "description", content: "AI-powered health insights and medication safety checks." },
    ],
  }),
});

interface DDIReport {
  status: string;
  message: string;
  total_medications: number;
  medications_list: string[];
  combinations: any[];
  combinations_with_interactions: number;
  total_combinations: number;
}

function ExpandableInteraction({ combo }: { combo: any }) {
  const [expanded, setExpanded] = useState(false);
  
  const isSafe = !combo.has_potential_interaction;
  const badgeColor = isSafe ? "success" : combo.overall_risk_level === "HIGH" ? "destructive" : "warning";
  const badgeText = isSafe ? "No significant interaction" : combo.overall_risk_level === "HIGH" ? "High-risk interaction" : "May need attention";
  
  return (
    <div className="rounded-xl border border-border bg-surface p-5 mb-4 transition-all shadow-sm">
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between">
          <div>
            <StatusBadge tone={badgeColor}>{badgeText}</StatusBadge>
            <h4 className="font-semibold text-lg text-foreground mt-2">{combo.pair_label}</h4>
            <p className="text-sm text-foreground/80 mt-1">These medications may interact when taken together.</p>
          </div>
        </div>

        {!isSafe && (
          <div className="mt-2 rounded-lg bg-primary/5 p-4 border border-primary/10">
            <h5 className="font-medium text-foreground text-sm flex items-center gap-1.5 mb-1">
              What should I do?
            </h5>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Don't stop or change your medication yourself. Ask your doctor or pharmacist whether these medicines should be taken at different times.
            </p>
          </div>
        )}

        {!isSafe && (
          <div>
            <Button variant="ghost" size="sm" onClick={() => setExpanded(!expanded)} className="text-primary mt-1 px-0 hover:bg-transparent hover:text-primary/80">
              Why was this flagged? {expanded ? <ChevronUp className="ml-1 size-4" /> : <ChevronDown className="ml-1 size-4" />}
            </Button>
          </div>
        )}
      </div>

      {expanded && !isSafe && (
        <div className="mt-4 border-t border-border pt-4">
          <div className="space-y-4">
            <div>
               <h5 className="font-medium text-foreground text-sm mb-1">Why was this flagged?</h5>
               <p className="text-sm text-muted-foreground">
                 MediLink identified a possible interaction between {combo.drug_a || "these drugs"} and {combo.drug_b || "these drugs"} based on known medication interaction information.
               </p>
            </div>
            
            {combo.xai_explanation && (
              <div>
                 <h5 className="font-medium text-foreground text-sm mb-1">Why it matters</h5>
                 <p className="text-sm text-muted-foreground">
                   {combo.xai_explanation}
                 </p>
              </div>
            )}

            {combo.recommendation && (
              <div>
                 <h5 className="font-medium text-foreground text-sm mb-1">What MediLink recommends</h5>
                 <p className="text-sm text-muted-foreground">
                   {combo.recommendation}
                 </p>
              </div>
            )}
            
            <div className="flex gap-4 pt-2">
               <p className="text-xs text-muted-foreground"><span className="font-medium">Evidence:</span> Strong</p>
               <p className="text-xs text-muted-foreground"><span className="font-medium">Confidence:</span> High</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AIPage() {
  const [profile, setProfile] = useState<any>(null);
  const [insights, setInsights] = useState<any[]>([]);
  const [ddiReport, setDdiReport] = useState<DDIReport | null>(null);
  const [loading, setLoading] = useState(true);

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
            setInsights(emValues.slice(0, 5)); // Just take the 5 most recent insights
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

  const getGreeting = () => {
    if (!profile) return "Hello!";
    const name = profile.full_name?.split(" ")[0] || "there";
    return `Hello, ${name}!`;
  };

  const getHealthSummary = () => {
    if (loading) return "Analyzing your health profile...";
    if (!ddiReport || ddiReport.total_medications === 0) {
      return "You currently have no active medications recorded. Whenever you upload medical documents, I'll extract insights and check for safety here.";
    }
    
    if (ddiReport.combinations_with_interactions > 0) {
      return `I've analyzed your ${ddiReport.total_medications} medications. There are some potential interactions you should be aware of. Please review the safety checker below.`;
    }
    
    return `Great news! I've analyzed your ${ddiReport.total_medications} medications and found no known interactions. Your profile looks safe.`;
  };

  let displayCombos: any[] = [];
  let needsAttentionCount = 0;
  if (ddiReport && ddiReport.combinations) {
    const highRiskCombos = ddiReport.combinations.filter((c: any) => c.has_potential_interaction && c.matched_in_trained_model);
    needsAttentionCount = highRiskCombos.length;
    const sortedCombos = highRiskCombos.sort((a: any, b: any) => {
      if (a.matched_in_trained_model && !b.matched_in_trained_model) return -1;
      if (!a.matched_in_trained_model && b.matched_in_trained_model) return 1;
      return 0;
    });
    displayCombos = sortedCombos.slice(0, 5);
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader 
        title="AI Intelligence" 
        description="Your smart health assistant summarizing insights and checking safety."
        actions={<StatusBadge tone="success"><Bot className="mr-1 size-4 inline" /> AI Active</StatusBadge>}
      />

      <Widget 
        title="Your AI Health Summary" 
        icon={Sparkles} 
        className="border-primary/20 bg-gradient-to-br from-surface to-primary/5 shadow-sm"
      >
        <p className="text-lg font-medium text-foreground py-2">
          {getGreeting()}
        </p>
        <p className="text-muted-foreground leading-relaxed">
          {getHealthSummary()}
        </p>
      </Widget>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="space-y-6">
          <Widget title="Medication Safety Checker" icon={ShieldAlert}>
            {loading ? (
              <p className="text-sm text-muted-foreground">Running safety checks...</p>
            ) : !ddiReport || ddiReport.total_medications < 2 ? (
              <div className="flex flex-col items-center justify-center p-6 text-center">
                <Pill className="size-12 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">You need at least 2 medications to check for interactions.</p>
              </div>
            ) : (
              <div className="mt-4">
                <div className="mb-6 rounded-lg bg-surface border border-border p-4">
                  <h4 className="text-sm font-semibold text-foreground mb-1">Medication Safety</h4>
                  <p className="text-sm text-muted-foreground mb-4">Your medications were checked for possible interactions.</p>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center justify-center size-5 rounded-full bg-orange-100 text-orange-600 text-xs font-bold">
                        {needsAttentionCount}
                      </span>
                      <span className="text-sm font-medium text-foreground">needs attention</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="flex items-center justify-center size-5 rounded-full bg-green-100 text-green-600">
                        <CheckCircle2 className="size-3.5" />
                      </span>
                      <span className="text-sm text-muted-foreground">{ddiReport.total_combinations - needsAttentionCount} look okay</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {displayCombos.length > 0 ? (
                    displayCombos.map((combo) => (
                      <ExpandableInteraction key={combo.id} combo={combo} />
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center p-6 text-center border border-border rounded-xl bg-surface">
                      <CheckCircle2 className="size-8 text-success mb-2" />
                      <p className="text-sm text-muted-foreground">All checked combinations appear safe.</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </Widget>
        </div>

        <div className="space-y-6">
          <Widget title="Recent Document Insights" icon={FileText}>
             {loading ? (
              <p className="text-sm text-muted-foreground">Scanning recent documents...</p>
             ) : insights.length === 0 ? (
               <p className="text-sm text-muted-foreground py-4 text-center">No recent insights found. Upload documents to generate insights.</p>
             ) : (
               <ul className="space-y-4 mt-4">
                 {insights.map((insight) => (
                   <li key={insight.id} className="flex gap-3 items-start border-b border-border pb-4 last:border-0 last:pb-0">
                     <div className="mt-0.5 rounded-full bg-primary/10 p-1.5 text-primary">
                       <CheckCircle2 className="size-4" />
                     </div>
                     <div>
                       <p className="text-sm font-medium text-foreground capitalize">
                         New {insight.value_type} detected
                       </p>
                       <p className="text-sm text-muted-foreground mt-0.5">
                         {insight.name}: <span className="text-foreground">{insight.value}</span> {insight.unit}
                       </p>
                     </div>
                   </li>
                 ))}
               </ul>
             )}
          </Widget>
        </div>
      </div>
    </div>
  );
}
