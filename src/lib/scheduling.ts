import type { LearningDayWithSubject, StudySession, Task } from "./db";

export const todayISO = () => new Date().toLocaleDateString("en-CA");

export function isoAddDays(iso: string, days: number) {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString("en-CA");
}

export function minutesLabel(min: number) {
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export function greeting(d = new Date()) {
  const h = d.getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

/** Deterministic adaptive planner: unfinished past days roll forward into the
 * next free slots, never marked as failures. */
export function rescheduleOverdue(days: LearningDayWithSubject[], today = todayISO()) {
  const overdue = days
    .filter((d) => d.status !== "completed" && d.status !== "skipped")
    .filter((d) => d.planned_date && d.planned_date < today)
    .sort((a, b) => (a.planned_date ?? "").localeCompare(b.planned_date ?? ""));

  const taken = new Set(
    days
      .filter((d) => d.planned_date && d.planned_date >= today && d.status !== "completed")
      .map((d) => `${d.subject_id}:${d.planned_date}`),
  );

  const moves: { id: string; planned_date: string }[] = [];
  for (const d of overdue) {
    let candidate = today;
    while (taken.has(`${d.subject_id}:${candidate}`)) candidate = isoAddDays(candidate, 1);
    taken.add(`${d.subject_id}:${candidate}`);
    moves.push({ id: d.id, planned_date: candidate });
  }
  return moves;
}

export function todaysPlan(days: LearningDayWithSubject[], today = todayISO()) {
  return days
    .filter((d) => d.planned_date === today && d.status !== "skipped")
    .sort((a, b) => a.day_number - b.day_number);
}

export function upcomingPlan(days: LearningDayWithSubject[], today = todayISO(), limit = 5) {
  return days
    .filter((d) => d.planned_date && d.planned_date > today && d.status !== "completed")
    .slice(0, limit);
}

/** Concepts flagged as hard resurface on a 1/3/7/14/30-day ladder. */
const LADDER = [1, 3, 7, 14, 30];

export function reviewToday(sessions: StudySession[], today = todayISO()) {
  const items: { key: string; topic: string; reason: string; since: number }[] = [];
  for (const s of sessions) {
    const hard = (s.difficulty ?? 0) >= 4 || s.understood === false || s.wants_practice === true;
    if (!hard || !s.topic) continue;
    const started = new Date(s.started_at).toLocaleDateString("en-CA");
    const since = Math.round(
      (new Date(today + "T00:00:00").getTime() - new Date(started + "T00:00:00").getTime()) /
        86400000,
    );
    if (LADDER.includes(since)) {
      items.push({
        key: s.id,
        topic: s.topic,
        reason:
          s.understood === false
            ? "Marked as not fully understood"
            : (s.difficulty ?? 0) >= 4
              ? "Rated difficult"
              : "You asked for extra practice",
        since,
      });
    }
  }
  const seen = new Set<string>();
  return items.filter((i) => (seen.has(i.topic) ? false : (seen.add(i.topic), true)));
}

export function studyStats(sessions: StudySession[], today = todayISO()) {
  const totalMinutes = sessions.reduce((a, s) => a + (s.actual_minutes ?? 0), 0);
  const byDay = new Map<string, number>();
  for (const s of sessions) {
    const d = new Date(s.started_at).toLocaleDateString("en-CA");
    byDay.set(d, (byDay.get(d) ?? 0) + (s.actual_minutes ?? 0));
  }
  const todayMinutes = byDay.get(today) ?? 0;

  // streak: today counts if studied, otherwise start from yesterday (grace day)
  let current = 0;
  let cursor = byDay.get(today) ? today : isoAddDays(today, -1);
  while ((byDay.get(cursor) ?? 0) > 0) {
    current++;
    cursor = isoAddDays(cursor, -1);
  }

  const dates = [...byDay.keys()].filter((d) => (byDay.get(d) ?? 0) > 0).sort();
  let longest = 0;
  let run = 0;
  let prev: string | null = null;
  for (const d of dates) {
    run = prev && isoAddDays(prev, 1) === d ? run + 1 : 1;
    longest = Math.max(longest, run);
    prev = d;
  }

  const weekMinutes = dates
    .filter((d) => d >= isoAddDays(today, -6))
    .reduce((a, d) => a + (byDay.get(d) ?? 0), 0);

  const last7 = Array.from({ length: 7 }, (_, i) => {
    const date = isoAddDays(today, -6 + i);
    return { date, minutes: byDay.get(date) ?? 0 };
  });

  return { totalMinutes, todayMinutes, weekMinutes, current, longest: Math.max(longest, current), last7 };
}

export function taskBuckets(tasks: Task[], today = todayISO()) {
  const open = tasks.filter((t) => t.status !== "completed");
  return {
    today: open.filter((t) => t.due_date === today),
    overdue: open.filter((t) => t.due_date && t.due_date < today),
    upcoming: open.filter((t) => !t.due_date || t.due_date > today),
    open,
  };
}
