import { Link } from "@tanstack/react-router";
import { Logo } from "@/components/shared/logo";

const columns = [
  {
    title: "Platform",
    items: [
      { label: "Dashboard", to: "/dashboard" },
      { label: "Documents", to: "/dashboard/documents" },
      { label: "Report Scanner", to: "/dashboard/scanner" },
      { label: "QR Codes", to: "/dashboard/qr" },
    ],
  },
  {
    title: "Coming soon",
    items: [
      { label: "AI Assistant", to: "/dashboard/soon/ai-assistant" },
      { label: "Telemedicine", to: "/dashboard/soon/telemedicine" },
      { label: "Emergency", to: "/dashboard/soon/emergency" },
      { label: "Health Analytics", to: "/dashboard/soon/health-analytics" },
    ],
  },
  {
    title: "Account",
    items: [
      { label: "Sign in", to: "/login" },
      { label: "Create account", to: "/register" },
      { label: "Reset password", to: "/forgot-password" },
    ],
  },
] as const;

export function MarketingFooter() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div className="space-y-4">
          <Logo />
          <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
            Secure digital health records with AI-ready structure — built for patients, trusted by clinicians.
          </p>
          <p className="text-xs text-muted-foreground">
            HIPAA-aligned practices · AES-256 encryption at rest · Consent-first sharing
          </p>
        </div>

        {columns.map((column) => (
          <div key={column.title}>
            <h3 className="font-display text-sm font-semibold text-foreground">{column.title}</h3>
            <ul className="mt-4 space-y-3">
              {column.items.map((item) => (
                <li key={item.label}>
                  <Link
                    to={item.to as never}
                    className="text-sm text-muted-foreground transition-colors hover:text-primary"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>© {new Date().getFullYear()} MediLink AI. All rights reserved.</p>
          <p>Demo product — no real medical data is stored.</p>
        </div>
      </div>
    </footer>
  );
}
