import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import type { ReactNode } from "react";
import { CheckCircle2, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/shared/logo";

const highlights = [
  "AES-256 encrypted medical vault",
  "Field-level consent on every share",
  "Instant revocation and access logs",
];

export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="grid min-h-screen w-full items-stretch lg:grid-cols-2 bg-background">
      <div className="flex flex-col justify-center px-4 py-10 sm:px-10">
        <div className="mx-auto w-full max-w-md">
          <Link to="/" className="inline-flex">
            <Logo />
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="mt-10"
          >
            <h1 className="font-display text-3xl font-bold text-foreground">{title}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
            <div className="mt-8">{children}</div>
            <div className="mt-6 text-sm text-muted-foreground">{footer}</div>
          </motion.div>
        </div>
      </div>

      <aside className="gradient-brand relative hidden flex-col justify-between p-12 lg:flex h-full min-h-screen">
        <div className="surface-grid absolute inset-0 opacity-20" aria-hidden />
        <div className="relative">
          <span className="inline-flex items-center gap-2 rounded-full bg-primary-foreground/15 px-3 py-2 text-xs font-semibold text-primary-foreground">
            <ShieldCheck className="size-3.5" aria-hidden />
            Security by design
          </span>
        </div>
        <div className="relative">
          <p className="font-display text-3xl font-bold leading-tight text-primary-foreground">
            One vault for every report, prescription and scan.
          </p>
          <ul className="mt-8 space-y-3">
            {highlights.map((item) => (
              <li key={item} className="flex items-center gap-3 text-sm text-primary-foreground/90">
                <CheckCircle2 className="size-4 shrink-0" aria-hidden />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-primary-foreground/70">
          Demo environment — no real patient data is processed.
        </p>
      </aside>
    </div>
  );
}
