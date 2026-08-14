import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { Brain, History, RotateCcw } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useMasteryMap,
  usePerformanceHistory,
  useRevisions,
  useTopics,
} from "@/lib/adaptive-db";
import { MASTERY_LABEL, today, type MasteryState } from "@/lib/adaptive";

export const Route = createFileRoute("/_authenticated/mastery")({
  head: () => ({
    meta: [
      { title: "Mastery & revision — Learning OS" },
      { name: "description", content: "Topic mastery, spaced revision schedule and learning history." },
      { property: "og:title", content: "Mastery & revision — Learning OS" },
      { property: "og:description", content: "See what's strong, what's weak and what's due." },
    ],
  }),
  component: MasteryPage,
});

const STATE_ORDER: MasteryState[] = [
  "needs_revision",
  "learning",
  "developing",
  "strong",
  "mastered",
  "not_started",
];

function MasteryPage() {
  const mastery = useMasteryMap();
  const topics = useTopics();
  const revisions = useRevisions();
  const history = usePerformanceHistory();

  const titleOf = useMemo(() => {
    const map = new Map((topics.data ?? []).map((t) => [t.id, t.title]));
    return (id: string) => map.get(id) ?? "Topic";
  }, [topics.data]);

  const rows = useMemo(
    () =>
      [...(mastery.data ?? [])].sort(
        (a, b) =>
          STATE_ORDER.indexOf(a.state as MasteryState) - STATE_ORDER.indexOf(b.state as MasteryState) ||
          Number(a.mastery) - Number(b.mastery),
      ),
    [mastery.data],
  );

  return (
    <AppShell title="Mastery">
      <div className="space-y-6">
        <header>
          <h2 className="text-2xl font-semibold tracking-tight">Mastery & revision</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Mastery moves gradually with every signal — one bad day never wipes out your progress.
          </p>
        </header>

        <Tabs defaultValue="mastery">
          <TabsList>
            <TabsTrigger value="mastery">
              <Brain className="size-4" /> Mastery
            </TabsTrigger>
            <TabsTrigger value="revision">
              <RotateCcw className="size-4" /> Revision
            </TabsTrigger>
            <TabsTrigger value="history">
              <History className="size-4" /> History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="mastery" className="mt-4 space-y-2">
            {mastery.isLoading ? (
              <Skeleton className="h-32 w-full rounded-xl" />
            ) : rows.length === 0 ? (
              <p className="surface p-6 text-center text-sm text-muted-foreground">
                No mastery data yet — record how a study activity went and it appears here.
              </p>
            ) : (
              rows.map((m) => (
                <div key={m.id} className="surface p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-medium">{titleOf(m.topic_id)}</span>
                    <Badge
                      variant={
                        m.state === "needs_revision"
                          ? "destructive"
                          : m.state === "mastered"
                            ? "default"
                            : "secondary"
                      }
                    >
                      {MASTERY_LABEL[m.state as MasteryState] ?? m.state}
                    </Badge>
                  </div>
                  <Progress className="mt-2" value={Number(m.mastery)} />
                  <p className="tabular mt-1 text-xs text-muted-foreground">
                    {Math.round(Number(m.mastery))}% · {m.reps} reviews · next revision{" "}
                    {m.next_review_date ?? "—"}
                  </p>
                </div>
              ))
            )}
          </TabsContent>

          <TabsContent value="revision" className="mt-4 space-y-2">
            {(revisions.data?.length ?? 0) === 0 ? (
              <p className="surface p-6 text-center text-sm text-muted-foreground">
                Nothing scheduled for revision yet.
              </p>
            ) : (
              revisions.data!.map((r) => (
                <div key={r.id} className="surface flex items-center gap-3 p-4">
                  <RotateCcw className="size-4 shrink-0 text-primary" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{titleOf(r.topic_id)}</p>
                    <p className="text-xs text-muted-foreground">
                      due {r.due_date} · every {r.interval_days}d · {r.reason}
                    </p>
                  </div>
                  {r.due_date <= today() && <Badge variant="destructive">due</Badge>}
                </div>
              ))
            )}
          </TabsContent>

          <TabsContent value="history" className="mt-4 space-y-2">
            {(history.data?.length ?? 0) === 0 ? (
              <p className="surface p-6 text-center text-sm text-muted-foreground">
                No performance recorded yet.
              </p>
            ) : (
              history.data!.map((h) => (
                <div key={h.id} className="surface p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-medium">
                      {h.topic_id ? titleOf(h.topic_id) : "Session"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(h.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="tabular mt-1 text-xs text-muted-foreground">
                    {h.activity_type} · {h.actual_minutes} min
                    {h.score != null && ` · score ${Math.round(Number(h.score))}%`}
                    {h.confidence != null && ` · confidence ${h.confidence}/5`}
                    {h.difficulty != null && ` · difficulty ${h.difficulty}/5`}
                  </p>
                  {h.reflection && <p className="mt-1 text-xs italic">“{h.reflection}”</p>}
                </div>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
