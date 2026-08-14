/**
 * Centralised model configuration.
 * Change models here only — never hard-code a model name anywhere else.
 */
export type AiTask = "material_analysis" | "plan_generation" | "daily_adaptation" | "reflection";

type TaskConfig = {
  /** Primary model id sent to OpenRouter. */
  model: string;
  /** Tried in order when the primary model errors or is unavailable. */
  fallbacks: string[];
  /** Escalate to this model when the input is large / complex. */
  heavyModel?: string;
  /** Input size (characters) above which `heavyModel` is used. */
  heavyThresholdChars?: number;
  temperature: number;
  maxTokens: number;
  timeoutMs: number;
};

export const MODEL_CONFIG: Record<AiTask, TaskConfig> = {
  material_analysis: {
    model: "openrouter/free",
    fallbacks: ["openrouter/auto"],
    heavyThresholdChars: 60_000,
    temperature: 0.2,
    maxTokens: 8000,
    timeoutMs: 120_000,
  },
  plan_generation: {
    model: "openrouter/free",
    fallbacks: ["openrouter/auto"],
    temperature: 0.3,
    maxTokens: 8000,
    timeoutMs: 120_000,
  },
  daily_adaptation: {
    model: "openrouter/free",
    fallbacks: ["openrouter/auto"],
    temperature: 0.3,
    maxTokens: 2000,
    timeoutMs: 60_000,
  },
  reflection: {
    model: "openrouter/free",
    fallbacks: ["openrouter/auto"],
    temperature: 0.2,
    maxTokens: 1200,
    timeoutMs: 60_000,
  },
};

export function modelsFor(task: AiTask, inputChars = 0): string[] {
  const cfg = MODEL_CONFIG[task];
  const primary =
    cfg.heavyModel && cfg.heavyThresholdChars && inputChars > cfg.heavyThresholdChars
      ? cfg.heavyModel
      : cfg.model;
  return [primary, ...cfg.fallbacks.filter((m) => m !== primary)];
}
