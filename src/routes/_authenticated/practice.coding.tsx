import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ExternalLink, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PracticeTabs } from "@/components/practice-tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
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
import {
  useCodingProblems,
  useCreateCodingProblem,
  useUpdateCodingProblem,
  useDeleteCodingProblem,
  type CodingProblem,
} from "@/lib/practice-db";
import { DIFFICULTIES } from "@/lib/practice";
import { todayISO } from "@/lib/scheduling";

export const Route = createFileRoute("/_authenticated/practice/coding")({
  head: () => ({
    meta: [
      { title: "Coding & DSA Log — My Study Compass" },
      {
        name: "description",
        content: "Log problems solved on external platforms and track patterns, time and weak topics.",
      },
      { property: "og:title", content: "Coding & DSA Log — My Study Compass" },
      { property: "og:description", content: "Manual coding practice log with statistics and revision flags." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CodingLog,
});

const PLATFORMS = ["LeetCode", "HackerRank", "CodeChef", "Codeforces", "GeeksforGeeks", "Other"];
const RESULTS = ["solved", "partial", "failed"] as const;

type Draft = {
  id?: string | undefined;
  name: string;
  platform: string;
  url: string;
  category: string;
  topic: string;
  difficulty: string;
  language: string;
  minutes_taken: number;
  attempts: number;
  result: string;
  solved_on: string;
  learned: string;
  difficulties: string;
  approach: string;
  needs_revision: boolean;
};

const emptyDraft = (): Draft => ({
  name: "",
  platform: "LeetCode",
  url: "",
  category: "dsa",
  topic: "",
  difficulty: "medium",
  language: "",
  minutes_taken: 30,
  attempts: 1,
  result: "solved",
  solved_on: todayISO(),
  learned: "",
  difficulties: "",
  approach: "",
  needs_revision: false,
});

function resultLabel(r: string) {
  return r === "solved" ? "Solved" : r === "partial" ? "Partially solved" : "Couldn't solve";
}

function CodingLog() {
  const problems = useCodingProblems();
  const createP = useCreateCodingProblem();
  const updateP = useUpdateCodingProblem();
  const deleteP = useDeleteCodingProblem();

  const [draft, setDraft] = useState<Draft | null>(null);
  const [search, setSearch] = useState("");
  const [platform, setPlatform] = useState("all");
  const [topic, setTopic] = useState("all");
  const [difficulty, setDifficulty] = useState("all");

  const all = problems.data ?? [];
  const topics = useMemo(
    () => [...new Set(all.map((p) => p.topic).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [all],
  );

  const filtered = useMemo(
    () =>
      all.filter((p) => {
        if (platform !== "all" && p.platform !== platform) return false;
        if (topic !== "all" && p.topic !== topic) return false;
        if (difficulty !== "all" && p.difficulty !== difficulty) return false;
        const s = search.trim().toLowerCase();
        if (s && !p.name.toLowerCase().includes(s) && !p.topic.toLowerCase().includes(s))
          return false;
        return true;
      }),
    [all, platform, topic, difficulty, search],
  );

  const stats = useMemo(() => {
    const weekAgo = new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10);
    const byTopic = new Map<string, { total: number; solved: number }>();
    for (const p of all) {
      const key = p.topic || "General";
      const s = byTopic.get(key) ?? { total: 0, solved: 0 };
      s.total += 1;
      if (p.result === "solved") s.solved += 1;
      byTopic.set(key, s);
    }
    return {
      total: all.length,
      week: all.filter((p) => p.solved_on >= weekAgo).length,
      minutes: all.reduce((a, p) => a + p.minutes_taken, 0),
      solved: all.filter((p) => p.result === "solved").length,
      partial: all.filter((p) => p.result === "partial").length,
      failed: all.filter((p) => p.result === "failed").length,
      byDifficulty: DIFFICULTIES.map((d) => ({
        d,
        n: all.filter((p) => p.difficulty === d).length,
      })),
      topics: [...byTopic.entries()]
        .map(([t, s]) => ({ topic: t, ...s, rate: Math.round((s.solved / s.total) * 100) }))
        .sort((a, b) => b.total - a.total),
    };
  }, [all]);

  const weakTopics = stats.topics.filter((t) => t.total >= 2 && t.rate < 70).slice(0, 5);

  function toDraft(p: CodingProblem): Draft {
    return {
      id: p.id,
      name: p.name,
      platform: p.platform,
      url: p.url ?? "",
      category: p.category,
      topic: p.topic,
      difficulty: p.difficulty,
      language: p.language ?? "",
      minutes_taken: p.minutes_taken,
      attempts: p.attempts,
      result: p.result,
      solved_on: p.solved_on,
      learned: p.learned ?? "",
      difficulties: p.difficulties ?? "",
      approach: p.approach ?? "",
      needs_revision: p.needs_revision,
    };
  }

  async function save() {
    if (!draft) return;
    if (!draft.name.trim()) {
      toast.error("Problem name is required.");
      return;
    }
    const payload = {
      name: draft.name.trim(),
      platform: draft.platform,
      url: draft.url.trim() || null,
      category: draft.category,
      topic: draft.topic.trim() || "General",
      difficulty: draft.difficulty,
      language: draft.language.trim() || null,
      minutes_taken: Math.max(0, draft.minutes_taken),
      attempts: Math.max(1, draft.attempts),
      result: draft.result,
      solved_on: draft.solved_on,
      learned: draft.learned.trim() || null,
      difficulties: draft.difficulties.trim() || null,
      approach: draft.approach.trim() || null,
      needs_revision: draft.needs_revision,
      revision_due_date: draft.needs_revision
        ? new Date(Date.now() + 3 * 864e5).toISOString().slice(0, 10)
        : null,
    };
    try {
      if (draft.id) await updateP.mutateAsync({ id: draft.id, ...payload });
      else await createP.mutateAsync(payload);
      setDraft(null);
      toast.success("Problem logged");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save problem");
    }
  }

  return (
    <AppShell title="Practice">
      <div className="space-y-6">
        <PracticeTabs />

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="Total problems" value={String(stats.total)} hint="all time" />
          <Stat label="This week" value={String(stats.week)} hint="logged" />
          <Stat
            label="Solving time"
            value={`${Math.round(stats.minutes / 60)}h`}
            hint={`${stats.minutes} min`}
          />
          <Stat
            label="Solved"
            value={`${stats.solved}`}
            hint={`${stats.partial} partial · ${stats.failed} failed`}
          />
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          <div className="surface p-5">
            <h3 className="text-sm font-semibold">Difficulty distribution</h3>
            <ul className="mt-3 space-y-2 text-sm">
              {stats.byDifficulty.map((d) => (
                <li key={d.d} className="flex items-center justify-between">
                  <span className="capitalize">{d.d}</span>
                  <span className="tabular text-muted-foreground">{d.n}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="surface p-5">
            <h3 className="text-sm font-semibold">Weak topics</h3>
            {weakTopics.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">
                Nothing flagged yet — log a few more problems.
              </p>
            ) : (
              <ul className="mt-3 space-y-2 text-sm">
                {weakTopics.map((t) => (
                  <li key={t.topic} className="flex items-center gap-3">
                    <span className="min-w-0 flex-1 truncate">{t.topic}</span>
                    <span className="tabular text-xs text-muted-foreground">
                      {t.solved}/{t.total}
                    </span>
                    <Badge variant={t.rate < 50 ? "destructive" : "secondary"}>{t.rate}%</Badge>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => setDraft(emptyDraft())}>
            <Plus className="size-4" /> Log problem
          </Button>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <Input
            placeholder="Search problems…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select value={platform} onValueChange={setPlatform}>
            <SelectTrigger><SelectValue placeholder="Platform" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All platforms</SelectItem>
              {PLATFORMS.map((p) => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={topic} onValueChange={setTopic}>
            <SelectTrigger><SelectValue placeholder="Topic" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All topics</SelectItem>
              {topics.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={difficulty} onValueChange={setDifficulty}>
            <SelectTrigger><SelectValue placeholder="Difficulty" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All difficulties</SelectItem>
              {DIFFICULTIES.map((d) => (
                <SelectItem key={d} value={d}>{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {problems.isLoading ? (
          <Skeleton className="h-32 w-full rounded-xl" />
        ) : filtered.length === 0 ? (
          <div className="surface p-6 text-center text-sm text-muted-foreground">
            {all.length === 0
              ? "No problems logged yet. Solve one on LeetCode or HackerRank, then log it here."
              : "No problems match these filters."}
          </div>
        ) : (
          <ul className="space-y-2">
            {filtered.map((p) => (
              <li key={p.id} className="surface p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium">{p.name}</span>
                  <Badge variant="secondary">{p.platform}</Badge>
                  <Badge variant="outline">{p.topic}</Badge>
                  <Badge variant="outline">{p.difficulty}</Badge>
                  <Badge
                    variant={
                      p.result === "solved"
                        ? "secondary"
                        : p.result === "partial"
                          ? "outline"
                          : "destructive"
                    }
                  >
                    {resultLabel(p.result)}
                  </Badge>
                  {p.needs_revision && (
                    <Badge className="gap-1" variant="outline">
                      <RotateCcw className="size-3" /> revise
                    </Badge>
                  )}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {p.solved_on} · {p.minutes_taken} min · {p.attempts} attempt
                  {p.attempts > 1 ? "s" : ""}
                  {p.language ? ` · ${p.language}` : ""}
                </p>
                {p.learned && <p className="mt-2 text-sm">{p.learned}</p>}
                <div className="mt-3 flex flex-wrap gap-1">
                  {p.url && (
                    <Button variant="ghost" size="sm" asChild>
                      <a href={p.url} target="_blank" rel="noreferrer noopener">
                        <ExternalLink className="size-3.5" /> Open problem
                      </a>
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => setDraft(toDraft(p))}>
                    <Pencil className="size-3.5" /> Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      updateP.mutate({
                        id: p.id,
                        needs_revision: !p.needs_revision,
                        revision_due_date: p.needs_revision
                          ? null
                          : new Date(Date.now() + 3 * 864e5).toISOString().slice(0, 10),
                      })
                    }
                  >
                    <RotateCcw className="size-3.5" />
                    {p.needs_revision ? "Clear revision" : "Mark for revision"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (confirm("Delete this log entry?")) deleteP.mutate(p.id);
                    }}
                  >
                    <Trash2 className="size-3.5" /> Delete
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Dialog open={!!draft} onOpenChange={(o) => !o && setDraft(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{draft?.id ? "Edit problem" : "Log a problem"}</DialogTitle>
          </DialogHeader>
          {draft && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="p-name">Problem name</Label>
                <Input
                  id="p-name"
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Platform</Label>
                  <Select
                    value={draft.platform}
                    onValueChange={(v) => setDraft({ ...draft, platform: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PLATFORMS.map((p) => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Category</Label>
                  <Select
                    value={draft.category}
                    onValueChange={(v) => setDraft({ ...draft, category: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dsa">DSA</SelectItem>
                      <SelectItem value="coding">Coding</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="p-topic">Topic / pattern</Label>
                  <Input
                    id="p-topic"
                    placeholder="Sliding window"
                    value={draft.topic}
                    onChange={(e) => setDraft({ ...draft, topic: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Difficulty</Label>
                  <Select
                    value={draft.difficulty}
                    onValueChange={(v) => setDraft({ ...draft, difficulty: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DIFFICULTIES.map((d) => (
                        <SelectItem key={d} value={d}>{d}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="p-lang">Language</Label>
                  <Input
                    id="p-lang"
                    value={draft.language}
                    onChange={(e) => setDraft({ ...draft, language: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Result</Label>
                  <Select
                    value={draft.result}
                    onValueChange={(v) => setDraft({ ...draft, result: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {RESULTS.map((r) => (
                        <SelectItem key={r} value={r}>{resultLabel(r)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="p-min">Time taken (min)</Label>
                  <Input
                    id="p-min"
                    type="number"
                    min={0}
                    value={draft.minutes_taken}
                    onChange={(e) =>
                      setDraft({ ...draft, minutes_taken: Number(e.target.value) || 0 })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="p-att">Attempts</Label>
                  <Input
                    id="p-att"
                    type="number"
                    min={1}
                    value={draft.attempts}
                    onChange={(e) => setDraft({ ...draft, attempts: Number(e.target.value) || 1 })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="p-date">Date</Label>
                  <Input
                    id="p-date"
                    type="date"
                    value={draft.solved_on}
                    onChange={(e) => setDraft({ ...draft, solved_on: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="p-url">Problem URL</Label>
                  <Input
                    id="p-url"
                    placeholder="https://leetcode.com/problems/..."
                    value={draft.url}
                    onChange={(e) => setDraft({ ...draft, url: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="p-learn">What I learned</Label>
                <Textarea
                  id="p-learn"
                  rows={2}
                  value={draft.learned}
                  onChange={(e) => setDraft({ ...draft, learned: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-hard">What was difficult</Label>
                <Textarea
                  id="p-hard"
                  rows={2}
                  value={draft.difficulties}
                  onChange={(e) => setDraft({ ...draft, difficulties: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-app">Approach / solution summary</Label>
                <Textarea
                  id="p-app"
                  rows={3}
                  value={draft.approach}
                  onChange={(e) => setDraft({ ...draft, approach: e.target.value })}
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <Label htmlFor="p-rev">Needs revision</Label>
                  <p className="text-xs text-muted-foreground">
                    Adds it to your revision queue in three days.
                  </p>
                </div>
                <Switch
                  id="p-rev"
                  checked={draft.needs_revision}
                  onCheckedChange={(v) => setDraft({ ...draft, needs_revision: v })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDraft(null)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={createP.isPending || updateP.isPending}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="surface p-4">
      <p className="tabular text-xl font-semibold">{value}</p>
      <p className="text-xs font-medium">{label}</p>
      <p className="text-[11px] text-muted-foreground">{hint}</p>
    </div>
  );
}
