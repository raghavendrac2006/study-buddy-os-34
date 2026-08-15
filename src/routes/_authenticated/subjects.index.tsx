import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Archive, ArrowRight, Plus, RotateCcw, Trash2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useCreateSubject,
  useDeleteSubject,
  useLearningDays,
  useSubjects,
  useUpdateSubject,
} from "@/lib/db";
import { isoAddDays, todayISO } from "@/lib/scheduling";

export const Route = createFileRoute("/_authenticated/subjects/")({
  head: () => ({
    meta: [
      { title: "Learn — Subjects & Plans" },
      { name: "description", content: "Manage your subjects and their day-wise learning plans." },
      { property: "og:title", content: "Learn — Subjects & Plans" },
      { property: "og:description", content: "Every subject with its own day-wise curriculum." },
    ],
  }),
  component: SubjectsPage,
});

const CATEGORIES = ["Programming", "Computer Science", "Aptitude", "Mathematics", "Other"];
const DIFFICULTIES = ["easy", "medium", "hard"];

function SubjectsPage() {
  const [showArchived, setShowArchived] = useState(false);
  const subjects = useSubjects(showArchived);
  const days = useLearningDays();
  const createSubject = useCreateSubject();
  const updateSubject = useUpdateSubject();
  const deleteSubject = useDeleteSubject();
  const [open, setOpen] = useState(false);

  const [form, setForm] = useState({
    name: "",
    description: "",
    category: "Programming",
    difficulty: "medium",
    total_planned_days: "30",
  });

  const progressBySubject = useMemo(() => {
    const map = new Map<string, { total: number; done: number }>();
    for (const d of days.data ?? []) {
      const e = map.get(d.subject_id) ?? { total: 0, done: 0 };
      e.total++;
      if (d.status === "completed") e.done++;
      map.set(d.subject_id, e);
    }
    return map;
  }, [days.data]);

  const submit = async () => {
    if (!form.name.trim()) {
      toast.error("Give the subject a name.");
      return;
    }
    const planned = parseInt(form.total_planned_days || "30", 10);
    try {
      await createSubject.mutateAsync({
        name: form.name.trim(),
        description: form.description.trim() || null,
        category: form.category,
        difficulty: form.difficulty,
        total_planned_days: planned,
        start_date: todayISO(),
        target_date: isoAddDays(todayISO(), Math.max(planned - 1, 0)),
        sort_order: subjects.data?.length ?? 0,
      });
      toast.success("Subject created.");
      setForm({ name: "", description: "", category: "Programming", difficulty: "medium", total_planned_days: "30" });
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create subject");
    }
  };

  const list = subjects.data ?? [];

  return (
    <AppShell title="Learn">
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Subjects</h2>
            <p className="text-sm text-muted-foreground">
              Each subject holds its own day-wise plan.
            </p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="size-4" /> New
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New subject</DialogTitle>
                <DialogDescription>You can add plan days right after creating it.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="sn">Name</Label>
                  <Input id="sn" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Machine Learning" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sd">Description</Label>
                  <Textarea id="sd" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Category</Label>
                    <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Difficulty</Label>
                    <Select value={form.difficulty} onValueChange={(v) => setForm({ ...form, difficulty: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {DIFFICULTIES.map((c) => (
                          <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sp">Planned days</Label>
                  <Input id="sp" type="number" min="1" value={form.total_planned_days} onChange={(e) => setForm({ ...form, total_planned_days: e.target.value })} />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={submit} disabled={createSubject.isPending}>Create subject</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {subjects.isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-28 w-full rounded-xl" />
            <Skeleton className="h-28 w-full rounded-xl" />
          </div>
        ) : subjects.isError ? (
          <div className="surface space-y-3 p-6 text-center">
            <p className="text-sm text-muted-foreground">Couldn't load your subjects.</p>
            <Button size="sm" variant="outline" onClick={() => subjects.refetch()}>
              <RotateCcw className="size-4" /> Retry
            </Button>
          </div>
        ) : list.length === 0 ? (
          <div className="surface space-y-3 p-8 text-center">
            <p className="text-sm text-muted-foreground">
              No subjects yet. Create your first one to start planning.
            </p>
            <Button size="sm" onClick={() => setOpen(true)}>
              <Plus className="size-4" /> Add a subject
            </Button>
          </div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {list.map((s) => {
              const p = progressBySubject.get(s.id) ?? { total: 0, done: 0 };
              const pct = p.total ? Math.round((p.done / p.total) * 100) : 0;
              return (
                <li key={s.id} className="surface flex flex-col gap-3 p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-sm font-semibold">{s.name}</h3>
                        {s.archived && <Badge variant="outline">archived</Badge>}
                      </div>
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                        {s.description || `${s.category ?? "Subject"} · ${s.difficulty}`}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={s.archived ? "Restore" : "Archive"}
                        onClick={() => updateSubject.mutate({ id: s.id, archived: !s.archived })}
                      >
                        <Archive className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Delete subject"
                        onClick={() => {
                          if (confirm(`Delete "${s.name}" and its plan?`)) {
                            deleteSubject.mutate(s.id, {
                              onSuccess: () => toast.success("Subject deleted."),
                              onError: (e) => toast.error(e.message),
                            });
                          }
                        }}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>

                  <div>
                    <div className="mb-1.5 flex justify-between text-xs text-muted-foreground">
                      <span>{p.done} / {p.total || s.total_planned_days} days</span>
                      <span className="tabular">{pct}%</span>
                    </div>
                    <Progress value={pct} />
                  </div>

                  <Button variant="outline" size="sm" asChild className="justify-between">
                    <Link to="/subjects/$id" params={{ id: s.id }}>
                      Open plan <ArrowRight className="size-3.5" />
                    </Link>
                  </Button>
                </li>
              );
            })}
          </ul>
        )}

        <button
          className="text-xs text-muted-foreground underline-offset-4 hover:underline"
          onClick={() => setShowArchived((v) => !v)}
        >
          {showArchived ? "Hide archived subjects" : "Show archived subjects"}
        </button>
      </div>
    </AppShell>
  );
}
