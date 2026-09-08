import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { aiJson } from "@/lib/ai/openrouter.server";
import { mentorPrompt } from "@/lib/ai/prompts.server";
import { MentorReplySchema } from "@/lib/ai/schemas";
import { buildMentorContext, decideNeeds } from "@/lib/ai/mentor-context.server";

/**
 * Read-only mentor. Retrieves only the data slices a question needs,
 * then asks the configured OpenRouter model for advice. Never mutates data.
 */
export const askMentor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        question: z.string().min(1).max(1000),
        history: z
          .array(
            z.object({
              role: z.enum(["user", "mentor"]),
              text: z.string().max(2000),
            }),
          )
          .max(8)
          .default([]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const needs = decideNeeds(data.question);
    const snapshot = await buildMentorContext(
      context.supabase,
      context.userId,
      needs,
      data.question,
    );
    const { system, user } = mentorPrompt({
      question: data.question,
      context: snapshot,
      history: data.history,
    });
    const { data: reply } = await aiJson({
      task: "mentor",
      system,
      user,
      schema: MentorReplySchema,
    });
    return {
      ...reply,
      used: Object.entries(needs)
        .filter(([, v]) => v)
        .map(([k]) => k),
    };
  });
