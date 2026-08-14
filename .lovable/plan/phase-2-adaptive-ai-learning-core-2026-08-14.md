# Phase 2 — Adaptive AI Learning Core

Phase 1 stays intact. Everything below is additive, except the login change.

## 1. No more login screen

The app opens straight into the portal. On first load it silently signs into one fixed personal account in the background, so your data stays private and synced, and you never see a sign-in form.

- A tiny boot step creates/uses a single stored device account and waits for it before rendering.
- `/auth` is removed from navigation; the landing page redirects to the dashboard.
- The database privacy rules, all Phase 1 tables and screens keep working unchanged.

## 2. Learning materials + AI analysis

- New **Materials** screen: upload PDF, DOC/DOCX, TXT, CSV. Files go to a private cloud storage bucket.
- Text is extracted (in the browser for PDF/DOCX/TXT/CSV) and sent once to the AI for analysis.
- AI returns a structured outline: units → chapters → topics → subtopics, plus key concepts, prerequisites, learning objectives, difficulty and estimated learning minutes.
- The analysis is saved once and reused. The full document is never re-sent.
- **Review & edit** screen: rename/merge/delete/reorder topics, edit difficulty, time estimates and objectives before anything is scheduled.

## 3. Plan creation

After confirming the structure you enter: subject (new or existing Phase 1 subject), target date, minutes available per day, preferred study days, current knowledge level, priority.

AI then produces a realistic plan — not an equal split. It mixes learn / active recall / practice / assessment / revision activities, respects prerequisites, difficulty, buffer days and the deadline. If the target date is unrealistic, the preview says so plainly and prioritises the most important material.

**Plan preview** lets you accept, regenerate, or hand-edit before saving.

## 4. Today's Mission (extends the existing dashboard)

The Phase 1 dashboard gains sections for: today's activities with per-activity minutes, topics due for revision, weak areas, current mastery snapshot, upcoming work, and adaptive recommendations. Existing dashboard cards remain.

A "today I only have X minutes" control re-prioritises the day by importance rather than truncating it.

## 5. Performance feedback and mastery

After a study session or assessment you record score, confidence, perceived difficulty, completion level and an optional note about what was hard. The app also tracks planned vs actual time, completion rate, missed and postponed sessions and repeat weak spots.

Mastery per topic is a rolling value (not just the latest score) with states: Not Started, Learning, Developing, Strong, Mastered, Needs Revision. Mastery history is stored so progress over time is visible.

## 6. Adaptive scheduling

Deterministic engine (no AI needed for the routine case):

- Spaced revision intervals stretch on strong performance and shorten on weak performance; weak topics can trigger extra practice or prerequisite review.
- A missed day is not a blanket one-day shift — remaining work is recomputed from priority, mastery, deadline, remaining material and available time.
- Multiple active plans are balanced against each other by deadline, priority, mastery and difficulty.
- Manual moves, skips, edits, locks and priority overrides are respected and preserved on future recalculation.

AI is called only for document analysis, initial plan generation, interpreting written reflections and periodic recommendations.

## 7. Screens added

Materials, Material Analysis review, Plan creation wizard, Plan preview, Topic Mastery, Revision Schedule, Learning History, Subject Progress — all inside the existing app shell and navigation style.

## Technical notes

- **AI access**: server-side only, through TanStack Start server functions (this stack's backend layer — no edge function needed). `OPENROUTER_API_KEY` is read from the server environment inside the handler only; never bundled, logged or returned to the browser.
- **Model config**: one central `src/lib/ai/models.ts` mapping task → model, defaulting to `openrouter/free` for every task, with a size/complexity hook so heavy analysis can later use a stronger model. No model names anywhere else.
- **Robustness**: JSON-schema-validated responses (zod), bounded retry on malformed output, explicit handling for missing key / 429 / timeout / provider error. A failed AI call never deletes or corrupts an existing plan or analysis.
- **New tables** (reusing Phase 1 `subjects`, `learning_days`, `study_sessions`, `tasks`): `materials`, `material_analyses`, `topics` (hierarchical, linked to subject + material), `learning_objectives`, `learning_plans`, `plan_activities`, `assessments`, `performance_records`, `mastery_states` + `mastery_history`, `revision_schedule`, `plan_adjustments`. All with privacy rules and grants, plus a private `materials` storage bucket.
- **Generic signal intake**: a single `recordPerformance` entry point so future coding/DSA/aptitude/flashcard activities feed the same mastery engine.
- **Verification**: end-to-end run with a small sample PDF — upload → analysis → topic review → plan → Today's Mission → performance entry → mastery update → revision reschedule — plus a pass over every Phase 1 screen to confirm nothing regressed.

## Out of scope this phase

Coding IDE, LeetCode clone, full aptitude platform, conversational AI mentor.
