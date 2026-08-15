import type { ZodSchema } from "zod";
import { MODEL_CONFIG, modelsFor, type AiTask } from "./models";

const ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

export class AiError extends Error {
  code: "missing_key" | "rate_limit" | "timeout" | "provider" | "malformed" | "empty" | "truncated";
  constructor(code: AiError["code"], message: string) {
    super(message);
    this.code = code;
  }
}

function extractJson(raw: string): unknown {
  const cleaned = raw
    .replace(/^\s*```(?:json)?/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1));
      } catch {
        /* fall through */
      }
    }
    throw new AiError("malformed", "The AI returned a response that could not be read.");
  }
}

async function callOnce(opts: {
  apiKey: string;
  model: string;
  system: string;
  user: string;
  temperature: number;
  maxTokens: number;
  timeoutMs: number;
  reasoning: boolean;
}): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs);
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${opts.apiKey}`,
        "Content-Type": "application/json",
        "X-Title": "Learning OS",
      },
      body: JSON.stringify({
        model: opts.model,
        temperature: opts.temperature,
        max_tokens: opts.maxTokens,
        response_format: { type: "json_object" },
        // Free routers frequently pick reasoning models that burn the whole
        // output budget on chain-of-thought and return no content at all.
        reasoning: { enabled: opts.reasoning },
        messages: [
          { role: "system", content: opts.system },
          { role: "user", content: opts.user },
        ],
      }),
    });

    if (res.status === 429) throw new AiError("rate_limit", "AI rate limit reached. Try again in a minute.");
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new AiError("provider", `AI provider error (${res.status}). ${body.slice(0, 200)}`);
    }

    const json = (await res.json()) as {
      choices?: { message?: { content?: string | null }; finish_reason?: string }[];
      error?: { message?: string };
    };
    if (json.error?.message) throw new AiError("provider", json.error.message);
    const choice = json.choices?.[0];
    const content = choice?.message?.content;
    if (!content || !content.trim()) {
      if (choice?.finish_reason === "length") {
        throw new AiError(
          "truncated",
          `The model (${opts.model}) ran out of output space before returning an answer.`,
        );
      }
      throw new AiError("empty", `The model (${opts.model}) returned an empty response.`);
    }
    return content;

  } catch (err) {
    if (err instanceof AiError) throw err;
    if (err instanceof Error && err.name === "AbortError") {
      throw new AiError("timeout", "The AI took too long to respond. Try again.");
    }
    throw new AiError("provider", err instanceof Error ? err.message : "AI request failed.");
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Calls OpenRouter and returns a schema-validated object.
 * Tries the configured models in order and retries once on malformed output.
 */
export async function aiJson<T>(args: {
  task: AiTask;
  system: string;
  user: string;
  schema: ZodSchema<T>;
  inputChars?: number;
}): Promise<{ data: T; model: string }> {
  const apiKey = process.env["OPENROUTER_API_KEY"];
  if (!apiKey) throw new AiError("missing_key", "AI is not configured yet.");

  const cfg = MODEL_CONFIG[args.task];
  const models = modelsFor(args.task, args.inputChars ?? args.user.length);
  let lastError: AiError | null = null;

  for (const model of models) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const raw = await callOnce({
          apiKey,
          model,
          system:
            args.system +
            "\n\nRespond with a single valid JSON object only. No markdown, no commentary.",
          user: attempt === 0 ? args.user : `${args.user}\n\nYour previous reply was not valid JSON matching the required shape. Reply with valid JSON only.`,
          temperature: cfg.temperature,
          maxTokens: cfg.maxTokens,
          timeoutMs: cfg.timeoutMs,
        });
        const parsed = args.schema.safeParse(extractJson(raw));
        if (parsed.success) return { data: parsed.data, model };
        lastError = new AiError("malformed", "The AI response did not match the expected format.");
      } catch (err) {
        lastError = err instanceof AiError ? err : new AiError("provider", String(err));
        if (lastError.code === "missing_key") throw lastError;
        if (lastError.code === "rate_limit" || lastError.code === "provider") break; // next model
      }
    }
  }

  throw lastError ?? new AiError("provider", "AI request failed.");
}
