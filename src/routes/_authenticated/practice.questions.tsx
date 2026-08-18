import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Copy, Download, Pencil, Plus, Trash2, Upload } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PracticeTabs } from "@/components/practice-tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
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
import {
  useQuestions,
  useCreateQuestion,
  useUpdateQuestion,
  useDeleteQuestion,
  useImportQuestions,
  type PracticeQuestion,
} from "@/lib/practice-db";
import { CSV_COLUMNS, DIFFICULTIES, csvToQuestions, questionsToCsv } from "@/lib/practice";

export const Route = createFileRoute("/_authenticated/practice/questions")({
  head: () => ({
    meta: [
      { title: "Question Bank — My Study Compass" },
      {
        name: "description",
        content: "Create, edit, import and export your own aptitude and reasoning question bank.",
      },
      { property: "og:title", content: "Question Bank — My Study Compass" },
      { property: "og:description", content: "Full control over your practice questions and CSV imports." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: QuestionBank,
});

type Draft = {
  id?: string;
  category: string;
  topic: string;
  difficulty: string;
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
  estimated_seconds: number;
  source: string;
};

const emptyDraft = (): Draft => ({
  category: "aptitude",
  topic: "General",
  difficulty: "medium",
  question: "",
  options: ["", "", "", ""],
  correct_index: 0,
  explanation: "",
  estimated_seconds: 90,
  source: "",
});

function QuestionBank() {
  const questions = useQuestions();
  const createQ = useCreateQuestion();
  const updateQ = useUpdateQuestion();
  const deleteQ = useDeleteQuestion();
  const importQ = useImportQuestions();

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [difficulty, setDifficulty] = useState("all");
  const [topic, setTopic] = useState("all");
  const [draft, setDraft] = useState<Draft | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const all = questions.data ?? [];
  const topics = useMemo(
    () => [...new Set(all.map((q) => q.topic))].sort((a, b) => a.localeCompare(b)),
    [all],
  );

  const filtered = useMemo(
    () =>
      all.filter((q) => {
        if (category !== "all" && q.category !== category) return false;
        if (difficulty !== "all" && q.difficulty !== difficulty) return false;
        if (topic !== "all" && q.topic !== topic) return false;
        const s = search.trim().toLowerCase();
        if (
          s &&
          !q.question.toLowerCase().includes(s) &&
          !q.topic.toLowerCase().includes(s) &&
          !q.options.some((o) => o.toLowerCase().includes(s))
        )
          return false;
        return true;
      }),
    [all, category, difficulty, topic, search],
  );

  function toDraft(q: PracticeQuestion, duplicate = false): Draft {
    return {
      id: duplicate ? undefined : q.id,
      category: q.category,
      topic: q.topic,
      difficulty: q.difficulty,
      question: duplicate ? `${q.question} (copy)` : q.question,
      options: [...q.options, "", "", "", ""].slice(0, Math.max(4, q.options.length)),
      correct_index: q.correct_index,
      explanation: q.explanation ?? "",
      estimated_seconds: q.estimated_seconds,
      source: q.source ?? "",
    };
  }

  async function save() {
    if (!draft) return;
    const options = draft.options.map((o) => o.trim()).filter(Boolean);
    if (!draft.question.trim()) return toast.error("Question text is required.");
    if (options.length < 2) return toast.error("At least two options are required.");
    if (draft.correct_index >= options.length) return toast.error("Pick a valid correct answer.");

    const payload = {
      category: draft.category,
      topic: draft.topic.trim() || "General",
      difficulty: draft.difficulty,
      question: draft.question.trim(),
      options,
      correct_index: draft.correct_index,
      explanation: draft.explanation.trim() || null,
      estimated_seconds: draft.estimated_seconds,
      source: draft.source.trim() || null,
    };

    try {
      if (draft.id) await updateQ.mutateAsync({ id: draft.id, ...payload });
      else await createQ.mutateAsync(payload);
      setDraft(null);
      toast.success("Question saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save question");
    }
  }

  function exportCsv() {
    const blob = new Blob([questionsToCsv(filtered)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `question-bank-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function importCsv(file: File) {
    const text = await file.text();
    const { rows, errors } = csvToQuestions(text);
    if (rows.length === 0) {
      toast.error(errors[0] ?? "No valid rows found in the CSV.");
      return;
    }
    try {
      await importQ.mutateAsync(rows);
      toast.success(
        `Imported ${rows.length} question${rows.length > 1 ? "s" : ""}${errors.length ? ` · ${errors.length} row(s) skipped` : ""}`,
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Import failed");
    }
  }

  return (
    <AppShell title="Practice">
      <div className="space-y-6">
        <PracticeTabs />

        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => setDraft(emptyDraft())}>
            <Plus className="size-4" /> Add question
          </Button>
          <Button variant="outline" onClick={() => fileRef.current?.click()}>
            <Upload className="size-4" /> Import CSV
          </Button>
          <Button variant="outline" onClick={exportCsv} disabled={filtered.length === 0}>
            <Download className="size-4" /> Export CSV
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void importCsv(f);
              e.target.value = "";
            }}
          />
        </div>

        <p className="text-xs text-muted-foreground">
          CSV columns: {CSV_COLUMNS.join(", ")}. <code>correct_option</code> accepts A–D or 1–4;
          only <code>question</code>, <code>option_a</code>, <code>option_b</code> and{" "}
          <code>correct_option</code> are required.
        </p>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <Input
            placeholder="Search questions…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              <SelectItem value="aptitude">Aptitude</SelectItem>
              <SelectItem value="reasoning">Reasoning</SelectItem>
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
          <Select value={topic} onValueChange={setTopic}>
            <SelectTrigger><SelectValue placeholder="Topic" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All topics</SelectItem>
              {topics.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {questions.isLoading ? (
          <Skeleton className="h-32 w-full rounded-xl" />
        ) : filtered.length === 0 ? (
          <div className="surface p-6 text-center text-sm text-muted-foreground">
            {all.length === 0
              ? "Your question bank is empty. Add a question or import a CSV."
              : "No questions match these filters."}
          </div>
        ) : (
          <ul className="space-y-2">
            {filtered.map((q) => (
              <li key={q.id} className="surface p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">{q.category}</Badge>
                  <Badge variant="outline">{q.topic}</Badge>
                  <Badge variant="outline">{q.difficulty}</Badge>
                  {q.times_attempted > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {Math.round((q.times_correct / q.times_attempted) * 100)}% over{" "}
                      {q.times_attempted}
                    </span>
                  )}
                </div>
                <p className="mt-2 text-sm font-medium">{q.question}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Answer: {String.fromCharCode(65 + q.correct_index)} ·{" "}
                  {q.options[q.correct_index]}
                </p>
                <div className="mt-3 flex flex-wrap gap-1">
                  <Button variant="ghost" size="sm" onClick={() => setDraft(toDraft(q))}>
                    <Pencil className="size-3.5" /> Edit
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setDraft(toDraft(q, true))}>
                    <Copy className="size-3.5" /> Duplicate
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (confirm("Delete this question?")) deleteQ.mutate(q.id);
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
            <DialogTitle>{draft?.id ? "Edit question" : "New question"}</DialogTitle>
            <DialogDescription>Options left blank are ignored.</DialogDescription>
          </DialogHeader>
          {draft && (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Category</Label>
                  <Select
                    value={draft.category}
                    onValueChange={(v) => setDraft({ ...draft, category: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="aptitude">Aptitude</SelectItem>
                      <SelectItem value="reasoning">Reasoning</SelectItem>
                    </SelectContent>
                  </Select>
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
                  <Label htmlFor="q-topic">Topic</Label>
                  <Input
                    id="q-topic"
                    value={draft.topic}
                    onChange={(e) => setDraft({ ...draft, topic: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="q-secs">Estimated solve time (s)</Label>
                  <Input
                    id="q-secs"
                    type="number"
                    min={5}
                    value={draft.estimated_seconds}
                    onChange={(e) =>
                      setDraft({ ...draft, estimated_seconds: Number(e.target.value) || 90 })
                    }
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="q-text">Question</Label>
                <Textarea
                  id="q-text"
                  rows={3}
                  value={draft.question}
                  onChange={(e) => setDraft({ ...draft, question: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Options (select the correct one)</Label>
                {draft.options.map((o, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="correct"
                      aria-label={`Option ${String.fromCharCode(65 + i)} is correct`}
                      checked={draft.correct_index === i}
                      onChange={() => setDraft({ ...draft, correct_index: i })}
                    />
                    <Input
                      value={o}
                      placeholder={`Option ${String.fromCharCode(65 + i)}`}
                      onChange={(e) => {
                        const options = [...draft.options];
                        options[i] = e.target.value;
                        setDraft({ ...draft, options });
                      }}
                    />
                  </div>
                ))}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="q-exp">Explanation</Label>
                <Textarea
                  id="q-exp"
                  rows={3}
                  value={draft.explanation}
                  onChange={(e) => setDraft({ ...draft, explanation: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="q-src">Source / reference (optional)</Label>
                <Input
                  id="q-src"
                  value={draft.source}
                  onChange={(e) => setDraft({ ...draft, source: e.target.value })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDraft(null)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={createQ.isPending || updateQ.isPending}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
