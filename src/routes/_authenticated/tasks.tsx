import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Circle, Plus, RotateCcw, Trash2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useCreateTask, useDeleteTask, useSubjects, useTasks, useUpdateTask } from "@/lib/db";
import { todayISO } from "@/lib/scheduling";

export const Route = createFileRoute("/_authenticated/tasks")({
  head: () => ({
    meta: [
      { title: "Tasks — Learning OS" },
      { name: "description", content: "Capture study tasks, set priorities and due dates, and clear them one by one." },
      { property: "og:title", content: "Tasks — Learning OS" },
      { property: "og:description", content: "A simple task list wired into your study plan." },
    ],
  }),
  component: TasksPage,
});

const PRIORITIES = [
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

const isDone = (t: { status: string }) => t.status === "completed";

const priorityTone: Record<string, string> = {
  high: "text-destructive",
  medium: "text-flame",
  low: "text-muted-foreground",
};

function TasksPage() {
  const tasks = useTasks();
  const subjects = useSubjects();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState("medium");
  const [dueDate, setDueDate] = useState(todayISO());
  const [subjectId, setSubjectId] = useState<string>("none");
  const [filter, setFilter] = useState<"open" | "done" | "all">("open");

  const list = useMemo(() => {
    const all = tasks.data ?? [];
    const filtered =
      filter === "all" ? all : all.filter((t) => (filter === "done" ? isDone(t) : !isDone(t)));
    const rank: Record<string, number> = { high: 0, medium: 1, low: 2 };
    return [...filtered].sort((a, b) => {
      if (isDone(a) !== isDone(b)) return isDone(a) ? 1 : -1;
      const d = (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999");
      if (d !== 0) return d;
      return (rank[a.priority] ?? 1) - (rank[b.priority] ?? 1);
    });
  }, [tasks.data, filter]);

  const add = async () => {
    if (!title.trim()) {
      toast.error("Type a task first.");
      return;
    }
    try {
      await createTask.mutateAsync({
        title: title.trim(),
        priority,
        due_date: dueDate || null,
        subject_id: subjectId === "none" ? null : subjectId,
      });
      setTitle("");
      toast.success("Task added.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add task");
    }
  };

  const openCount = (tasks.data ?? []).filter((t) => t.status !== "completed").length;

  return (
    <AppShell title="Tasks">
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Tasks</h2>
          <p className="text-sm text-muted-foreground">
            {openCount} open {openCount === 1 ? "task" : "tasks"}
          </p>
        </div>

        <section className="surface space-y-4 p-5">
          <div className="space-y-1.5">
            <Label htmlFor="tt">New task</Label>
            <Input
              id="tt"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") add();
              }}
              placeholder="e.g. Revise SQL joins"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="td">Due</Label>
              <Input id="td" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Subject</Label>
              <Select value={subjectId} onValueChange={setSubjectId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {(subjects.data ?? []).map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={add} disabled={createTask.isPending} className="w-full sm:w-auto">
            <Plus className="size-4" /> Add task
          </Button>
        </section>

        <div className="flex gap-2">
          {(["open", "done", "all"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs capitalize transition-colors",
                filter === f
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground hover:border-primary/40",
              )}
            >
              {f}
            </button>
          ))}
        </div>

        {tasks.isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-14 w-full rounded-xl" />
            <Skeleton className="h-14 w-full rounded-xl" />
          </div>
        ) : tasks.isError ? (
          <div className="surface space-y-3 p-6 text-center">
            <p className="text-sm text-muted-foreground">Couldn't load your tasks.</p>
            <Button size="sm" variant="outline" onClick={() => tasks.refetch()}>
              <RotateCcw className="size-4" /> Retry
            </Button>
          </div>
        ) : list.length === 0 ? (
          <div className="surface p-8 text-center text-sm text-muted-foreground">
            Nothing here. Add a task above.
          </div>
        ) : (
          <ul className="space-y-2">
            {list.map((t) => {
              const overdue = !isDone(t) && t.due_date && t.due_date < todayISO();
              return (
                <li key={t.id} className="surface flex items-center gap-3 p-4">
                  <button
                    aria-label={isDone(t) ? "Mark incomplete" : "Mark complete"}
                    onClick={() =>
                      updateTask.mutate({
                        id: t.id,
                        status: isDone(t) ? "pending" : "completed",
                        completed_at: isDone(t) ? null : new Date().toISOString(),
                      })
                    }
                  >
                    {isDone(t) ? (
                      <CheckCircle2 className="size-5 text-success" />
                    ) : (
                      <Circle className="size-5 text-muted-foreground/50" />
                    )}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className={cn("truncate text-sm", isDone(t) && "text-muted-foreground line-through")}>
                      {t.title}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span className={cn("capitalize", priorityTone[t.priority])}>{t.priority}</span>
                      {t.due_date && (
                        <span className={cn(overdue && "text-destructive")}>due {t.due_date}</span>
                      )}
                      {t.subject_id && (
                        <Badge variant="outline">
                          {subjects.data?.find((s) => s.id === t.subject_id)?.name ?? "Subject"}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Delete task"
                    onClick={() => deleteTask.mutate(t.id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </AppShell>
  );
}
