export function analysisPrompt(input: { text: string; fileName: string; subjectHint?: string }) {
  const MAX = 90_000;
  const body = input.text.length > MAX ? `${input.text.slice(0, MAX)}\n...[truncated]` : input.text;
  return {
    system: `You are a curriculum analyst. You read raw study material and extract its real structure.
Rules:
- Use ONLY what is actually in the material. Never invent a standard syllabus.
- Preserve the material's own wording for unit/chapter/topic names where possible.
- estimated_minutes is realistic focused study time for an average learner.
- difficulty is 1 (very easy) to 5 (very hard).
Return JSON shaped exactly as:
{"summary":string,"subject_guess":string,"units":[{"title":string,"description":string,"chapters":[{"title":string,"description":string,"topics":[{"title":string,"description":string,"key_concepts":[string],"prerequisites":[string],"objectives":[string],"subtopics":[string],"difficulty":number,"estimated_minutes":number}]}]}]}`,
    user: `File: ${input.fileName}
${input.subjectHint ? `Subject hint: ${input.subjectHint}` : ""}

MATERIAL:
"""
${body}
"""`,
  };
}

export function planPrompt(input: {
  goal: string;
  startDate: string;
  targetDate: string | null;
  dailyMinutes: number;
  preferredDays: number[];
  knowledgeLevel: string;
  priority: string;
  feasibilityNote: string;
  topics: { title: string; difficulty: number; estimated_minutes: number; prerequisites: string[] }[];
}) {
  return {
    system: `You are an expert study planner. You build realistic, adaptive study schedules.
Rules:
- Never divide topics equally across days. Weight by difficulty, prerequisites and priority.
- Mix activity types: learn, recall, practice, assess, revise.
- Respect prerequisites: a topic is learned before topics that depend on it.
- Schedule spaced revisions (roughly 1, 3, 7, 14 days after learning) as "revise" activities.
- Only schedule on the allowed weekdays. Keep each day at or under the daily minute budget, leaving buffer.
- If the target date is not realistic, set feasible=false, explain in message, and front-load the highest-value material.
Return JSON: {"feasible":boolean,"message":string,"days":[{"date":"YYYY-MM-DD","focus":string,"activities":[{"topic_title":string,"activity_type":"learn|recall|practice|assess|revise","title":string,"description":string,"minutes":number,"priority":number}]}]}`,
    user: `Goal: ${input.goal}
Start date: ${input.startDate}
Target date: ${input.targetDate ?? "none"}
Daily study budget: ${input.dailyMinutes} minutes
Allowed weekdays (0=Sunday): ${input.preferredDays.join(",")}
Current knowledge level: ${input.knowledgeLevel}
Priority: ${input.priority}
Deterministic feasibility check: ${input.feasibilityNote}

TOPICS (title | difficulty | estimated minutes | prerequisites):
${input.topics
  .map(
    (t) =>
      `- ${t.title} | ${t.difficulty} | ${t.estimated_minutes} | ${t.prerequisites.join(", ") || "none"}`,
  )
  .join("\n")}`,
  };
}

export function recommendationPrompt(input: { context: string }) {
  return {
    system: `You are a study mentor. Given a compact snapshot of a learner's progress, give at most 4 short, concrete, actionable recommendations. Be specific about topics and time. No generic motivation.
Return JSON: {"recommendations":[{"headline":string,"detail":string,"severity":"info|warn|critical","topic_title":string}]}`,
    user: input.context,
  };
}
