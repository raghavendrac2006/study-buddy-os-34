import type { PracticeQuestion } from "@/lib/practice-db";

export const CATEGORIES = ["aptitude", "reasoning"] as const;
export const MODES = ["aptitude", "reasoning", "mixed"] as const;
export const DIFFICULTIES = ["easy", "medium", "hard"] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export type SelectionConfig = {
  mode: string; // aptitude | reasoning | mixed
  count: number;
  difficulty: string; // easy | medium | hard | mixed
  topics?: string[];
  /** Recent attempts (newest first) used to bias selection toward weak topics. */
  history?: { topic: string | null; is_correct: boolean; question_id: string | null }[];
};

const RECENT_WINDOW = 40;

/**
 * Deterministic, explainable question selection.
 * Priority: never-attempted first, then weak topics, then weakest accuracy,
 * then least-recently attempted. Questions seen in the recent window are
 * pushed to the back while unused questions remain.
 */
export function selectQuestions(all: PracticeQuestion[], cfg: SelectionConfig): PracticeQuestion[] {
  const pool = all.filter((q) => {
    if (q.archived) return false;
    if (q.options.length < 2) return false;
    if (cfg.mode !== "mixed" && q.category !== cfg.mode) return false;
    if (cfg.difficulty !== "mixed" && q.difficulty !== cfg.difficulty) return false;
    if (cfg.topics?.length && !cfg.topics.includes(q.topic)) return false;
    return true;
  });

  const history = cfg.history ?? [];
  const recentIds = new Set(
    history
      .slice(0, RECENT_WINDOW)
      .map((h) => h.question_id)
      .filter((id): id is string => !!id),
  );
  const topicAcc = new Map<string, { correct: number; total: number }>();
  for (const h of history) {
    const key = h.topic ?? "General";
    const s = topicAcc.get(key) ?? { correct: 0, total: 0 };
    s.total += 1;
    if (h.is_correct) s.correct += 1;
    topicAcc.set(key, s);
  }

  const scored = pool.map((q) => {
    const accuracy = q.times_attempted ? q.times_correct / q.times_attempted : 0;
    const last = q.last_attempted_at ? new Date(q.last_attempted_at).getTime() : 0;
    const t = topicAcc.get(q.topic);
    // weakest topics first (0 = weakest); unseen topics sit in the middle.
    const topicScore = t && t.total > 0 ? t.correct / t.total : 0.5;
    return {
      q,
      recent: recentIds.has(q.id) ? 1 : 0,
      unattempted: q.times_attempted === 0 ? 0 : 1,
      topicScore,
      accuracy,
      last,
    };
  });

  scored.sort(
    (a, b) =>
      a.recent - b.recent ||
      a.unattempted - b.unattempted ||
      a.topicScore - b.topicScore ||
      a.accuracy - b.accuracy ||
      a.last - b.last ||
      a.q.id.localeCompare(b.q.id),
  );

  return scored.slice(0, Math.max(1, cfg.count)).map((s) => s.q);
}

/** Result-based revision spacing for logged coding/DSA problems. */
export function revisionDaysFor(result: string, difficulty?: string) {
  const base = result === "failed" ? 2 : result === "partial" ? 5 : 14;
  if (difficulty === "hard") return Math.max(1, Math.round(base * 0.7));
  if (difficulty === "easy") return Math.round(base * 1.5);
  return base;
}

export function revisionDateFor(result: string, difficulty?: string, from = new Date()) {
  const d = new Date(from);
  d.setDate(d.getDate() + revisionDaysFor(result, difficulty));
  return d.toLocaleDateString("en-CA");
}


export function selectionReason(q: PracticeQuestion) {
  if (q.times_attempted === 0) return "New question";
  const acc = Math.round((q.times_correct / q.times_attempted) * 100);
  return `${acc}% accuracy over ${q.times_attempted} attempt${q.times_attempted > 1 ? "s" : ""}`;
}

/* ---------------- topic performance ---------------- */

export type TopicStat = { topic: string; total: number; correct: number; accuracy: number };

export function topicStats(rows: { topic: string | null; is_correct: boolean }[]): TopicStat[] {
  const map = new Map<string, TopicStat>();
  for (const r of rows) {
    const topic = r.topic ?? "General";
    const s = map.get(topic) ?? { topic, total: 0, correct: 0, accuracy: 0 };
    s.total += 1;
    if (r.is_correct) s.correct += 1;
    s.accuracy = Math.round((s.correct / s.total) * 100);
    map.set(topic, s);
  }
  return [...map.values()].sort((a, b) => a.accuracy - b.accuracy || b.total - a.total);
}

/* ---------------- CSV ---------------- */

export const CSV_COLUMNS = [
  "category",
  "topic",
  "difficulty",
  "question",
  "option_a",
  "option_b",
  "option_c",
  "option_d",
  "correct_option",
  "explanation",
  "estimated_seconds",
  "source",
] as const;

function csvCell(value: string) {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function questionsToCsv(rows: PracticeQuestion[]) {
  const lines = [CSV_COLUMNS.join(",")];
  for (const q of rows) {
    const o = q.options;
    lines.push(
      [
        q.category,
        q.topic,
        q.difficulty,
        q.question,
        o[0] ?? "",
        o[1] ?? "",
        o[2] ?? "",
        o[3] ?? "",
        String.fromCharCode(65 + q.correct_index),
        q.explanation ?? "",
        String(q.estimated_seconds),
        q.source ?? "",
      ]
        .map((v) => csvCell(String(v)))
        .join(","),
    );
  }
  return lines.join("\n");
}

function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(cell);
      cell = "";
    } else if (c === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (c !== "\r") cell += c;
  }
  if (cell.length || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((v) => v.trim() !== ""));
}

export type ParsedQuestion = {
  category: string;
  topic: string;
  difficulty: string;
  question: string;
  options: string[];
  correct_index: number;
  explanation: string | null;
  estimated_seconds: number;
  source: string | null;
};

export function csvToQuestions(text: string): { rows: ParsedQuestion[]; errors: string[] } {
  const parsed = parseCsvRows(text);
  const errors: string[] = [];
  if (parsed.length < 2) return { rows: [], errors: ["CSV has no data rows."] };

  const header = (parsed[0] ?? []).map((h) => h.trim().toLowerCase());
  const idx = (name: string) => header.indexOf(name);
  const missing = ["question", "option_a", "option_b", "correct_option"].filter(
    (c) => idx(c) === -1,
  );
  if (missing.length) return { rows: [], errors: [`Missing columns: ${missing.join(", ")}`] };

  const rows: ParsedQuestion[] = [];
  parsed.slice(1).forEach((cols, i) => {
    const get = (name: string) => (idx(name) === -1 ? "" : (cols[idx(name)] ?? "").trim());
    const question = get("question");
    if (!question) {
      errors.push(`Row ${i + 2}: empty question, skipped.`);
      return;
    }
    const options = ["option_a", "option_b", "option_c", "option_d"]
      .map(get)
      .filter((v) => v !== "");
    if (options.length < 2) {
      errors.push(`Row ${i + 2}: needs at least two options, skipped.`);
      return;
    }
    const rawCorrect = get("correct_option").toUpperCase();
    let correct = /^[A-D]$/.test(rawCorrect)
      ? rawCorrect.charCodeAt(0) - 65
      : Number(rawCorrect) - 1;
    if (!Number.isFinite(correct) || correct < 0 || correct >= options.length) {
      errors.push(`Row ${i + 2}: invalid correct_option "${rawCorrect}", defaulted to A.`);
      correct = 0;
    }
    const category = get("category").toLowerCase() === "reasoning" ? "reasoning" : "aptitude";
    const difficulty = (DIFFICULTIES as readonly string[]).includes(get("difficulty").toLowerCase())
      ? get("difficulty").toLowerCase()
      : "medium";
    const secs = Number(get("estimated_seconds"));

    rows.push({
      category,
      topic: get("topic") || "General",
      difficulty,
      question,
      options,
      correct_index: correct,
      explanation: get("explanation") || null,
      estimated_seconds: Number.isFinite(secs) && secs > 0 ? Math.round(secs) : 90,
      source: get("source") || null,
    });
  });

  return { rows, errors };
}

export function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}
