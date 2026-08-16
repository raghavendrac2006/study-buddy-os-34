import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { aiJson } from "@/lib/ai/openrouter.server";
import {
  analysisPrompt,
  assistantPrompt,
  coursePlanPrompt,
  coursePrompt,
  gradeShortPrompt,
  planPrompt,
  quizPrompt,
  recallEvalPrompt,
  recallPrompt,
  recommendationPrompt,
} from "@/lib/ai/prompts.server";
import {
  AnalysisSchema,
  AssistantReplySchema,
  CourseStructureSchema,
  GradeShortAnswersSchema,
  PlanSchema,
  QuizSchema,
  RecallEvaluationSchema,
  RecallSetSchema,
  RecommendationsSchema,
} from "@/lib/ai/schemas";

export const analyzeMaterial = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        text: z.string().min(40).max(400_000),
        fileName: z.string().max(200),
        subjectHint: z.string().max(120).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { system, user } = analysisPrompt(data);
    const { data: analysis, model } = await aiJson({
      task: "material_analysis",
      system,
      user,
      schema: AnalysisSchema,
      inputChars: data.text.length,
    });
    return { analysis, model };
  });

export const generatePlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        goal: z.string().max(300),
        startDate: z.string(),
        targetDate: z.string().nullable(),
        dailyMinutes: z.number().min(15).max(720),
        preferredDays: z.array(z.number().min(0).max(6)),
        knowledgeLevel: z.string().max(40),
        priority: z.string().max(40),
        feasibilityNote: z.string().max(600),
        topics: z
          .array(
            z.object({
              title: z.string().max(200),
              difficulty: z.number(),
              estimated_minutes: z.number(),
              prerequisites: z.array(z.string()).default([]),
            }),
          )
          .min(1)
          .max(400),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { system, user } = planPrompt(data);
    const { data: plan, model } = await aiJson({
      task: "plan_generation",
      system,
      user,
      schema: PlanSchema,
    });
    return { plan, model };
  });

export const getRecommendations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ context: z.string().max(12_000) }).parse(input))
  .handler(async ({ data }) => {
    const { system, user } = recommendationPrompt(data);
    const { data: result } = await aiJson({
      task: "daily_adaptation",
      system,
      user,
      schema: RecommendationsSchema,
    });
    return result;
  });

export const analyzeCourse = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        title: z.string().max(300),
        author: z.string().max(200),
        durationMinutes: z.number().min(0).max(20_000),
        description: z.string().max(20_000),
        chapters: z
          .array(z.object({ title: z.string().max(300), start_seconds: z.number().min(0) }))
          .max(400),
        transcriptSample: z.string().max(120_000),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { system, user } = coursePrompt(data);
    const { data: course, model } = await aiJson({
      task: "material_analysis",
      system,
      user,
      schema: CourseStructureSchema,
      inputChars: data.transcriptSample.length,
    });
    return { course, model };
  });

export const generateCoursePlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        goal: z.string().max(300),
        startDate: z.string(),
        targetDate: z.string().nullable(),
        dailyMinutes: z.number().min(15).max(720),
        preferredDays: z.array(z.number().min(0).max(6)),
        knowledgeLevel: z.string().max(40),
        priority: z.string().max(40),
        feasibilityNote: z.string().max(600),
        manualGoals: z.array(z.string().max(300)).max(30),
        sections: z
          .array(
            z.object({
              title: z.string().max(200),
              video_minutes: z.number(),
              difficulty: z.number(),
              prerequisites: z.array(z.string()).default([]),
            }),
          )
          .min(1)
          .max(300),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { system, user } = coursePlanPrompt(data);
    const { data: plan, model } = await aiJson({
      task: "course_plan",
      system,
      user,
      schema: PlanSchema,
    });
    return { plan, model };
  });

export const generateRecall = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        topicTitle: z.string().max(200),
        objectives: z.array(z.string().max(300)).max(12),
        keyConcepts: z.array(z.string().max(200)).max(20),
        context: z.string().max(20_000),
        count: z.number().min(1).max(5),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { system, user } = recallPrompt(data);
    const { data: set } = await aiJson({ task: "recall", system, user, schema: RecallSetSchema });
    return set;
  });

export const evaluateRecall = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        topicTitle: z.string().max(200),
        question: z.string().max(600),
        expected: z.string().max(2000),
        answer: z.string().max(4000),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { system, user } = recallEvalPrompt(data);
    const { data: result } = await aiJson({
      task: "recall",
      system,
      user,
      schema: RecallEvaluationSchema,
    });
    return result;
  });

export const generateQuiz = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        topicTitles: z.array(z.string().max(200)).min(1).max(12),
        objectives: z.array(z.string().max(300)).max(20),
        weakAreas: z.array(z.string().max(200)).max(10),
        context: z.string().max(20_000),
        count: z.number().min(3).max(10),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { system, user } = quizPrompt(data);
    const { data: quiz } = await aiJson({ task: "assessment", system, user, schema: QuizSchema });
    return quiz;
  });

export const gradeShortAnswers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        items: z
          .array(
            z.object({
              index: z.number().min(0).max(20),
              question: z.string().max(600),
              expected: z.string().max(1500),
              answer: z.string().max(3000),
            }),
          )
          .min(1)
          .max(10),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { system, user } = gradeShortPrompt(data);
    const { data: graded } = await aiJson({
      task: "assessment",
      system,
      user,
      schema: GradeShortAnswersSchema,
    });
    return graded;
  });

export const askAssistant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        action: z.string().max(120),
        topicTitle: z.string().max(200),
        sourceTitle: z.string().max(200),
        selection: z.string().max(20_000),
        question: z.string().max(2000),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { system, user } = assistantPrompt(data);
    const { data: reply } = await aiJson({
      task: "assistant",
      system,
      user,
      schema: AssistantReplySchema,
    });
    return reply;
  });
