export function friendlyAiError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (/not configured/i.test(msg)) return "AI isn't configured yet. Add your OpenRouter key in the backend.";
  if (/rate limit/i.test(msg)) return "AI rate limit reached. Wait a minute and try again.";
  if (/too long/i.test(msg)) return "The AI took too long. Try again, or split the material into smaller files.";
  if (/format|read/i.test(msg)) return "The AI reply couldn't be read. Nothing was changed — try again.";
  return msg || "Something went wrong with the AI request.";
}
