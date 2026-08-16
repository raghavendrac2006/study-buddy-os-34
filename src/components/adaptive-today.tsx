import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  CheckCircle2,
  Lightbulb,
  Loader2,
  PlayCircle,
  RotateCcw,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PerformanceDialog, type FeedbackTarget } from "@/components/performance-dialog";
import {
  useActivities,
  useMasteryMap,
  usePlans,
  useReplan,
  useRevisions,
  useTopics,
} from "@/lib/adaptive-db";
import { MASTERY_LABEL, today, type MasteryState } from "@/lib/adaptive";
import { getRecommendations } from "@/lib/ai.functions";
import { friendlyAiError } from "@/lib/ai/errors";
import type { Recommendation } from "@/lib/ai/schemas";

const TYPE_LABEL: Record<string, string> = {
  learn: "Learn",
  recall: "Recall",
  practice: "Practice",
  assess: "Assess",
  revise: "Revise",
  watch: "Watch",
  notes: "Notes",
};

export function AdaptiveToday() {
  const plans = usePlans();
  const activities = useActivities();
  const topics = useTopics();
  const mastery = useMasteryMap();
  const revisions = useRevisions();
  const replan = useReplan();
  const rebalanced = useRef(false);

  const [feedback, setFeedback] = useState<FeedbackTarget | null>(null);
  const [tips, setTips] = useState<Recommendation[] | null>(null);
  const [tipsBusy, setTipsBusy] = useState(false);

  const day = today();

  const titleOf = useMemo(() => {
    const map = new Map((topics.data ?? []).map((t) => [t.id, t.title]));
    return (id: string | null) => (id ? (map.get(id) ?? "Topic") : "General");
  }, [topics.data]);

  const masteryByTopic = useMemo(() => {
    const rec: Record<string, number> = {};
    for (const m of mastery.data ?? []) rec[m.topic_id] = Number(m.mastery);
    return rec;
  }, [mastery.data]);

  // Missed work is redistributed by value, not shifted by a flat day.
  useEffect(() => {
    if (rebalanced.current || !plans.data?.length || !activities.data) return;
    const overdue = activities.data.filter((a) => a.status === "pending" && a.scheduled_date < day);
    if (!overdue.length) return;
    rebalanced.current = true;
    for (const plan of plans.data) {
      const own = activities.data.filter((a) => a.plan_id === plan.id);
      if (!own.some((a) => a.status === "pending" && a.scheduled_date < day)) continue;
      replan
        .mutateAsync({
          plan,
          activities: own,
          masteryByTopic,
          reason: "Automatic catch-up for missed sessions",
        })
        .catch(() => undefined);
    }
  }, [plans.data, activities.data, day, masteryByTopic, replan]);

  const mission = useMemo(
    () =>
      (activities.data ?? [])
        .filter((a) => a.status === "pending" && a.scheduled_date <= day)
        .sort((a, b) => b.priority - a.priority),
    [activities.data, day],
  );

  const dueRevisions = (revisions.data ?? []).filter((r) => r.due_date <= day);
  const weak = (mastery.data ?? [])
    .filter((m) => Number(m.mastery) < 50 && m.state !== "not_started")
    .sort((a, b) => Number(a.mastery) - Number(b.mastery))
    .slice(0, 5);

  const askAi = async () => {
    setTipsBusy(true);
    try {
      const context = [
        `Date: ${day}`,
        `Plans: ${(plans.data ?? [])
          .map((p) => `${p.title} (target ${p.target_date ?? "none"}, ${p.daily_minutes} min/day, priority ${p.priority})`)
          .join("; ")}`,
        `Today's pending activities: ${mission
          .slice(0, 12)
          .map((a) => `${a.activity_type}: ${a.title} (${a.estimated_minutes}m)`)
          .join("; ") || "none"}`,
        `Weak topics: ${weak.map((m) => `${titleOf(m.topic_id)} ${Math.round(Number(m.mastery))}%`).join("; ") || "none"}`,
        `Due revisions: ${dueRevisions.map((r) => titleOf(r.topic_id)).join("; ") || "none"}`,
      ].join("\n");
      const res = await getRecommendations({ data: { context } });
      setTips(res.recommendations as Recommendation[]);
    } catch (err) {
      toast.error(friendlyAiError(err));
    } finally {
      setTipsBusy(false);
    }
  };

  const loading = plans.isLoading || activities.isLoading;

  if (!loading && (plans.data?.length ?? 0) === 0) {
    return (
      <section className="surface flex flex-col items-center gap-3 p-6 text-center">
        <Sparkles className="size-5 text-primary" />
        <div>
          <p className="text-sm font-medium">Build your adaptive plan</p>
          <p className="text-sm text-muted-foreground">
            Upload your own study material and get a realistic day-by-day plan.
          </p>
        </div>
        <Button asChild>
          <Link to="/materials">Upload material</Link>
        </Button>
      </section>
    );
  }

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold tracking-tight">Adaptive mission</h2>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/plans">All plans</Link>
          </Button>
        </div>
        {loading ? (
          <Skeleton className="h-24 w-full rounded-xl" />
        ) : mission.length === 0 ? (
          <p className="surface p-6 text-center text-sm text-muted-foreground">
            Nothing left for today. Nice work.
          </p>
        ) : (
          <ul className="space-y-2">
            {mission.slice(0, 8).map((a) => (
              <li key={a.id} className="surface flex flex-wrap items-center gap-2 p-4">
                <Badge variant="secondary">{TYPE_LABEL[a.activity_type] ?? a.activity_type}</Badge>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{a.title}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {titleOf(a.topic_id)} · {a.estimated_minutes} min
                    {a.scheduled_date < day && " · moved from an earlier day"}
                  </p>
                </div>
                {a.topic_id && (
                  <Button size="sm" variant="outline" asChild>
                    <Link
                      to="/workspace/$topicId"
                      params={{ topicId: a.topic_id }}
                      search={{ activityId: a.id, planId: a.plan_id ?? undefined, tab: "source" }}
                    >
                      <PlayCircle className="size-4" /> Start learning
                    </Link>
                  </Button>
                )}
                <Button
                  size="sm"
                  onClick={() =>
                    a.topic_id
                      ? setFeedback({
                          topicId: a.topic_id,
                          topicTitle: titleOf(a.topic_id),
                          activityId: a.id,
                          planId: a.plan_id,
                          activityType: a.activity_type,
                          plannedMinutes: a.estimated_minutes,
                        })
                      : toast.info("Open the plan to complete this activity.")
                  }
                >
                  <CheckCircle2 className="size-4" /> Record
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {dueRevisions.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold tracking-tight">Due for revision</h2>
          <ul className="space-y-2">
            {dueRevisions.slice(0, 6).map((r) => (
              <li key={r.id} className="surface flex items-center gap-3 p-4">
                <RotateCcw className="size-4 shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{titleOf(r.topic_id)}</p>
                  <p className="text-xs text-muted-foreground">
                    every {r.interval_days}d · {r.reason}
                  </p>
                </div>
                <Button size="sm" variant="ghost" asChild>
                  <Link to="/workspace/$topicId" params={{ topicId: r.topic_id }} search={{ tab: "recall" }}>
                    Open
                  </Link>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setFeedback({
                      topicId: r.topic_id,
                      topicTitle: titleOf(r.topic_id),
                      planId: r.plan_id,
                      activityType: "revise",
                      plannedMinutes: 20,
                    })
                  }
                >
                  Revise
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {weak.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold tracking-tight">Weak areas</h2>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/mastery">All mastery</Link>
            </Button>
          </div>
          <ul className="space-y-2">
            {weak.map((m) => (
              <li key={m.id} className="surface flex items-center gap-3 p-4">
                <TriangleAlert className="size-4 shrink-0 text-destructive" />
                <Link
                  to="/workspace/$topicId"
                  params={{ topicId: m.topic_id }}
                  search={{}}
                  className="min-w-0 flex-1 truncate text-sm hover:underline"
                >
                  {titleOf(m.topic_id)}
                </Link>
                <Badge variant="secondary">
                  {Math.round(Number(m.mastery))}% · {MASTERY_LABEL[m.state as MasteryState]}
                </Badge>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold tracking-tight">Adaptive recommendations</h2>
          <Button variant="ghost" size="sm" onClick={askAi} disabled={tipsBusy}>
            {tipsBusy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            {tips ? "Refresh" : "Get advice"}
          </Button>
        </div>
        {tips === null ? (
          <p className="surface p-5 text-sm text-muted-foreground">
            Ask your mentor what to prioritise right now, based on your mastery and deadlines.
          </p>
        ) : tips.length === 0 ? (
          <p className="surface p-5 text-sm text-muted-foreground">You're on track — keep going.</p>
        ) : (
          <ul className="space-y-2">
            {tips.map((t, i) => (
              <li key={i} className="surface flex items-start gap-3 p-4">
                <Lightbulb
                  className={
                    t.severity === "critical"
                      ? "mt-0.5 size-4 shrink-0 text-destructive"
                      : "mt-0.5 size-4 shrink-0 text-primary"
                  }
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium">{t.headline}</p>
                  {t.detail && <p className="text-xs text-muted-foreground">{t.detail}</p>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <PerformanceDialog target={feedback} onClose={() => setFeedback(null)} />
    </div>
  );
}
