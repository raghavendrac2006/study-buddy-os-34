import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Sparkles } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useProfile, useUpdateProfile } from "@/lib/db";
import { isoAddDays, todayISO } from "@/lib/scheduling";
import { SUBJECT_TEMPLATES, type SubjectTemplate } from "@/lib/templates";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({
    meta: [
      { title: "Set up your plan — My Study Compass" },
      { name: "description", content: "Tell your study system what you're learning and how much time you have." },
      { property: "og:title", content: "Set up your plan — My Study Compass" },
      { property: "og:description", content: "Create your first study plan in under a minute." },
    ],
  }),
  component: Onboarding,
});

function Onboarding() {
  const navigate = useNavigate();
  const { data: profile } = useProfile();
  const updateProfile = useUpdateProfile();
  const [name, setName] = useState("");
  const [picked, setPicked] = useState<string[]>(["Java", "DSA", "Aptitude"]);
  const [hours, setHours] = useState("2");
  const [studyTime, setStudyTime] = useState("19:00");
  const [goals, setGoals] = useState("");
  const [level, setLevel] = useState("beginner");
  const [busy, setBusy] = useState(false);

  const toggle = (n: string) =>
    setPicked((p) => (p.includes(n) ? p.filter((x) => x !== n) : [...p, n]));

  const finish = async () => {
    if (picked.length === 0) {
      toast.error("Pick at least one subject to start with.");
      return;
    }
    setBusy(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user!.id;
      const templates = SUBJECT_TEMPLATES.filter((t) => picked.includes(t.name));

      const { data: subjects, error } = await supabase
        .from("subjects")
        .insert(
          templates.map((t: SubjectTemplate, i) => ({
            user_id: userId,
            name: t.name,
            description: t.description,
            icon: t.icon,
            color: t.color,
            category: t.category,
            difficulty: t.difficulty,
            start_date: todayISO(),
            target_date: isoAddDays(todayISO(), t.days.length - 1),
            total_planned_days: t.days.length,
            sort_order: i,
          })),
        )
        .select("id,name");
      if (error) throw error;

      const rows = (subjects ?? []).flatMap((s) => {
        const t = templates.find((x) => x.name === s.name)!;
        return t.days.map((d, idx) => ({
          user_id: userId,
          subject_id: s.id,
          day_number: idx + 1,
          planned_date: isoAddDays(todayISO(), idx),
          topic: d.topic,
          subtopics: d.subtopics,
          estimated_minutes: d.minutes,
        }));
      });
      if (rows.length) {
        const { error: dayErr } = await supabase.from("learning_days").insert(rows);
        if (dayErr) throw dayErr;
      }

      await updateProfile.mutateAsync({
        display_name: name || profile?.display_name || null,
        daily_target_minutes: Math.round(parseFloat(hours || "2") * 60),
        preferred_study_time: studyTime,
        coding_level: level,
        onboarded: true,
      });

      toast.success("Your plan is ready.");
      navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create your plan");
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
          <h2 className="text-2xl font-semibold tracking-tight">Let's build your first plan</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Everything here can be edited later in Settings and Learn.
          </p>
        </div>

        <section className="surface space-y-4 p-5">
          <div className="space-y-1.5">
            <Label htmlFor="n">What should I call you?</Label>
            <Input id="n" value={name} onChange={(e) => setName(e.target.value)} placeholder={profile?.display_name ?? "Your name"} />
          </div>

          <div className="space-y-2">
            <Label>What are you learning right now?</Label>
            <div className="flex flex-wrap gap-2">
              {SUBJECT_TEMPLATES.map((t) => (
                <button
                  key={t.name}
                  type="button"
                  onClick={() => toggle(t.name)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-sm transition-colors",
                    picked.includes(t.name)
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-muted-foreground hover:border-primary/40",
                  )}
                >
                  {t.name}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Each pick creates a starter day-wise plan you can fully edit.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="h">Hours per day</Label>
              <Input id="h" type="number" min="0.5" step="0.5" value={hours} onChange={(e) => setHours(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="t">Usual study time</Label>
              <Input id="t" type="time" value={studyTime} onChange={(e) => setStudyTime(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Current coding level</Label>
            <div className="flex gap-2">
              {["beginner", "intermediate", "advanced"].map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLevel(l)}
                  className={cn(
                    "flex-1 rounded-lg border px-3 py-2 text-sm capitalize transition-colors",
                    level === l ? "border-primary bg-accent text-accent-foreground" : "border-border text-muted-foreground",
                  )}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="g">Your goals (optional)</Label>
            <Textarea id="g" value={goals} onChange={(e) => setGoals(e.target.value)} placeholder="e.g. Finish Java in 30 days, be placement-ready by December." />
          </div>

          <Button className="w-full" size="lg" onClick={finish} disabled={busy}>
            {busy && <Loader2 className="size-4 animate-spin" />}
            Create my plan
          </Button>
        </section>
      </div>
    </AppShell>
  );
}
