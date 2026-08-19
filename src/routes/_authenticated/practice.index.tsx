import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Brain, CheckCircle2, Settings2, Timer, XCircle } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PracticeTabs } from "@/components/practice-tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useProfile, useUpdateProfile } from "@/lib/db";
import {
  useQuestions,
  usePracticeSessions,
  usePracticeAttempts,
  useSavePracticeRun,
  type FinishedAttempt,
  type PracticeQuestion,
} from "@/lib/practice-db";
import { DIFFICULTIES, formatDuration, selectQuestions, topicStats } from "@/lib/practice";

export const Route = createFileRoute("/_authenticated/practice/")({
  head: () => ({
    meta: [
      { title: "Daily Practice — My Study Compass" },
      {
        name: "description",
        content: "A short morning routine of aptitude and reasoning questions with instant feedback.",
      },
      { property: "og:title", content: "Daily Practice — My Study Compass" },
      { property: "og:description", content: "5–7 questions, 10–15 minutes, instant explanations." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DailyPractice,
});

type Stage = "idle" | "running" | "done";

function DailyPractice() {
  const profile = useProfile();
  const updateProfile = useUpdateProfile();
  const questions = useQuestions();
  const sessions = usePracticeSessions(20);
  const attempts = usePracticeAttempts(500);
  const saveRun = useSavePracticeRun();

  const [stage, setStage] = useState<Stage>("idle");
  const [showSettings, setShowSettings] = useState(false);
  const [queue, setQueue] = useState<PracticeQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [results, setResults] = useState<FinishedAttempt[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const questionStart = useRef(Date.now());
  const runStart = useRef(Date.now());
  const saved = useRef(false);

  const mode = profile.data?.practice_mode ?? "mixed";
  const count = profile.data?.practice_questions_per_day ?? 5;
  const targetMinutes = profile.data?.practice_target_minutes ?? 12;
  const difficulty = profile.data?.practice_difficulty ?? "mixed";

  useEffect(() => {
    if (stage !== "running") return;
    const t = setInterval(() => setElapsed(Math.round((Date.now() - runStart.current) / 1000)), 1000);
    return () => clearInterval(t);
  }, [stage]);

  const history = useMemo(
    () =>
      (attempts.data ?? []).map((a) => ({
        topic: a.topic,
        is_correct: a.is_correct,
        question_id: a.question_id,
      })),
    [attempts.data],
  );

  const available = useMemo(
    () => selectQuestions(questions.data ?? [], { mode, count, difficulty, history }),
    [questions.data, mode, count, difficulty, history],
  );


  const bankSize = (questions.data ?? []).filter((q) => !q.archived).length;

  function start() {
    if (available.length === 0) {
      toast.error("No questions match your settings. Add some to your question bank first.");
      return;
    }
    setQueue(available);
    setIndex(0);
    setSelected(null);
    setResults([]);
    setElapsed(0);
    saved.current = false;
    runStart.current = Date.now();
    questionStart.current = Date.now();
    setStage("running");
  }

  const current = queue[index];

  function answer(i: number) {
    if (selected !== null || !current) return;
    setSelected(i);
    setResults((r) => [
      ...r,
      {
        question: current,
        selected_index: i,
        is_correct: i === current.correct_index,
        seconds_taken: Math.max(1, Math.round((Date.now() - questionStart.current) / 1000)),
      },
    ]);
  }

  function next() {
    if (index + 1 >= queue.length) {
      setStage("done");
      return;
    }
    setIndex((i) => i + 1);
    setSelected(null);
    questionStart.current = Date.now();
  }

  // Persist once when the run completes.
  useEffect(() => {
    if (stage !== "done" || saved.current || results.length === 0) return;
    saved.current = true;
    saveRun.mutate(
      {
        mode,
        targetMinutes,
        durationSeconds: Math.max(1, Math.round((Date.now() - runStart.current) / 1000)),
        attempts: results,
      },
      { onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save practice") },
    );
  }, [stage, results, mode, targetMinutes, saveRun]);

  const runStats = useMemo(() => {
    const correct = results.filter((r) => r.is_correct).length;
    return {
      correct,
      total: results.length,
      accuracy: results.length ? Math.round((correct / results.length) * 100) : 0,
      seconds: results.reduce((a, r) => a + r.seconds_taken, 0),
      topics: topicStats(results.map((r) => ({ topic: r.question.topic, is_correct: r.is_correct }))),
    };
  }, [results]);

  const weakTopics = useMemo(
    () => topicStats(attempts.data ?? []).filter((t) => t.total >= 3 && t.accuracy < 70).slice(0, 5),
    [attempts.data],
  );

  return (
    <AppShell title="Practice">
      <div className="space-y-6">
        <PracticeTabs />

        {stage === "idle" && (
          <>
            <section className="surface p-6 text-center sm:p-10">
              <Brain className="mx-auto size-6 text-primary" />
              <h2 className="mt-3 text-xl font-semibold tracking-tight">
                Daily {mode === "mixed" ? "Practice" : mode === "aptitude" ? "Aptitude" : "Reasoning"}
              </h2>
              {profile.isLoading || questions.isLoading ? (
                <Skeleton className="mx-auto mt-3 h-5 w-40" />
              ) : (
                <p className="mt-1 text-sm text-muted-foreground">
                  {available.length} Question{available.length === 1 ? "" : "s"} · ~{targetMinutes} min
                </p>
              )}
              <div className="mt-6 flex flex-col items-center gap-2">
                <Button size="lg" className="w-full sm:w-auto" onClick={start} disabled={bankSize === 0}>
                  Start Practice
                </Button>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setShowSettings((s) => !s)}>
                    <Settings2 className="size-4" /> Settings
                  </Button>
                  <Button variant="ghost" size="sm" asChild>
                    <Link to="/practice/questions">Manage questions</Link>
                  </Button>
                </div>
              </div>
              {bankSize === 0 && !questions.isLoading && (
                <p className="mt-4 text-xs text-muted-foreground">
                  Your question bank is empty — add questions or import a CSV to get started.
                </p>
              )}
            </section>

            {showSettings && (
              <section className="surface space-y-4 p-5">
                <h3 className="text-sm font-semibold">Daily configuration</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Practice mode</Label>
                    <Select
                      value={mode}
                      onValueChange={(v) => updateProfile.mutate({ practice_mode: v })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mixed">Mixed</SelectItem>
                        <SelectItem value="aptitude">Aptitude</SelectItem>
                        <SelectItem value="reasoning">Reasoning</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Difficulty</Label>
                    <Select
                      value={difficulty}
                      onValueChange={(v) => updateProfile.mutate({ practice_difficulty: v })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mixed">Mixed</SelectItem>
                        {DIFFICULTIES.map((d) => (
                          <SelectItem key={d} value={d}>
                            {d}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="qpd">Questions per day</Label>
                    <Input
                      id="qpd"
                      type="number"
                      min={1}
                      max={50}
                      defaultValue={count}
                      onBlur={(e) =>
                        updateProfile.mutate({
                          practice_questions_per_day: Math.min(50, Math.max(1, Number(e.target.value) || 5)),
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="tmin">Target duration (minutes)</Label>
                    <Input
                      id="tmin"
                      type="number"
                      min={1}
                      max={180}
                      defaultValue={targetMinutes}
                      onBlur={(e) =>
                        updateProfile.mutate({
                          practice_target_minutes: Math.min(180, Math.max(1, Number(e.target.value) || 12)),
                        })
                      }
                    />
                  </div>
                </div>
              </section>
            )}

            {weakTopics.length > 0 && (
              <section className="surface p-5">
                <h3 className="text-sm font-semibold">Weak topics</h3>
                <ul className="mt-3 space-y-2">
                  {weakTopics.map((t) => (
                    <li key={t.topic} className="flex items-center gap-3 text-sm">
                      <span className="min-w-0 flex-1 truncate">{t.topic}</span>
                      <span className="tabular text-xs text-muted-foreground">
                        {t.correct}/{t.total}
                      </span>
                      <Badge variant={t.accuracy < 50 ? "destructive" : "secondary"}>{t.accuracy}%</Badge>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section className="space-y-3">
              <h3 className="text-sm font-semibold tracking-tight">Practice history</h3>
              {sessions.isLoading ? (
                <Skeleton className="h-20 w-full rounded-xl" />
              ) : (sessions.data ?? []).length === 0 ? (
                <div className="surface p-5 text-sm text-muted-foreground">
                  No practice sessions yet.
                </div>
              ) : (
                <ul className="space-y-2">
                  {(sessions.data ?? []).map((s) => {
                    const acc = s.question_count
                      ? Math.round((s.correct_count / s.question_count) * 100)
                      : 0;
                    const topics = Object.keys((s.topics ?? {}) as Record<string, unknown>);
                    return (
                      <li key={s.id} className="surface flex flex-wrap items-center gap-3 p-4">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">
                            {s.practiced_on} · {s.mode}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {topics.slice(0, 4).join(" · ") || "No topics"}
                          </p>
                        </div>
                        <span className="tabular text-xs text-muted-foreground">
                          {formatDuration(s.duration_seconds)}
                        </span>
                        <Badge variant="secondary">
                          {s.correct_count}/{s.question_count} · {acc}%
                        </Badge>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </>
        )}

        {stage === "running" && current && (
          <section className="space-y-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                Question {index + 1} of {queue.length}
              </span>
              <span className="tabular flex items-center gap-1">
                <Timer className="size-3.5" /> {formatDuration(elapsed)}
              </span>
            </div>
            <Progress value={((index + (selected !== null ? 1 : 0)) / queue.length) * 100} />

            <div className="surface p-5">
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">{current.category}</Badge>
                <Badge variant="outline">{current.topic}</Badge>
                <Badge variant="outline">{current.difficulty}</Badge>
              </div>
              <p className="mt-4 whitespace-pre-wrap text-base font-medium leading-relaxed">
                {current.question}
              </p>

              <div className="mt-5 space-y-2">
                {current.options.map((opt, i) => {
                  const isCorrect = i === current.correct_index;
                  const chosen = selected === i;
                  const reveal = selected !== null;
                  return (
                    <button
                      key={i}
                      onClick={() => answer(i)}
                      disabled={reveal}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm transition-colors",
                        !reveal && "border-border hover:bg-accent/60",
                        reveal && chosen && isCorrect && "border-success bg-success/10 text-success",
                        reveal && chosen && !isCorrect && "border-destructive bg-destructive/10 text-destructive",
                        reveal && !chosen && isCorrect && "border-success bg-success/5",
                        reveal && !chosen && !isCorrect && "border-border opacity-60",
                      )}
                    >
                      <span className="text-xs font-semibold text-muted-foreground">
                        {String.fromCharCode(65 + i)}
                      </span>
                      <span className="min-w-0 flex-1">{opt}</span>
                      {reveal && chosen && (isCorrect ? <CheckCircle2 className="size-4" /> : <XCircle className="size-4" />)}
                    </button>
                  );
                })}
              </div>

              {selected !== null && selected !== current.correct_index && (
                <div className="mt-4 rounded-lg border border-border bg-accent/40 p-4">
                  <p className="text-sm font-semibold">
                    Correct answer: {String.fromCharCode(65 + current.correct_index)} ·{" "}
                    {current.options[current.correct_index]}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                    {current.explanation || "No explanation saved for this question."}
                  </p>
                </div>
              )}

              {selected !== null && (
                <Button className="mt-5 w-full" onClick={next}>
                  {index + 1 >= queue.length ? "Finish" : "Next question"}
                </Button>
              )}
            </div>
          </section>
        )}

        {stage === "done" && (
          <section className="space-y-4">
            <div className="surface p-6 text-center">
              <h2 className="text-xl font-semibold tracking-tight">Practice complete</h2>
              <p className="tabular mt-2 text-3xl font-semibold">
                {runStats.correct}/{runStats.total}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {runStats.accuracy}% accuracy · {formatDuration(runStats.seconds)}
              </p>
            </div>

            <div className="surface p-5">
              <h3 className="text-sm font-semibold">Topic-wise performance</h3>
              <ul className="mt-3 space-y-2">
                {runStats.topics.map((t) => (
                  <li key={t.topic} className="flex items-center gap-3 text-sm">
                    <span className="min-w-0 flex-1 truncate">{t.topic}</span>
                    <span className="tabular text-xs text-muted-foreground">
                      {t.correct}/{t.total}
                    </span>
                    <Badge variant={t.accuracy < 60 ? "destructive" : "secondary"}>{t.accuracy}%</Badge>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex gap-2">
              <Button className="flex-1" onClick={() => setStage("idle")}>
                Done
              </Button>
              <Button variant="outline" className="flex-1" onClick={start}>
                Practice again
              </Button>
            </div>
          </section>
        )}
      </div>
    </AppShell>
  );
}
