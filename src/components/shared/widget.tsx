import { motion } from "motion/react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/** Animated dashboard widget shell — one consistent card style app-wide. */
export function Widget({
  title,
  icon: Icon,
  action,
  children,
  className,
  id,
  delay = 0,
}: {
  title?: string;
  icon?: LucideIcon;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  id?: string;
  delay?: number;
}) {
  return (
    <motion.div
      id={id}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className={cn("h-full", className)}
    >
      <Card className="card-hover h-full gap-5 rounded-2xl border-border bg-card shadow-soft">
        {title ? (
          <CardHeader className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 pb-0">
            <CardTitle className="flex min-w-0 items-center gap-2 font-display text-sm font-semibold text-foreground">
              {Icon ? <Icon className="size-4 shrink-0 text-primary" aria-hidden /> : null}
              <span className="truncate">{title}</span>
            </CardTitle>
            {action ? <div className="shrink-0">{action}</div> : null}
          </CardHeader>
        ) : null}
        <CardContent className="pt-0">{children}</CardContent>
      </Card>
    </motion.div>
  );
}

export function MetricCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "primary",
  delay = 0,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  tone?: "primary" | "teal" | "success" | "warning";
  delay?: number;
}) {
  const tones = {
    primary: "bg-primary/10 text-primary",
    teal: "bg-teal/15 text-teal",
    success: "bg-success/12 text-success",
    warning: "bg-warning/15 text-warning",
  } as const;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
    >
      <Card className="card-hover rounded-xl border-border bg-card p-6 shadow-soft">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
            <p className="mt-2 font-display text-2xl font-bold text-foreground">{value}</p>
            {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
          </div>
          <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl", tones[tone])}>
            <Icon className="size-5" aria-hidden />
          </span>
        </div>
      </Card>
    </motion.div>
  );
}
