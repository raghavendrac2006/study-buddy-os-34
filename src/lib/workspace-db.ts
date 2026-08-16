import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type T = Database["public"]["Tables"];
export type Goal = T["goals"]["Row"];
export type Note = T["notes"]["Row"];

async function uid() {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Not signed in");
  return data.user.id;
}

function unwrap<D>({ data, error }: { data: D; error: { message: string } | null }): D {
  if (error) throw new Error(error.message);
  return data;
}

/* ---------------- date helpers ---------------- */

export function isoDay(d = new Date()) {
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

/** Monday-based week start for a given ISO date. */
export function weekStart(iso = isoDay()) {
  const d = new Date(`${iso}T00:00:00`);
  const shift = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - shift);
  return isoDay(d);
}

export function addDays(iso: string, n: number) {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + n);
  return isoDay(d);
}

/* ---------------- goals ---------------- */

export function useGoals(range?: { from?: string; to?: string }) {
  return useQuery({
    queryKey: ["goals", range?.from ?? "", range?.to ?? ""],
    queryFn: async () => {
      let q = supabase.from("goals").select("*").order("goal_date").order("sort_order");
      if (range?.from) q = q.gte("goal_date", range.from);
      if (range?.to) q = q.lte("goal_date", range.to);
      return unwrap(await q);
    },
  });
}

export function useCreateGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: Omit<T["goals"]["Insert"], "user_id">) =>
      unwrap(
        await supabase
          .from("goals")
          .insert({ ...values, user_id: await uid() })
          .select("*")
          .single(),
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["goals"] }),
  });
}

export function useUpdateGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: T["goals"]["Update"] & { id: string }) =>
      unwrap(await supabase.from("goals").update(patch).eq("id", id).select("*").single()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["goals"] }),
  });
}

export function useDeleteGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("goals").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["goals"] }),
  });
}

/* ---------------- notes ---------------- */

export function useNotes(filter?: { topicId?: string; materialId?: string; search?: string }) {
  return useQuery({
    queryKey: ["notes", filter?.topicId ?? "", filter?.materialId ?? "", filter?.search ?? ""],
    queryFn: async () => {
      let q = supabase.from("notes").select("*").order("created_at", { ascending: false }).limit(300);
      if (filter?.topicId) q = q.eq("topic_id", filter.topicId);
      if (filter?.materialId) q = q.eq("material_id", filter.materialId);
      if (filter?.search) q = q.ilike("content", `%${filter.search}%`);
      return unwrap(await q);
    },
  });
}

export function useCreateNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: Omit<T["notes"]["Insert"], "user_id">) =>
      unwrap(
        await supabase
          .from("notes")
          .insert({ ...values, user_id: await uid() })
          .select("*")
          .single(),
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notes"] }),
  });
}

export function useUpdateNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: T["notes"]["Update"] & { id: string }) =>
      unwrap(await supabase.from("notes").update(patch).eq("id", id).select("*").single()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notes"] }),
  });
}

export function useDeleteNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("notes").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notes"] }),
  });
}

/* ---------------- learning objectives ---------------- */

export function useObjectives(topicId?: string) {
  return useQuery({
    queryKey: ["objectives", topicId ?? "all"],
    queryFn: async () => {
      let q = supabase.from("learning_objectives").select("*").order("sort_order");
      if (topicId) q = q.eq("topic_id", topicId);
      return unwrap(await q);
    },
    enabled: topicId !== "",
  });
}

/* ---------------- assessments (history) ---------------- */

export function useAssessments(topicId?: string) {
  return useQuery({
    queryKey: ["assessments", topicId ?? "all"],
    queryFn: async () => {
      let q = supabase
        .from("assessments")
        .select("*")
        .order("taken_at", { ascending: false })
        .limit(200);
      if (topicId) q = q.eq("topic_id", topicId);
      return unwrap(await q);
    },
  });
}
