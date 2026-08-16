import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "My Study Compass — Your Personal Study Mentor" },
      {
        name: "description",
        content:
          "Upload your own study material, get an adaptive plan, and know exactly what to study today.",
      },
      { property: "og:title", content: "My Study Compass — Your Personal Study Mentor" },
      {
        property: "og:description",
        content: "Adaptive daily missions, mastery tracking and spaced revision from your own material.",
      },
    ],
  }),
  beforeLoad: () => {
    throw redirect({ to: "/dashboard" });
  },
  component: () => null,
});
