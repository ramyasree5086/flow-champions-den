import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TaskFlow — DevOps Task Board" },
      {
        name: "description",
        content:
          "TaskFlow lets you create, prioritize, and track tasks with due dates, statuses, filters, and a live statistics dashboard.",
      },
      { property: "og:title", content: "TaskFlow — DevOps Task Board" },
      {
        property: "og:description",
        content:
          "Create, prioritize, and track tasks with due dates, statuses, filters, and a live statistics dashboard.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      navigate({ to: data.user ? "/dashboard" : "/auth", replace: true });
    });
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex items-center gap-3">
        <div className="grid size-10 place-items-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
          <span className="font-display text-lg font-bold text-primary">T</span>
        </div>
        <span className="font-display text-xl font-semibold tracking-tight text-foreground">
          TaskFlow
        </span>
      </div>
    </div>
  );
}
