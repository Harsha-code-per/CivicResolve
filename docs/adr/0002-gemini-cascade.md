# ADR 0002: A resilient Gemini cascade

**Status:** accepted

**Context.** The free tier rate-limits, models occasionally time out, and model names change over time.

**Decision.** A cascade of `TriageModel`s: cache → lite models → a stronger flash model → rule engine.
Each call has a 12 s timeout; a failing model cools down for a minute. Model names come from
`GEMINI_MODELS`. Output is constrained by a JSON schema generated from the zod schema that validates it.

**Consequences.** Citizens always get a triage. Changing models is configuration, not code. Tests inject
fake models, so no test touches the network.
