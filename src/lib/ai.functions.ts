import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { aiJson } from "@/lib/ai/openrouter.server";
import { analysisPrompt, planPrompt, recommendationPrompt } from "@/lib/ai/prompts.server";
import { AnalysisSchema, PlanSchema, RecommendationsSchema } from "@/lib/ai/schemas";

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
