import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef } from "react";
import {
  ArrowRight,
  Dumbbell,
  BookOpen,
  CheckCircle2,
  Clock,
  Flame,
  ListTodo,
  Play,
  RotateCcw,
  Target,
  TriangleAlert,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { AdaptiveToday } from "@/components/adaptive-today";
import { GoalsPanel } from "@/components/goals-panel";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useLearningDays,
  useProfile,
  useSessions,
  useSubjects,
  useTasks,
  useUpdateLearningDay,
  useUpdateTask,
} from "@/lib/db";
import {
  greeting,
  minutesLabel,
  rescheduleOverdue,
  reviewToday,
  studyStats,
  taskBuckets,
  todayISO,
  todaysPlan,
  upcomingPlan,
} from "@/lib/scheduling";
import { usePracticeSessions } from "@/lib/practice-db";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Today's Mission — My Study Compass" },
      { name: "description", content: "Your daily study mission, streak, plan and tasks in one view." },
      { property: "og:title", content: "Today's Mission — My Study Compass" },
      { property: "og:description", content: "What to learn, practise and revise today." },
    ],
  }),
  component: Dashboard,
});

function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function Empty({ text, cta }: { text: string; cta?: React.ReactNode }) {
  return (
    <div className="surface flex flex-col items-center gap-3 p-6 text-center">
      <p className="text-sm text-muted-foreground">{text}</p>
      {cta}
    </div>
  );
}

function Dashboard() {
  const navigate = useNavigate();
  const profile = useProfile();
  const subjects = useSubjects();
  const days = useLearningDays();
  const tasks = useTasks();
  const sessions = useSessions();
  const updateDay = useUpdateLearningDay();
  const updateTask = useUpdateTask();
  const rescheduled = useRef(false);

  const today = todayISO();

  useEffect(() => {
    if (profile.data && profile.data.onboarded === false) {
      navigate({ to: "/onboarding" });
    }
  }, [profile.data, navigate]);

  // Adaptive planner: roll unfinished past days forward, once per visit.
  useEffect(() => {
    if (rescheduled.current || !days.data) return;
    const moves = rescheduleOverdue(days.data, today);
    if (moves.length === 0) return;
    rescheduled.current = true;
    Promise.all(moves.map((m) => updateDay.mutateAsync({ id: m.id, planned_date: m.planned_date })));
  }, [days.data, today, updateDay]);

  const stats = useMemo(() => studyStats(sessions.data ?? [], today), [sessions.data, today]);
  const plan = useMemo(() => todaysPlan(days.data ?? [], today), [days.data, today]);
  const upcoming = useMemo(() => upcomingPlan(days.data ?? [], today), [days.data, today]);
  const reviews = useMemo(() => reviewToday(sessions.data ?? [], today), [sessions.data, today]);
  const buckets = useMemo(() => taskBuckets(tasks.data ?? [], today), [tasks.data, today]);

  const target = profile.data?.daily_target_minutes ?? 120;
  const planMinutes = plan.reduce((a, d) => a + d.estimated_minutes, 0);
  const donePlan = plan.filter((d) => d.status === "completed").length;
  const dayProgress = Math.min(100, Math.round((stats.todayMinutes / Math.max(target, 1)) * 100));

  const loading = profile.isLoading || days.isLoading || sessions.isLoading;

  const dateLabel = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <AppShell title="Today">
      <div className="space-y-8">
        <header>
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{dateLabel}</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight">
            {greeting()}
            {profile.data?.display_name ? `, ${profile.data.display_name}` : ""} 👋
          </h2>
        </header>

        <AdaptiveToday />

        <DailyPracticeCard today={today} />

        <GoalsPanel plannedMinutes={planMinutes} dailyBudget={target} />

        {/* Today's Mission */}

        <section className="surface overflow-hidden">
          <div className="border-b border-border bg-accent/40 px-5 py-4">
            <div className="flex items-center gap-2">
              <Target className="size-4 text-primary" />
              <span className="text-sm font-semibold">Today's Mission</span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {loading
                ? "Loading your plan…"
                : plan.length === 0
                  ? "Nothing scheduled — pick a subject and start a free session."
                  : `${plan.length} topic${plan.length > 1 ? "s" : ""} · about ${minutesLabel(planMinutes)} of focused work.`}
            </p>
          </div>
          <div className="space-y-4 p-5">
            <div>
              <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                <span>Daily target</span>
                <span className="tabular">
                  {minutesLabel(stats.todayMinutes)} / {minutesLabel(target)}
                </span>
              </div>
              <Progress value={dayProgress} />
            </div>
            <Button size="lg" className="w-full" asChild>
              <Link to="/study">
                <Play className="size-4" /> Start today's study
              </Link>
            </Button>
          </div>
        </section>

        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard icon={Clock} label="Study time" value={minutesLabel(stats.totalMinutes)} hint="all time" loading={loading} />
          <StatCard icon={Flame} label="Current streak" value={`${stats.current}d`} hint={`best ${stats.longest}d`} loading={loading} accent />
          <StatCard icon={CheckCircle2} label="Today's plan" value={`${donePlan}/${plan.length}`} hint="topics done" loading={loading} />
          <StatCard icon={ListTodo} label="Open tasks" value={`${buckets.open.length}`} hint={`${buckets.overdue.length} overdue`} loading={loading} />
        </div>

        {/* Today's learning plan */}
        <Section
          title="Today's learning plan"
          action={
            <Button variant="ghost" size="sm" asChild>
              <Link to="/subjects">
                Manage <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          }
        >
          {loading ? (
            <Skeleton className="h-24 w-full rounded-xl" />
          ) : plan.length === 0 ? (
            <Empty
              text={
                (subjects.data?.length ?? 0) === 0
                  ? "No subjects yet. Add one to build your day-wise plan."
                  : "No topics scheduled for today."
              }
              cta={
                <Button size="sm" asChild>
                  <Link to="/subjects">Go to Learn</Link>
                </Button>
              }
            />
          ) : (
            <ul className="space-y-2">
              {plan.map((d) => (
                <li key={d.id} className="surface flex items-start gap-3 p-4">
                  <button
                    aria-label="Toggle complete"
                    onClick={() =>
                      updateDay.mutate({
                        id: d.id,
                        status: d.status === "completed" ? "pending" : "completed",
                        completed_at: d.status === "completed" ? null : new Date().toISOString(),
                      })
                    }
                    className="mt-0.5"
                  >
                    <CheckCircle2
                      className={
                        d.status === "completed"
                          ? "size-5 text-success"
                          : "size-5 text-muted-foreground/40"
                      }
                    />
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">{d.topic}</span>
                      <Badge variant="secondary">{d.subject?.name ?? "Subject"}</Badge>
                      <span className="text-xs text-muted-foreground">Day {d.day_number}</span>
                    </div>
                    {d.subtopics.length > 0 && (
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {d.subtopics.join(" · ")}
                      </p>
                    )}
                  </div>
                  <span className="tabular shrink-0 text-xs text-muted-foreground">
                    {minutesLabel(d.estimated_minutes)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Section>

        {/* Review today */}
        <Section title="Review today">
          {reviews.length === 0 ? (
            <Empty text="Nothing due for revision. Topics you rate as difficult come back on a 1 / 3 / 7 / 14 / 30 day ladder." />
          ) : (
            <ul className="space-y-2">
              {reviews.map((r) => (
                <li key={r.key} className="surface flex items-center gap-3 p-4">
                  <RotateCcw className="size-4 shrink-0 text-primary" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{r.topic}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.reason} · {r.since} day{r.since > 1 ? "s" : ""} ago
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>

        {/* Tasks */}
        <Section
          title="Tasks"
          action={
            <Button variant="ghost" size="sm" asChild>
              <Link to="/tasks">
                All tasks <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          }
        >
          {buckets.overdue.length === 0 && buckets.today.length === 0 ? (
            <Empty text="Nothing due today. Enjoy the clear runway." />
          ) : (
            <ul className="space-y-2">
              {[...buckets.overdue, ...buckets.today].slice(0, 6).map((t) => (
                <li key={t.id} className="surface flex items-center gap-3 p-4">
                  <button
                    aria-label="Complete task"
                    onClick={() =>
                      updateTask.mutate({
                        id: t.id,
                        status: "completed",
                        completed_at: new Date().toISOString(),
                      })
                    }
                  >
                    <CheckCircle2 className="size-5 text-muted-foreground/40" />
                  </button>
                  <span className="min-w-0 flex-1 truncate text-sm">{t.title}</span>
                  {t.due_date && t.due_date < today && (
                    <Badge variant="destructive" className="gap-1">
                      <TriangleAlert className="size-3" /> overdue
                    </Badge>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Section>

        {/* Continue learning */}
        <Section title="Coming up">
          {upcoming.length === 0 ? (
            <Empty text="No upcoming days planned yet." />
          ) : (
            <ul className="space-y-2">
              {upcoming.map((d) => (
                <li key={d.id} className="surface flex items-center gap-3 p-4">
                  <BookOpen className="size-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{d.topic}</p>
                    <p className="text-xs text-muted-foreground">
                      {d.subject?.name} · Day {d.day_number} · {d.planned_date}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>

        {/* Week trend */}
        <Section title="This week">
          <div className="surface p-5">
            <div className="flex items-end justify-between gap-2">
              {stats.last7.map((d) => {
                const pct = Math.min(100, (d.minutes / Math.max(target, 1)) * 100);
                return (
                  <div key={d.date} className="flex flex-1 flex-col items-center gap-2">
                    <div className="flex h-24 w-full items-end rounded-md bg-muted">
                      <div
                        className="w-full rounded-md bg-primary transition-all"
                        style={{ height: `${Math.max(pct, d.minutes > 0 ? 6 : 2)}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(d.date + "T00:00:00").toLocaleDateString(undefined, {
                        weekday: "narrow",
                      })}
                    </span>
                  </div>
                );
              })}
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              {minutesLabel(stats.weekMinutes)} studied in the last 7 days.
            </p>
          </div>
        </Section>
      </div>
    </AppShell>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  loading,
  accent,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  hint: string;
  loading?: boolean;
  accent?: boolean;
}) {
  return (
    <div className="surface p-4">
      <Icon className={accent ? "size-4 text-flame" : "size-4 text-muted-foreground"} />
      {loading ? (
        <Skeleton className="mt-3 h-6 w-16" />
      ) : (
        <p className="tabular mt-3 text-xl font-semibold">{value}</p>
      )}
      <p className="text-xs font-medium">{label}</p>
      <p className="text-[11px] text-muted-foreground">{hint}</p>
    </div>
  );
}

function DailyPracticeCard({ today }: { today: string }) {
  const sessions = usePracticeSessions(10);
  const profile = useProfile();
  const doneToday = (sessions.data ?? []).filter((s) => s.practiced_on === today);
  const solved = doneToday.reduce((a, s) => a + s.question_count, 0);
  const correct = doneToday.reduce((a, s) => a + s.correct_count, 0);
  const count = profile.data?.practice_questions_per_day ?? 5;
  const minutes = profile.data?.practice_target_minutes ?? 12;

  return (
    <section className="surface flex flex-wrap items-center gap-3 p-4">
      <Dumbbell className="size-4 shrink-0 text-primary" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">Daily practice</p>
        <p className="text-xs text-muted-foreground">
          {doneToday.length > 0
            ? `Done today · ${correct}/${solved} correct`
            : `${count} questions · ~${minutes} min · optional`}
        </p>
      </div>
      <Button size="sm" variant={doneToday.length > 0 ? "outline" : "default"} asChild>
        <Link to="/practice">{doneToday.length > 0 ? "Practice again" : "Start"}</Link>
      </Button>
    </section>
  );
}
