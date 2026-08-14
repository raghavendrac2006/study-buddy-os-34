/**
 * Deterministic adaptive engine — mastery, spaced revision, daily prioritisation
 * and rescheduling. No AI calls live here on purpose.
 */

export type MasteryState =
  | "not_started"
  | "learning"
  | "developing"
  | "strong"
  | "mastered"
  | "needs_revision";

export const MASTERY_LABEL: Record<MasteryState, string> = {
  not_started: "Not started",
  learning: "Learning",
  developing: "Developing",
  strong: "Strong",
  mastered: "Mastered",
  needs_revision: "Needs revision",
};

export type PerformanceSignal = {
  /** 0–100 */
  score?: number | null;
  /** 1–5 */
  confidence?: number | null;
  /** 1–5, higher = harder */
  difficulty?: number | null;
  /** 0–1 */
  completion?: number | null;
  plannedMinutes?: number;
  actualMinutes?: number;
  activityType?: string;
};

export type MasteryRecord = {
  mastery: number; // 0–100
  state: MasteryState;
  ease: number;
  interval_days: number;
  reps: number;
  lapses: number;
  next_review_date: string | null;
};

export const NEW_MASTERY: MasteryRecord = {
  mastery: 0,
  state: "not_started",
  ease: 2.5,
  interval_days: 0,
  reps: 0,
  lapses: 0,
  next_review_date: null,
};

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Blends the available signals into a single 0–1 quality value. */
export function signalQuality(s: PerformanceSignal): number {
  const parts: { value: number; weight: number }[] = [];
  if (s.score != null) parts.push({ value: clamp(s.score, 0, 100) / 100, weight: 0.5 });
  if (s.confidence != null) parts.push({ value: (clamp(s.confidence, 1, 5) - 1) / 4, weight: 0.2 });
  if (s.difficulty != null) parts.push({ value: 1 - (clamp(s.difficulty, 1, 5) - 1) / 4, weight: 0.15 });
  if (s.completion != null) parts.push({ value: clamp(s.completion, 0, 1), weight: 0.15 });

  if (s.plannedMinutes && s.actualMinutes != null) {
    const ratio = clamp(s.actualMinutes / Math.max(1, s.plannedMinutes), 0, 1.5);
    parts.push({ value: clamp(ratio, 0, 1), weight: 0.1 });
  }
  if (!parts.length) return 0.5;
  const total = parts.reduce((a, p) => a + p.weight, 0);
  return clamp(parts.reduce((a, p) => a + p.value * p.weight, 0) / total, 0, 1);
}

export function stateForMastery(mastery: number, lapsedRecently = false): MasteryState {
  if (lapsedRecently && mastery < 80) return "needs_revision";
  if (mastery <= 0) return "not_started";
  if (mastery < 35) return "learning";
  if (mastery < 60) return "developing";
  if (mastery < 80) return "strong";
  return "mastered";
}

function addDays(iso: string, days: number) {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Rolling mastery update — the new value always blends with history, so a single
 * good or bad result never fully defines a topic.
 */
export function updateMastery(
  prev: MasteryRecord,
  signal: PerformanceSignal,
  onDate = today(),
): MasteryRecord {
  const q = signalQuality(signal);
  const reps = prev.reps + 1;
  const alpha = reps <= 2 ? 0.45 : reps <= 5 ? 0.3 : 0.22;
  const mastery = clamp(prev.mastery + alpha * (q * 100 - prev.mastery), 0, 100);

  let ease = prev.ease;
  let lapses = prev.lapses;
  let interval: number;

  if (q >= 0.8) {
    ease = clamp(ease + 0.12, 1.3, 3.2);
    interval = prev.interval_days <= 0 ? 2 : Math.round(prev.interval_days * ease);
  } else if (q >= 0.6) {
    interval = prev.interval_days <= 0 ? 1 : Math.max(1, Math.round(prev.interval_days * 1.3));
  } else if (q >= 0.4) {
    ease = clamp(ease - 0.15, 1.3, 3.2);
    interval = Math.max(1, Math.round(Math.max(1, prev.interval_days) * 0.6));
  } else {
    ease = clamp(ease - 0.25, 1.3, 3.2);
    lapses += 1;
    interval = 1;
  }
  interval = clamp(interval, 1, 120);

  const lapsedRecently = q < 0.5;
  return {
    mastery: Math.round(mastery * 10) / 10,
    state: stateForMastery(mastery, lapsedRecently),
    ease,
    interval_days: interval,
    reps,
    lapses,
    next_review_date: addDays(onDate, interval),
  };
}

/** Extra reinforcement work suggested by a weak result. */
export function reinforcementFor(signal: PerformanceSignal): ("practice" | "revise" | "learn")[] {
  const q = signalQuality(signal);
  if (q < 0.4) return ["learn", "practice"];
  if (q < 0.6) return ["practice"];
  return [];
}

/* ---------------- daily prioritisation ---------------- */

export type SchedulableActivity = {
  id: string;
  activity_type: string;
  estimated_minutes: number;
  priority: number;
  locked: boolean;
  scheduled_date: string;
  status: string;
  mastery?: number | undefined;
  deadline?: string | null | undefined;
};

const TYPE_WEIGHT: Record<string, number> = {
  assess: 5,
  revise: 4.5,
  recall: 4,
  practice: 3.5,
  learn: 3,
};

export function activityScore(a: SchedulableActivity, onDate = today()): number {
  let score = (a.priority ?? 3) * 2 + (TYPE_WEIGHT[a.activity_type] ?? 3);
  if (a.locked) score += 100;
  if (a.scheduled_date < onDate) score += 6; // overdue first
  if (a.mastery != null) score += (100 - a.mastery) / 25;
  if (a.deadline) {
    const days = Math.max(
      0,
      (new Date(`${a.deadline}T00:00:00`).getTime() - new Date(`${onDate}T00:00:00`).getTime()) /
        86_400_000,
    );
    score += clamp(30 / (days + 3), 0, 8);
  }
  return score;
}

/**
 * Fits the highest-value activities into the minutes actually available today,
 * keeping ~10% buffer. Returns what to do now and what to push forward.
 */
export function prioritiseForBudget(
  activities: SchedulableActivity[],
  availableMinutes: number,
  onDate = today(),
): { keep: SchedulableActivity[]; defer: SchedulableActivity[]; usedMinutes: number } {
  const budget = Math.max(10, Math.floor(availableMinutes * 0.9));
  const sorted = [...activities].sort((a, b) => activityScore(b, onDate) - activityScore(a, onDate));
  const keep: SchedulableActivity[] = [];
  const defer: SchedulableActivity[] = [];
  let used = 0;
  for (const a of sorted) {
    if (used + a.estimated_minutes <= budget || (keep.length === 0 && a.locked)) {
      keep.push(a);
      used += a.estimated_minutes;
    } else {
      defer.push(a);
    }
  }
  return { keep, defer, usedMinutes: used };
}

/* ---------------- rescheduling ---------------- */

export function nextStudyDate(from: string, preferredDays: number[]): string {
  const days = preferredDays.length ? preferredDays : [0, 1, 2, 3, 4, 5, 6];
  let d = from;
  for (let i = 0; i < 14; i++) {
    const dow = new Date(`${d}T00:00:00`).getDay();
    if (days.includes(dow)) return d;
    d = addDays(d, 1);
  }
  return from;
}

/**
 * Redistributes missed / deferred work across upcoming study days by value,
 * respecting the daily time budget and locked items. Never shifts everything
 * by a flat day.
 */
export function redistribute(args: {
  activities: SchedulableActivity[];
  fromDate?: string;
  dailyMinutes: number;
  preferredDays: number[];
  targetDate?: string | null;
}): { updates: { id: string; scheduled_date: string }[]; overflow: SchedulableActivity[] } {
  const from = args.fromDate ?? today();
  const pending = args.activities
    .filter((a) => a.status === "pending" && !a.locked)
    .sort((a, b) => activityScore(b, from) - activityScore(a, from));

  const load = new Map<string, number>();
  for (const a of args.activities) {
    if (a.locked && a.status === "pending" && a.scheduled_date >= from) {
      load.set(a.scheduled_date, (load.get(a.scheduled_date) ?? 0) + a.estimated_minutes);
    }
  }

  const budget = Math.max(20, args.dailyMinutes);
  const updates: { id: string; scheduled_date: string }[] = [];
  const overflow: SchedulableActivity[] = [];
  let cursor = nextStudyDate(from, args.preferredDays);

  for (const a of pending) {
    let placed = false;
    let day = cursor;
    for (let i = 0; i < 200; i++) {
      day = nextStudyDate(day, args.preferredDays);
      const used = load.get(day) ?? 0;
      if (used + a.estimated_minutes <= budget) {
        load.set(day, used + a.estimated_minutes);
        if (day !== a.scheduled_date) updates.push({ id: a.id, scheduled_date: day });
        placed = true;
        break;
      }
      day = addDays(day, 1);
      if (args.targetDate && day > args.targetDate) break;
    }
    if (!placed) overflow.push(a);
  }

  return { updates, overflow };
}

/** Plain-language feasibility check against the target date. */
export function feasibility(args: {
  totalMinutes: number;
  dailyMinutes: number;
  preferredDays: number[];
  targetDate?: string | null;
  fromDate?: string;
}): { feasible: boolean; message: string; requiredDays: number; availableDays: number } {
  const from = args.fromDate ?? today();
  const perDay = Math.max(15, args.dailyMinutes);
  const requiredDays = Math.ceil(args.totalMinutes / perDay);
  if (!args.targetDate) {
    return {
      feasible: true,
      message: `About ${requiredDays} study days at ${perDay} minutes a day.`,
      requiredDays,
      availableDays: requiredDays,
    };
  }
  const days = args.preferredDays.length ? args.preferredDays : [0, 1, 2, 3, 4, 5, 6];
  let available = 0;
  let d = from;
  while (d <= args.targetDate && available < 1000) {
    if (days.includes(new Date(`${d}T00:00:00`).getDay())) available++;
    d = addDays(d, 1);
  }
  const feasible = requiredDays <= available;
  return {
    feasible,
    availableDays: available,
    requiredDays,
    message: feasible
      ? `Comfortable: ${requiredDays} study days needed, ${available} available before your target date.`
      : `Tight: you need about ${requiredDays} study days but only have ${available}. The plan will focus on the highest-priority material first.`,
  };
}

export { addDays };
