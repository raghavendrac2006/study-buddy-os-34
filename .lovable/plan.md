# Phase 5 Day 5 — Daily study prioritization

## Goal
Make the existing AI Mentor reliably answer daily decision questions from the learner’s real schedule, without changing the UI or writing any data.

## Implementation
- Audit the current intent detection, context snapshot, and Mentor response rules for “today,” “next,” and time-limited questions.
- Keep plan and revision retrieval compact, but clearly separate:
  - work scheduled for today,
  - upcoming work,
  - overdue or due revisions,
  - completed work and recent actual study.
- Add a deterministic priority signal to the Mentor context: scheduled/due work first, then mastery weakness and recent study evidence as tie-breakers.
- When no scheduled plan or revision exists, explicitly mark that absence and permit only a conservative recommendation using exact existing subject, topic, or material names.
- Tighten prompt rules so the model respects time limits, does not describe completed work as pending, and never invents plans or revisions.

## Validation
- Confirm all Mentor data access remains authenticated, user-scoped, and read-only.
- Test these real Mentor questions:
  - “What should I study today?”
  - “What should I do next?”
  - “I have 1 hour today, what should I prioritize?”
- Verify responses distinguish scheduled, due, completed, and fallback recommendations.
- Verify typecheck/build and current Mentor route behavior.

## Scope limits
No UI changes, persistence, database changes, new features, provider/key changes, or unrelated edits. Stop within the 5-credit limit.
