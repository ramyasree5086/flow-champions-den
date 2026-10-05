import { createFileRoute, redirect } from "@tanstack/react-router";

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
  beforeLoad: () => {
    throw redirect({ to: "/dashboard" });
  },
});
