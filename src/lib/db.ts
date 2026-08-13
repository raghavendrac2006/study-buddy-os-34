import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type T = Database["public"]["Tables"];
export type Profile = T["profiles"]["Row"];
export type Subject = T["subjects"]["Row"];
export type LearningDay = T["learning_days"]["Row"];
export type Task = T["tasks"]["Row"];
export type StudySession = T["study_sessions"]["Row"];

export type LearningDayWithSubject = LearningDay & {
  subject: Pick<Subject, "id" | "name" | "color" | "icon"> | null;
};

async function uid() {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Not signed in");
  return data.user.id;
}

function unwrap<D>({ data, error }: { data: D; error: { message: string } | null }): D {
  if (error) throw new Error(error.message);
  return data;
}

/* ---------------- profile ---------------- */

export function useProfile() {
  return useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const id = await uid();
      const res = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
      const existing = unwrap(res);
      if (existing) return existing;
      const created = await supabase
        .from("profiles")
        .insert({ id })
        .select("*")
        .single();
      return unwrap(created);
    },
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: T["profiles"]["Update"]) => {
      const id = await uid();
      return unwrap(
        await supabase.from("profiles").update(patch).eq("id", id).select("*").single(),
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["profile"] }),
  });
}

/* ---------------- subjects ---------------- */

export function useSubjects(includeArchived = false) {
  return useQuery({
    queryKey: ["subjects", includeArchived],
    queryFn: async () => {
      let q = supabase.from("subjects").select("*").order("sort_order").order("created_at");
      if (!includeArchived) q = q.eq("archived", false);
      return unwrap(await q);
    },
  });
}

export function useSubject(id: string) {
  return useQuery({
    queryKey: ["subject", id],
    queryFn: async () => unwrap(await supabase.from("subjects").select("*").eq("id", id).single()),
    enabled: !!id,
  });
}

export function useCreateSubject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: Omit<T["subjects"]["Insert"], "user_id">) =>
      unwrap(
        await supabase
          .from("subjects")
          .insert({ ...values, user_id: await uid() })
          .select("*")
          .single(),
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["subjects"] }),
  });
}

export function useUpdateSubject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: T["subjects"]["Update"] & { id: string }) =>
      unwrap(await supabase.from("subjects").update(patch).eq("id", id).select("*").single()),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["subjects"] });
      qc.invalidateQueries({ queryKey: ["subject", v.id] });
    },
  });
}

export function useDeleteSubject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("subjects").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["subjects"] });
      qc.invalidateQueries({ queryKey: ["days"] });
    },
  });
}

/* ---------------- learning days ---------------- */

export function useLearningDays(subjectId?: string) {
  return useQuery({
    queryKey: ["days", subjectId ?? "all"],
    queryFn: async () => {
      let q = supabase
        .from("learning_days")
        .select("*, subject:subjects(id,name,color,icon)")
        .order("planned_date", { nullsFirst: false })
        .order("day_number");
      if (subjectId) q = q.eq("subject_id", subjectId);
      return unwrap(await q) as unknown as LearningDayWithSubject[];
    },
  });
}

export function useCreateLearningDay() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: Omit<T["learning_days"]["Insert"], "user_id">) =>
      unwrap(
        await supabase
          .from("learning_days")
          .insert({ ...values, user_id: await uid() })
          .select("*")
          .single(),
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["days"] }),
  });
}

export function useUpdateLearningDay() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: T["learning_days"]["Update"] & { id: string }) =>
      unwrap(await supabase.from("learning_days").update(patch).eq("id", id).select("*").single()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["days"] }),
  });
}

export function useDeleteLearningDay() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("learning_days").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["days"] }),
  });
}

/* ---------------- tasks ---------------- */

export function useTasks() {
  return useQuery({
    queryKey: ["tasks"],
    queryFn: async () =>
      unwrap(
        await supabase
          .from("tasks")
          .select("*")
          .order("status")
          .order("due_date", { nullsFirst: false }),
      ),
  });
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: Omit<T["tasks"]["Insert"], "user_id">) =>
      unwrap(
        await supabase
          .from("tasks")
          .insert({ ...values, user_id: await uid() })
          .select("*")
          .single(),
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: T["tasks"]["Update"] & { id: string }) =>
      unwrap(await supabase.from("tasks").update(patch).eq("id", id).select("*").single()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });
}

/* ---------------- study sessions ---------------- */

export function useSessions() {
  return useQuery({
    queryKey: ["sessions"],
    queryFn: async () =>
      unwrap(
        await supabase
          .from("study_sessions")
          .select("*")
          .order("started_at", { ascending: false })
          .limit(400),
      ),
  });
}

export function useCreateSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: Omit<T["study_sessions"]["Insert"], "user_id">) =>
      unwrap(
        await supabase
          .from("study_sessions")
          .insert({ ...values, user_id: await uid() })
          .select("*")
          .single(),
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sessions"] }),
  });
}

export function useUpdateSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: T["study_sessions"]["Update"] & { id: string }) =>
      unwrap(await supabase.from("study_sessions").update(patch).eq("id", id).select("*").single()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sessions"] }),
  });
}
