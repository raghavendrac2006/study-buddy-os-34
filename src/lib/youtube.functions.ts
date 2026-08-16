import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { readYoutubeCourse } from "@/lib/youtube.server";

export const fetchYoutubeCourse = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ url: z.string().min(8).max(500) }).parse(input))
  .handler(async ({ data }) => readYoutubeCourse(data.url));
