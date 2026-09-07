/**
 * Centralised model configuration.
 * Change models here only — never hard-code a model name anywhere else.
 */
export type AiTask =
  | "material_analysis"
  | "plan_generation"
  | "course_plan"
  | "daily_adaptation"
  | "reflection"
  | "recall"
  | "assessment"
  | "assistant"
  | "mentor";

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
  /**
   * Allow the model to emit chain-of-thought tokens.
   * Keep false for structured JSON tasks: free reasoning models routed by
   * `openrouter/free` otherwise spend the whole output budget on reasoning
   * and return `content: null` with finish_reason "length".
   */
  reasoning?: boolean;
};

/**
 * Free models known to answer directly (no reasoning preamble). Used as a last
 * resort when the free router keeps returning empty content.
 */
export const SAFE_FREE_FALLBACKS = [
  "meta-llama/llama-3.3-70b-instruct:free",
  "mistralai/mistral-small-3.2-24b-instruct:free",
];

export const MODEL_CONFIG: Record<AiTask, TaskConfig> = {
  material_analysis: {
    model: "openrouter/free",
    fallbacks: [...SAFE_FREE_FALLBACKS],
    heavyThresholdChars: 60_000,
    temperature: 0.2,
    maxTokens: 8000,
    timeoutMs: 120_000,
    reasoning: false,
  },
  plan_generation: {
    model: "openrouter/free",
    fallbacks: [...SAFE_FREE_FALLBACKS],
    temperature: 0.3,
    maxTokens: 8000,
    timeoutMs: 120_000,
    reasoning: false,
  },
  daily_adaptation: {
    model: "openrouter/free",
    fallbacks: [...SAFE_FREE_FALLBACKS],
    temperature: 0.3,
    maxTokens: 2000,
    timeoutMs: 60_000,
    reasoning: false,
  },
  reflection: {
    model: "openrouter/free",
    fallbacks: [...SAFE_FREE_FALLBACKS],
    temperature: 0.2,
    maxTokens: 1200,
    timeoutMs: 60_000,
    reasoning: false,
  },
  course_plan: {
    model: "openrouter/free",
    fallbacks: [...SAFE_FREE_FALLBACKS],
    temperature: 0.3,
    maxTokens: 8000,
    timeoutMs: 120_000,
    reasoning: false,
  },
  recall: {
    model: "openrouter/free",
    fallbacks: [...SAFE_FREE_FALLBACKS],
    temperature: 0.3,
    maxTokens: 2000,
    timeoutMs: 60_000,
    reasoning: false,
  },
  assessment: {
    model: "openrouter/free",
    fallbacks: [...SAFE_FREE_FALLBACKS],
    temperature: 0.3,
    maxTokens: 4000,
    timeoutMs: 90_000,
    reasoning: false,
  },
  mentor: {
    model: "openrouter/free",
    fallbacks: [...SAFE_FREE_FALLBACKS],
    temperature: 0.4,
    maxTokens: 2000,
    timeoutMs: 90_000,
    reasoning: false,
  },
  assistant: {
    model: "openrouter/free",
    fallbacks: [...SAFE_FREE_FALLBACKS],
    temperature: 0.4,
    maxTokens: 1600,
    timeoutMs: 60_000,
    reasoning: false,
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
