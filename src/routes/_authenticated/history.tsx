import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { History as HistoryIcon } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePerformanceHistory, useTopics } from "@/lib/adaptive-db";
import { useSessions } from "@/lib/db";
import { useNotes } from "@/lib/workspace-db";

export const Route = createFileRoute("/_authenticated/history")({
  head: () => ({
    meta: [
      { title: "Study history — My Study Compass" },
      {
        name: "description",
        content: "Every study session, recall attempt, assessment and note you have recorded.",
      },
      { property: "og:title", content: "Study history — My Study Compass" },
      { property: "og:description", content: "Review what you studied and how it went." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HistoryPage,
});

type Row = {
  key: string;
  at: string;
  kind: string;
  title: string;
  detail: string;
  topicId?: string | null;
};

function HistoryPage() {
  const [kind, setKind] = useState("all");
  const [q, setQ] = useState("");

  const performance = usePerformanceHistory(300);
  const sessions = useSessions();
  const notes = useNotes();
  const topics = useTopics();

  const titleOf = useMemo(() => {
    const map = new Map((topics.data ?? []).map((t) => [t.id, t.title]));
    return (id: string | null | undefined) => (id ? (map.get(id) ?? "Topic") : "General");
  }, [topics.data]);

  const rows: Row[] = useMemo(() => {
    const list: Row[] = [];
    for (const p of performance.data ?? []) {
      list.push({
        key: `p-${p.id}`,
        at: p.created_at,
        kind: p.activity_type,
        title: titleOf(p.topic_id),
        detail: [
          `${p.actual_minutes} min`,
          p.score != null ? `score ${Math.round(Number(p.score) * 100)}%` : null,
          p.confidence != null ? `confidence ${p.confidence}/5` : null,
          p.reflection || null,
        ]
          .filter(Boolean)
          .join(" · "),
        topicId: p.topic_id,
      });
    }
    for (const s of sessions.data ?? []) {
      list.push({
        key: `s-${s.id}`,
        at: s.started_at,
        kind: "session",
        title: s.topic ?? "Study session",
        detail: [`${s.actual_minutes} min`, s.mode, s.struggled_with || null]
          .filter(Boolean)
          .join(" · "),
      });
    }
    for (const n of notes.data ?? []) {
      list.push({
        key: `n-${n.id}`,
        at: n.created_at,
        kind: "note",
        title: titleOf(n.topic_id),
        detail: n.content.slice(0, 160),
        topicId: n.topic_id,
      });
    }
    return list.sort((a, b) => b.at.localeCompare(a.at));
  }, [performance.data, sessions.data, notes.data, titleOf]);

  const kinds = useMemo(() => ["all", ...new Set(rows.map((r) => r.kind))], [rows]);
  const filtered = rows.filter(
    (r) =>
      (kind === "all" || r.kind === kind) &&
      (!q.trim() || `${r.title} ${r.detail}`.toLowerCase().includes(q.toLowerCase())),
  );

  const loading = performance.isLoading || sessions.isLoading || notes.isLoading;

  return (
    <AppShell title="History">
      <div className="space-y-5">
        <header className="flex items-center gap-2">
          <HistoryIcon className="size-5 text-primary" />
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Study history</h2>
            <p className="text-sm text-muted-foreground">
              Sessions, recall, assessments and notes — newest first.
            </p>
          </div>
        </header>

        <div className="flex flex-wrap gap-2">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search history"
            className="max-w-xs"
          />
          <Select value={kind} onValueChange={setKind}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {kinds.map((k) => (
                <SelectItem key={k} value={k}>
                  {k}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <Skeleton className="h-40 w-full rounded-xl" />
        ) : filtered.length === 0 ? (
          <p className="surface p-6 text-center text-sm text-muted-foreground">
            Nothing recorded yet. Study a topic and it will show up here.
          </p>
        ) : (
          <div className="space-y-2">
            {filtered.map((r) => (
              <div key={r.key} className="surface flex flex-wrap items-center gap-3 p-3">
                <Badge variant="secondary">{r.kind}</Badge>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{r.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{r.detail}</p>
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(r.at).toLocaleDateString(undefined, { day: "numeric", month: "short" })}
                </span>
                {r.topicId && (
                  <Button size="sm" variant="ghost" asChild>
                    <Link to="/workspace/$topicId" params={{ topicId: r.topicId }} search={{}}>
                      Open
                    </Link>
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
