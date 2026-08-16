import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { generateQuiz, gradeShortAnswers } from "@/lib/ai.functions";
import { friendlyAiError } from "@/lib/ai/errors";
import { useRecordPerformance } from "@/lib/adaptive-db";

type Q = {
  type: "mcq" | "short";
  question: string;
  options: string[];
  correct_index: number;
  expected_answer: string;
  concept: string;
};

type Result = { correct: boolean; feedback: string };

export function AssessmentPanel({
  topicId,
  topicTitle,
  objectives,
  weakAreas,
  context,
  activityId,
  planId,
}: {
  topicId: string;
  topicTitle: string;
  objectives: string[];
  weakAreas: string[];
  context: string;
  activityId?: string | null;
  planId?: string | null;
}) {
  const record = useRecordPerformance();
  const [questions, setQuestions] = useState<Q[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [results, setResults] = useState<Record<number, Result> | null>(null);
  const [loading, setLoading] = useState(false);
  const [grading, setGrading] = useState(false);

  const start = async () => {
    setLoading(true);
    try {
      const quiz = await generateQuiz({
        data: {
          topicTitles: [topicTitle],
          objectives: objectives.slice(0, 20),
          weakAreas: weakAreas.slice(0, 10),
          context: context.slice(0, 20_000),
          count: 5,
        },
      });
      setQuestions(
        quiz.questions.map((q) => ({
          type: (q.type ?? "mcq") as "mcq" | "short",
          question: q.question,
          options: q.options ?? [],
          correct_index: q.correct_index ?? 0,
          expected_answer: q.expected_answer ?? "",
          concept: q.concept ?? "",
        })),
      );
      setAnswers({});
      setResults(null);
    } catch (err) {
      toast.error(friendlyAiError(err));
    } finally {
      setLoading(false);
    }
  };

  const submit = async () => {
    setGrading(true);
    try {
      const out: Record<number, Result> = {};
      const shorts: { index: number; question: string; expected: string; answer: string }[] = [];

      questions.forEach((q, i) => {
        const a = answers[i] ?? "";
        if (q.type === "mcq") {
          const correct = a !== "" && Number(a) === q.correct_index;
          out[i] = {
            correct,
            feedback: correct ? "Correct" : `Correct answer: ${q.options[q.correct_index] ?? "—"}`,
          };
        } else if (a.trim()) {
          shorts.push({ index: i, question: q.question, expected: q.expected_answer, answer: a.trim() });
        } else {
          out[i] = { correct: false, feedback: "Not answered" };
        }
      });

      if (shorts.length) {
        try {
          const graded = await gradeShortAnswers({ data: { items: shorts } });
          for (const r of graded.results) {
            out[r.index] = { correct: r.correct ?? false, feedback: r.feedback ?? "" };
          }
        } catch (err) {
          toast.error(`${friendlyAiError(err)} Short answers were left ungraded.`);
          for (const s of shorts) out[s.index] = { correct: false, feedback: "Could not grade automatically." };
        }
      }

      setResults(out);

      const total = questions.length;
      const correct = Object.values(out).filter((r) => r.correct).length;
      const score = Math.round((correct / Math.max(1, total)) * 100);
      const weak = questions.filter((_, i) => !out[i]?.correct).map((q) => q.concept || q.question).slice(0, 5);

      await record.mutateAsync({
        topicId,
        activityId: activityId ?? null,
        planId: planId ?? null,
        activityType: "assess",
        reflection: weak.length ? `Weak areas: ${weak.join("; ")}` : undefined,
        signal: {
          score,
          confidence: Math.max(1, Math.min(5, Math.round(score / 20))),
          difficulty: 3,
          completion: 1,
          plannedMinutes: 15,
          actualMinutes: 15,
        },
      });
      toast.success(`Scored ${score}% — mastery, revisions and plan updated.`);
    } finally {
      setGrading(false);
    }
  };

  if (!questions.length) {
    return (
      <div className="surface space-y-3 p-6">
        <p className="text-sm text-muted-foreground">
          A short 5-question check on what you just studied. Results feed mastery, revision and your plan.
        </p>
        <Button onClick={() => void start()} disabled={loading}>
          {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
          Generate quick assessment
        </Button>
      </div>
    );
  }

  const score = results
    ? Math.round((Object.values(results).filter((r) => r.correct).length / questions.length) * 100)
    : null;

  return (
    <div className="space-y-3">
      {score != null && (
        <div className="surface flex items-center gap-3 p-4">
          <Badge className="text-base">{score}%</Badge>
          <span className="text-sm text-muted-foreground">
            {Object.values(results!).filter((r) => r.correct).length} of {questions.length} correct
          </span>
        </div>
      )}
      {questions.map((q, i) => (
        <div key={i} className="surface space-y-2 p-4">
          <p className="text-sm font-medium">
            {i + 1}. {q.question}
          </p>
          {q.type === "mcq" ? (
            <div className="grid gap-1">
              {q.options.map((opt, oi) => (
                <label
                  key={oi}
                  className="flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-sm"
                >
                  <input
                    type="radio"
                    name={`q-${i}`}
                    checked={answers[i] === String(oi)}
                    onChange={() => setAnswers((a) => ({ ...a, [i]: String(oi) }))}
                    disabled={!!results}
                  />
                  {opt}
                </label>
              ))}
            </div>
          ) : (
            <Textarea
              rows={3}
              value={answers[i] ?? ""}
              disabled={!!results}
              onChange={(e) => setAnswers((a) => ({ ...a, [i]: e.target.value }))}
              placeholder="Your answer…"
            />
          )}
          {results?.[i] && (
            <p className={`text-xs ${results[i]!.correct ? "text-primary" : "text-destructive"}`}>
              {results[i]!.correct ? "Correct. " : "Incorrect. "}
              {results[i]!.feedback}
            </p>
          )}
        </div>
      ))}
      <div className="flex gap-2">
        {!results ? (
          <Button onClick={() => void submit()} disabled={grading}>
            {grading && <Loader2 className="mr-2 size-4 animate-spin" />}
            Submit answers
          </Button>
        ) : (
          <Button variant="outline" onClick={() => void start()}>
            New assessment
          </Button>
        )}
        <Button variant="ghost" onClick={() => setQuestions([])}>
          Close
        </Button>
      </div>
    </div>
  );
}
