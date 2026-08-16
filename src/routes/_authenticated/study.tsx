import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Coffee, Minimize2, Pause, Play, Plus, Square, Timer as TimerIcon } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  useCreateSession,
  useLearningDays,
  useProfile,
  useSubjects,
  useUpdateLearningDay,
  useUpdateSession,
} from "@/lib/db";
import { minutesLabel, todayISO, todaysPlan } from "@/lib/scheduling";

export const Route = createFileRoute("/_authenticated/study")({
  head: () => ({
    meta: [
      { title: "Study session — My Study Compass" },
      { name: "description", content: "Run a focused study session with a countdown timer, objectives and a post-session reflection." },
      { property: "og:title", content: "Study session — My Study Compass" },
      { property: "og:description", content: "Timer, objectives, notes and reflection in one screen." },
    ],
  }),
  component: StudyPage,
});

const DURATIONS = [30, 45, 60, 90, 120, 180];

const fmt = (s: number) => {
  const sec = Math.max(0, s);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const r = sec % 60;
  return (h ? `${h}:${String(m).padStart(2, "0")}` : `${m}`) + `:${String(r).padStart(2, "0")}`;
};

type Phase = "setup" | "running" | "reflect";

function StudyPage() {
  const navigate = useNavigate();
  const profile = useProfile();
  const subjects = useSubjects();
  const days = useLearningDays();
  const createSession = useCreateSession();
  const updateSession = useUpdateSession();
  const updateDay = useUpdateLearningDay();

  const today = todayISO();
  const plan = useMemo(() => todaysPlan(days.data ?? [], today), [days.data, today]);

  const [phase, setPhase] = useState<Phase>("setup");
  const [subjectId, setSubjectId] = useState<string>("");
  const [dayId, setDayId] = useState<string>("");
  const [topic, setTopic] = useState("");
  const [planned, setPlanned] = useState(120);
  const [focusMode, setFocusMode] = useState(false);
  const [pomodoro, setPomodoro] = useState(false);
  const [onBreak, setOnBreak] = useState(false);

  const [remaining, setRemaining] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [paused, setPaused] = useState(false);
  const [notes, setNotes] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);

  const [reflect, setReflect] = useState({
    completed: "",
    struggled: "",
    difficulty: 3,
    understood: true,
    practice: false,
  });

  const tick = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (profile.data) setPlanned(profile.data.default_session_minutes);
  }, [profile.data]);

  useEffect(() => {
    if (!subjectId && plan.length > 0) {
      setSubjectId(plan[0]!.subject_id);
      setDayId(plan[0]!.id);
      setTopic(plan[0]!.topic);
    }
  }, [plan, subjectId]);

  const focusLen = profile.data?.pomodoro_focus_minutes ?? 25;
  const breakLen = profile.data?.pomodoro_break_minutes ?? 5;

  useEffect(() => {
    if (phase !== "running" || paused) return;
    tick.current = setInterval(() => {
      setRemaining((r) => r - 1);
      if (!onBreak) setElapsed((e) => e + 1);
    }, 1000);
    return () => {
      if (tick.current) clearInterval(tick.current);
    };
  }, [phase, paused, onBreak]);

  useEffect(() => {
    if (phase !== "running" || remaining > 0) return;
    if (pomodoro) {
      const next = !onBreak;
      setOnBreak(next);
      setRemaining((next ? breakLen : focusLen) * 60);
      toast.info(next ? "Break time — step away for a few minutes." : "Back to focus.");
    } else {
      toast.success("Session complete.");
      finish();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining, phase]);

  const selectedDays = (days.data ?? []).filter((d) => d.subject_id === subjectId);

  const start = async () => {
    if (!subjectId && !topic.trim()) {
      toast.error("Pick a subject or type what you're studying.");
      return;
    }
    const length = pomodoro ? focusLen : planned;
    try {
      const s = await createSession.mutateAsync({
        subject_id: subjectId || null,
        learning_day_id: dayId || null,
        topic: topic.trim() || null,
        mode: pomodoro ? "focus" : "study",
        planned_minutes: planned,
      });
      setSessionId(s?.id ?? null);
      setRemaining(length * 60);
      setElapsed(0);
      setOnBreak(false);
      setPaused(false);
      setPhase("running");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not start session");
    }
  };

  const finish = () => {
    if (tick.current) clearInterval(tick.current);
    setPhase("reflect");
  };

  const saveReflection = async () => {
    const minutes = Math.max(1, Math.round(elapsed / 60));
    try {
      if (sessionId) {
        await updateSession.mutateAsync({
          id: sessionId,
          actual_minutes: minutes,
          ended_at: new Date().toISOString(),
          completed_notes: [reflect.completed, notes].filter(Boolean).join("\n\n") || null,
          struggled_with: reflect.struggled || null,
          difficulty: reflect.difficulty,
          understood: reflect.understood,
          wants_practice: reflect.practice,
        });
      }
      if (dayId && reflect.understood) {
        await updateDay.mutateAsync({
          id: dayId,
          status: "completed",
          completed_at: new Date().toISOString(),
        });
      }
      toast.success(`Logged ${minutesLabel(minutes)} of study.`);
      navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save your session");
    }
  };

  /* -------- running (and focus mode) -------- */
  if (phase === "running") {
    const total = (pomodoro ? (onBreak ? breakLen : focusLen) : planned) * 60;
    const pct = Math.min(100, ((total - remaining) / Math.max(total, 1)) * 100);

    const timerBlock = (
      <div className="flex flex-col items-center gap-6">
        <Badge variant={onBreak ? "secondary" : "outline"} className="gap-1">
          {onBreak ? <Coffee className="size-3" /> : <TimerIcon className="size-3" />}
          {onBreak ? "Break" : pomodoro ? "Pomodoro focus" : "Study"}
        </Badge>
        <p className="tabular text-6xl font-semibold md:text-7xl">{fmt(remaining)}</p>
        <div className="w-full max-w-md">
          <Progress value={pct} />
          <p className="mt-2 text-center text-xs text-muted-foreground">
            {minutesLabel(Math.round(elapsed / 60))} focused so far
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          <Button variant="outline" onClick={() => setPaused((p) => !p)}>
            {paused ? <Play className="size-4" /> : <Pause className="size-4" />}
            {paused ? "Resume" : "Pause"}
          </Button>
          <Button variant="outline" onClick={() => setRemaining((r) => r + 10 * 60)}>
            <Plus className="size-4" /> 10 min
          </Button>
          <Button onClick={finish}>
            <Square className="size-4" /> Finish
          </Button>
        </div>
      </div>
    );

    if (focusMode) {
      return (
        <div className="flex min-h-dvh flex-col items-center justify-center gap-8 bg-background px-6">
          <p className="text-sm font-medium text-muted-foreground">{topic || "Focus"}</p>
          {timerBlock}
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Quick notes…"
            className="max-w-md"
          />
          <Button variant="ghost" size="sm" onClick={() => setFocusMode(false)}>
            <Minimize2 className="size-4" /> Exit focus mode
          </Button>
        </div>
      );
    }

    const objectives =
      (days.data ?? []).find((d) => d.id === dayId)?.subtopics ?? [];

    return (
      <AppShell title="Session">
        <div className="space-y-6">
          <section className="surface p-6">
            <div className="mb-6 text-center">
              <p className="text-sm font-medium">
                {subjects.data?.find((s) => s.id === subjectId)?.name ?? "Free study"}
              </p>
              <p className="text-xs text-muted-foreground">{topic}</p>
            </div>
            {timerBlock}
            <div className="mt-6 flex justify-center">
              <Button variant="ghost" size="sm" onClick={() => setFocusMode(true)}>
                <Minimize2 className="size-4" /> Enter focus mode
              </Button>
            </div>
          </section>

          {objectives.length > 0 && (
            <section className="surface p-5">
              <h3 className="text-sm font-semibold">Today's objectives</h3>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                {objectives.map((o) => (
                  <li key={o}>· {o}</li>
                ))}
              </ul>
            </section>
          )}

          <section className="surface space-y-2 p-5">
            <Label htmlFor="notes">Session notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Jot anything down while you study…"
              rows={5}
            />
          </section>
        </div>
      </AppShell>
    );
  }

  /* -------- reflection -------- */
  if (phase === "reflect") {
    return (
      <AppShell title="Session review">
        <div className="space-y-5">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">How did it go?</h2>
            <p className="text-sm text-muted-foreground">
              This shapes your revision schedule and tomorrow's plan.
            </p>
          </div>

          <section className="surface space-y-5 p-5">
            <div className="space-y-1.5">
              <Label htmlFor="c">What did you complete?</Label>
              <Textarea id="c" value={reflect.completed} onChange={(e) => setReflect({ ...reflect, completed: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="s">What did you struggle with?</Label>
              <Textarea id="s" value={reflect.struggled} onChange={(e) => setReflect({ ...reflect, struggled: e.target.value })} />
            </div>
            <div className="space-y-3">
              <Label>How difficult was it? ({reflect.difficulty}/5)</Label>
              <Slider
                value={[reflect.difficulty]}
                min={1}
                max={5}
                step={1}
                onValueChange={([v]) => setReflect({ ...reflect, difficulty: v ?? 3 })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="u">Did you understand the topic?</Label>
              <Switch id="u" checked={reflect.understood} onCheckedChange={(v) => setReflect({ ...reflect, understood: v })} />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="p">Want extra practice on this?</Label>
              <Switch id="p" checked={reflect.practice} onCheckedChange={(v) => setReflect({ ...reflect, practice: v })} />
            </div>
            <Button className="w-full" size="lg" onClick={saveReflection} disabled={updateSession.isPending}>
              Save session
            </Button>
          </section>
        </div>
      </AppShell>
    );
  }

  /* -------- setup -------- */
  return (
    <AppShell title="Study">
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Start a session</h2>
          <p className="text-sm text-muted-foreground">Pick what you're working on and for how long.</p>
        </div>

        {plan.length > 0 && (
          <section className="space-y-2">
            <h3 className="text-sm font-semibold">From today's plan</h3>
            <div className="grid gap-2 sm:grid-cols-2">
              {plan.map((d) => (
                <button
                  key={d.id}
                  onClick={() => {
                    setSubjectId(d.subject_id);
                    setDayId(d.id);
                    setTopic(d.topic);
                    setPlanned(d.estimated_minutes);
                  }}
                  className={cn(
                    "surface p-4 text-left transition-colors",
                    dayId === d.id && "border-primary ring-1 ring-primary",
                  )}
                >
                  <p className="text-sm font-medium">{d.topic}</p>
                  <p className="text-xs text-muted-foreground">
                    {d.subject?.name} · {minutesLabel(d.estimated_minutes)}
                  </p>
                </button>
              ))}
            </div>
          </section>
        )}

        <section className="surface space-y-5 p-5">
          <div className="space-y-1.5">
            <Label>Subject</Label>
            <Select
              value={subjectId}
              onValueChange={(v) => {
                setSubjectId(v);
                setDayId("");
              }}
            >
              <SelectTrigger><SelectValue placeholder="Free study" /></SelectTrigger>
              <SelectContent>
                {(subjects.data ?? []).map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedDays.length > 0 && (
            <div className="space-y-1.5">
              <Label>Plan day (optional)</Label>
              <Select
                value={dayId}
                onValueChange={(v) => {
                  setDayId(v);
                  const d = selectedDays.find((x) => x.id === v);
                  if (d) {
                    setTopic(d.topic);
                    setPlanned(d.estimated_minutes);
                  }
                }}
              >
                <SelectTrigger><SelectValue placeholder="Not tied to a plan day" /></SelectTrigger>
                <SelectContent>
                  {selectedDays.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      Day {d.day_number} — {d.topic}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="t">Topic</Label>
            <Input id="t" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="What are you studying?" />
          </div>

          <div className="space-y-2">
            <Label>Duration</Label>
            <div className="flex flex-wrap gap-2">
              {DURATIONS.map((m) => (
                <button
                  key={m}
                  onClick={() => setPlanned(m)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-sm transition-colors",
                    planned === m
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-muted-foreground hover:border-primary/40",
                  )}
                >
                  {minutesLabel(m)}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 pt-1">
              <Label htmlFor="cd" className="text-xs text-muted-foreground">Custom (minutes)</Label>
              <Input
                id="cd"
                type="number"
                min="5"
                step="5"
                className="w-28"
                value={planned}
                onChange={(e) => setPlanned(Math.max(5, parseInt(e.target.value || "5", 10)))}
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <Label htmlFor="pom">Pomodoro mode</Label>
              <p className="text-xs text-muted-foreground">
                {focusLen}/{breakLen} intervals, adjustable in Settings.
              </p>
            </div>
            <Switch id="pom" checked={pomodoro} onCheckedChange={setPomodoro} />
          </div>

          <Button size="lg" className="w-full" onClick={start} disabled={createSession.isPending}>
            <Play className="size-4" /> Start session
          </Button>
        </section>
      </div>
    </AppShell>
  );
}
