import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { ArrowLeft, Sparkles, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/page-header";

export interface ComingSoonProps {
  title: string;
  tagline: string;
  description: string;
  capabilities: string[];
  timeline: string;
  icon: LucideIcon;
}

/** Shared "Feature Under Development" screen used by all future modules. */
export function ComingSoon({ title, tagline, description, capabilities, timeline, icon: Icon }: ComingSoonProps) {
  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <Button asChild variant="ghost" size="sm" className="-ml-2 gap-2 text-muted-foreground">
        <Link to="/dashboard">
          <ArrowLeft className="size-4" aria-hidden />
          Back to dashboard
        </Link>
      </Button>

      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="overflow-hidden rounded-3xl border border-border bg-card shadow-soft"
      >
        <div className="gradient-brand relative grid place-items-center px-6 py-16">
          <div className="surface-grid absolute inset-0 opacity-20" aria-hidden />
          <motion.span
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="relative grid size-24 place-items-center rounded-3xl bg-card/95 shadow-lift"
          >
            <Icon className="size-11 text-primary" aria-hidden />
          </motion.span>
        </div>

        <div className="space-y-6 p-6 sm:p-10">
          <div className="space-y-3">
            <StatusBadge tone="warning">Feature Under Development</StatusBadge>
            <h1 className="font-display text-3xl font-bold text-foreground">{title}</h1>
            <p className="text-base font-medium text-primary">{tagline}</p>
            <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-6">
            <h2 className="flex items-center gap-2 font-display text-sm font-semibold text-foreground">
              <Sparkles className="size-4 text-teal" aria-hidden />
              Expected capabilities
            </h2>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {capabilities.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border p-6">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Estimated availability</p>
              <p className="mt-1 font-display text-sm font-semibold text-foreground">{timeline}</p>
            </div>
            <Button asChild variant="outline">
              <Link to="/dashboard">Return to overview</Link>
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
