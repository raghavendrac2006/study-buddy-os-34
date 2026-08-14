import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  CalendarClock,
  CheckCircle2,
  ChevronsRight,
  Clock,
  Lock,
  LockOpen,
  RefreshCw,
  SkipForward,
  Trash2,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { PerformanceDialog, type FeedbackTarget } from "@/components/performance-dialog";
import {
  useActivities,
  useDeleteActivity,
  useMasteryMap,
  usePlan,
  useReplan,
  useTopics,
  useUpdateActivity,
} from "@/lib/adaptive-db";
import { addDays, prioritiseForBudget, today, type SchedulableActivity } from "@/lib/adaptive";

export const Route = createFileRoute("/_authenticated/plans/$id")({
  head: () => ({
    meta: [
      { title: "Plan detail — Learning OS" },
      { name: "description", content: "Your day-by-day adaptive schedule with full manual control." },
      { property: "og:title", content: "Plan detail — Learning OS" },
      { property: "og:description", content: "Move, lock, skip or reschedule any activity." },
    ],
  }),
  component: PlanDetail,
});

const TYPE_LABEL: Record<string, string> = {
  learn: "Learn",
  recall: "Recall",
  practice: "Practice",
  assess: "Assess",
  revise: "Revise",
};

function PlanDetail() {
  const { id } = Route.useParams();
  const plan = usePlan(id);
  const activities = useActivities({ planId: id });
  const topics = useTopics();
  const mastery = useMasteryMap();
  const updateActivity = useUpdateActivity();
  const removeActivity = useDeleteActivity();
  const replan = useReplan();
  const [feedback, setFeedback] = useState<FeedbackTarget | null>(null);
  const [budget, setBudget] = useState<number | "">("");

  const topicTitle = useMemo(() => {
    const map = new Map((topics.data ?? []).map((t) => [t.id, t.title]));
    return (tid: string | null) => (tid ? (map.get(tid) ?? "Topic") : "General");
  }, [topics.data]);

  const masteryByTopic = useMemo(() => {
    const rec: Record<string, number> = {};
    for (const m of mastery.data ?? []) rec[m.topic_id] = Number(m.mastery);
    return rec;
  }, [mastery.data]);

  const grouped = useMemo(() => {
    const map = new Map<string, typeof activities.data>();
    for (const a of activities.data ?? []) {
      const list = map.get(a.scheduled_date) ?? [];
      list.push(a);
      map.set(a.scheduled_date, list);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [activities.data]);

  const done = (activities.data ?? []).filter((a) => a.status === "done").length;
  const total = activities.data?.length ?? 0;

  const doReplan = async (dailyMinutesOverride?: number) => {
    if (!plan.data || !activities.data) return;
    try {
      const res = await replan.mutateAsync({
        plan: plan.data,
        activities: activities.data,
        masteryByTopic,
        reason: dailyMinutesOverride
          ? `Short day: only ${dailyMinutesOverride} minutes available`
          : "Manual replan of missed / pending work",
        ...(dailyMinutesOverride ? { dailyMinutesOverride } : {}),
      });
      toast.success(
        res.overflow
          ? `Moved ${res.moved} activities. ${res.overflow} don't fit before your target date — the highest-priority work was kept first.`
          : `Rebalanced ${res.moved} activities.`,
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not replan");
    }
  };

  const trimToday = () => {
    if (!activities.data || budget === "") return;
    const todays = activities.data.filter(
      (a) => a.scheduled_date <= today() && a.status === "pending",
    );
    const schedulable: SchedulableActivity[] = todays.map((a) => ({
      id: a.id,
      activity_type: a.activity_type,
      estimated_minutes: a.estimated_minutes,
      priority: a.priority,
      locked: a.locked,
      scheduled_date: a.scheduled_date,
      status: a.status,
      mastery: a.topic_id ? masteryByTopic[a.topic_id] : undefined,
      deadline: plan.data?.target_date ?? null,
    }));
    const { keep, defer } = prioritiseForBudget(schedulable, Number(budget));
    Promise.all(
      defer.map((a) =>
        updateActivity.mutateAsync({ id: a.id, scheduled_date: addDays(today(), 1) }),
      ),
    )
      .then(() =>
        toast.success(`Kept ${keep.length} high-value activities, moved ${defer.length} forward.`),
      )
      .catch(() => toast.error("Could not adjust today"));
  };

  return (
    <AppShell title="Plan">
      <div className="space-y-7">
        <header>
          <Link to="/plans" className="text-xs text-muted-foreground hover:underline">
            ← All plans
          </Link>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight">{plan.data?.title ?? "Plan"}</h2>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
            <CalendarClock className="size-3.5" />
            {plan.data?.target_date ? `Target ${plan.data.target_date}` : "No target date"} ·{" "}
            {plan.data?.daily_minutes} min/day
          </p>
          {plan.data?.feasibility &&
            typeof (plan.data.feasibility as { message?: string }).message === "string" && (
              <p className="mt-2 text-xs text-muted-foreground">
                {(plan.data.feasibility as { message?: string }).message}
              </p>
            )}
        </header>

        <div className="surface space-y-3 p-5">
          <Progress value={total ? Math.round((done / total) * 100) : 0} />
          <p className="tabular text-xs text-muted-foreground">
            {done}/{total} activities complete
          </p>
          <div className="flex flex-wrap items-end gap-3 pt-1">
            <div className="space-y-1.5">
              <Label htmlFor="budget" className="text-xs">
                Only have limited time today?
              </Label>
              <div className="flex gap-2">
                <Input
                  id="budget"
                  type="number"
                  placeholder="45"
                  className="w-24"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value === "" ? "" : Number(e.target.value))}
                />
                <Button variant="outline" onClick={trimToday} disabled={budget === ""}>
                  <Clock className="size-4" /> Fit my day
                </Button>
              </div>
            </div>
            <Button variant="outline" onClick={() => doReplan()} disabled={replan.isPending}>
              <RefreshCw className="size-4" /> Rebalance plan
            </Button>
          </div>
        </div>

        {activities.isLoading ? (
          <Skeleton className="h-40 w-full rounded-xl" />
        ) : (
          <div className="space-y-5">
            {grouped.map(([date, list]) => (
              <section key={date} className="space-y-2">
                <h3 className="text-sm font-semibold tracking-tight">
                  {new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                  })}
                  {date < today() && <span className="ml-2 text-xs text-destructive">overdue</span>}
                </h3>
                <ul className="space-y-2">
                  {(list ?? []).map((a) => (
                    <li key={a.id} className="surface flex flex-wrap items-center gap-2 p-3">
                      <Badge variant="secondary">{TYPE_LABEL[a.activity_type] ?? a.activity_type}</Badge>
                      <div className="min-w-0 flex-1">
                        <p
                          className={
                            a.status === "done"
                              ? "truncate text-sm text-muted-foreground line-through"
                              : "truncate text-sm font-medium"
                          }
                        >
                          {a.title}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {topicTitle(a.topic_id)} · {a.estimated_minutes} min
                          {a.source === "adaptive" && " · added by adaptation"}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={a.locked ? "Unlock" : "Lock to this day"}
                        onClick={() => updateActivity.mutate({ id: a.id, locked: !a.locked })}
                      >
                        {a.locked ? <Lock className="size-4" /> : <LockOpen className="size-4" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Postpone one day"
                        onClick={() =>
                          updateActivity.mutate({
                            id: a.id,
                            scheduled_date: addDays(a.scheduled_date, 1),
                          })
                        }
                      >
                        <ChevronsRight className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Skip"
                        onClick={() => updateActivity.mutate({ id: a.id, status: "skipped" })}
                      >
                        <SkipForward className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Delete activity"
                        onClick={() => removeActivity.mutate(a.id)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant={a.status === "done" ? "ghost" : "default"}
                        disabled={a.status === "done"}
                        onClick={() =>
                          a.topic_id
                            ? setFeedback({
                                topicId: a.topic_id,
                                topicTitle: topicTitle(a.topic_id),
                                activityId: a.id,
                                planId: id,
                                activityType: a.activity_type,
                                plannedMinutes: a.estimated_minutes,
                              })
                            : updateActivity.mutate({
                                id: a.id,
                                status: "done",
                                completed_at: new Date().toISOString(),
                              })
                        }
                      >
                        <CheckCircle2 className="size-4" />
                        {a.status === "done" ? "Done" : "Complete"}
                      </Button>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>

      <PerformanceDialog target={feedback} onClose={() => setFeedback(null)} />
    </AppShell>
  );
}
