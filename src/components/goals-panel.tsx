import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Check, Plus, Trash2, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useCreateGoal,
  useDeleteGoal,
  useGoals,
  useUpdateGoal,
  isoDay,
  weekStart,
  type Goal,
} from "@/lib/workspace-db";
import { useSubjects } from "@/lib/db";

export function GoalsPanel({
  plannedMinutes = 0,
  dailyBudget = 0,
}: {
  plannedMinutes?: number;
  dailyBudget?: number;
}) {
  const day = isoDay();
  const week = weekStart(day);
  const goals = useGoals();
  const subjects = useSubjects();
  const create = useCreateGoal();
  const update = useUpdateGoal();
  const remove = useDeleteGoal();

  const [title, setTitle] = useState("");
  const [minutes, setMinutes] = useState(30);
  const [period, setPeriod] = useState<"daily" | "weekly">("daily");
  const [subjectId, setSubjectId] = useState<string>("none");

  const daily = useMemo(
    () => (goals.data ?? []).filter((g) => g.period === "daily" && g.goal_date === day),
    [goals.data, day],
  );
  const weekly = useMemo(
    () => (goals.data ?? []).filter((g) => g.period === "weekly" && g.goal_date === week),
    [goals.data, week],
  );

  const manualMinutes = daily
    .filter((g) => g.status !== "done")
    .reduce((sum, g) => sum + g.target_minutes, 0);
  const overload = dailyBudget > 0 && manualMinutes + plannedMinutes > dailyBudget;

  const add = async () => {
    if (!title.trim()) return;
    const list = period === "daily" ? daily : weekly;
    await create.mutateAsync({
      title: title.trim(),
      period,
      goal_date: period === "daily" ? day : week,
      target_minutes: minutes,
      subject_id: subjectId === "none" ? null : subjectId,
      source: "manual",
      sort_order: list.length,
    });
    setTitle("");
    toast.success("Goal added");
  };

  const move = async (list: Goal[], index: number, dir: -1 | 1) => {
    const a = list[index];
    const b = list[index + dir];
    if (!a || !b) return;
    await Promise.all([
      update.mutateAsync({ id: a.id, sort_order: b.sort_order }),
      update.mutateAsync({ id: b.id, sort_order: a.sort_order }),
    ]);
  };

  const renderList = (list: Goal[], label: string) => (
    <div className="space-y-2">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      {list.length === 0 && <p className="text-sm text-muted-foreground">No goals set.</p>}
      {list.map((g, i) => (
        <div key={g.id} className="surface flex flex-wrap items-center gap-2 p-3">
          <Button
            size="icon"
            variant={g.status === "done" ? "default" : "outline"}
            aria-label="Toggle complete"
            onClick={() =>
              update.mutate({
                id: g.id,
                status: g.status === "done" ? "pending" : "done",
                completed_at: g.status === "done" ? null : new Date().toISOString(),
              })
            }
          >
            <Check className="size-4" />
          </Button>
          <div className="min-w-0 flex-1">
            <Input
              value={g.title}
              className={`h-8 border-none px-0 shadow-none focus-visible:ring-0 ${
                g.status === "done" ? "line-through opacity-60" : ""
              }`}
              onChange={(e) => update.mutate({ id: g.id, title: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              {g.target_minutes} min{g.source === "ai" ? " · AI suggestion" : ""}
            </p>
          </div>
          <Badge variant="secondary">{g.period}</Badge>
          <Button size="icon" variant="ghost" aria-label="Move up" onClick={() => void move(list, i, -1)}>
            <ArrowUp className="size-3.5" />
          </Button>
          <Button size="icon" variant="ghost" aria-label="Move down" onClick={() => void move(list, i, 1)}>
            <ArrowDown className="size-3.5" />
          </Button>
          <Button size="icon" variant="ghost" aria-label="Delete goal" onClick={() => remove.mutate(g.id)}>
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      ))}
    </div>
  );

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold tracking-tight">My goals</h2>

      {overload && (
        <div className="surface flex items-start gap-2 p-4 text-sm">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
          <div>
            <p className="font-medium">Today looks over-committed</p>
            <p className="text-muted-foreground">
              Your goals ({manualMinutes} min) plus the planned activities ({plannedMinutes} min) exceed
              your {dailyBudget} min budget by {manualMinutes + plannedMinutes - dailyBudget} min. Your
              goals stay as written — consider splitting the largest goal across{" "}
              {Math.ceil((manualMinutes + plannedMinutes) / Math.max(1, dailyBudget))} days or trimming a
              planned activity.
            </p>
          </div>
        </div>
      )}

      <div className="surface flex flex-wrap items-end gap-2 p-4">
        <div className="min-w-40 flex-1">
          <Input
            placeholder="e.g. Finish Spring Boot REST section"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void add()}
          />
        </div>
        <Input
          type="number"
          min={5}
          max={600}
          className="w-24"
          aria-label="Target minutes"
          value={minutes}
          onChange={(e) => setMinutes(Number(e.target.value) || 30)}
        />
        <Select value={period} onValueChange={(v) => setPeriod(v as "daily" | "weekly")}>
          <SelectTrigger className="w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="daily">Daily</SelectItem>
            <SelectItem value="weekly">Weekly</SelectItem>
          </SelectContent>
        </Select>
        <Select value={subjectId} onValueChange={setSubjectId}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Subject" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No subject</SelectItem>
            {(subjects.data ?? []).map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={() => void add()} disabled={!title.trim() || create.isPending}>
          <Plus className="size-4" /> Add
        </Button>
      </div>

      {renderList(daily, "Today")}
      {renderList(weekly, "This week")}
    </section>
  );
}
