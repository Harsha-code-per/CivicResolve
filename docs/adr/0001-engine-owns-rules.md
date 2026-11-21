# ADR 0001: The engine owns the rules, Gemini owns the understanding

**Status:** accepted

**Context.** Complaints are free text plus photos, which a language model reads far better than keyword
rules can. But SLAs, the status workflow and safety escalation must be predictable and auditable, and a
model can be wrong or unavailable.

**Decision.** Gemini proposes category, priority, department, summary and rationale. The pure domain
engine owns the SLA table, the state machine, urgency scoring and analytics. `reconcileTriage` keeps the
more urgent priority of the two, so the model can raise urgency but never lower it below the rule
engine's floor.

**Consequences.** Every triage is explainable and has a deterministic fallback. The engine is pure and
100% tested. A model upgrade cannot silently relax safety behaviour.
