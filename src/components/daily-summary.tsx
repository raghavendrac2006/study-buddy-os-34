import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLearningDays, useProfile, useSessions } from "@/lib/db";
import { isoAddDays, minutesLabel, todayISO, upcomingPlan } from "@/lib/scheduling";
import { useGoals, useAssessments } from "@/lib/workspace-db";
import { useCodingProblems, usePracticeSessions } from "@/lib/practice-db";
import { usePerformanceHistory, useRevisions, useTopics } from "@/lib/adaptive-db";

const dayISO = (d: Date) => d.toLocaleDateString("en-CA");

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="tabular text-sm font-medium text-right">{value}</span>
    </div>
  );
}

/**
 * Deterministic, AI-free digest of one day, aggregated from data the app
 * already stores. No new tables, no new analytics system.
 */
export function DailySummary() {
  const [date, setDate] = useState(todayISO());

  const profile = useProfile();
  const sessions = useSessions();
  const days = useLearningDays();
  const goals = useGoals({ from: date, to: isoAddDays(date, 1) });
  const assessments = useAssessments();
  const practice = usePracticeSessions(60);
  const coding = useCodingProblems();
  const revisions = useRevisions();
  const topics = useTopics();
  const performance = usePerformanceHistory(200);

  const topicTitle = useMemo(() => {
    const m = new Map((topics.data ?? []).map((t) => [t.id, t.title]));
    return (id?: string | null) => (id ? (m.get(id) ?? "Topic") : null);
  }, [topics.data]);

  const s = useMemo(() => {
    const daySessions = (sessions.data ?? []).filter((x) => dayISO(new Date(x.started_at)) === date);
    const actual = daySessions.reduce((a, x) => a + (x.actual_minutes || 0), 0);
    const dayPlan = (days.data ?? []).filter((d) => d.planned_date === date);
    const planned =
      dayPlan.reduce((a, d) => a + d.estimated_minutes, 0) ||
      (profile.data?.daily_target_minutes ?? 120);

    const dayGoals = (goals.data ?? []).filter((g) => g.goal_date === date);
    const goalsDone = dayGoals.filter((g) => g.status === "completed").length;

    const dayAssess = (assessments.data ?? []).filter(
      (a) => dayISO(new Date(a.taken_at)) === date,
    );
    const assessPct = dayAssess.length
      ? Math.round(
          (dayAssess.reduce((a, x) => a + Number(x.score), 0) /
            Math.max(
              1,
              dayAssess.reduce((a, x) => a + Number(x.max_score), 0),
            )) *
            100,
        )
      : null;

    const dayPractice = (practice.data ?? []).filter((p) => p.practiced_on === date);
    const pq = dayPractice.reduce((a, p) => a + p.question_count, 0);
    const pc = dayPractice.reduce((a, p) => a + p.correct_count, 0);

    const dayCoding = (coding.data ?? []).filter((c) => c.solved_on === date);
    const solved = dayCoding.filter((c) => c.result === "solved").length;

    const dueRevisions = (revisions.data ?? []).filter((r) => r.due_date <= date);

    // Weak signals: lowest-scoring performance rows recorded on this day.
    const dayPerf = (performance.data ?? []).filter(
      (p) => dayISO(new Date(p.created_at)) === date && p.score != null,
    );
    const weak = [...dayPerf]
      .sort((a, b) => Number(a.score) - Number(b.score))
      .filter((p) => Number(p.score) < 60)
      .slice(0, 2)
      .map((p) => {
        const sig = (p.signals ?? {}) as Record<string, unknown>;
        const label =
          topicTitle(p.topic_id) ??
          (Array.isArray(sig["topics"]) ? String((sig["topics"] as unknown[])[0]) : null) ??
          p.activity_type;
        return `${label} (${Math.round(Number(p.score))}%)`;
      });

    const next = upcomingPlan(days.data ?? [], date, 3);
    const nextRevisions = (revisions.data ?? [])
      .filter((r) => r.due_date > date)
      .slice(0, 3)
      .map((r) => `${topicTitle(r.topic_id) ?? "Topic"} · ${r.due_date}`);
    const nextGoals = (goals.data ?? []).filter(
      (g) => g.goal_date > date && g.status !== "completed",
    );

    return {
      actual,
      planned,
      sessionCount: daySessions.length,
      dayGoals,
      goalsDone,
      assessCount: dayAssess.length,
      assessPct,
      pq,
      pc,
      codingCount: dayCoding.length,
      solved,
      dueRevisions,
      weak,
      next,
      nextRevisions,
      nextGoals,
    };
  }, [
    sessions.data,
    days.data,
    goals.data,
    assessments.data,
    practice.data,
    coding.data,
    revisions.data,
    performance.data,
    profile.data,
    topicTitle,
    date,
  ]);

  const isToday = date === todayISO();
  const label = new Date(date + "T00:00:00").toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  return (
    <section className="surface overflow-hidden">
      <div className="flex items-center gap-2 border-b border-border bg-accent/40 px-4 py-3">
        <CalendarDays className="size-4 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Daily summary</p>
          <p className="text-xs text-muted-foreground">{isToday ? `Today · ${label}` : label}</p>
        </div>
        <Button variant="ghost" size="icon" aria-label="Previous day" onClick={() => setDate(isoAddDays(date, -1))}>
          <ChevronLeft className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Next day"
          disabled={isToday}
          onClick={() => setDate(isoAddDays(date, 1))}
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>

      <div className="grid gap-x-6 p-4 sm:grid-cols-2">
        <div>
          <p className="text-sm">
            You studied <strong>{minutesLabel(s.actual)}</strong> of {minutesLabel(s.planned)}{" "}
            planned
            {s.sessionCount > 0 ? ` across ${s.sessionCount} session${s.sessionCount > 1 ? "s" : ""}` : ""}.
          </p>
          <div className="mt-2 divide-y divide-border/60">
            <Line
              label="Goals"
              value={s.dayGoals.length ? `${s.goalsDone}/${s.dayGoals.length} completed` : "none set"}
            />
            <Line
              label="Recall / assessments"
              value={s.assessPct == null ? "none" : `${s.assessCount} · ${s.assessPct}%`}
            />
            <Line label="Aptitude / reasoning" value={s.pq ? `${s.pc}/${s.pq} correct` : "not done"} />
            <Line
              label="Coding & DSA"
              value={s.codingCount ? `${s.solved} solved of ${s.codingCount} logged` : "none logged"}
            />
            <Line
              label="Revisions due"
              value={s.dueRevisions.length ? `${s.dueRevisions.length} pending` : "all clear"}
            />
          </div>
          {s.weak.length > 0 && (
            <p className="mt-3 text-xs text-muted-foreground">
              Weak area{s.weak.length > 1 ? "s" : ""}: {s.weak.join(", ")}
            </p>
          )}
        </div>

        <div className="mt-4 sm:mt-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Tomorrow / next
          </p>
          <ul className="mt-2 space-y-2">
            {s.next.map((d) => (
              <li key={d.id} className="text-sm">
                <span className="font-medium">{d.topic}</span>{" "}
                <span className="text-xs text-muted-foreground">
                  {d.subject?.name} · {d.planned_date}
                </span>
              </li>
            ))}
            {s.nextRevisions.map((r) => (
              <li key={r} className="text-sm">
                <Badge variant="secondary" className="mr-2">
                  revision
                </Badge>
                <span className="text-xs text-muted-foreground">{r}</span>
              </li>
            ))}
            {s.nextGoals.slice(0, 3).map((g) => (
              <li key={g.id} className="text-sm">
                <Badge variant="outline" className="mr-2">
                  goal
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {g.title} · {g.goal_date}
                </span>
              </li>
            ))}
            {s.next.length === 0 && s.nextRevisions.length === 0 && s.nextGoals.length === 0 && (
              <li className="text-sm text-muted-foreground">
                Nothing scheduled yet.{" "}
                <Link to="/subjects" className="underline">
                  Plan something
                </Link>
                .
              </li>
            )}
          </ul>
        </div>
      </div>
    </section>
  );
}
