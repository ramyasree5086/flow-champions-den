import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — TaskFlow" },
      { name: "description", content: "Sign in or create your TaskFlow account to manage your tasks." },
      { property: "og:title", content: "Sign in — TaskFlow" },
      { property: "og:description", content: "Sign in or create your TaskFlow account to manage your tasks." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  async function handleEmailSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: displayName.trim() },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        if (!data.session) {
          toast.success("Account created — check your email to confirm, then sign in.");
          setMode("signin");
        } else {
          navigate({ to: "/dashboard" });
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/dashboard" });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Google sign-in failed. Please try again.");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/dashboard" });
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute -top-48 -left-44 h-[560px] w-[560px] rounded-full bg-primary/20 blur-[130px]" />
      <div className="pointer-events-none absolute -bottom-56 -right-40 h-[520px] w-[520px] rounded-full bg-accent/15 blur-[130px]" />

      <div className="relative flex min-h-screen items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="flex items-center justify-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
              <span className="font-display text-lg font-bold text-primary">T</span>
            </div>
            <div className="leading-tight">
              <div className="font-display text-xl font-semibold tracking-tight">TaskFlow</div>
              <div className="text-xs text-muted-foreground">DevOps project board</div>
            </div>
          </div>

          <div className="glass-card mt-8 p-6 sm:p-8">
            <h1 className="font-display text-2xl font-semibold tracking-tight">
              {mode === "signin" ? "Welcome back" : "Create your account"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {mode === "signin"
                ? "Sign in to pick up where you left off."
                : "Start tracking your tasks in under a minute."}
            </p>

            <form onSubmit={handleEmailSubmit} className="mt-6 space-y-3">
              {mode === "signup" && (
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Display name"
                  className="w-full rounded-lg bg-secondary px-3 py-2.5 text-sm text-foreground ring-1 ring-border outline-none placeholder:text-muted-foreground/70 focus:ring-2 focus:ring-primary/40"
                />
              )}
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                className="w-full rounded-lg bg-secondary px-3 py-2.5 text-sm text-foreground ring-1 ring-border outline-none placeholder:text-muted-foreground/70 focus:ring-2 focus:ring-primary/40"
              />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full rounded-lg bg-secondary px-3 py-2.5 text-sm text-foreground ring-1 ring-border outline-none placeholder:text-muted-foreground/70 focus:ring-2 focus:ring-primary/40"
              />
              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground ring-1 ring-primary/30 transition-colors hover:bg-primary/90 disabled:opacity-60"
              >
                {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
              </button>
            </form>

            <div className="my-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs text-muted-foreground">or</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <button
              type="button"
              onClick={handleGoogle}
              className="w-full rounded-lg bg-card px-4 py-2.5 text-sm font-medium text-foreground ring-1 ring-border transition-colors hover:bg-secondary"
            >
              Continue with Google
            </button>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              {mode === "signin" ? "New to TaskFlow?" : "Already have an account?"}{" "}
              <button
                type="button"
                onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
                className="font-medium text-primary hover:underline"
              >
                {mode === "signin" ? "Create an account" : "Sign in"}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
