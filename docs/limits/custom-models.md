# Custom models: limits and constraints

[Feature specification](../projects/custom-models-feature-spec.md) · [Technical design](../projects/custom-models-tech-design.md) · [Implementation tracker](../maintainers/custom-models.md) · [Inventory rules](README.md)

The production mechanisms and optional benchmark extensions are implemented. [Verification](../verification/custom-models.md) separates local/native fixture evidence from actual Macrofold and hosted-runtime acceptance, which remains tracked in MX06. Existing [AI execution](ai-execution.md), [cognition](cognition.md), world/privacy and financial integrity remain with their owners. Stable MX IDs are retained.

## MX-L01 — Caller and output support

**Implemented · Restrictiveness: Medium.** Initial server settings select fast and complex NPC response generation independently. Shared generation target preparation is reusable by other explicitly wired producers. Native decision scoring, embeddings and full harnesses retain their own protocols. All gameplay modes require the same complete local schema; native JSON-schema, JSON-object and explicitly prompted-JSON output are supported strategies. Streaming uses existing supported transport/publication boundaries.

**Reason / boundary:** Execution labels and matching model names do not identify semantic callers. Unsupported purposes/modes fail explicitly; omitted purposes retain their existing configuration. A text-only runtime can use explicitly selected prompted JSON, accepting a higher invalid-output risk without relaxing action validation.

**Removed restriction:** Verified artifact manifests and remote strict-schema enforcement are not universal gameplay eligibility requirements. Operator-trusted external endpoints are usable with honest unknown provenance and the required local validation. Add further caller protocols through their existing owner when needed, not an experiment API.

## MX-L02 — Trusted configuration shape

**Implemented · Restrictiveness: Safe.** `OPENLEGEND_MODEL_TARGETS_JSON` uses current schema version `1`, required workspace UUID and one or both supported NPC-purpose keys. Each target has a required deployment UUID, optional revision UUID, optional declared output strategy and an optional positive safe-integer output reduction. Unknown properties fail startup; no prompts, endpoint credentials or arbitrary schemas belong here.

**Reason / boundary:** A small ordinary configuration has no need for free-form provider registries or unbounded nesting. The pure configuration owner supplies the same meaning to the game and optional tools. Current-format validation follows normal config bounds; no legacy readers are introduced.

**Removed restriction:** Experiment IDs, comparison scopes and deployment activation IDs are absent from runtime configuration. Study metadata is tool-owned and never required for normal play.

## MX-L03 — Service continuity and revision selection

**Implemented · Restrictiveness: Safe.** OpenLegend config follows existing controlled restart. A stable deployment ID follows Macrofold's current revision at each Run admission; an optional pin requests exactly one revision. Immutable capabilities are cached; necessary metadata preparation is bounded/coalesced and does not poll every NPC turn. Macrofold enforces current permission/readiness/capacity.

**Reason / boundary:** Each admitted Run retains its selected revision, while long-lived production service can recover or update normally. Temporary remote failure marks that generator unavailable and permits recovery on later new work. A pin never silently falls back. Game read/use rights do not imply hosting management. A local rejection based only on cached unpinned capabilities can perform one coalesced refresh within the original deadline. Unsupported/failed refresh results have a 30-second per-target cooldown to avoid a management read for every NPC; the tradeoff is that an external fix may take that long to be discovered by subsequent work. No timer polls the target, and compatible warm requests add no read. A new actual revision observed on a successful receipt invalidates later metadata without rejecting that answer.

**Removed restriction:** One boot/certificate per hosting session, forced operator reapproval after restart and a fresh game profile/cohort for equivalent recovery are not requirements. Valid earlier replies are not rejected solely for changed process/hardware/credential diagnostics or a later revision becoming current. Actual wrong-target output, original deadlines and stale-world authority remain protected.

## MX-L04 — Context and output envelopes

**Implemented · Restrictiveness: Medium.** Effective input/output bounds intersect the actual caller envelope with the runtime's capability. Optional configured output reductions cannot enlarge the current role allowance. No new universal context minimum, global prompt truncation ceiling or mandatory provider token-count call is added.

**Reason / boundary:** Preserve required actor identity/evidence/reference closure and the single local response schema. A small model may return context-capability failure; existing context selection alone owns optional evidence. Native enforcement is preferred when supported; weaker output modes use schema-derived guidance and the same decoder. Unsupported format/schema features fail without silent downgrade or a repair call.

## MX-L05 — Deadlines, replay and streaming

**Implemented · Restrictiveness: Safe.** The original caller deadline and current Macrofold direct-inference **240-second** ceiling bound each request. Existing same-Run observation and cleanup retain their owners. No automatic paid inference replay, hidden repair or deployment-triggered escalation is added; ordinary explicitly configured decision escalation remains unchanged.

**Reason / boundary:** Host recovery and new request admission are separate from retrying a possibly charged request. Capacity/timeout produces a bounded outcome; a server restart does not extend the deadline. Streaming can use the existing supported path; SSE grants no new public/private disclosure rights. There is no experiment-only blanket completed-output restriction on the provider type.

## MX-L06 — Request cost versus shared service cost

**Implemented · Restrictiveness: Safe.** Existing actor/task admission and no-call/zero-budget controls remain. A known zero separate inference fee can settle the exact request while infrastructure cost is excluded. Hosting startup/idle/busy/storage cost is owned and displayed by Macrofold over deployment/time windows, with unknown bills explicit. Game per-call/monthly budgets do not claim to cap independently funded hosting.

**Reason / boundary:** Count each obligation once. Missing usage or hosting invoice finality is not proof of free compute and does not independently invalidate an answer. Uncertain dispatch keeps the existing financial/execution protections. Provider shutdown/billing uncertainty remains a real operational limit.

**Removed restriction:** Finite experimental activations, a whole-host commitment held by every game consumer and final invoice reconciliation before production use are not runtime requirements. Optional paid studies retain their own aggregate budget and honest cost-attribution evidence; an unallocatable shared bill limits cost conclusions rather than banning gameplay.

## MX-L07 — Optional experiment bounds and retention

**Implemented · Restrictiveness: Safe, tooling only.** A selected live comparison has a finite work plan, ordinary explicit request/time/output/cost bounds and stop conditions. The optional first-screen template remains twenty cases × two arms × one replicate, at most forty calls; it is unrun, not mandatory and insufficient for universal adoption claims. There is no design-wide corpus/model-count ceiling.

**Reason / boundary:** Reuse the benchmark's journal, original attempts, bounded transport and private artifact ownership. No unbounded model-search loop, duplicated ledger or per-turn study-history scan is added. Preserve unattempted cases on interruption; larger selected reports can process their chosen cohort incrementally. Production requests perform none of this optional preparation when study collection is off.

**Implemented preparation bound:** The benchmark reuses its 20 MB private evidence envelope for model-plan files and resolved arm/request metadata. It checks safe request-count arithmetic and rejects provably oversized repeated arm metadata or the minimum required request keys/digests/reservations before constructing the repetitions. This limits retained local preparation; it does not establish a JavaScript heap bound, impose a fixed model or corpus count, authorize spending, or truncate selected work.

## MX-L08 — Evidence scope

**Implemented · Restrictiveness: Medium.** Production acceptance covers usable NPC output, actual authority boundaries, service recovery, cancellation, costs and measured performance. Model quality and player suitability use evidence appropriate to the selected role and existing release owners. No model winner, universal refusal-rate threshold or automatic default selection follows from this design.

**Removed restriction:** A fixed benchmark cohort, two reviewers, study completion or a qualification-certificate match is not a universal production release/runtime gate. Independent blinded reviewers and held-out families remain useful for consequential comparative claims. Missing evidence limits the claim it supports; it must not be converted into an unrelated engine restriction. Existing content/privacy/publication requirements remain effective.
