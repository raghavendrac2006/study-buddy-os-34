import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { evaluateRecall, generateRecall } from "@/lib/ai.functions";
import { friendlyAiError } from "@/lib/ai/errors";
import { useRecordPerformance } from "@/lib/adaptive-db";
import type { RecallEvaluation } from "@/lib/ai/schemas";

type Q = { question: string; expected_answer: string };

export function RecallPanel({
  topicId,
  topicTitle,
  objectives,
  keyConcepts,
  context,
}: {
  topicId: string;
  topicTitle: string;
  objectives: string[];
  keyConcepts: string[];
  context: string;
}) {
  const record = useRecordPerformance();
  const [questions, setQuestions] = useState<Q[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [revealed, setRevealed] = useState<Record<number, boolean>>({});
  const [evals, setEvals] = useState<Record<number, RecallEvaluation>>({});
  const [loading, setLoading] = useState(false);
  const [busyIndex, setBusyIndex] = useState<number | null>(null);

  const start = async () => {
    setLoading(true);
    try {
      const res = await generateRecall({
        data: {
          topicTitle,
          objectives: objectives.slice(0, 12),
          keyConcepts: keyConcepts.slice(0, 20),
          context: context.slice(0, 20_000),
          count: 3,
        },
      });
      setQuestions(res.questions.map((q) => ({ question: q.question, expected_answer: q.expected_answer })));
      setAnswers({});
      setRevealed({});
      setEvals({});
    } catch (err) {
      toast.error(friendlyAiError(err));
    } finally {
      setLoading(false);
    }
  };

  const evaluate = async (i: number) => {
    const q = questions[i];
    if (!q || !answers[i]?.trim()) return;
    setBusyIndex(i);
    try {
      const res = await evaluateRecall({
        data: {
          topicTitle,
          question: q.question,
          expected: q.expected_answer,
          answer: answers[i]!.trim(),
        },
      });
      setEvals((e) => ({ ...e, [i]: res }));
      setRevealed((r) => ({ ...r, [i]: true }));
    } catch (err) {
      toast.error(friendlyAiError(err));
    } finally {
      setBusyIndex(null);
    }
  };

  const finish = async () => {
    const scores = Object.values(evals).map((e) => e.score);
    const answered = Object.values(answers).filter((a) => a.trim()).length;
    if (!answered) {
      toast.info("Answer at least one question first.");
      return;
    }
    const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
    await record.mutateAsync({
      topicId,
      activityType: "recall",
      signal: {
        score: avg,
        confidence: avg == null ? 3 : Math.max(1, Math.min(5, Math.round(avg / 20))),
        difficulty: 3,
        completion: answered / Math.max(1, questions.length),
        plannedMinutes: 10,
        actualMinutes: 10,
      },
    });
    toast.success("Recall recorded — mastery and revisions updated.");
    setQuestions([]);
    setAnswers({});
    setEvals({});
  };

  if (!questions.length) {
    return (
      <div className="surface space-y-3 p-6">
        <p className="text-sm text-muted-foreground">
          Answer a few questions from memory. Your answers feed straight into mastery and spaced revision.
        </p>
        <Button onClick={() => void start()} disabled={loading}>
          {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
          Start active recall
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {questions.map((q, i) => (
        <div key={i} className="surface space-y-3 p-4">
          <p className="text-sm font-medium">
            {i + 1}. {q.question}
          </p>
          <Textarea
            rows={3}
            placeholder="Answer in your own words…"
            value={answers[i] ?? ""}
            onChange={(e) => setAnswers((a) => ({ ...a, [i]: e.target.value }))}
          />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => setRevealed((r) => ({ ...r, [i]: true }))}>
              Reveal expected answer
            </Button>
            <Button size="sm" onClick={() => void evaluate(i)} disabled={busyIndex === i || !answers[i]?.trim()}>
              {busyIndex === i && <Loader2 className="mr-2 size-4 animate-spin" />}
              Evaluate with AI
            </Button>
          </div>
          {revealed[i] && q.expected_answer && (
            <p className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Expected: </span>
              {q.expected_answer}
            </p>
          )}
          {evals[i] && (
            <div className="space-y-1 rounded-md border border-border p-3 text-xs">
              <div className="flex items-center gap-2">
                <Badge>{Math.round(evals[i]!.score)}%</Badge>
                <span className="font-medium">{evals[i]!.verdict}</span>
              </div>
              {evals[i]!.feedback && <p className="text-muted-foreground">{evals[i]!.feedback}</p>}
              {!!evals[i]!.missing.length && (
                <p className="text-muted-foreground">Missing: {evals[i]!.missing.join(", ")}</p>
              )}
            </div>
          )}
        </div>
      ))}
      <div className="flex gap-2">
        <Button onClick={() => void finish()} disabled={record.isPending}>
          Finish recall
        </Button>
        <Button variant="ghost" onClick={() => setQuestions([])}>
          Discard
        </Button>
      </div>
    </div>
  );
}
