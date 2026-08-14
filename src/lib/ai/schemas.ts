import { z } from "zod";

/* ---------- Material analysis ---------- */

export const AnalysisTopicSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(600).optional().default(""),
  key_concepts: z.array(z.string().max(160)).max(20).optional().default([]),
  prerequisites: z.array(z.string().max(160)).max(12).optional().default([]),
  objectives: z.array(z.string().max(240)).max(10).optional().default([]),
  subtopics: z.array(z.string().max(160)).max(20).optional().default([]),
  difficulty: z.coerce.number().min(1).max(5).optional().default(3),
  estimated_minutes: z.coerce.number().min(5).max(600).optional().default(45),
});

export const AnalysisChapterSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(600).optional().default(""),
  topics: z.array(AnalysisTopicSchema).min(1).max(40),
});

export const AnalysisUnitSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(600).optional().default(""),
  chapters: z.array(AnalysisChapterSchema).min(1).max(30),
});

export const AnalysisSchema = z.object({
  summary: z.string().max(1500).optional().default(""),
  subject_guess: z.string().max(120).optional().default(""),
  units: z.array(AnalysisUnitSchema).min(1).max(20),
});

export type Analysis = z.infer<typeof AnalysisSchema>;
export type AnalysisTopic = z.infer<typeof AnalysisTopicSchema>;

/* ---------- Plan generation ---------- */

export const PlanActivitySchema = z.object({
  topic_title: z.string().max(200).optional().default(""),
  activity_type: z.enum(["learn", "recall", "practice", "assess", "revise"]).default("learn"),
  title: z.string().min(1).max(200),
  description: z.string().max(400).optional().default(""),
  minutes: z.coerce.number().min(5).max(300).default(30),
  priority: z.coerce.number().min(1).max(5).optional().default(3),
});

export const PlanDaySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  focus: z.string().max(200).optional().default(""),
  activities: z.array(PlanActivitySchema).max(12),
});

export const PlanSchema = z.object({
  feasible: z.boolean().default(true),
  message: z.string().max(800).optional().default(""),
  days: z.array(PlanDaySchema).min(1).max(200),
});

export type GeneratedPlan = z.infer<typeof PlanSchema>;
export type GeneratedPlanActivity = z.infer<typeof PlanActivitySchema>;

/* ---------- Adaptive recommendations ---------- */

export const RecommendationSchema = z.object({
  headline: z.string().max(160),
  detail: z.string().max(500).optional().default(""),
  severity: z.enum(["info", "warn", "critical"]).default("info"),
  topic_title: z.string().max(200).optional().default(""),
});

export const RecommendationsSchema = z.object({
  recommendations: z.array(RecommendationSchema).max(6),
});

export type Recommendation = z.infer<typeof RecommendationSchema>;
