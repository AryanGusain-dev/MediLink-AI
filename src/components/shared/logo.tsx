import { cn } from "@/lib/utils";
import logoImg from "@/assets/Logo.png";

export function Logo({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <span className="grid size-8 shrink-0 place-items-center rounded-xl overflow-hidden shadow-soft">
        <img src={logoImg} alt="MediLink AI Logo" className="size-full object-contain" />
      </span>
      {!compact ? (
        <span className="font-display text-base font-bold tracking-tight text-foreground">
          MediLink<span className="text-primary"> AI</span>
        </span>
      ) : null}
    </span>
  );
}
