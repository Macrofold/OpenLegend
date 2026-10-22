# Model experiments: limits and constraints

[Feature specification](../projects/model-experiments-feature-spec.md) · [Technical design](../projects/model-experiments-tech-design.md) · [Implementation tracker](../maintainers/model-experiments.md) · [Inventory rules](README.md)

All entries below are **proposed by the October 22, 2026 design, not implemented**. The inspected baseline is `27c6fb8152ec58c34334e74ba91a9d5bec6a30ff`. Restrictiveness describes the engineering tradeoff, not a measured success rate. Existing [AI execution](ai-execution.md), [cognition](cognition.md), privacy, financial and native-action bounds remain owned by their current inventories; a model deployment does not enlarge them.

## MX-L01 — Supported caller purposes and output modes

**Proposed · Restrictiveness: Medium.** Gameplay overrides cover exactly two producer purposes: `npc_response_fast` and `npc_response_complex`, independently selected. Standalone `benchmark_generation` consumes the same target type under its own manifest. Gameplay requires verified manifest identity and qualified strict JSON-schema generation; offline tools may explicitly select raw text and cannot publish it or count it as structured-action success.

**Reason / tradeoff:** The execution label `fast` also covers unrelated action interpretation, player expression and consolidation. Explicit purposes prevent accidental rerouting and misleading experimental attribution. Native decisions, embeddings, full harness, reflection and public streaming remain with their qualified owners.

**Overflow / failure:** Reject unsupported purposes/modes. Preserve an omitted purpose's configured baseline; invalid present configuration never falls back.

**Extension trigger:** A separately designed producer mapping, capability requirement, financial owner and qualification can add a purpose. An endpoint advertising chat, tools or SSE is insufficient.

## MX-L02 — Profile identity and cardinality

**Proposed · Restrictiveness: Very safe.** Profile schema version is literal `1`; experiment ID is 1–64 ASCII letters, digits, dot, underscore or hyphen and starts with a letter/digit. `purposes` contains 1–2 of MX-L01's gameplay keys. All objects reject unknown properties. The required `workspace_id` is a Macrofold workspace UUID; each target is exactly the deployment/revision/activation UUID triple. The profile does not contain prompts, endpoints or credentials.

**Reason / tradeoff:** This small closed configuration needs no free-form registry, arbitrary role list or unbounded nesting. The display ID is not an identity/authorization substitute; the retained canonical profile SHA-256 identifies its exact contents.

**Overflow / failure:** Fail startup/dry preparation with the invalid field; do not truncate or silently drop configuration. JSON complexity remains bounded by the existing configuration/serialization owner.

**Extension trigger:** Add a versioned current schema when a supported product requirement changes this shape. Do not add historical readers or migration scaffolding before an actual compatibility requirement exists.

## MX-L03 — Immutable process profile and capability preflight

**Proposed · Restrictiveness: Safe.** One profile snapshot is active per process. Profile changes use controlled restart, not hot reload. Preflight obtains exact activation/revision/qualification metadata once per explicit preparation; normal requests use the retained immutable identity and Macrofold's dynamic admission checks. The game has read/use and owned-Run rights, no model-deployment write/activation rights.

**Reason / tradeoff:** This avoids a model-discovery call per NPC tick, mutable aliases during admitted work and unreviewed new allocation budgets. It does not cache revocation or ready state as permanent authority.

**Overflow / failure:** Invalid/stale/unready/expired bindings fail the affected preparation/admission. An accepted old request keeps its original identity and cannot publish into a replaced timeline. No provisioning, renewal, endpoint discovery or automatic warmup occurs.

**Extension trigger:** Hot changes require a designed versioned admission fence, retirement/reconciliation and UI before adding them; ordinary model comparison needs only a new cohort/restart.

## MX-L04 — Context and output capability intersection

**Proposed · Restrictiveness: Medium.** Effective input/output bounds are the intersection of the current caller's complete request/response limits and the exact qualified runtime's context, schema and output capability. An optional experiment output limit may only reduce the current role allowance. This project adds no universal minimum model context or new global prompt truncation limit.

**Reason / tradeoff:** Smaller supported models are useful experiments, but required accepted identity, permitted evidence, schema and reference closure cannot be discarded to make an input fit. The existing context/compiler owner determines genuinely optional information. A byte heuristic is not proof of actual token fit.

**Overflow / failure:** Reject and report the exact input/capability/structure failure before dispatch when known; preserve runtime rejection if discovered there. Never strip required fields, change schema mode or substitute a model. Raw-text mode stays a distinct offline cohort.

**Extension trigger:** Change caller semantic envelopes through the context project or qualify a new runtime/encoding; model marketing context size does not suffice.

## MX-L05 — Deadline, retries and completion

**Proposed · Restrictiveness: Safe.** One submitted inference per selected attempt; no automatic paid retry, fallback, hidden repair or deployment-triggered reconsideration. Effective deadline is the earliest of the original caller deadline, current Macrofold direct-inference **240-second** policy and activation usable lifetime after the canonical cleanup margin. A schema maximum of 300 seconds does not authorize 300-second service execution. Existing same-Run observation and separately bounded cleanup remain applicable.

**Reason / tradeoff:** Submission loss or model refusal does not justify another charge, and slow startup must not stall the game indefinitely. Completed output is the first gameplay contract; partial private transport data gains no publication rights.

**Overflow / failure:** Stop new work at its original deadline, reconcile the same accepted Run and retain dispatch/financial uncertainty. A pre-admission failure proves no new inference, not zero pre-existing allocation cost.

**Extension trigger:** Deliberate repeats belong in a finite new manifest. Public progressive speech requires existing NST qualification. Any provider deadline change must be reconciled at the shared contract and current source first.

## MX-L06 — Request reservations and allocation liability

**Proposed · Restrictiveness: Safe.** Preserve current positive finite per-call configuration, actor/task ceilings and no-call/zero-budget controls. A verified custom receipt may settle request charge to literal zero while `infrastructure_cost_included` is false. The separate activation's canonical `accepted_terms` must establish a finite authorized commitment/lifetime; a study holds it once together with other model charges and unresolved obligations against its one task ceiling.

**Reason / tradeoff:** Hosting costs startup, busy/idle time and potentially storage independently of request tokens. Concurrent requests cannot each claim a whole allocation bill, and free request accounting does not erase GPU cost. An already funded host is not permission to call externally in fixture/zero-budget mode.

**Overflow / failure:** Stop new admissions when the owning ceiling is unavailable/exhausted. The canonical `external_cap_guaranteed:false` warning remains explicit: a finite authorization is not a provider-enforced absolute dollar cap. A study with `cost_requirement:"hard_external_cap"` rejects this mode; `planning_bound` holds the accepted maximum and disclosed residual liability. Keep uncertain startup/termination/provider charges outstanding until reconciled; no fabricated zero token price or per-request GPU invoice.

**Extension trigger:** Additional pricing modes or shared-allocation attribution require the canonical Macrofold accounting policy and explicit non-overlap rules. OpenLegend does not create a second provider ledger.

## MX-L07 — Finite experiment growth and retention

**Proposed · Restrictiveness: Safe.** A live study has a frozen finite selected case × arm × replicate/episode-turn work list, explicit request/output-byte/time/cost allowances and stop conditions. The first-screen preparation template is two arms × twenty contrasting cases × one replicate, at most forty new inferences, beginning with one inspected pair; it is unrun and insufficient for adoption. There is no design-wide fixed corpus-size or model-count ceiling. Current transport/JSON limits bound each record; existing benchmark journal/permission/retention owners hold raw private artifacts outside Git.

**Reason / tradeoff:** Work and allocation wall time, including co-models, grow with the actual plan. Explicit study bounds support small probes and larger justified cohorts without arbitrary truncation or an unbounded “try models until one wins” loop. Full report generation may read its chosen cohort once; admission must not repeatedly rescan all history.

**Overflow / failure:** Reject incomplete/unfunded/unbounded plans before calls. Retain unattempted work and partial coverage when stopped; process journals/reports incrementally under current bounds instead of buffering every response.

**Extension trigger:** Measured corpus/report performance or retention needs can justify pagination/indexing/rollup under the existing owner; no extra store or perpetual scheduler is implied.

## MX-L08 — Evidence and promotion scope

**Proposed · Restrictiveness: Medium.** Two blinded reviewers independently classify consequential character/refusal comparisons and retain disagreements. Freeze exact counts, accepted alternatives, practical latency/cost ceilings and the intended improvement criterion before paid study execution. There is no universal refusal-rate threshold, model winner or production promotion in this design.

**Reason / tradeoff:** Character disagreement, uncertainty, schema failure, service/provider withholding and generic assistant refusal have different meanings. A valid schema and coherent prose cannot establish native success, human enjoyment or full-cost efficiency. Severe privacy/authority failures stay individual stop/review events.

**Overflow / failure:** Missing evidence keeps its corresponding qualification/adoption gate open. Preserve failed coverage, unknown provenance/cost and raw first attempts; do not change references or average away severe errors.

**Extension trigger:** Broader native episodes, external-player exposure, longitudinal enjoyment and concurrency scale use CE/CR/AG, PD, NST and PF/PS gates. Only evidence collected for those scopes can close them.
