import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarClock, Plus } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useActivities, usePlans } from "@/lib/adaptive-db";

export const Route = createFileRoute("/_authenticated/plans/")({
  head: () => ({
    meta: [
      { title: "Learning plans — My Study Compass" },
      { name: "description", content: "All your adaptive learning plans, deadlines and progress." },
      { property: "og:title", content: "Learning plans — My Study Compass" },
      { property: "og:description", content: "Adaptive plans built from your own study material." },
    ],
  }),
  component: PlansPage,
});

function PlansPage() {
  const plans = usePlans();
  const activities = useActivities();

  return (
    <AppShell title="Learning plans">
      <div className="space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Learning plans</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Balanced automatically by deadline, priority and mastery.
            </p>
          </div>
          <Button asChild>
            <Link to="/materials">
              <Plus className="size-4" /> New from material
            </Link>
          </Button>
        </header>

        {plans.isLoading ? (
          <Skeleton className="h-28 w-full rounded-xl" />
        ) : (plans.data?.length ?? 0) === 0 ? (
          <div className="surface p-6 text-center">
            <p className="text-sm text-muted-foreground">
              No plans yet. Upload study material and generate your first plan.
            </p>
            <Button className="mt-3" asChild>
              <Link to="/materials">Upload material</Link>
            </Button>
          </div>
        ) : (
          <ul className="space-y-3">
            {plans.data!.map((p) => {
              const own = (activities.data ?? []).filter((a) => a.plan_id === p.id);
              const done = own.filter((a) => a.status === "done").length;
              const pct = own.length ? Math.round((done / own.length) * 100) : 0;
              const feasible = (p.feasibility as { feasible?: boolean } | null)?.feasible !== false;
              return (
                <li key={p.id} className="surface p-5">
                  <Link to="/plans/$id" params={{ id: p.id }} className="block">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold">{p.title}</span>
                      <Badge variant="secondary">{p.priority}</Badge>
                      {!feasible && <Badge variant="destructive">tight deadline</Badge>}
                    </div>
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <CalendarClock className="size-3.5" />
                      {p.target_date ? `Target ${p.target_date}` : "No target date"} ·{" "}
                      {p.daily_minutes} min/day
                    </p>
                    <div className="mt-3 space-y-1.5">
                      <Progress value={pct} />
                      <p className="tabular text-xs text-muted-foreground">
                        {done}/{own.length} activities done
                      </p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </AppShell>
  );
}
