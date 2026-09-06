import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type DB = SupabaseClient<Database>;

/** Which slices of the user's study data a question needs. */
export type ContextNeeds = {
  plan: boolean;
  revisions: boolean;
  mastery: boolean;
  sessions: boolean;
  practice: boolean;
  coding: boolean;
  goals: boolean;
  materials: boolean;
};

const RULES: { key: keyof ContextNeeds; re: RegExp }[] = [
  { key: "plan", re: /(today|tomorrow|plan|schedule|next|behind|priorit|hour|time|study what|what should)/i },
  { key: "revisions", re: /(revis|review|due|spaced|forget)/i },
  { key: "mastery", re: /(weak|strong|mastery|master|struggl|improve|topic|progress|behind)/i },
  { key: "sessions", re: /(study|session|hours|time|consistent|behind|progress|streak)/i },
  { key: "practice", re: /(aptitude|reasoning|practice|quiz|question|accuracy|score)/i },
  { key: "coding", re: /(cod|dsa|leetcode|problem|algorithm|program)/i },
  { key: "goals", re: /(goal|target|deadline|exam|behind|today|plan)/i },
  { key: "materials", re: /(material|pdf|document|youtube|video|course|upload|book)/i },
];

export function decideNeeds(question: string): ContextNeeds {
  const needs: ContextNeeds = {
    plan: false,
    revisions: false,
    mastery: false,
    sessions: false,
    practice: false,
    coding: false,
    goals: false,
    materials: false,
  };
  for (const r of RULES) if (r.re.test(question)) needs[r.key] = true;
  // Always give a minimal anchor so answers are never contextless.
  if (!Object.values(needs).some(Boolean)) {
    needs.plan = true;
    needs.mastery = true;
    needs.revisions = true;
  }
  return needs;
}

function iso(d: Date) {
  return d.toISOString().slice(0, 10);
}

/**
 * Builds a compact, read-only text snapshot of the user's study data.
 * Only the slices flagged in `needs` are queried.
 */
export async function buildMentorContext(
  supabase: DB,
  userId: string,
  needs: ContextNeeds,
): Promise<string> {
  const now = new Date();
  const todayStr = iso(now);
  const weekAgo = iso(new Date(now.getTime() - 7 * 86_400_000));
  const inWeek = iso(new Date(now.getTime() + 7 * 86_400_000));
  const parts: string[] = [`Today's date: ${todayStr}`];

  const topicTitle = new Map<string, string>();
  const loadTopics = async () => {
    if (topicTitle.size) return;
    const { data } = await supabase
      .from("topics")
      .select("id,title")
      .eq("user_id", userId)
      .limit(500);
    for (const t of data ?? []) topicTitle.set(t.id, t.title);
  };

  if (needs.plan) {
    const { data } = await supabase
      .from("plan_activities")
      .select("scheduled_date,title,activity_type,estimated_minutes,status,priority")
      .eq("user_id", userId)
      .gte("scheduled_date", todayStr)
      .lte("scheduled_date", inWeek)
      .order("scheduled_date")
      .order("priority", { ascending: false })
      .limit(40);
    parts.push(
      data?.length
        ? `PLANNED ACTIVITIES (today → +7d):\n${data
            .map(
              (a) =>
                `- ${a.scheduled_date} | ${a.activity_type} | ${a.title} | ${a.estimated_minutes}min | ${a.status}`,
            )
            .join("\n")}`
        : "PLANNED ACTIVITIES (today → +7d): none scheduled.",
    );
  }

  if (needs.revisions) {
    await loadTopics();
    const { data } = await supabase
      .from("revision_schedule")
      .select("due_date,status,topic_id,reason")
      .eq("user_id", userId)
      .neq("status", "done")
      .lte("due_date", inWeek)
      .order("due_date")
      .limit(30);
    parts.push(
      data?.length
        ? `REVISIONS DUE (up to +7d):\n${data
            .map(
              (r) =>
                `- ${r.due_date} | ${topicTitle.get(r.topic_id) ?? "topic"} | ${r.status}${
                  r.due_date < todayStr ? " (OVERDUE)" : ""
                }`,
            )
            .join("\n")}`
        : "REVISIONS DUE: none.",
    );
  }

  if (needs.mastery) {
    await loadTopics();
    const { data } = await supabase
      .from("topic_mastery")
      .select("topic_id,mastery,state,reps,lapses,last_reviewed_at")
      .eq("user_id", userId)
      .order("mastery", { ascending: true })
      .limit(15);
    parts.push(
      data?.length
        ? `WEAKEST TOPICS (lowest mastery first):\n${data
            .map(
              (m) =>
                `- ${topicTitle.get(m.topic_id) ?? "topic"} | mastery ${Math.round(
                  Number(m.mastery) * 100,
                )}% | ${m.state} | reps ${m.reps} | lapses ${m.lapses}`,
            )
            .join("\n")}`
        : "TOPIC MASTERY: no mastery records yet.",
    );
  }

  if (needs.sessions) {
    const { data } = await supabase
      .from("study_sessions")
      .select("started_at,topic,planned_minutes,actual_minutes,understood")
      .eq("user_id", userId)
      .gte("started_at", `${weekAgo}T00:00:00Z`)
      .order("started_at", { ascending: false })
      .limit(30);
    const total = (data ?? []).reduce((s, r) => s + (r.actual_minutes ?? 0), 0);
    parts.push(
      data?.length
        ? `STUDY SESSIONS (last 7 days, total ${total} min):\n${data
            .slice(0, 12)
            .map(
              (s) =>
                `- ${s.started_at.slice(0, 10)} | ${s.topic ?? "unspecified"} | ${
                  s.actual_minutes
                }/${s.planned_minutes} min${s.understood === false ? " | struggled" : ""}`,
            )
            .join("\n")}`
        : "STUDY SESSIONS (last 7 days): none recorded.",
    );
  }

  if (needs.practice) {
    const { data } = await supabase
      .from("practice_sessions")
      .select("practiced_on,mode,question_count,correct_count,duration_seconds")
      .eq("user_id", userId)
      .order("practiced_on", { ascending: false })
      .limit(10);
    parts.push(
      data?.length
        ? `APTITUDE / REASONING PRACTICE (recent):\n${data
            .map(
              (p) =>
                `- ${p.practiced_on} | ${p.mode} | ${p.correct_count}/${p.question_count} correct`,
            )
            .join("\n")}`
        : "APTITUDE / REASONING PRACTICE: no sessions recorded.",
    );
  }

  if (needs.coding) {
    const { data } = await supabase
      .from("coding_problems")
      .select("solved_on,name,category,difficulty,result,minutes_taken,needs_revision")
      .eq("user_id", userId)
      .order("solved_on", { ascending: false })
      .limit(15);
    parts.push(
      data?.length
        ? `CODING / DSA LOG (recent):\n${data
            .map(
              (c) =>
                `- ${c.solved_on} | ${c.name} | ${c.category} | ${c.difficulty} | ${c.result} | ${
                  c.minutes_taken
                }min${c.needs_revision ? " | needs revision" : ""}`,
            )
            .join("\n")}`
        : "CODING / DSA LOG: nothing logged.",
    );
  }

  if (needs.goals) {
    const { data } = await supabase
      .from("goals")
      .select("goal_date,title,status,target_minutes,period")
      .eq("user_id", userId)
      .gte("goal_date", weekAgo)
      .order("goal_date")
      .limit(30);
    parts.push(
      data?.length
        ? `GOALS (last 7 days onward):\n${data
            .map((g) => `- ${g.goal_date} | ${g.period} | ${g.title} | ${g.status}`)
            .join("\n")}`
        : "GOALS: none set.",
    );
  }

  if (needs.materials) {
    const { data } = await supabase
      .from("materials")
      .select(
        "title,source_type,status,char_count,last_page,watched_seconds,duration_seconds,updated_at",
      )
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(15);
    parts.push(
      data?.length
        ? `MATERIALS & COURSES:\n${data
            .map((m) => {
              const progress =
                m.source_type === "youtube" && m.duration_seconds
                  ? `${Math.round((m.watched_seconds / m.duration_seconds) * 100)}% watched`
                  : m.last_page
                    ? `last page ${m.last_page}`
                    : "no progress recorded";
              return `- ${m.title} | ${m.source_type} | ${m.status} | ${progress}`;
            })
            .join("\n")}`
        : "MATERIALS & COURSES: none uploaded.",
    );
  }

  return parts.join("\n\n");
}
