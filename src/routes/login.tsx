import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Eye, EyeOff, Loader2, Lock, Mail, Zap } from "lucide-react";
import { toast } from "sonner";
import { AuthLayout } from "@/components/layout/auth-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/lib/supabase";
import { resetThemeToLight } from "@/hooks/use-theme";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — MediLink AI" },
      { name: "description", content: "Sign in to your MediLink AI health vault to manage records, shares and QR access." },
      { property: "og:title", content: "Sign in — MediLink AI" },
      { property: "og:description", content: "Access your encrypted MediLink AI health record workspace." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      toast.error(error.message);
    } else {
      resetThemeToLight();
      toast.success("Welcome back to MediLink AI");
      navigate({ to: "/dashboard" });
    }
  };

  const handleTrialLogin = async () => {
    setLoading(true);
    const trialEmail = import.meta.env.VITE_TRIAL_USER_EMAIL || "rocksposiden@gmail.com";
    let trialPassword = import.meta.env.VITE_TRIAL_USER_PASSWORD || "patient#1";

    // Guarantee '#' is not truncated by dotenv comment parsing
    if (!trialPassword || trialPassword === "patient" || !trialPassword.includes("#")) {
      trialPassword = "patient#1";
    }

    setEmail(trialEmail);
    setPassword(trialPassword);

    const { error } = await supabase.auth.signInWithPassword({
      email: trialEmail,
      password: trialPassword,
    });

    setLoading(false);

    if (error) {
      toast.error(error.message);
    } else {
      resetThemeToLight();
      toast.success("Welcome back, Rahul!");
      navigate({ to: "/dashboard" });
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to access your encrypted health record workspace."
      footer={
        <>
          New to MediLink AI?{" "}
          <Link to="/register" className="font-semibold text-primary hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="email">Email address</Label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="h-10 rounded-xl pl-10"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <div className="relative flex items-center">
            <Lock className="pointer-events-none absolute left-3 size-4 text-muted-foreground" aria-hidden />
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="h-10 rounded-xl pl-10 pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 p-1 text-muted-foreground hover:text-foreground focus:outline-none transition-colors rounded-md"
              title={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <Checkbox id="remember" /> Remember this device
          </label>
          <Link to="/forgot-password" className="text-sm font-medium text-primary hover:underline">
            Forgot password?
          </Link>
        </div>

        <div className="space-y-3 pt-1">
          <Button type="submit" size="lg" className="w-full rounded-xl shadow-soft font-semibold" disabled={loading}>
            {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
            {loading ? "Signing in…" : "Sign in"}
          </Button>

          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={handleTrialLogin}
            disabled={loading}
            className="w-full rounded-xl border-emerald-500/35 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 hover:text-emerald-800 dark:hover:text-emerald-200 font-semibold gap-2 transition-all shadow-xs"
          >
            {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Zap className="size-4 text-emerald-500 fill-emerald-500" />}
            login as Rahul (trial)
          </Button>
        </div>
      </form>
    </AuthLayout>
  );
}
