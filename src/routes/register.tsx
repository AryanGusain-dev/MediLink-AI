import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AuthLayout } from "@/components/layout/auth-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Create your account — MediLink AI" },
      { name: "description", content: "Create a free MediLink AI account and build a secure, shareable digital health record." },
      { property: "og:title", content: "Create your account — MediLink AI" },
      { property: "og:description", content: "Start your encrypted health vault in under two minutes." },
    ],
  }),
  component: RegisterPage,
});

interface FieldConfig {
  id: string;
  label: string;
  type: string;
  placeholder: string;
  autoComplete: string;
}

const fields: FieldConfig[] = [
  { id: "name", label: "Full name", type: "text", placeholder: "Ananya Sharma", autoComplete: "name" },
  { id: "email", label: "Email address", type: "email", placeholder: "you@example.com", autoComplete: "email" },
  { id: "phone", label: "Phone number", type: "tel", placeholder: "+91 98450 22119", autoComplete: "tel" },
  { id: "password", label: "Password", type: "password", placeholder: "••••••••", autoComplete: "new-password" },
  { id: "confirm", label: "Confirm password", type: "password", placeholder: "••••••••", autoComplete: "new-password" },
];

function RegisterPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const elements = e.currentTarget.elements;
    const name = (elements.namedItem("name") as HTMLInputElement).value;
    const email = (elements.namedItem("email") as HTMLInputElement).value;
    const phone = (elements.namedItem("phone") as HTMLInputElement).value;
    const password = (elements.namedItem("password") as HTMLInputElement).value;
    const confirm = (elements.namedItem("confirm") as HTMLInputElement).value;

    if (password !== confirm) {
      toast.error("Passwords do not match");
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
          phone: phone,
        },
      },
    });

    setLoading(false);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Account created — welcome to MediLink AI");
      navigate({ to: "/dashboard" });
    }
  };

  return (
    <AuthLayout
      title="Create your health vault"
      subtitle="Two minutes to set up. Free forever for personal records."
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-primary hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        {fields.map((field) => (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id}>{field.label}</Label>
            <Input
              id={field.id}
              type={field.type}
              required
              placeholder={field.placeholder}
              autoComplete={field.autoComplete}
              className="h-10 rounded-xl"
            />
          </div>
        ))}

        <label className="flex items-start gap-2 text-sm text-muted-foreground">
          <Checkbox id="terms" required className="mt-0.5" />
          <span>
            I agree to the terms of service and consent to my records being stored securely.
          </span>
        </label>

        <Button type="submit" size="lg" className="w-full rounded-xl shadow-soft" disabled={loading}>
          {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
          {loading ? "Creating account…" : "Create account"}
        </Button>
      </form>
    </AuthLayout>
  );
}
