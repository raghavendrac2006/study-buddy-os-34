import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { CalendarDays, Flame, Target, Timer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Learning OS — Your Personal Study Mentor" },
      {
        name: "description",
        content:
          "Open it every morning and know exactly what to study: daily missions, day-wise subject plans, a focus timer and task tracking.",
      },
      { property: "og:title", content: "Learning OS — Your Personal Study Mentor" },
      {
        property: "og:description",
        content: "Daily study missions, day-wise plans, focus timer and streaks in one place.",
      },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  { icon: Target, title: "Today's Mission", body: "One screen that answers: what do I study today?" },
  { icon: CalendarDays, title: "Day-wise plans", body: "Build a 30-day plan per subject; miss a day and it reschedules itself." },
  { icon: Timer, title: "Focus sessions", body: "Study timer and Pomodoro mode with a post-session reflection." },
  { icon: Flame, title: "Streaks that don't punish", body: "Consistency tracking built for real life, not guilt." },
];

function Landing() {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto max-w-3xl px-5 py-20 md:py-28">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary">
          Personal learning operating system
        </p>
        <h1 className="mt-4 text-4xl font-semibold leading-[1.1] tracking-tight md:text-6xl">
          Stop asking
          <br />
          "what should I study today?"
        </h1>
        <p className="mt-5 max-w-xl text-base text-muted-foreground md:text-lg">
          A single-user study system: subjects, day-wise curriculum, a focus timer, tasks and
          streaks — with one big button that starts your day.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link to="/auth">Get started</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link to="/auth">I already have an account</Link>
          </Button>
        </div>

        <div className="mt-16 grid gap-3 sm:grid-cols-2">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <div key={title} className="surface p-5">
              <Icon className="size-5 text-primary" />
              <h2 className="mt-3 text-sm font-semibold">{title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
