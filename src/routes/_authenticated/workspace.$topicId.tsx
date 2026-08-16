import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, BookOpen, Target } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SourcePanel } from "@/components/workspace/source-panel";
import { NotesPanel } from "@/components/workspace/notes-panel";
import { RecallPanel } from "@/components/workspace/recall-panel";
import { AssessmentPanel } from "@/components/workspace/assessment-panel";
import { AssistantPanel } from "@/components/workspace/assistant-panel";
import { PerformanceDialog, type FeedbackTarget } from "@/components/performance-dialog";
import {
  useMasteryMap,
  useMaterial,
  usePerformanceHistory,
  useRevisions,
  useTopics,
} from "@/lib/adaptive-db";
import { useAssessments, useObjectives } from "@/lib/workspace-db";
import { MASTERY_LABEL } from "@/lib/adaptive";

export const Route = createFileRoute("/_authenticated/workspace/$topicId")({
  validateSearch: (
    search: Record<string, unknown>,
  ): { activityId?: string; planId?: string; tab?: string } => ({
    ...(typeof search["activityId"] === "string" ? { activityId: search["activityId"] } : {}),
    ...(typeof search["planId"] === "string" ? { planId: search["planId"] } : {}),
    ...(typeof search["tab"] === "string" ? { tab: search["tab"] } : {}),
  }),
  head: () => ({
    meta: [
      { title: "Learning workspace — My Study Compass" },
      {
        name: "description",
        content: "Read your source, take notes, do active recall and quick assessments in one place.",
      },
      { property: "og:title", content: "Learning workspace — My Study Compass" },
      { property: "og:description", content: "Focused study workspace for a single topic." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: WorkspacePage,
});

function WorkspacePage() {
  const { topicId } = Route.useParams();
  const search = Route.useSearch();

  const topics = useTopics();
  const topic = (topics.data ?? []).find((t) => t.id === topicId) ?? null;
  const material = useMaterial(topic?.material_id ?? "");
  const mastery = useMasteryMap();
  const objectives = useObjectives(topicId);
  const performance = usePerformanceHistory(200);
  const assessments = useAssessments(topicId);
  const revisions = useRevisions();

  const [selection, setSelection] = useState("");
  const [feedback, setFeedback] = useState<FeedbackTarget | null>(null);
  const [tab, setTab] = useState(search.tab ?? "source");

  const m = (mastery.data ?? []).find((x) => x.topic_id === topicId);
  const revision = (revisions.data ?? []).find((r) => r.topic_id === topicId);
  const topicPerf = (performance.data ?? []).filter((p) => p.topic_id === topicId);

  const context = useMemo(() => {
    const parts = [topic?.title ?? "", topic?.description ?? "", (topic?.key_concepts ?? []).join(", ")];
    if (selection) parts.push(selection);
    else if (material.data?.extracted_text) parts.push(material.data.extracted_text.slice(0, 12_000));
    return parts.filter(Boolean).join("\n\n");
  }, [topic, material.data?.extracted_text, selection]);

  const weakAreas = useMemo(
    () =>
      topicPerf
        .map((p) => p.reflection ?? "")
        .filter((r) => r.startsWith("Weak areas:"))
        .slice(0, 2)
        .flatMap((r) => r.replace("Weak areas:", "").split(";").map((s) => s.trim()))
        .filter(Boolean),
    [topicPerf],
  );

  if (topics.isLoading) {
    return (
      <AppShell title="Learning workspace">
        <Skeleton className="h-64 w-full" />
      </AppShell>
    );
  }

  if (!topic) {
    return (
      <AppShell title="Learning workspace">
        <p className="surface p-6 text-sm text-muted-foreground">
          This topic no longer exists.{" "}
          <Link to="/dashboard" className="text-primary underline">
            Back to Today
          </Link>
        </p>
      </AppShell>
    );
  }

  const objectiveTexts = (objectives.data ?? []).map((o) => o.text);

  return (
    <AppShell title={topic.title}>
      <div className="space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <Button variant="ghost" size="sm" asChild className="-ml-2 mb-1 text-muted-foreground">
              <Link to="/dashboard">
                <ArrowLeft className="mr-1 size-4" /> Today
              </Link>
            </Button>
            <h2 className="text-xl font-semibold tracking-tight">{topic.title}</h2>
            {topic.description && (
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{topic.description}</p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() =>
                setFeedback({
                  topicId,
                  topicTitle: topic.title,
                  activityId: search.activityId ?? null,
                  planId: search.planId ?? null,
                  activityType: "learn",
                  plannedMinutes: topic.estimated_minutes,
                })
              }
            >
              Log study time
            </Button>
            <Button variant="outline" onClick={() => setTab("assess")}>
              Quick assessment
            </Button>
            <Button variant="outline" onClick={() => setTab("ai")}>
              Ask AI
            </Button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="surface p-4">
            <p className="text-xs text-muted-foreground">Mastery</p>
            <p className="mt-1 text-lg font-semibold">{Math.round(Number(m?.mastery ?? 0))}%</p>
            <Progress value={Number(m?.mastery ?? 0)} className="mt-2 h-1.5" />
            <Badge variant="secondary" className="mt-2">
              {MASTERY_LABEL[(m?.state ?? "not_started") as keyof typeof MASTERY_LABEL] ?? "Not started"}
            </Badge>
          </div>
          <div className="surface p-4">
            <p className="text-xs text-muted-foreground">Next revision</p>
            <p className="mt-1 text-lg font-semibold">{revision?.due_date ?? "—"}</p>
            <p className="text-xs text-muted-foreground">
              {topicPerf.length} recorded {topicPerf.length === 1 ? "session" : "sessions"}
            </p>
          </div>
          <div className="surface p-4">
            <p className="text-xs text-muted-foreground">Source</p>
            {material.data ? (
              <Link
                to="/materials/$id"
                params={{ id: material.data.id }}
                className="mt-1 flex items-center gap-2 text-sm font-medium hover:underline"
              >
                <BookOpen className="size-4" /> {material.data.title}
              </Link>
            ) : (
              <p className="mt-1 text-sm text-muted-foreground">No linked source</p>
            )}
            {topic.source_page != null && (
              <p className="text-xs text-muted-foreground">Page {topic.source_page}</p>
            )}
          </div>
        </div>

        {objectiveTexts.length > 0 && (
          <div className="surface p-4">
            <p className="flex items-center gap-2 text-sm font-medium">
              <Target className="size-4 text-primary" /> Learning objectives
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              {objectiveTexts.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ul>
          </div>
        )}

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="flex w-full flex-wrap">
            <TabsTrigger value="source">Source</TabsTrigger>
            <TabsTrigger value="notes">Notes</TabsTrigger>
            <TabsTrigger value="recall">Recall</TabsTrigger>
            <TabsTrigger value="assess">Assessment</TabsTrigger>
            <TabsTrigger value="ai">Ask AI</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="source" className="mt-4">
            <SourcePanel material={material.data} topic={topic} onSelectText={setSelection} />
          </TabsContent>

          <TabsContent value="notes" className="mt-4">
            <NotesPanel
              topicId={topicId}
              subjectId={topic.subject_id}
              materialId={topic.material_id}
              page={material.data?.last_page ?? topic.source_page ?? null}
            />
          </TabsContent>

          <TabsContent value="recall" className="mt-4">
            <RecallPanel
              topicId={topicId}
              topicTitle={topic.title}
              objectives={objectiveTexts}
              keyConcepts={topic.key_concepts ?? []}
              context={context}
            />
          </TabsContent>

          <TabsContent value="assess" className="mt-4">
            <AssessmentPanel
              topicId={topicId}
              topicTitle={topic.title}
              objectives={objectiveTexts}
              weakAreas={weakAreas}
              context={context}
              activityId={search.activityId ?? null}
              planId={search.planId ?? null}
            />
          </TabsContent>

          <TabsContent value="ai" className="mt-4">
            <AssistantPanel
              topicTitle={topic.title}
              sourceTitle={material.data?.title ?? "this topic"}
              selection={selection}
              onClearSelection={() => setSelection("")}
            />
          </TabsContent>

          <TabsContent value="history" className="mt-4 space-y-2">
            {topicPerf.length === 0 && (
              <p className="text-sm text-muted-foreground">No study history for this topic yet.</p>
            )}
            {topicPerf.map((p) => (
              <div key={p.id} className="surface flex flex-wrap items-center gap-3 p-3 text-sm">
                <Badge variant="secondary">{p.activity_type}</Badge>
                <span className="text-muted-foreground">
                  {new Date(p.created_at).toLocaleString()}
                </span>
                <span className="text-muted-foreground">{p.actual_minutes} min</span>
                {p.score != null && <Badge>{Math.round(Number(p.score))}%</Badge>}
                {p.reflection && <span className="text-xs text-muted-foreground">{p.reflection}</span>}
              </div>
            ))}
            {(assessments.data ?? []).length > 0 && (
              <div className="surface p-4">
                <p className="text-sm font-medium">Assessment history</p>
                <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                  {(assessments.data ?? []).map((a) => (
                    <li key={a.id}>
                      {new Date(a.taken_at).toLocaleDateString()} · {a.kind} ·{" "}
                      {Math.round((Number(a.score) / Math.max(1, Number(a.max_score))) * 100)}%
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <PerformanceDialog target={feedback} onClose={() => setFeedback(null)} />
    </AppShell>
  );
}
