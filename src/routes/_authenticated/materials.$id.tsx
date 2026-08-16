import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus, Sparkles, Trash2, Wand2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { analyzeCourse, analyzeMaterial, generateCoursePlan, generatePlan } from "@/lib/ai.functions";
import { friendlyAiError } from "@/lib/ai/errors";
import type { Analysis } from "@/lib/ai/schemas";
import { useGoals, isoDay, weekStart } from "@/lib/workspace-db";
import type { Json } from "@/integrations/supabase/types";
import { feasibility, today } from "@/lib/adaptive";
import {
  useCreateActivities,
  useCreatePlan,
  useMaterial,
  useSaveAnalysisTree,
  useTopics,
  useUpdateMaterial,
} from "@/lib/adaptive-db";
import { useSubjects, useCreateSubject } from "@/lib/db";

export const Route = createFileRoute("/_authenticated/materials/$id")({
  head: () => ({
    meta: [
      { title: "Material analysis — Learning OS" },
      { name: "description", content: "Review and edit the structure AI found in your study material." },
      { property: "og:title", content: "Material analysis — Learning OS" },
      { property: "og:description", content: "Units, chapters, topics and objectives from your own file." },
    ],
  }),
  component: MaterialDetail,
});

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

function MaterialDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const material = useMaterial(id);
  const updateMaterial = useUpdateMaterial();
  const saveTree = useSaveAnalysisTree();
  const topics = useTopics({ materialId: id });
  const subjects = useSubjects();
  const createSubject = useCreateSubject();
  const createPlan = useCreatePlan();
  const createActivities = useCreateActivities();

  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [analysing, setAnalysing] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);

  // Load a previously saved analysis so a document is never analysed twice.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("material_analyses")
        .select("result")
        .eq("material_id", id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!cancelled && data?.result) setAnalysis(data.result as unknown as Analysis);
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const meta = (material.data?.metadata ?? {}) as {
    chapters?: { title: string; start_seconds: number }[];
    description?: string;
    transcript_available?: boolean;
    chapters_available?: boolean;
    notes?: string[];
  };
  const isCourse = material.data?.source_type === "youtube";

  /** Turns an AI course structure into the same tree shape the editor already renders. */
  const analyseCourseSource = async () => {
    const res = await analyzeCourse({
      data: {
        title: material.data!.title,
        author: material.data!.author ?? "",
        durationMinutes: Math.round((material.data!.duration_seconds ?? 0) / 60),
        description: (meta.description ?? "").slice(0, 20_000),
        chapters: (meta.chapters ?? []).slice(0, 400),
        transcriptSample: (material.data!.extracted_text ?? "").slice(0, 120_000),
      },
    });
    const analysis: Analysis = {
      summary: res.course.summary ?? "",
      subject_guess: res.course.subject_guess ?? "",
      units: [
        {
          title: material.data!.title,
          description: "Video course",
          chapters: [
            {
              title: "Course sections",
              description: "",
              topics: res.course.sections.map((sec) => ({
                title: sec.title,
                description: sec.description ?? "",
                key_concepts: sec.key_concepts ?? [],
                prerequisites: sec.prerequisites ?? [],
                objectives: sec.objectives ?? [],
                subtopics: [],
                difficulty: sec.difficulty ?? 3,
                // watching time plus active learning time
                estimated_minutes: Math.min(600, Math.max(5, Math.round((sec.video_minutes ?? 30) * 1.5))),
                source_page: null,
                start_seconds: sec.start_seconds ?? null,
                end_seconds: sec.end_seconds ?? null,
              })),
            },
          ],
        },
      ],
    };
    return { analysis, model: res.model };
  };

  const runAnalysis = async () => {
    if (!material.data) return;
    if (!isCourse && !material.data.extracted_text) return;
    setAnalysing(true);
    await updateMaterial.mutateAsync({ id, status: "analyzing", error_message: null });
    try {
      const res = isCourse
        ? await analyseCourseSource()
        : await analyzeMaterial({
            data: {
              text: material.data.extracted_text ?? "",
              fileName: material.data.file_name,
            },
          });
      const { data: userData } = await supabase.auth.getUser();
      await supabase.from("material_analyses").insert({
        user_id: userData.user!.id,
        material_id: id,
        model: res.model,
        summary: res.analysis.summary ?? "",
        result: res.analysis as unknown as Json,
      });
      setAnalysis(res.analysis as Analysis);
      await updateMaterial.mutateAsync({ id, status: "analyzed" });
      toast.success("Structure extracted. Review and edit it below.");
    } catch (err) {
      const message = friendlyAiError(err);
      await updateMaterial.mutateAsync({ id, status: "uploaded", error_message: message });
      toast.error(message);
    } finally {
      setAnalysing(false);
    }
  };

  const topicCount = useMemo(
    () =>
      analysis?.units.reduce(
        (a, u) => a + u.chapters.reduce((b, c) => b + c.topics.length, 0),
        0,
      ) ?? 0,
    [analysis],
  );

  const totalMinutes = useMemo(
    () =>
      analysis?.units.reduce(
        (a, u) =>
          a + u.chapters.reduce((b, c) => b + c.topics.reduce((t, x) => t + x.estimated_minutes, 0), 0),
        0,
      ) ?? 0,
    [analysis],
  );

  const mutate = (fn: (draft: Analysis) => void) => {
    setAnalysis((prev) => {
      if (!prev) return prev;
      const copy = structuredClone(prev) as Analysis;
      fn(copy);
      return copy;
    });
  };

  const saveStructure = async () => {
    if (!analysis) return;
    let subjectId = material.data?.subject_id ?? null;
    if (!subjectId) {
      const name = analysis.subject_guess || material.data?.title || "New subject";
      const existing = subjects.data?.find((s) => s.name.toLowerCase() === name.toLowerCase());
      const subject = existing ?? (await createSubject.mutateAsync({ name }));
      subjectId = subject?.id ?? null;
      await updateMaterial.mutateAsync({ id, subject_id: subjectId });
    }
    await saveTree.mutateAsync({ materialId: id, subjectId, analysis });
    toast.success("Structure saved. Now set your goal and dates.");
    setPlanOpen(true);
  };

  const savedTopics = (topics.data ?? []).filter((t) => t.kind === "topic");

  return (
    <AppShell title="Material">
      <div className="space-y-8">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <Link to="/materials" className="text-xs text-muted-foreground hover:underline">
              ← All material
            </Link>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight">
              {material.data?.title ?? "Material"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {material.data
                ? isCourse
                  ? `${Math.round((material.data.duration_seconds ?? 0) / 60)} min video · ${material.data.author ?? "YouTube"}`
                  : `${Math.round(material.data.char_count / 1000)}k characters`
                : ""}
            </p>
            {isCourse && (meta.notes?.length ?? 0) > 0 && (
              <p className="mt-1 max-w-xl text-xs text-muted-foreground">
                {meta.notes!.join(" ")} You can still plan this course manually.
              </p>
            )}
          </div>
          <div className="flex gap-2">
            {!analysis && (
              <Button onClick={runAnalysis} disabled={analysing || !material.data}>
                {analysing ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                {analysing ? "Analysing…" : "Analyse with AI"}
              </Button>
            )}
            {analysis && (
              <>
                <Button variant="outline" onClick={runAnalysis} disabled={analysing}>
                  <Wand2 className="size-4" /> Re-analyse
                </Button>
                <Button onClick={saveStructure} disabled={saveTree.isPending}>
                  {saveTree.isPending && <Loader2 className="size-4 animate-spin" />}
                  Save structure
                </Button>
              </>
            )}
          </div>
        </header>

        {material.data?.error_message && (
          <p className="surface border-destructive/40 p-4 text-sm text-destructive">
            {material.data.error_message}
          </p>
        )}

        {material.isLoading && <Skeleton className="h-40 w-full rounded-xl" />}

        {!analysis && !material.isLoading && (
          <div className="surface p-6 text-center">
            <p className="text-sm text-muted-foreground">
              AI will read this file once and save the structure it finds — units, chapters, topics,
              key concepts, prerequisites, objectives, difficulty and time estimates.
            </p>
          </div>
        )}

        {analysis && (
          <>
            <div className="surface p-5">
              <p className="text-sm">{analysis.summary}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge variant="secondary">{analysis.units.length} units</Badge>
                <Badge variant="secondary">{topicCount} topics</Badge>
                <Badge variant="secondary">{Math.round(totalMinutes / 60)}h estimated</Badge>
                {analysis.subject_guess && <Badge>{analysis.subject_guess}</Badge>}
              </div>
            </div>

            <div className="space-y-4">
              {analysis.units.map((unit, ui) => (
                <div key={ui} className="surface space-y-3 p-4">
                  <div className="flex items-center gap-2">
                    <Input
                      value={unit.title}
                      onChange={(e) => mutate((d) => void (d.units[ui]!.title = e.target.value))}
                      className="font-medium"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Remove unit"
                      onClick={() => mutate((d) => void d.units.splice(ui, 1))}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>

                  {unit.chapters.map((chapter, ci) => (
                    <div key={ci} className="rounded-lg border border-border p-3">
                      <div className="flex items-center gap-2">
                        <Input
                          value={chapter.title}
                          onChange={(e) =>
                            mutate((d) => void (d.units[ui]!.chapters[ci]!.title = e.target.value))
                          }
                          className="h-8 text-sm"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Remove chapter"
                          onClick={() => mutate((d) => void d.units[ui]!.chapters.splice(ci, 1))}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>

                      <ul className="mt-2 space-y-2">
                        {chapter.topics.map((topic, ti) => (
                          <li key={ti} className="flex flex-wrap items-center gap-2">
                            <Input
                              value={topic.title}
                              onChange={(e) =>
                                mutate(
                                  (d) =>
                                    void (d.units[ui]!.chapters[ci]!.topics[ti]!.title =
                                      e.target.value),
                                )
                              }
                              className="h-8 min-w-40 flex-1 text-sm"
                            />
                            <Input
                              type="number"
                              aria-label="Estimated minutes"
                              value={topic.estimated_minutes}
                              onChange={(e) =>
                                mutate(
                                  (d) =>
                                    void (d.units[ui]!.chapters[ci]!.topics[ti]!.estimated_minutes =
                                      Number(e.target.value) || 15),
                                )
                              }
                              className="h-8 w-20 text-sm"
                            />
                            <Select
                              value={String(topic.difficulty)}
                              onValueChange={(v) =>
                                mutate(
                                  (d) =>
                                    void (d.units[ui]!.chapters[ci]!.topics[ti]!.difficulty =
                                      Number(v)),
                                )
                              }
                            >
                              <SelectTrigger className="h-8 w-24 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {[1, 2, 3, 4, 5].map((n) => (
                                  <SelectItem key={n} value={String(n)}>
                                    Diff {n}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label="Remove topic"
                              onClick={() =>
                                mutate((d) => void d.units[ui]!.chapters[ci]!.topics.splice(ti, 1))
                              }
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </li>
                        ))}
                      </ul>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-2"
                        onClick={() =>
                          mutate((d) =>
                            void d.units[ui]!.chapters[ci]!.topics.push({
                              title: "New topic",
                              description: "",
                              key_concepts: [],
                              prerequisites: [],
                              objectives: [],
                              subtopics: [],
                              difficulty: 3,
                              estimated_minutes: 30,
                              source_page: null,
                              start_seconds: null,
                              end_seconds: null,
                            }),
                          )
                        }
                      >
                        <Plus className="size-3.5" /> Add topic
                      </Button>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </>
        )}

        {savedTopics.length > 0 && (
          <div className="surface flex flex-wrap items-center justify-between gap-3 p-5">
            <p className="text-sm text-muted-foreground">
              {savedTopics.length} topics saved from this material.
            </p>
            <Button onClick={() => setPlanOpen(true)}>Create study plan</Button>
          </div>
        )}
      </div>

      <PlanDialog
        open={planOpen}
        onOpenChange={setPlanOpen}
        materialId={id}
        subjectId={material.data?.subject_id ?? null}
        defaultTitle={material.data?.title ?? "Study plan"}
        topics={savedTopics.map((t) => ({
          id: t.id,
          title: t.title,
          difficulty: t.difficulty,
          estimated_minutes: t.estimated_minutes,
          prerequisites: t.prerequisites,
        }))}
        isCourse={isCourse}
        onCreated={(planId) => navigate({ to: "/plans/$id", params: { id: planId } })}
        createPlan={createPlan}
        createActivities={createActivities}
      />
    </AppShell>
  );
}

type PlanTopic = {
  id: string;
  title: string;
  difficulty: number;
  estimated_minutes: number;
  prerequisites: string[];
};

function PlanDialog({
  open,
  onOpenChange,
  materialId,
  subjectId,
  defaultTitle,
  topics,
  isCourse,
  onCreated,
  createPlan,
  createActivities,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  materialId: string;
  subjectId: string | null;
  defaultTitle: string;
  topics: PlanTopic[];
  isCourse: boolean;
  onCreated: (planId: string) => void;
  createPlan: ReturnType<typeof useCreatePlan>;
  createActivities: ReturnType<typeof useCreateActivities>;
}) {
  const [goal, setGoal] = useState(defaultTitle);
  const [targetDate, setTargetDate] = useState("");
  const [dailyMinutes, setDailyMinutes] = useState(120);
  const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5, 6, 0]);
  const [level, setLevel] = useState("beginner");
  const [priority, setPriority] = useState("medium");
  const [busy, setBusy] = useState(false);
  const goals = useGoals({ from: weekStart(isoDay()) });
  const manualGoals = (goals.data ?? [])
    .filter((g) => g.source === "manual" && g.status !== "done")
    .map((g) => `${g.title} (${g.period}, ${g.target_minutes} min)`)
    .slice(0, 30);

  const totalMinutes = topics.reduce((a, t) => a + t.estimated_minutes, 0);
  const check = feasibility({
    totalMinutes: Math.round(totalMinutes * 1.4), // learning + revision overhead
    dailyMinutes,
    preferredDays: days,
    targetDate: targetDate || null,
  });

  const submit = async () => {
    setBusy(true);
    try {
      const res = isCourse
        ? await generateCoursePlan({
            data: {
              goal,
              startDate: today(),
              targetDate: targetDate || null,
              dailyMinutes,
              preferredDays: days,
              knowledgeLevel: level,
              priority,
              feasibilityNote: check.message,
              manualGoals,
              sections: topics.map((t) => ({
                title: t.title,
                // the stored estimate includes active learning; recover watch time
                video_minutes: Math.max(1, Math.round(t.estimated_minutes / 1.5)),
                difficulty: t.difficulty,
                prerequisites: t.prerequisites,
              })),
            },
          })
        : await generatePlan({
            data: {
              goal,
              startDate: today(),
              targetDate: targetDate || null,
              dailyMinutes,
              preferredDays: days,
              knowledgeLevel: level,
              priority,
              feasibilityNote: check.message,
              topics: topics.map((t) => ({
                title: t.title,
                difficulty: t.difficulty,
                estimated_minutes: t.estimated_minutes,
                prerequisites: t.prerequisites,
              })),
            },
          });

      const plan = await createPlan.mutateAsync({
        subject_id: subjectId,
        material_id: materialId,
        title: goal || defaultTitle,
        target_date: targetDate || null,
        daily_minutes: dailyMinutes,
        preferred_days: days,
        knowledge_level: level,
        priority,
        feasibility: {
          ai_feasible: res.plan.feasible,
          ai_message: res.plan.message,
          ...check,
        },
      });
      if (!plan) throw new Error("Could not create the plan");

      const byTitle = new Map(topics.map((t) => [t.title.toLowerCase().trim(), t.id]));
      const rows = res.plan.days.flatMap((day, di) =>
        day.activities.map((a, ai) => ({
          plan_id: plan.id,
          topic_id: byTitle.get((a.topic_title ?? "").toLowerCase().trim()) ?? null,
          scheduled_date: day.date,
          activity_type: a.activity_type ?? "learn",
          title: a.title,
          description: a.description ?? "",
          estimated_minutes: Math.round(a.minutes ?? 30),
          priority: Math.round(a.priority ?? 3),
          sort_order: di * 100 + ai,
          source: "ai",
        })),
      );
      if (!rows.length) throw new Error("The AI plan had no activities. Nothing was saved.");
      await createActivities.mutateAsync(rows);

      toast.success(res.plan.feasible ? "Plan created." : `Plan created. ${res.plan.message}`);
      onOpenChange(false);
      onCreated(plan.id);
    } catch (err) {
      toast.error(friendlyAiError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create your learning plan</DialogTitle>
          <DialogDescription>
            {topics.length} {isCourse ? "course sections" : "topics"} from this source.
            {manualGoals.length > 0 && " Your manual goals are sent to the planner."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="goal">Goal</Label>
            <Textarea id="goal" value={goal} onChange={(e) => setGoal(e.target.value)} rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="target">Target date</Label>
              <Input
                id="target"
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="daily">Minutes / day</Label>
              <Input
                id="daily"
                type="number"
                min={15}
                step={15}
                value={dailyMinutes}
                onChange={(e) => setDailyMinutes(Number(e.target.value) || 60)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Study days</Label>
            <div className="flex gap-1.5">
              {DAY_LABELS.map((label, i) => (
                <Button
                  key={i}
                  type="button"
                  size="icon"
                  variant={days.includes(i) ? "default" : "outline"}
                  onClick={() =>
                    setDays((d) => (d.includes(i) ? d.filter((x) => x !== i) : [...d, i]))
                  }
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Current level</Label>
              <Select value={level} onValueChange={setLevel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["beginner", "some knowledge", "intermediate", "advanced"].map((l) => (
                    <SelectItem key={l} value={l}>
                      {l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["low", "medium", "high", "critical"].map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <p
            className={
              check.feasible
                ? "text-xs text-muted-foreground"
                : "text-xs font-medium text-destructive"
            }
          >
            {check.message}
          </p>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={busy || topics.length === 0}>
            {busy && <Loader2 className="size-4 animate-spin" />}
            {busy ? "Generating…" : "Generate plan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
