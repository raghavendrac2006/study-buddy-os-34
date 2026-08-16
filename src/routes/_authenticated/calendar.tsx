import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { CalendarDays } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useActivities, usePlans, useRevisions, useTopics } from "@/lib/adaptive-db";
import { useTasks } from "@/lib/db";
import { addDays, isoDay, useGoals } from "@/lib/workspace-db";

export const Route = createFileRoute("/_authenticated/calendar")({
  head: () => ({
    meta: [
      { title: "Calendar — My Study Compass" },
      {
        name: "description",
        content: "Today, this week and upcoming study activities, revisions, deadlines and goals.",
      },
      { property: "og:title", content: "Calendar — My Study Compass" },
      { property: "og:description", content: "One timeline over your adaptive plan." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CalendarPage,
});

type Entry = {
  key: string;
  date: string;
  kind: string;
  label: string;
  detail: string;
  topicId?: string | null;
};

function CalendarPage() {
  const day = isoDay();
  const [tab, setTab] = useState("today");
  const horizon = addDays(day, 30);

  const activities = useActivities({ from: addDays(day, -7), to: horizon });
  const revisions = useRevisions();
  const plans = usePlans();
  const topics = useTopics();
  const tasks = useTasks();
  const goals = useGoals({ from: addDays(day, -7), to: horizon });

  const titleOf = useMemo(() => {
    const map = new Map((topics.data ?? []).map((t) => [t.id, t.title]));
    return (id: string | null | undefined) => (id ? (map.get(id) ?? "Topic") : "General");
  }, [topics.data]);

  const entries: Entry[] = useMemo(() => {
    const list: Entry[] = [];
    for (const a of activities.data ?? []) {
      if (a.status !== "pending") continue;
      list.push({
        key: `a-${a.id}`,
        date: a.scheduled_date,
        kind: a.activity_type,
        label: a.title,
        detail: `${titleOf(a.topic_id)} · ${a.estimated_minutes} min`,
        topicId: a.topic_id,
      });
    }
    for (const r of revisions.data ?? []) {
      list.push({
        key: `r-${r.id}`,
        date: r.due_date,
        kind: "revise",
        label: `Revise ${titleOf(r.topic_id)}`,
        detail: r.reason ?? "Spaced revision",
        topicId: r.topic_id,
      });
    }
    for (const g of goals.data ?? []) {
      if (g.status === "done") continue;
      list.push({
        key: `g-${g.id}`,
        date: g.goal_date,
        kind: g.period === "weekly" ? "weekly goal" : "goal",
        label: g.title,
        detail: `${g.target_minutes} min · my goal`,
      });
    }
    for (const t of tasks.data ?? []) {
      if (t.status === "done" || !t.due_date) continue;
      list.push({ key: `t-${t.id}`, date: t.due_date, kind: "task", label: t.title, detail: "Task" });
    }
    for (const p of plans.data ?? []) {
      if (p.target_date) {
        list.push({
          key: `p-${p.id}`,
          date: p.target_date,
          kind: "deadline",
          label: `${p.title} target date`,
          detail: "Plan deadline",
        });
      }
    }
    return list.sort((a, b) => a.date.localeCompare(b.date));
  }, [activities.data, revisions.data, goals.data, tasks.data, plans.data, titleOf]);

  const today = entries.filter((e) => e.date <= day);
  const weekEnd = addDays(day, 7);
  const week = entries.filter((e) => e.date > day && e.date <= weekEnd);
  const upcoming = entries.filter((e) => e.date > weekEnd);

  const group = (list: Entry[]) => {
    const byDate = new Map<string, Entry[]>();
    for (const e of list) byDate.set(e.date, [...(byDate.get(e.date) ?? []), e]);
    return [...byDate.entries()];
  };

  const renderList = (list: Entry[], empty: string) => {
    if (activities.isLoading) return <Skeleton className="h-32 w-full rounded-xl" />;
    if (!list.length) return <p className="surface p-6 text-center text-sm text-muted-foreground">{empty}</p>;
    return (
      <div className="space-y-4">
        {group(list).map(([date, items]) => (
          <div key={date} className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
                weekday: "short",
                day: "numeric",
                month: "short",
              })}
              {date < day && " · overdue"}
            </p>
            {items.map((e) => (
              <div key={e.key} className="surface flex flex-wrap items-center gap-3 p-3">
                <Badge variant="secondary">{e.kind}</Badge>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{e.label}</p>
                  <p className="truncate text-xs text-muted-foreground">{e.detail}</p>
                </div>
                {e.topicId && (
                  <Button size="sm" variant="ghost" asChild>
                    <Link to="/workspace/$topicId" params={{ topicId: e.topicId }} search={{}}>
                      Open
                    </Link>
                  </Button>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  };

  return (
    <AppShell title="Calendar">
      <div className="space-y-5">
        <header className="flex items-center gap-2">
          <CalendarDays className="size-5 text-primary" />
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Your schedule</h2>
            <p className="text-sm text-muted-foreground">
              A view over the adaptive plan — the planner stays the single source of truth.
            </p>
          </div>
        </header>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="today">Today</TabsTrigger>
            <TabsTrigger value="week">This week</TabsTrigger>
            <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          </TabsList>
          <TabsContent value="today" className="mt-4">
            {renderList(today, "Nothing scheduled for today.")}
          </TabsContent>
          <TabsContent value="week" className="mt-4">
            {renderList(week, "Nothing scheduled in the next 7 days.")}
          </TabsContent>
          <TabsContent value="upcoming" className="mt-4">
            {renderList(upcoming, "Nothing further ahead yet.")}
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
