# Phase 2 Material Analysis — Audit and Minimal Fix

## What I verified (read-only)

- **Material row** `4bf7a485-…`: `status = uploaded`, `error_message = NULL`, `char_count = 11726`, and `extracted_text` holds real, clean DOCX text (UNIT-I, PART-A questions, HTML5 sections). **DOCX extraction is valid** — mammoth worked correctly.
- **`material_analyses` = 0 rows, `topics` = 0 rows.** Nothing has been persisted.
- **Analyze action exists** in `src/routes/_authenticated/materials.$id.tsx`: it sets `status='analyzing'`, calls `analyzeMaterial`, then writes `status='analyzed'`, and on failure resets to `uploaded` with `error_message`.
- **Server function** `analyzeMaterial` in `src/lib/ai.functions.ts` is correctly a `createServerFn` with `requireSupabaseAuth`; `src/start.ts` registers `attachSupabaseAuth`, so the bearer token is attached.
- **Secret handling is correct**: `OPENROUTER_API_KEY` is read only inside `src/lib/ai/openrouter.server.ts`, server-side, never in client code. The key is present and valid — a live call to OpenRouter succeeded.

## Diagnosis

Two separate findings:

1. **Why it shows "Not analysed" right now**: the row is `uploaded` with a `NULL` error message. The failure path always writes an error message, so the analysis was never actually run to completion — the button click either never happened or the page was left before the request resolved. This alone is not a bug.

2. **The real defect that will bite on the next click**: the configured model id `openrouter/free` routes to arbitrary free models, many of which are *reasoning* models. In a live test with the project's own key, `openrouter/free` selected `nvidia/nemotron-nano-9b-v2:free`, spent the entire `max_tokens` budget inside the `reasoning` field, and returned `content: null` with `finish_reason: "length"`. Our client treats null content as `AiError("malformed", "The AI returned an empty response.")`, retries once, then falls back to `openrouter/auto` which has the same exposure. Result: the analysis fails with an unhelpful "malformed" error and the material bounces back to `uploaded`.

   Re-running the identical request with `reasoning: { enabled: false }` returned `{"ok": true}` immediately from `cohere/north-mini-code:free`. So the failing point is precisely: **no reasoning control on the OpenRouter request payload**.

## Minimal fix

Confined to `src/lib/ai/openrouter.server.ts` (+ one config field in `src/lib/ai/models.ts`):

1. Send `reasoning: { enabled: false }` (configurable per task) in the request body so free reasoning models do not consume the token budget before emitting content.
2. Treat `content: null` together with `finish_reason: "length"` as a distinct, retryable condition and surface a clear message ("the model ran out of output space") instead of the generic malformed error.
3. On the retry attempt, fall back to an explicit non-reasoning free model id rather than re-rolling `openrouter/free`, so a bad route cannot repeat indefinitely. Model ids stay centralised in `models.ts`.

No schema change, no data change, no change to the upload/extraction path, and no change to Phase 1.

## Optional follow-up (not part of the minimal fix)

Surface the AI error text in the material detail UI (it is already stored in `error_message` but is not prominently displayed), so future failures are visible without a database query.
