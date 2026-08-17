import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus, Sparkles, X } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useProfile, useUpdateProfile, useCreateSubject } from "@/lib/db";
import { isoAddDays, todayISO } from "@/lib/scheduling";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({
    meta: [
      { title: "Set up your plan — My Study Compass" },
      {
        name: "description",
        content: "Tell your study system what you're learning and how much time you have.",
      },
      { property: "og:title", content: "Set up your plan — My Study Compass" },
      { property: "og:description", content: "Create your own subjects in under a minute." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Onboarding,
});

const IDEAS = ["Spring Boot", "React", "AWS", "DBMS", "Machine Learning", "Aptitude", "Reasoning"];

function Onboarding() {
  const navigate = useNavigate();
  const { data: profile } = useProfile();
  const updateProfile = useUpdateProfile();
  const createSubject = useCreateSubject();

  const [name, setName] = useState("");
  const [subjects, setSubjects] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [hours, setHours] = useState("2");
  const [studyTime, setStudyTime] = useState("19:00");
  const [level, setLevel] = useState("beginner");
  const [busy, setBusy] = useState(false);

  const add = (value: string) => {
    const v = value.trim();
    if (!v) return;
    setSubjects((s) => (s.some((x) => x.toLowerCase() === v.toLowerCase()) ? s : [...s, v]));
    setDraft("");
  };

  const finish = async () => {
    setBusy(true);
    try {
      for (const [i, subject] of subjects.entries()) {
        await createSubject.mutateAsync({
          name: subject,
          start_date: todayISO(),
          target_date: isoAddDays(todayISO(), 29),
          total_planned_days: 30,
          sort_order: i,
        });
      }

      await updateProfile.mutateAsync({
        display_name: name || profile?.display_name || null,
        daily_target_minutes: Math.round(parseFloat(hours || "2") * 60),
        preferred_study_time: studyTime,
        coding_level: level,
        onboarded: true,
      });

      toast.success("You're set up. Add a learning source to build your plan.");
      navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not finish setup");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell title="Set up">
      <div className="space-y-6">
        <div>
          <Badge variant="secondary" className="mb-3">
            <Sparkles className="size-3" /> First-time setup
          </Badge>
          <h1 className="text-2xl font-semibold tracking-tight">Let's set up your workspace</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Nothing is pre-filled — you create your own subjects, then add a document or a YouTube
            course and the plan is generated from your own material.
          </p>
        </div>

        <section className="surface space-y-4 p-5">
          <div className="space-y-1.5">
            <Label htmlFor="n">What should I call you?</Label>
            <Input
              id="n"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={profile?.display_name ?? "Your name"}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="s">Your subjects (optional — add any you like)</Label>
            <div className="flex gap-2">
              <Input
                id="s"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    add(draft);
                  }
                }}
                placeholder="e.g. Spring Boot"
              />
              <Button type="button" variant="outline" onClick={() => add(draft)} disabled={!draft.trim()}>
                <Plus className="size-4" /> Add
              </Button>
            </div>
            {subjects.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {subjects.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSubjects((list) => list.filter((x) => x !== s))}
                    className="flex items-center gap-1 rounded-full border border-primary bg-primary px-3 py-1.5 text-sm text-primary-foreground"
                  >
                    {s} <X className="size-3" />
                  </button>
                ))}
              </div>
            )}
            <div className="flex flex-wrap gap-2 pt-1">
              {IDEAS.filter((i) => !subjects.some((s) => s.toLowerCase() === i.toLowerCase())).map(
                (i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => add(i)}
                    className="rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/40"
                  >
                    + {i}
                  </button>
                ),
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Subjects are just containers — no curriculum is created for you.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="h">Hours per day</Label>
              <Input
                id="h"
                type="number"
                min="0.5"
                step="0.5"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="t">Usual study time</Label>
              <Input
                id="t"
                type="time"
                value={studyTime}
                onChange={(e) => setStudyTime(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Current level</Label>
            <div className="flex gap-2">
              {["beginner", "intermediate", "advanced"].map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLevel(l)}
                  className={cn(
                    "flex-1 rounded-lg border px-3 py-2 text-sm capitalize transition-colors",
                    level === l
                      ? "border-primary bg-accent text-accent-foreground"
                      : "border-border text-muted-foreground",
                  )}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          <Button className="w-full" size="lg" onClick={finish} disabled={busy}>
            {busy && <Loader2 className="size-4 animate-spin" />}
            Finish setup
          </Button>
        </section>
      </div>
    </AppShell>
  );
}
