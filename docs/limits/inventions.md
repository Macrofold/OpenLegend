# Invention and generated content: limits and constraints

[Feature contract](../../archive/07-technical-architecture/declarations-and-evolution.md) · [Implementation work](../maintainers/inventions-and-world-evolution.md) · [Tracking rules](README.md) · [Change backlog](../maintainers/limits-audit.md)

Values describe the stated baseline, not approved future targets. **Reported** means the merged implementation report (2026-09-26, `c133000` / `a90d411`); **Historical** means the original audit and needs code recheck. Ratings describe restrictiveness, not correctness or measured capacity. New rationale is an engineering assessment unless an authored decision is explicitly identified.

Implementation starting points: [context.ts](../../apps/server/src/context.ts).

## LA092

**Historical — needs recheck · Restrictiveness: Safe.**

The current finite invention flow permits eight linked authoring follow-ups. Applying an exact saved ready proposal is exempt because it makes no provider call and grants no additional allowance.

**Reason / tradeoff:** Keep an explicit recursion stop so generated authoring work cannot repeatedly invoke itself without end.

[Implementation starting point](../../apps/server/src/cognition-maintenance.ts).

Original recommendation: **Review**.

## LA098

**Historical — needs recheck · Restrictiveness: Safe.**

Existing inventions are indexed for meaning-based search in batches of 8.

**Reason / tradeoff:** Keep manageable indexing batches; this does not need to limit how many inventions can eventually be searched.

[Implementation starting point](../../packages/ai/src/embedding.ts).

Original recommendation: **Keep**.

## LA099

**Historical — needs recheck · Restrictiveness: Safe.**

The invention-reuse search returns at most 5 matches and excludes semantic-similarity scores below 0.25.

**Reason / tradeoff:** Keep the small suggestion set provisionally, but report whether relevant reusable inventions are being missed.

[Implementation starting point](../../packages/ai/src/embedding.ts).

Original recommendation: **Keep**.

## LA100

**Historical — needs recheck · Restrictiveness: Very safe.**

An invention-model request includes at most 24 known recipes chosen by matching words in the request.

**Reason / tradeoff:** Search all recipes known to the character and select relevant examples within the model's actual input allowance.

[Implementation starting point](../../apps/server/src/context.ts).

Original recommendation: **Replace**.

## LA101

**Historical — needs recheck · Restrictiveness: Very safe.**

An invention-model request includes at most 12 memories and 12 recent events.

**Reason / tradeoff:** Include the memories and events needed to understand the invention request rather than assuming twelve of each is sufficient.

[Implementation starting point](../../apps/server/src/context.ts).

Original recommendation: **Replace**.

## LA103

**Historical — needs recheck · Restrictiveness: Very safe.**

In invention-model input, names are shortened to 40 characters, recipe names to 64, recipe descriptions to 120 and memory/event text to 220.

**Reason / tradeoff:** Preserve complete meaning when it fits, and shorten only optional text when the whole request actually needs reduction.

[Implementation starting point](../../apps/server/src/context.ts).

Original recommendation: **Replace**.

## LA104

**Historical — needs recheck · Restrictiveness: Very safe.**

Oversized invention-model input is reduced by dropping recipes and memories/events to fixed counts, then nearby beings/objects, and finally material names.

**Reason / tradeoff:** Replace fixed deletion order with situation-specific selection, and explicitly fail if required facts cannot fit without changing their meaning.

[Implementation starting point](../../apps/server/src/context.ts).

Original recommendation: **Replace**.

## LA105

**Historical — needs recheck · Restrictiveness: Very safe.**

A character's invention-model input includes only 3 recent invention-job records from the current saved-world timeline, including their proposals and feedback.

**Reason / tradeoff:** Choose relevant previous invention attempts and feedback rather than always limiting the history to three records.

[Implementation starting point](../../apps/server/src/context.ts).

Original recommendation: **Replace**.

## LA106

**Historical — needs recheck · Restrictiveness: Safe.**

A generated invention purpose is limited to 1,000 characters, and the proposed invention's JSON document is limited to 12,000 characters.

**Reason / tradeoff:** Align authoring and model-response limits so the complete supported invention can pass through every validation stage.

[Implementation starting point](../../apps/server/src/context.ts).

Original recommendation: **Expand**.

## LA107

**Historical — needs recheck · Restrictiveness: Safe.**

The invention-generation call allows at most 1,800 output tokens.

**Reason / tradeoff:** Expand output room when supported invention descriptions need it, while reserving the additional cost before the call.

[Implementation starting point](../../apps/server/src/context.ts).

Original recommendation: **Expand**.

## LA108

**Removed at original audit; not reverified · Restrictiveness: — (removed).**

**Former limit, now removed:** The world refuses to add a new, distinct recipe once its stored recipe collection contains 64 entries.

**Reason / tradeoff:** Removed the sixty-four-recipe admission ceiling. Recipe validity, identity, material provenance, permissions and duplicate-request handling remain.

[Implementation starting point](../../apps/server/src/context.ts).

Original recommendation: **Completed removals**.

## LA109

**Historical — needs recheck · Restrictiveness: Very safe.**

A new recipe must use 2–6 ingredient roles (the required kinds of material), 1–8 units per role and no more than 20 material units total.

**Reason / tradeoff:** Allow richer recipes when the supported crafting mechanics can execute them correctly, keeping material accounting and balance rules explicit.

[Implementation starting point](../../apps/server/src/context.ts).

Original recommendation: **Expand**.

## LA110

**Removed at original audit; not reverified · Restrictiveness: — (removed).**

**Former limit, now removed:** A generated recipe's output item may declare at most 6 material properties.

**Reason / tradeoff:** Removed the six-output-property ceiling from both native invention validation and the model response format. Supported property names and material provenance remain required.

[Implementation starting point](../../apps/server/src/context.ts).

Original recommendation: **Completed removals**.

## LA111

**Historical — needs recheck · Restrictiveness: Safe.**

Generated recipe and output-item names are limited to 80 characters, and their descriptions to 700.

**Reason / tradeoff:** Expand meaningful descriptions where necessary and keep the same limits in model instructions, response validation and stored records.

[Implementation starting point](../../apps/server/src/context.ts).

Original recommendation: **Expand**.

## LA112

**Historical — needs recheck · Restrictiveness: Safe.**

A generated recipe must take between 48 and 480 simulation seconds to craft.

**Reason / tradeoff:** Review the crafting-time range as a balance rule rather than removing it as though it only protects performance.

[Implementation starting point](../../apps/server/src/context.ts).

Original recommendation: **Review**.

## LA113

**Historical — needs recheck · Restrictiveness: Safe.**

A swing-powered launcher, such as a sling, is limited to damage 10–20, range 3–7 and accuracy 0.6–0.9.

**Reason / tradeoff:** Review these weapon values as authored game balance while retaining validation of the mechanics the engine can execute.

[Implementation starting point](../../apps/server/src/context.ts).

Original recommendation: **Review**.

## LA114

**Historical — needs recheck · Restrictiveness: Safe.**

A flex-powered launcher, such as a bow, is limited to damage 16–28, range 4–10 and accuracy 0.6–0.9.

**Reason / tradeoff:** Review these weapon values as authored game balance rather than a general limit on extensible worlds.

[Implementation starting point](../../apps/server/src/context.ts).

Original recommendation: **Review**.

## LA115

**Historical — needs recheck · Restrictiveness: Safe.**

Invented arrows can add 0–5 damage, and invented gathering tools can yield 2–4 resource units.

**Reason / tradeoff:** Change these values only as an intentional ammunition or gathering balance decision.

[Implementation starting point](../../apps/server/src/context.ts).

Original recommendation: **Review**.

## LA116

**Historical — needs recheck · Restrictiveness: Safe.**

Stored feedback about an invention attempt is shortened to 700 characters.

**Reason / tradeoff:** Preserve enough feedback to explain why the invention failed, and make fuller failure details available separately if the display stays short.

[Implementation starting point](../../apps/server/src/context.ts).

Original recommendation: **Expand**.

## LA117

**Historical — needs recheck · Restrictiveness: Safe.**

An invention-permission policy change allows a reason of 500 characters and an editor identifier of 100 characters.

**Reason / tradeoff:** Keep policy-change records bounded while ensuring the reason and responsible editor remain understandable.

[Implementation starting point](../../apps/server/src/context.ts).

Original recommendation: **Keep**.

## LA118

**Historical — needs recheck · Restrictiveness: Medium.**

Generated inventions can use only reviewed launcher, ammunition and gathering-tool mechanics; generated data cannot introduce executable code or arbitrary new effects.

**Reason / tradeoff:** Keep the boundary between proposed data and executable mechanics; add new invention families through validated engine support.

[Implementation starting point](../../apps/server/src/context.ts).

Original recommendation: **Keep**.

## Reviewed authoring and remaining usage

**Current — September 2026 integration.** The finite recipe loop retains four model rounds, eight tool calls, 48,000 context bytes and 20,000 bytes per tool result. Owner sessions retain 64 drafts, 256 revisions per draft, 512 review plans, 2,048 edit receipts, 256 turns and a seven-day authorization lifetime; old records are not deleted on expiry. Four active/admitting turns and 32 short queued session operations bound local concurrency. These existing foundation guards bound work and retained operational growth; richer long-lived projects require INV-21 qualification before expansion. Paging does not grant additional work or money.

The default owner session cap is $5 and may be lowered; the finite workshop root defaults to $5 and is configurable from $0–$10, under the existing per-character monthly ceiling. Attributable Run reservations use remaining session exposure. Shared Worker capacity is separately owner-managed; the earlier all-inclusive compute allocation is removed by the owner’s decision. Players see abstract remaining usage, with no dollars, provider terms or invention-count estimates. See [runtime ownership](../world-agent-runtime.md#1-product-decisions), [budget accounting](../invention-budgets.md), and WW09/WW11 in [write delivery](../maintainers/world-agent-writes.md).

The relationship reader bounds 50,000 nodes / 200,000 edges, 1,024 examined entries and 50 public results per page; traces retain 100 visited nodes, depth 12 and 16 pages with explicit unfinished frontiers. These are synchronous safety ceilings, not measured population capacity. Current PostgreSQL memory inspection pages ten records through canonical cold storage, removing the obsolete 1,000-record hot-world cutoff. INV-15 and WW15 own expansion; current limits remain until evidence justifies it.

## World Agent context proposal

**Proposed, not implemented or performance-qualified.** [Design](../projects/world-agent-context-tech-design.md) and [WW17–WW23](../maintainers/world-agent-writes.md#context-and-invention-loop-design) own context work. Existing runtime/session/recipe guards remain controlling until deliberately changed. These entries are defaults and qualification targets, not gameplay laws. No extra limits-audit task is needed before the proposed path exists; WW18/WW23 own measurement and revision.

### CTX01 — Context size and measured efficiency

**Proposed · Restrictiveness: Safe for the simple reference journey; unqualified for complex work.** Target at most 12,000 compact-JSON-equivalent bytes for the complete initial simple-recipe request, including tools/instructions, and 25,000 bytes for each subsequent request in that journey. Target at most three model generations to saved review plus explanation when no correction/clarification is needed. These are diagnostic acceptance targets, not truncation or turn limits. The old capture's initial/final sizes were 21,514/71,948 bytes; it failed to save and is not a successful matched baseline. Measure provider tokens/quality and complete matched journeys separately.

**Reason / tradeoff:** A readable goal, selected mechanics/materials and typed submission should fit below the broad catalogue/history. Preserve units, consequences and uncertainty if a target is missed. Complex policy/investigation may exceed these targets under current resource admission; record why. No invention-count estimate or player-visible token budget is introduced.

### CTX02 — Preparation and disclosure work

**Proposed · Restrictiveness: Safe, requires representative measurement.** Start a packet slice with at most 64 projected fact/description records and 256 examined dependency references, in addition to existing bounded search/page work. Count aggregate slice work, not once per nested call; use stricter existing reader bounds and check bytes incrementally. Required facts beyond the slice return a retained continuation/incomplete result, never an absence claim. Drop optional examples before required mechanics.

**Reason / tradeoff:** Tiny output does not bound scans, graph construction or hydration. These provisional bounds cover a selected family and direct dependencies with explicit overflow. Current whole-graph paths retain their larger construction ceilings; this design does not make them incremental automatically. WW18 measures and prefers direct reads; WW15/PF retain broader index work. No global cap on world definitions, relevant knowledge or eventual investigation completeness is proposed.

### CTX03 — Retention, deduplication and cache scope

**Proposed · Restrictiveness: Safe.** Use request-scoped live-fact reuse and versioned immutable schema/description fragments. No new cross-session live-state cache or time-to-live initially. Match grants/audience, generation, dependency and projection versions. Derived packet versions remain while an active turn/unresolved operation needs them; at most one new packet per tool response under the existing admitted tool-work ceiling. Before enabling the new path, WW20 must verify that this aggregate ceiling is actually enforced by the executor, not merely a documented target. Never discard unresolved operations, exact approvals, selected candidate or required constraints to hit a byte target. Existing record/session caps apply to invalid drafts and receipts; capacity refusal preserves records.

**Reason / tradeoff:** Observed duplication is largely within requests and schema reads. Global caching or lossy administrative memory adds privacy/invalidation risk before demonstrated need. Audit history stays with its current owner; no unlimited retention promise or automatic deletion policy. Harness compaction and provider-cache billing are not assumed.

### CTX04 — Tool profiles and templates

**Proposed · Restrictiveness: Medium per run, not a global capability limit.** Initial recipe profile: four named find/inspect/guide/submit operations with relevant facts preloaded. Broader profiles remain reachable within grants through qualified session transitions. No-file runs expose no filesystem tools; legitimate file tasks retain appropriate affordances. YAML is readable generated context, not executable mutation syntax.

**Reason / tradeoff:** Smaller catalogues reduce irrelevant choices but require retained continuity when changing profiles. No dynamic grant expansion is assumed. A tested codec may omit irrelevant representation branches, never required effects or checks. Four tools are not a universal investigation ceiling.

### CTX05 — Reasoning effort and paid work

**Owner-requested target, not yet implemented/live-qualified · Restrictiveness: Medium.** World Agent uses medium effort with strict forwarding and no silent fallback. Keep configured model/BYOK and existing session/monthly/Run admission, timeouts and output ceilings. This replaces authoring's current xhigh selection, not generic full cognition. New remote profiles/sessions preserve funding identity and reconcile prior exposure.

**Reason / tradeoff:** The owner requested medium. Lower effort may affect latency/cost and difficult-task quality; measure separately from context changes. Do not invent a lower output cap without evidence, increase spending automatically or treat continuation as a new allowance. Existing uncertainty and no-paid-retry rules remain binding.

### CTX06 — Initial graph, validation and pipeline scope

**Proposed · Restrictiveness: Medium; finite native families remain useful while unsupported guarantees are blocked.** Reuse existing relationship reader/index limits and aggregate CTX02 work accounting for candidate extraction/analysis; a nested graph call does not receive a fresh slice allowance. Required overflow retains pending coverage and a continuation or explicit unsupported blocker. Complete finite-family admission is distinct from broader interaction coverage, which remains unevaluated unless a named analyzer establishes it. Only resolved exact edges enter the index; missing required endpoints remain findings.

Retained requirements, check plans, findings and readiness inherit existing authoring record/session/byte bounds and CTX03 retention rules; verify aggregate enforcement before enabling the path. Large evidence stays referenced through bounded authorized readers, not copied into every draft/prompt. Do not add unbounded graph generations, hydration fan-out or a second history. A bounded native slice may refuse unsupported long analysis; it cannot keep a transaction/paid harness open or silently pass truncated checks.

**Reason / tradeoff:** The owner requested a real initial foundation for every critical invention stage, including dependencies. This adds native records and shared projections while keeping simple model inputs small. A candidate graph is derived, never independent write authority. Separate readiness and truthful existing/no-new-asset presentation can serve current families without compulsory paid art. Full interaction solvers, graphical editing and general job scheduling remain with their existing INV/PF owners. WW18/WW19/WW22/WW23 own supported-path delivery, measurement and explicit refusal/continuation; revisit these restrictions when a real supported family requires wider analysis.
