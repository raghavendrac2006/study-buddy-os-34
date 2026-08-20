import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { recordPerformance, resolveTopicIdByTitle } from "@/lib/adaptive-db";

type T = Database["public"]["Tables"];
export type PracticeQuestion = T["practice_questions"]["Row"];
export type PracticeSession = T["practice_sessions"]["Row"];
export type PracticeAttempt = T["practice_attempts"]["Row"];
export type CodingProblem = T["coding_problems"]["Row"];

async function uid() {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Not signed in");
  return data.user.id;
}

function unwrap<D>({ data, error }: { data: D; error: { message: string } | null }): D {
  if (error) throw new Error(error.message);
  return data;
}

/* ---------------- question bank ---------------- */

export function useQuestions() {
  return useQuery({
    queryKey: ["practice-questions"],
    queryFn: async () =>
      unwrap(
        await supabase
          .from("practice_questions")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(2000),
      ),
  });
}

export function useCreateQuestions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: Omit<T["practice_questions"]["Insert"], "user_id">[]) => {
      const user_id = await uid();
      return unwrap(
        await supabase
          .from("practice_questions")
          .insert(values.map((v) => ({ ...v, user_id })))
          .select("*"),
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["practice-questions"] }),
  });
}

export function useUpdateQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: T["practice_questions"]["Update"] & { id: string }) =>
      unwrap(
        await supabase.from("practice_questions").update(patch).eq("id", id).select("*").single(),
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["practice-questions"] }),
  });
}

export function useDeleteQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("practice_questions").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["practice-questions"] }),
  });
}

/* ---------------- practice sessions & attempts ---------------- */

export function usePracticeSessions(limit = 60) {
  return useQuery({
    queryKey: ["practice-sessions", limit],
    queryFn: async () =>
      unwrap(
        await supabase
          .from("practice_sessions")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(limit),
      ),
  });
}

export function usePracticeAttempts(limit = 500) {
  return useQuery({
    queryKey: ["practice-attempts", limit],
    queryFn: async () =>
      unwrap(
        await supabase
          .from("practice_attempts")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(limit),
      ),
  });
}

export type FinishedAttempt = {
  question: PracticeQuestion;
  selected_index: number | null;
  is_correct: boolean;
  seconds_taken: number;
};

/** Persists a completed daily practice run: session + attempts + question stats. */
export function useSavePracticeRun() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      mode: string;
      targetMinutes: number;
      durationSeconds: number;
      attempts: FinishedAttempt[];
    }) => {
      const user_id = await uid();
      const topics: Record<string, { correct: number; total: number }> = {};
      for (const a of input.attempts) {
        const t = (topics[a.question.topic] ??= { correct: 0, total: 0 });
        t.total += 1;
        if (a.is_correct) t.correct += 1;
      }

      const session = unwrap(
        await supabase
          .from("practice_sessions")
          .insert({
            user_id,
            mode: input.mode,
            question_count: input.attempts.length,
            correct_count: input.attempts.filter((a) => a.is_correct).length,
            duration_seconds: input.durationSeconds,
            target_minutes: input.targetMinutes,
            topics,
            completed_at: new Date().toISOString(),
          })
          .select("*")
          .single(),
      )!;

      if (input.attempts.length) {
        const { error } = await supabase.from("practice_attempts").insert(
          input.attempts.map((a) => ({
            user_id,
            session_id: session.id,
            question_id: a.question.id,
            selected_index: a.selected_index,
            is_correct: a.is_correct,
            seconds_taken: a.seconds_taken,
            topic: a.question.topic,
            category: a.question.category,
          })),
        );
        if (error) throw new Error(error.message);
      }

      const now = new Date().toISOString();
      await Promise.all(
        input.attempts.map((a) =>
          supabase
            .from("practice_questions")
            .update({
              times_attempted: a.question.times_attempted + 1,
              times_correct: a.question.times_correct + (a.is_correct ? 1 : 0),
              last_attempted_at: now,
            })
            .eq("id", a.question.id),
        ),
      );

      // Feed the shared performance history (weak-topic + activity signals).
      const correct = input.attempts.filter((a) => a.is_correct).length;
      await supabase.from("performance_records").insert({
        user_id,
        activity_type: "practice",
        score: input.attempts.length ? correct / input.attempts.length : 0,
        completion: 1,
        planned_minutes: input.targetMinutes,
        actual_minutes: Math.round(input.durationSeconds / 60),
        signals: { mode: input.mode, topics },
        reflection: `Daily ${input.mode} practice · ${correct}/${input.attempts.length}`,
      });

      // Where a practice topic maps to an existing structured topic, run it through
      // the existing adaptive mastery/revision engine (no new systems).
      for (const [label, t] of Object.entries(topics)) {
        try {
          const topicId = await resolveTopicIdByTitle(label);
          if (!topicId) continue;
          await recordPerformance({
            topicId,
            activityType: "practice",
            signal: {
              score: (t.correct / Math.max(1, t.total)) * 100,
              completion: 1,
              plannedMinutes: input.targetMinutes,
              actualMinutes: Math.round(input.durationSeconds / 60),
            },
            reflection: `Daily practice · ${label} · ${t.correct}/${t.total}`,
          });
        } catch {
          /* mapping is best-effort; practice must never fail because of it */
        }
      }

      return session;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["practice-sessions"] });
      qc.invalidateQueries({ queryKey: ["practice-attempts"] });
      qc.invalidateQueries({ queryKey: ["practice-questions"] });
      qc.invalidateQueries({ queryKey: ["performance"] });
      qc.invalidateQueries({ queryKey: ["mastery"] });
      qc.invalidateQueries({ queryKey: ["revisions"] });
    },
  });
}

/* ---------------- coding & dsa ---------------- */

export function useCodingProblems() {
  return useQuery({
    queryKey: ["coding-problems"],
    queryFn: async () =>
      unwrap(
        await supabase
          .from("coding_problems")
          .select("*")
          .order("solved_on", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(1000),
      ),
  });
}

export function useCreateCodingProblem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: Omit<T["coding_problems"]["Insert"], "user_id">) => {
      const user_id = await uid();
      const row = unwrap(
        await supabase.from("coding_problems").insert({ ...values, user_id }).select("*").single(),
      )!;
      // Shared performance signal so coding work shows up in weak-topic insight.
      await supabase.from("performance_records").insert({
        user_id,
        activity_type: "coding",
        score: row.result === "solved" ? 1 : row.result === "partial" ? 0.5 : 0,
        completion: 1,
        planned_minutes: 0,
        actual_minutes: row.minutes_taken ?? 0,
        signals: {
          topic: row.topic,
          platform: row.platform,
          difficulty: row.difficulty,
          result: row.result,
        },
        reflection: `${row.name} · ${row.topic} · ${row.result}`,
      });
      return row;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["coding-problems"] });
      qc.invalidateQueries({ queryKey: ["performance"] });
    },
  });
}


export function useUpdateCodingProblem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: T["coding_problems"]["Update"] & { id: string }) =>
      unwrap(await supabase.from("coding_problems").update(patch).eq("id", id).select("*").single()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["coding-problems"] }),
  });
}

export function useDeleteCodingProblem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("coding_problems").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["coding-problems"] }),
  });
}
