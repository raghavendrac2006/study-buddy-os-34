import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { Analysis } from "@/lib/ai/schemas";
import {
  NEW_MASTERY,
  redistribute,
  reinforcementFor,
  today,
  updateMastery,
  type MasteryRecord,
  type MasteryState,
  type PerformanceSignal,
  type SchedulableActivity,
} from "@/lib/adaptive";

type T = Database["public"]["Tables"];
export type Material = T["materials"]["Row"];
export type Topic = T["topics"]["Row"];
export type LearningPlan = T["learning_plans"]["Row"];
export type PlanActivity = T["plan_activities"]["Row"];
export type TopicMastery = T["topic_mastery"]["Row"];
export type RevisionItem = T["revision_schedule"]["Row"];
export type PerformanceRecord = T["performance_records"]["Row"];

async function uid() {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Not signed in");
  return data.user.id;
}

function unwrap<D>({ data, error }: { data: D; error: { message: string } | null }): D {
  if (error) throw new Error(error.message);
  return data;
}

/** Same as unwrap, but asserts a row actually came back. */
function need<D>(res: { data: D; error: { message: string } | null }): NonNullable<D> {
  const data = unwrap(res);
  if (data == null) throw new Error("Record not found");
  return data as NonNullable<D>;
}

/* ---------------- materials ---------------- */

export function useMaterials() {
  return useQuery({
    queryKey: ["materials"],
    queryFn: async () =>
      unwrap(await supabase.from("materials").select("*").order("created_at", { ascending: false })),
  });
}

export function useMaterial(id: string) {
  return useQuery({
    queryKey: ["material", id],
    queryFn: async () => unwrap(await supabase.from("materials").select("*").eq("id", id).single()),
    enabled: !!id,
  });
}

export function useCreateMaterial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: Omit<T["materials"]["Insert"], "user_id">) =>
      unwrap(
        await supabase
          .from("materials")
          .insert({ ...values, user_id: await uid() })
          .select("*")
          .single(),
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["materials"] }),
  });
}

export function useUpdateMaterial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: T["materials"]["Update"] & { id: string }) =>
      unwrap(await supabase.from("materials").update(patch).eq("id", id).select("*").single()),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["materials"] });
      qc.invalidateQueries({ queryKey: ["material", v.id] });
    },
  });
}

export function useDeleteMaterial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("materials").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["materials"] });
      qc.invalidateQueries({ queryKey: ["topics"] });
    },
  });
}

/* ---------------- topics ---------------- */

export function useTopics(filter?: { materialId?: string; subjectId?: string }) {
  return useQuery({
    queryKey: ["topics", filter?.materialId ?? "", filter?.subjectId ?? ""],
    queryFn: async () => {
      let q = supabase.from("topics").select("*").order("sort_order");
      if (filter?.materialId) q = q.eq("material_id", filter.materialId);
      if (filter?.subjectId) q = q.eq("subject_id", filter.subjectId);
      return unwrap(await q);
    },
  });
}

/** Persists a reviewed analysis tree as unit → chapter → topic rows. */
export function useSaveAnalysisTree() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { materialId: string; subjectId: string | null; analysis: Analysis }) => {
      const user_id = await uid();
      await supabase.from("topics").delete().eq("material_id", args.materialId);

      let order = 0;
      const created: Topic[] = [];

      for (const unit of args.analysis.units) {
        const unitRow = need(
          await supabase
            .from("topics")
            .insert({
              user_id,
              material_id: args.materialId,
              subject_id: args.subjectId,
              title: unit.title,
              description: unit.description ?? "",
              kind: "unit",
              sort_order: order++,
            })
            .select("*")
            .single(),
        );
        created.push(unitRow);

        for (const chapter of unit.chapters) {
          const chapterRow = need(
            await supabase
              .from("topics")
              .insert({
                user_id,
                material_id: args.materialId,
                subject_id: args.subjectId,
                parent_id: unitRow.id,
                title: chapter.title,
                description: chapter.description ?? "",
                kind: "chapter",
                sort_order: order++,
              })
              .select("*")
              .single(),
          );
          created.push(chapterRow);

          const topicRows = need(
            await supabase
              .from("topics")
              .insert(
                chapter.topics.map((t) => ({
                  user_id,
                  material_id: args.materialId,
                  subject_id: args.subjectId,
                  parent_id: chapterRow.id,
                  title: t.title,
                  description: t.description ?? "",
                  kind: "topic",
                  key_concepts: t.key_concepts ?? [],
                  prerequisites: t.prerequisites ?? [],
                  difficulty: Math.round(t.difficulty ?? 3),
                  estimated_minutes: Math.round(t.estimated_minutes ?? 45),
                  source_page: t.source_page ?? null,
                  start_seconds: t.start_seconds ?? null,
                  end_seconds: t.end_seconds ?? null,
                  sort_order: order++,
                })),
              )
              .select("*"),
          );
          created.push(...topicRows);

          const objectives = chapter.topics.flatMap((t, i) =>
            (t.objectives ?? []).map((text, j) => ({
              user_id,
              topic_id: topicRows[i]?.id as string,
              text,
              sort_order: j,
            })),
          ).filter((o) => !!o.topic_id);
          if (objectives.length) {
            const { error } = await supabase.from("learning_objectives").insert(objectives);
            if (error) throw new Error(error.message);
          }
        }
      }

      await supabase.from("materials").update({ status: "structured" }).eq("id", args.materialId);
      return created;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["topics"] });
      qc.invalidateQueries({ queryKey: ["materials"] });
    },
  });
}

export function useUpdateTopic() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: T["topics"]["Update"] & { id: string }) =>
      unwrap(await supabase.from("topics").update(patch).eq("id", id).select("*").single()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["topics"] }),
  });
}

export function useDeleteTopic() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("topics").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["topics"] }),
  });
}

/* ---------------- plans & activities ---------------- */

export function usePlans() {
  return useQuery({
    queryKey: ["plans"],
    queryFn: async () =>
      unwrap(
        await supabase.from("learning_plans").select("*").order("created_at", { ascending: false }),
      ),
  });
}

export function usePlan(id: string) {
  return useQuery({
    queryKey: ["plan", id],
    queryFn: async () =>
      unwrap(await supabase.from("learning_plans").select("*").eq("id", id).single()),
    enabled: !!id,
  });
}

export function useCreatePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: Omit<T["learning_plans"]["Insert"], "user_id">) =>
      unwrap(
        await supabase
          .from("learning_plans")
          .insert({ ...values, user_id: await uid() })
          .select("*")
          .single(),
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["plans"] }),
  });
}

export function useUpdatePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: T["learning_plans"]["Update"] & { id: string }) =>
      unwrap(await supabase.from("learning_plans").update(patch).eq("id", id).select("*").single()),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["plans"] });
      qc.invalidateQueries({ queryKey: ["plan", v.id] });
    },
  });
}

export function useActivities(filter?: { planId?: string; from?: string; to?: string }) {
  return useQuery({
    queryKey: ["activities", filter?.planId ?? "", filter?.from ?? "", filter?.to ?? ""],
    queryFn: async () => {
      let q = supabase
        .from("plan_activities")
        .select("*")
        .order("scheduled_date")
        .order("sort_order");
      if (filter?.planId) q = q.eq("plan_id", filter.planId);
      if (filter?.from) q = q.gte("scheduled_date", filter.from);
      if (filter?.to) q = q.lte("scheduled_date", filter.to);
      return unwrap(await q);
    },
  });
}

export function useCreateActivities() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rows: Omit<T["plan_activities"]["Insert"], "user_id">[]) => {
      const user_id = await uid();
      return unwrap(
        await supabase
          .from("plan_activities")
          .insert(rows.map((r) => ({ ...r, user_id })))
          .select("*"),
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["activities"] }),
  });
}

export function useUpdateActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: T["plan_activities"]["Update"] & { id: string }) =>
      unwrap(await supabase.from("plan_activities").update(patch).eq("id", id).select("*").single()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["activities"] }),
  });
}

export function useDeleteActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("plan_activities").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["activities"] }),
  });
}

/* ---------------- mastery, performance, revision ---------------- */

export function useMasteryMap() {
  return useQuery({
    queryKey: ["mastery"],
    queryFn: async () => unwrap(await supabase.from("topic_mastery").select("*")),
  });
}

export function useRevisions() {
  return useQuery({
    queryKey: ["revisions"],
    queryFn: async () =>
      unwrap(
        await supabase
          .from("revision_schedule")
          .select("*")
          .eq("status", "pending")
          .order("due_date"),
      ),
  });
}

export function usePerformanceHistory(limit = 120) {
  return useQuery({
    queryKey: ["performance", limit],
    queryFn: async () =>
      unwrap(
        await supabase
          .from("performance_records")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(limit),
      ),
  });
}

export function useMasteryHistory(topicId?: string) {
  return useQuery({
    queryKey: ["mastery-history", topicId ?? "all"],
    queryFn: async () => {
      let q = supabase
        .from("mastery_history")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (topicId) q = q.eq("topic_id", topicId);
      return unwrap(await q);
    },
  });
}

/**
 * The heart of the adaptive loop: stores the raw signal, rolls mastery forward,
 * reschedules spaced revision and queues reinforcement work.
 */
export function useRecordPerformance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      topicId: string;
      activityId?: string | null | undefined;
      sessionId?: string | null | undefined;
      planId?: string | null | undefined;
      activityType?: string | undefined;
      signal: PerformanceSignal;
      reflection?: string | undefined;
    }) => {
      const user_id = await uid();
      const day = today();

      const perf = await supabase.from("performance_records").insert({
        user_id,
        topic_id: args.topicId,
        activity_id: args.activityId ?? null,
        session_id: args.sessionId ?? null,
        activity_type: args.activityType ?? "learn",
        score: args.signal.score ?? null,
        confidence: args.signal.confidence ?? null,
        difficulty: args.signal.difficulty ?? null,
        completion: args.signal.completion ?? 1,
        planned_minutes: args.signal.plannedMinutes ?? 0,
        actual_minutes: args.signal.actualMinutes ?? 0,
        reflection: args.reflection ?? null,
      });
      if (perf.error) throw new Error(perf.error.message);

      if (args.signal.score != null) {
        await supabase.from("assessments").insert({
          user_id,
          topic_id: args.topicId,
          plan_id: args.planId ?? null,
          activity_id: args.activityId ?? null,
          kind: args.activityType === "assess" ? "assessment" : "self",
          score: args.signal.score,
          max_score: 100,
        });
      }

      const existing = unwrap(
        await supabase
          .from("topic_mastery")
          .select("*")
          .eq("topic_id", args.topicId)
          .maybeSingle(),
      );
      const prev: MasteryRecord = existing
        ? {
            mastery: Number(existing.mastery),
            state: existing.state as MasteryState,
            ease: Number(existing.ease),
            interval_days: existing.interval_days,
            reps: existing.reps,
            lapses: existing.lapses,
            next_review_date: existing.next_review_date,
          }
        : NEW_MASTERY;

      const next = updateMastery(prev, args.signal, day);

      const up = await supabase.from("topic_mastery").upsert(
        {
          user_id,
          topic_id: args.topicId,
          mastery: next.mastery,
          state: next.state,
          ease: next.ease,
          interval_days: next.interval_days,
          reps: next.reps,
          lapses: next.lapses,
          last_reviewed_at: new Date().toISOString(),
          next_review_date: next.next_review_date,
        },
        { onConflict: "user_id,topic_id" },
      );
      if (up.error) throw new Error(up.error.message);

      await supabase.from("mastery_history").insert({
        user_id,
        topic_id: args.topicId,
        mastery: next.mastery,
        state: next.state,
        reason: args.activityType ?? "study",
      });

      await supabase
        .from("revision_schedule")
        .update({ status: "done" })
        .eq("topic_id", args.topicId)
        .eq("status", "pending");

      if (next.next_review_date) {
        await supabase.from("revision_schedule").insert({
          user_id,
          topic_id: args.topicId,
          plan_id: args.planId ?? null,
          due_date: next.next_review_date,
          interval_days: next.interval_days,
          reason: next.state === "needs_revision" ? "weak performance" : "spaced repetition",
        });
      }

      // Weak result → queue reinforcement activities near-term.
      const extra = reinforcementFor(args.signal);
      if (extra.length && args.planId) {
        const topic = need(
          await supabase.from("topics").select("title").eq("id", args.topicId).single(),
        );
        await supabase.from("plan_activities").insert(
          extra.map((type, i) => ({
            user_id,
            plan_id: args.planId as string,
            topic_id: args.topicId,
            scheduled_date: next.next_review_date ?? day,
            activity_type: type,
            title: `${type === "learn" ? "Re-learn" : "Extra practice"}: ${topic.title}`,
            description: "Added automatically after a weak result.",
            estimated_minutes: type === "learn" ? 30 : 20,
            priority: 5,
            source: "adaptive",
            sort_order: 100 + i,
          })),
        );
      }

      if (args.activityId) {
        await supabase
          .from("plan_activities")
          .update({
            status: "done",
            completed_at: new Date().toISOString(),
            actual_minutes: args.signal.actualMinutes ?? 0,
          })
          .eq("id", args.activityId);
      }

      return next;
    },
    onSuccess: () => {
      for (const key of ["mastery", "revisions", "activities", "performance", "mastery-history"]) {
        qc.invalidateQueries({ queryKey: [key] });
      }
    },
  });
}

/** Recomputes future dates for pending work after a miss or a short day. */
export function useReplan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      plan: LearningPlan;
      activities: PlanActivity[];
      masteryByTopic: Record<string, number>;
      fromDate?: string | undefined;
      dailyMinutesOverride?: number | undefined;
      reason: string;
    }) => {
      const user_id = await uid();
      const schedulable: SchedulableActivity[] = args.activities.map((a) => ({
        id: a.id,
        activity_type: a.activity_type,
        estimated_minutes: a.estimated_minutes,
        priority: a.priority,
        locked: a.locked,
        scheduled_date: a.scheduled_date,
        status: a.status,
        mastery: a.topic_id ? args.masteryByTopic[a.topic_id] : undefined,
        deadline: args.plan.target_date,
      }));

      const { updates, overflow } = redistribute({
        activities: schedulable,
        fromDate: args.fromDate ?? today(),
        dailyMinutes: args.dailyMinutesOverride ?? args.plan.daily_minutes,
        preferredDays: args.plan.preferred_days ?? [0, 1, 2, 3, 4, 5, 6],
        targetDate: args.plan.target_date,
      });

      for (const u of updates) {
        const { error } = await supabase
          .from("plan_activities")
          .update({ scheduled_date: u.scheduled_date })
          .eq("id", u.id);
        if (error) throw new Error(error.message);
      }

      await supabase.from("plan_adjustments").insert({
        user_id,
        plan_id: args.plan.id,
        reason: args.reason,
        details: { moved: updates.length, overflow: overflow.length },
      });

      return { moved: updates.length, overflow: overflow.length };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["activities"] });
      qc.invalidateQueries({ queryKey: ["plans"] });
    },
  });
}

export function useAdjustments(planId?: string) {
  return useQuery({
    queryKey: ["adjustments", planId ?? "all"],
    queryFn: async () => {
      let q = supabase
        .from("plan_adjustments")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (planId) q = q.eq("plan_id", planId);
      return unwrap(await q);
    },
  });
}
