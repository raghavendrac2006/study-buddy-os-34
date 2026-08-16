import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, CalendarDays, CheckCircle2, Plus, Trash2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  useCreateLearningDay,
  useDeleteLearningDay,
  useLearningDays,
  useSubject,
  useUpdateLearningDay,
} from "@/lib/db";
import { isoAddDays, minutesLabel, todayISO } from "@/lib/scheduling";

export const Route = createFileRoute("/_authenticated/subjects/$id")({
  head: () => ({
    meta: [
      { title: "Subject plan — My Study Compass" },
      { name: "description", content: "Day-wise curriculum for this subject: topics, subtopics and durations." },
      { property: "og:title", content: "Subject plan — My Study Compass" },
      { property: "og:description", content: "Define exactly what to study on each day." },
    ],
  }),
  component: SubjectDetail,
});

function SubjectDetail() {
  const { id } = Route.useParams();
  const subject = useSubject(id);
  const days = useLearningDays(id);
  const createDay = useCreateLearningDay();
  const updateDay = useUpdateLearningDay();
  const deleteDay = useDeleteLearningDay();

  const [topic, setTopic] = useState("");
  const [subtopics, setSubtopics] = useState("");
  const [minutes, setMinutes] = useState("60");

  const list = days.data ?? [];
  const done = list.filter((d) => d.status === "completed").length;
  const pct = list.length ? Math.round((done / list.length) * 100) : 0;

  const addDay = async () => {
    if (!topic.trim()) {
      toast.error("Add a topic for this day.");
      return;
    }
    const nextNumber = (list.at(-1)?.day_number ?? 0) + 1;
    const base = subject.data?.start_date ?? todayISO();
    try {
      await createDay.mutateAsync({
        subject_id: id,
        day_number: nextNumber,
        planned_date: isoAddDays(base, nextNumber - 1),
        topic: topic.trim(),
        subtopics: subtopics
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        estimated_minutes: parseInt(minutes || "60", 10),
      });
      setTopic("");
      setSubtopics("");
      toast.success(`Day ${nextNumber} added.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add day");
    }
  };

  return (
    <AppShell title={subject.data?.name ?? "Subject"}>
      <div className="space-y-6">
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link to="/subjects">
            <ArrowLeft className="size-4" /> All subjects
          </Link>
        </Button>

        {subject.isLoading ? (
          <Skeleton className="h-24 w-full rounded-xl" />
        ) : subject.isError ? (
          <div className="surface p-6 text-center text-sm text-muted-foreground">
            This subject could not be loaded.
          </div>
        ) : (
          <section className="surface p-5">
            <h2 className="text-lg font-semibold tracking-tight">{subject.data?.name}</h2>
            {subject.data?.description && (
              <p className="mt-1 text-sm text-muted-foreground">{subject.data.description}</p>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              {subject.data?.category && <Badge variant="secondary">{subject.data.category}</Badge>}
              <Badge variant="outline" className="capitalize">{subject.data?.difficulty}</Badge>
              {subject.data?.target_date && (
                <Badge variant="outline" className="gap-1">
                  <CalendarDays className="size-3" /> target {subject.data.target_date}
                </Badge>
              )}
            </div>
            <div className="mt-4">
              <div className="mb-1.5 flex justify-between text-xs text-muted-foreground">
                <span>{done} of {list.length} days complete</span>
                <span className="tabular">{pct}%</span>
              </div>
              <Progress value={pct} />
            </div>
          </section>
        )}

        <section className="space-y-3">
          <h3 className="text-sm font-semibold tracking-tight">Day-wise plan</h3>
          {days.isLoading ? (
            <Skeleton className="h-40 w-full rounded-xl" />
          ) : list.length === 0 ? (
            <div className="surface p-6 text-center text-sm text-muted-foreground">
              No days planned yet. Add your first day below.
            </div>
          ) : (
            <ul className="space-y-2">
              {list.map((d) => (
                <li key={d.id} className="surface flex items-start gap-3 p-4">
                  <button
                    aria-label="Toggle day complete"
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
                      className={cn(
                        "size-5",
                        d.status === "completed" ? "text-success" : "text-muted-foreground/40",
                      )}
                    />
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-medium text-muted-foreground">Day {d.day_number}</span>
                      <span className="text-sm font-medium">{d.topic}</span>
                    </div>
                    {d.subtopics.length > 0 && (
                      <p className="mt-1 text-xs text-muted-foreground">{d.subtopics.join(" · ")}</p>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <input
                        type="date"
                        value={d.planned_date ?? ""}
                        onChange={(e) => updateDay.mutate({ id: d.id, planned_date: e.target.value })}
                        className="rounded-md border border-border bg-background px-2 py-1"
                        aria-label={`Planned date for day ${d.day_number}`}
                      />
                      <span className="tabular">{minutesLabel(d.estimated_minutes)}</span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Delete day"
                    onClick={() => deleteDay.mutate(d.id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="surface space-y-4 p-5">
          <h3 className="text-sm font-semibold tracking-tight">Add a day</h3>
          <div className="space-y-1.5">
            <Label htmlFor="topic">Topic</Label>
            <Input id="topic" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. Loops" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="subs">Subtopics (comma separated)</Label>
            <Textarea id="subs" value={subtopics} onChange={(e) => setSubtopics(e.target.value)} placeholder="for, while, do-while, practice problems" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mins">Estimated minutes</Label>
            <Input id="mins" type="number" min="5" step="5" value={minutes} onChange={(e) => setMinutes(e.target.value)} />
          </div>
          <Button onClick={addDay} disabled={createDay.isPending} className="w-full">
            <Plus className="size-4" /> Add day
          </Button>
        </section>
      </div>
    </AppShell>
  );
}
