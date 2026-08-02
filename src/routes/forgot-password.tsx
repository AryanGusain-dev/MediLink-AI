import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { CheckCircle2, Loader2, Mail } from "lucide-react";
import { AuthLayout } from "@/components/layout/auth-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Reset your password — MediLink AI" },
      { name: "description", content: "Request a secure password reset link for your MediLink AI health record account." },
      { property: "og:title", content: "Reset your password — MediLink AI" },
      { property: "og:description", content: "Recover access to your MediLink AI health vault." },
    ],
  }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [state, setState] = useState<"idle" | "loading" | "sent">("idle");

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setState("loading");

    const email = (e.currentTarget.elements.namedItem("email") as HTMLInputElement).value;

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      toast.error(error.message);
      setState("idle");
    } else {
      setState("sent");
    }
  };

  return (
    <AuthLayout
      title="Reset your password"
      subtitle="We'll email you a secure link to set a new password."
      footer={
        <>
          Remembered it?{" "}
          <Link to="/login" className="font-semibold text-primary hover:underline">
            Back to sign in
          </Link>
        </>
      }
    >
      {state === "sent" ? (
        <div className="rounded-2xl border border-success/30 bg-success/10 p-6 text-center">
          <CheckCircle2 className="mx-auto size-8 text-success" aria-hidden />
          <h2 className="mt-3 font-display text-lg font-semibold text-foreground">Check your inbox</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            If an account exists for that address, a reset link is on its way. It expires in 30 minutes.
          </p>
          <Button variant="outline" className="mt-6 rounded-xl" onClick={() => setState("idle")}>
            Use a different email
          </Button>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email">Email address</Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input id="email" type="email" required placeholder="you@example.com" className="h-10 rounded-xl pl-10" />
            </div>
          </div>
          <Button type="submit" size="lg" className="w-full rounded-xl shadow-soft" disabled={state === "loading"}>
            {state === "loading" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
            {state === "loading" ? "Sending link…" : "Send reset link"}
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
