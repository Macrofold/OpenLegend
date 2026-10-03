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

**Implemented finite foundation. The original no-question sample met the complete-request targets; the question-enabled control exceeds the initial-size diagnostic target. Broader complexity/variance remains unqualified.** [Design](../projects/world-agent-context-tech-design.md) and [WW17–WW23](../maintainers/world-agent-writes.md#context-and-invention-loop-design) own context work. Existing runtime/session/recipe guards remain controlling. These entries are defaults and qualification targets, not gameplay laws. No extra limits-audit task is needed before the proposed path exists; WW18/WW23 own measurement and revision.

### CTX01 — Context size and measured efficiency

**Qualification targets · Restrictiveness: Safe for the simple reference journey; unqualified for complex work.** Target at most 12,000 compact-JSON-equivalent bytes for the complete initial simple-recipe request, including tools/instructions, and 25,000 bytes for each subsequent request in that journey. Target at most three model generations to saved review plus explanation when no correction/clarification is needed. These are diagnostic acceptance targets, not truncation or turn limits. The old capture's initial/final sizes were 21,514/71,948 bytes; it failed to save and is not a successful matched baseline. Measure provider tokens/quality and complete matched journeys separately. The final explicit-invention sample measured 11,973 / 14,442 bytes, two model generations and one valid save; the same-model/medium matched earlier recipe stage measured 13,710 / 15,270 / 17,665 bytes plus a separate discovery Run. The earlier question-enabled control missed the initial target at 13,873 / 15,585 / 17,947 bytes. The final compact question-enabled control measures 11,967 / 14,600 bytes, two generations and one successful save, including the 1,514-byte native question descriptor. Schema-derived field/range guidance and removed duplication preserve required mechanics and strict validation. [Final question evidence](../verification/invention-questions.md#final-acceptance--september-29) records the successful matched run and intervening repair failure. This supports the tested path, not a size guarantee for every invention; [evidence](../verification/world-agent-context.md#final-local-qualification) retains scope and limitations.

**Reason / tradeoff:** A readable goal, selected mechanics/materials and typed submission should fit below the broad catalogue/history. Preserve units, consequences and uncertainty if a target is missed. Complex policy/investigation may exceed these targets under current resource admission; record why. No invention-count estimate or player-visible token budget is introduced.

### CTX02 — Preparation and disclosure work

**Current · Restrictiveness: Safe for measured finite fixtures; broader qualification remains open.** Packets bound observed material and accumulated reference records to 64; candidate extraction bounds nodes to 64 and examined dependency operations to 256. Existing search/page limits still apply. Each admitted turn, including a planned recipe stage, permits 32 new tool calls in total. Exact committed write replay and authenticated operation-result lookup remain available after this quota. Generated prompt text has a 64,000-byte ceiling. Required oversize packets fail before dispatch; oversized candidate analysis is retained as incomplete and cannot produce a review. There is no general resumable analysis executor in this version.

**Reason / tradeoff:** Tiny output does not bound scans, graph construction or hydration. These provisional bounds cover a selected family and direct dependencies with explicit overflow. Current whole-graph paths retain their larger construction ceilings; this design does not make them incremental automatically. WW18 measures and prefers direct reads; WW15/PF retain broader index work. No global cap on world definitions, relevant knowledge or eventual investigation completeness is proposed.

### CTX03 — Retention, deduplication and cache scope

**Current · Restrictiveness: Safe.** Use request-scoped live-fact reuse and versioned immutable schema/description fragments. No new cross-session live-state cache or time-to-live initially. Match grants/audience, generation, dependency and projection versions. Derived packet versions remain while an active turn/unresolved operation needs them; at most one new packet per tool response under the existing admitted tool-work ceiling. The server enforces the aggregate tool ceiling across reads and writes; native quota/replay evidence is recorded in [context verification](../verification/world-agent-context.md). Never discard unresolved operations, exact approvals, selected candidate or required constraints to hit a byte target. Existing record/session caps apply to invalid drafts and receipts; capacity refusal preserves records. Session payloads are bounded at 128 KiB; tool arguments at 28,000 bytes and 64 JSON-container levels before recursive parsing (native status predicates still have their tighter domain limit); normalized candidates retain the existing 24,000-byte bound. One submission accepts at most 16 source-quoted annotations, with at most 64 retained requirements. These storage/transport guards reject oversize work without deleting prior records.

**Reason / tradeoff:** Observed duplication is largely within requests and schema reads. Global caching or lossy administrative memory adds privacy/invalidation risk before demonstrated need. Audit history stays with its current owner; no unlimited retention promise or automatic deletion policy. Harness compaction and provider-cache billing are not assumed.

### CTX04 — Tool profiles and templates

**Current qualified application profiles · Restrictiveness: Medium per run, not a global capability limit.** The recipe profile uses four named find/inspect/submit/capability-request operations; its complete guide is preloaded. Capability requests keep another supported kind reachable without broadening the active grant. Open-ended discovery has four tools; other kinds have five, or seven when entity/activity reads are required. Broader profiles remain reachable within grants through qualified session transitions. No-file runs expose no filesystem tools; legitimate file tasks retain appropriate affordances. YAML is readable generated context, not executable mutation syntax.

**Reason / tradeoff:** Smaller catalogues reduce irrelevant choices but require retained continuity when changing profiles. No dynamic grant expansion is assumed. A tested codec may omit irrelevant representation branches, never required effects or checks. Selected profiles are not a universal investigation ceiling. The intermediate five-tool profile is superseded by four: omit the redundant guide tool while retaining typed profile changes.

### CTX05 — Reasoning effort and paid work

**Implemented with actual provider-wire medium capture · Restrictiveness: Medium.** World Agent uses medium effort with strict forwarding and no silent fallback. Keep configured model/BYOK and existing session/monthly/Run admission, timeouts and output ceilings. This replaces authoring's former xhigh selection, not generic full cognition. New remote profiles/sessions preserve funding identity and reconcile prior exposure.

**Reason / tradeoff:** The owner requested medium. Lower effort may affect latency/cost and difficult-task quality; measure separately from context changes. Do not invent a lower output cap without evidence, increase spending automatically or treat continuation as a new allowance. Existing uncertainty and no-paid-retry rules remain binding.

### CTX06 — Initial graph, validation and pipeline scope

**Implemented finite scope · Restrictiveness: Medium; unsupported guarantees remain blocked.** Reuse existing relationship reader/index limits and aggregate CTX02 work accounting for candidate extraction/analysis; a nested graph call does not receive a fresh slice allowance. Required overflow retains pending coverage and a continuation or explicit unsupported blocker. Complete finite-family admission is distinct from broader interaction coverage, which remains unevaluated unless a named analyzer establishes it. Only resolved exact edges enter the index; missing required endpoints remain findings.

Retained requirements, check plans, findings and readiness inherit existing authoring record/session/byte bounds and CTX03 retention rules; native quota/overflow evidence is recorded separately from live qualification. Large evidence stays referenced through bounded authorized readers, not copied into every draft/prompt. Do not add unbounded graph generations, hydration fan-out or a second history. A bounded native slice may refuse unsupported long analysis; it cannot keep a transaction/paid harness open or silently pass truncated checks.

**Reason / tradeoff:** The owner requested a real initial foundation for every critical invention stage, including dependencies. This adds native records and shared projections while keeping simple model inputs small. A candidate graph is derived, never independent write authority. Separate readiness and truthful existing/no-new-asset presentation can serve current families without compulsory paid art. Full interaction solvers, graphical editing and general job scheduling remain with their existing INV/PF owners. WW18/WW19/WW22/WW23 own supported-path delivery, measurement and explicit refusal/continuation; revisit these restrictions when a real supported family requires wider analysis.

## Structured invention question proposal

**Implemented safeguards; bounded native, browser and live acceptance complete.** [Feature spec](../projects/invention-questions-feature-spec.md), [technical design](../projects/invention-questions-tech-design.md) and [WW24–WW30](../maintainers/world-agent-writes.md#structured-invention-questions) own design/delivery. [Native and live evidence](../verification/invention-questions.md) qualifies bounded recipe and policy journeys, not general model quality or large-world capacity. These application safeguards do not restrict what an authored world can express. Existing authorization, context, record/session and spending limits remain controlling; these entries do not create fresh allowances.

### QST01 — Question and answer envelopes

**Current defaults · Restrictiveness: Medium.** One active question bundle per conversation; 1–3 questions per bundle, with 2–5 choices when choices are offered. A custom-only question may have zero options if the qualified adapter permits it. Prefer one question. Bound the normalized bundle to 16 KiB and accepted answer to 8 KiB UTF-8 including their envelope; validate the full source question payload under a 64 KiB raw parsing ceiling before retaining only the normalized original fields/digest. Existing 128 KiB operational-record bounds still apply; refusal preserves earlier records. Custom text replaces selections for that question in v1. No optional/unanswered entries, nested conditional forms, attachments or executable/rich widgets.

**Reason / tradeoff:** A small group avoids an overwhelming interview and bounds parsing/rendering/persistence. Accepting arbitrary native objects or silently dropping choices would change meaning. Reject unsupported/oversize bundles explicitly and stop their Run; never truncate a required choice. Native malformed/oversize and real recipe/policy event checks qualify these initial defaults; they are not token-efficiency measurements. Expand only when a supported real journey needs more; broader questionnaires are outside this feature.

### QST02 — Event work and retained growth

**Current defaults · Restrictiveness: Medium.** Read at most 100 Run events per page and four pages per reconciliation pass, with a 256 KiB response-body ceiling checked before JSON hydration. Persist progress and continue later under existing scheduling; a page cutoff is not proof of no question. Refuse an oversized response or unrecoverable cursor gap explicitly rather than skip events or resubmit paid work. Use the provider's chronological Run cursor; never scan every session or world to discover a question.

Retain at most one accepted bundle for each originating Run/turn. Duplicate events reuse it; changed payload under the same identity conflicts. After capture, fence and stop that Run rather than accumulate further bundles. Follow-up questions belong to deliberately continued turns under the existing 256-turn session ceiling. Each answer correction consumes a retained human turn under the same ceiling, including save-only corrections, and supersedes older unadmitted continuation. Thus retained bundles/answers/corrections have bounded growth without a separate arbitrary total interview cap. No automatic paid question loop or automatic deletion of old history. Existing session-wide discovery/retention remains under INV-21.7; this feature does not establish an unlimited archival guarantee.

**Reason / tradeoff:** A bounded visible card alone would not bound event downloads, object allocation, polling or stored history. These values may refuse large unrelated provider events. Actual event envelopes, pagination beyond four pages and interrupted reads have been qualified; each pass persists its cursor and later resumes without a new generation. No new global cache, cross-session hydration or general event bus. WW26/WW30 own measurement and explicit overflow/recovery behavior; unchanged broader retention gaps stay with WW11/INV-21.7.

### QST03 — Human waiting and continuation

**Current lifecycle · Restrictiveness: Medium.** No live paid Run is retained for human waiting after capture-and-stop completes. Existing cancellation/deadline/reconciliation bounds govern stopping, and uncertain exposure remains reserved. Do not add a human-answer countdown or auto-answer; current session authorization lifetime governs whether an old question remains actionable. No application executor slot or lock is held merely for an open question once its Run terminates. Shared Worker capacity is not shut down by this conversation.

Saving an answer is allowed while allowance or previous-work reconciliation blocks continuation. Only an explicit operation made when admission is ready may continue; a blocked send retains the answer but does not queue later paid work. Reconnect, restart, status reads and funding changes never resume it automatically. Fresh execution uses the original funding session and current scoped provider context.

**Reason / tradeoff:** Current Macrofold waiting keeps execution/deadline/Worker occupancy and is not a qualified suspension contract. End-and-readmit may add startup/context cost, but avoids indefinite human waits and stale native question state. Native same-run answer/suspension is deferred until actual identity, cost and restart behavior are qualified; it is not an initial release requirement. The existing no-paid-retry and uncertain-accounting rules are unchanged.

### QST04 — Initial audience and native support

**Current rollout boundary · Restrictiveness: Medium.** First release uses the current authorized owner World Agent conversation and a specifically qualified OpenCode adapter. Other profiles/harnesses retain existing ordinary-text behavior and permissions; enable structured questions only when the complete capture/UI/answer/continuation path is ready. No new permission to author, broaden tool grants, approve Apply, raise allowance or consume inventory follows from answering. A selected option grants only the design intent it actually describes.

**Reason / tradeoff:** Harness question schemas/defaults and answer APIs differ, and native availability alone does not establish safe application handling. Keep provider-specific normalization with the adapter while shared scoped records/UI support more harnesses later. This is not a new restriction on world mechanics or a substitute for player/multiplayer authorization design. Preserve separate complex-invention, NPC-clarification and module/conjuring roadmap work.

## RF01 — World-owned recipe families

**Implemented native slice; integration qualification pending · Restrictiveness: Very safe.** [PW02](../maintainers/next-playable-week.md#pw02--world-owned-invention-families-and-one-admission-path) replaces the common contract's fixed family switches with installed trusted family descriptors. The four existing generated families use the authored descriptor path; Engineer 3 supplies the woven-container family through that same interface. This is a supported-capability boundary, not five prewritten recipes and not permission for generated code or arbitrary physics. No separate global family-count ceiling is added; selected-family schemas and installed metadata must avoid preparing every family for each request. Complete discovery at larger catalogue sizes remains subject to INV/EWF qualification.

The strict RecipeCandidateV2 envelope carries a family ID/version, role inputs and family parameters; installed records carry trusted compiled native output plus exact family support. Existing engine callers move together with current-format validation, without an older-envelope reader. Editable field metadata and read-only derived facts share the family owner across model and browser. The native-material-input restriction, existing authoring budgets and finite operation semantics remain. Their world-specific eligibility, roles and wording move to the authored owner. Unknown family/version or unsupported parameters are refused explicitly. General invented-input composition remains INV-3.6/3.7; the unlike-policy demonstration only proves recipe-family selection. Existing total request, record and spending limits remain. Output material properties are derived by the compiler from the non-food/non-fuel input union rather than selected independently by a candidate. The complete item-handling policy is pinned conservatively; changing even an unused policy field refuses restoration of a recipe that depended on its prior bytes.

**Reason / tradeoff:** Remove a repeated engine edit requirement for each family while retaining positive proof that an admitted object has real semantics. This deliberately does not pretend arbitrary material/effect composition is solved. Implementation base: inherited planning commit `8005f7c7`. Native four-family admission, repeated receipt, craft/use and exact current-state restore probes pass; the container, whole request-cost measurements and integrated client acceptance remain tracked under PW02. [Design](../projects/next-playable-week-tech-design.md#pw02--family-definitions-not-engine-recipe-switches).

## WS01 — World Agent stream delivery

**Implemented; bounded native/browser evidence, deployed acceptance blocked · Restrictiveness: Safe.** [PW05](../maintainers/next-playable-week.md#pw05--streamed-world-agent-replies) adds incremental owner-session delivery with these application-side guards:

- Bound an upstream SSE event frame before hydration at 256 KiB; process network batches in 64 KiB decode slices. Paged replay keeps a 256 KiB response plus 1 KiB envelope allowance and shrinks the same-cursor page from 100 down to 1 on explicit size overflow, retaining four successful pages per pass; retain the existing question/event replay windows and question payload limits. Oversize or unrecoverable event gaps stop that delivery path explicitly, without silently skipping questions or submitting a replacement Run.
- Keep one sanitized progress record per turn, with explicit discovery/reply Run transitions and private per-run cursor/redaction carry in the existing integration owner; at most 64 KiB of UTF-8 preview text and the existing 128 KiB whole-record ceiling including metadata. At the text boundary stop extending the preview, record omitted bytes/incompleteness and continue required question/final-result reconciliation. Do not call the preview complete or erase earlier retained text. The independently validated final result keeps the existing 48,000-character guard and oversized-result notice. Whole-record UTF-8/escaped-JSON overflow first removes optional preview, then applies that notice to oversized completed prose while preserving the terminal code/job ID, required question and separately committed effects. Required data that still cannot fit is rejected explicitly; it is never silently truncated.
- Coalesce durable progress snapshots at most once per 250 ms per active turn, with immediate terminal/question handling. This bounds write amplification, not provider generation or question delivery. Reuse existing active-turn admission; measure writes and payload bytes because repeatedly rewriting growing snapshots still costs work.
- Keep at most one replaceable unsent progress snapshot per subscriber, within the existing 128 KiB record envelope. If the transport cannot accept it within the existing write timeout, detach and require an authorized fresh snapshot. No token-by-token backlog or second event archive. Use existing server connection admission and cleanup rather than an unbounded subscription map.
- Preserve the current 256-turn authoring-session ceiling, bounded authoring records and authorization lifetime. A progress record is associated with one retained turn; expiry does not delete history. Current client history can represent all admitted turns; expanding server retention requires changing client history windowing together.

**Reason / tradeoff:** First-token delivery should not create unbounded parsing, database writes or browser queues. Preview truncation is disclosed and cannot substitute for the complete result or required question history. These initial values are operational safeguards, not measured optima. The local delivery target and browser workload are in the [verification plan](../projects/next-playable-week-tech-design.md#verification-plan); measure provider startup separately. Upstream replay/rotation is its native Run contract, not a new inference permission. Existing WW07/WW11 and INV-21 release/retention gaps remain open.
