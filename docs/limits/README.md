# Tracking limits and constraints

A limit is a chosen restriction on capacity, access to supported features, selection, retention, scheduling or behavior. It need not be a number: “only search the current bag” and “one login provider” qualify. Track deliberate **no limit**, removed limits and supported-feature boundaries as well as active caps. This register is an inventory, not a mandate to expand everything.

## One owner per purpose

- The feature specification owns behavior and accepted requirements.
- `docs/limits/<feature>.md` owns that feature’s limit inventory, reason and restrictiveness. A shared mechanism belongs to its owning feature once; consumers link to it. Do not create a second inventory in each project that touches it.
- The focused maintainer tracker owns implementation tasks, dependencies and acceptance. [Limits to revisit](../maintainers/limits-audit.md) ranks proposed limit changes and links those tasks; it does not duplicate their checklists.
- [The index](../openlegend-limits-decisions.md) locates inventories and the original audit IDs. [Import coverage](import-coverage.md) records source disposition, not another set of limits.
- [Policies to revisit](../maintainers/revisitable-policies.md) retains decision authority and triggers for accepted policies. Keep a cross-reference when a concrete limit-change candidate is added to the backlog; do not copy that policy register here.

## Entry structure

Each entry needs a stable ID, the value or behavioral restriction and its scope/units, status and evidence baseline, restrictiveness, a short reason/tradeoff, and an implementation/specification reference. Describe what happens at the boundary: refusal, omission, paging, waiting, eviction or pause. A compact paragraph is enough; group related constants only when their scope and reason are the same. Record “reason unknown” when no basis is established; an engineering explanation is not evidence that an exact number is optimal.

Use **Current**, **Reported** (implementation handoff, not independently rechecked), **Historical — needs recheck**, **Proposed**, **Removed** or **No limit**, qualified when necessary. Separate status from restrictiveness. Original `LA001`–`LA238` mean audit numbers 1–238; never renumber them. Feature prefixes identify newer entries, and imported report IDs remain stable even if their feature file changes. Moving an ID requires updating every inbound link. Do not reuse a retired ID.

A removed/no-limit entry still says what was removed, why, and which independent controls remain. Removing a stored-count cap does not permit unlimited per-tick work, model input or spending. Keep the removal record in the inventory after deleting the completed task from the backlog.

## Restrictiveness

Preserve the original audit vocabulary; these are qualitative judgments, not benchmark certifications:

| Rating      | Meaning                                                                                      |
| ----------- | -------------------------------------------------------------------------------------------- |
| Very safe   | Strongly restrictive; may exclude substantial valid content, evidence or supported activity. |
| Safe        | Conservative allowance, bounded batch or short window.                                       |
| Medium      | Moderate envelope or a supported behavioral choice whose generosity is context-dependent.    |
| Liberal     | Substantial finite work/information allowance; qualification still required.                 |
| Too liberal | Unbounded growth or a known growth problem remains.                                          |

“Very safe” does not mean good gameplay or secure. Use `— (removed)` or `— (superseded)` when no current bound remains to rate; retain the original removal status. A no-limit policy with real unchecked growth can be **Too liberal**. For grouped settings, rate the consequential restriction and explain the tradeoff.

## What belongs here

Include engineering envelopes, tunable safety values, product defaults, authored-world balance choices, unsupported operations, implementation shortcuts and restrictions that hide information. Ordinary page/cache/buffer sizes belong in the inventory even when no change is recommended. Distinguish caps on total retained content from per-request work and from display-only previews. Keep authored base-world values separate from universal engine bounds.

Do not turn pure correctness obligations into tuning candidates: authorization/private-human boundaries, consistent identity, exact references, atomicity, no double spending or executable generated code. A discretionary implementation around an obligation still belongs: single-writer ownership, chosen payload limits or a broad invalidation strategy can change while correctness remains. Mixed findings retain their discretionary part and identify the invariant. [Import exclusions](import-coverage.md#excluded-original-entries) preserve references for old audit entries that are solely invariants.

## Update with the feature

When creating or changing feature documentation, follow [Feature documentation](../feature-documentation.md). When a change introduces, changes, removes or explicitly declines a limit, update its entry in the same change, including rationale, overflow behavior, source and baseline. Read only the inventories owned or consumed by the changed behavior; this is not a requirement to reload every feature.

Check schema, configuration, persistence, API, model request and UI consumers for inconsistent limits. A bounded page should expose remaining data; truncation or selection must be explicit. Where omissions matter, distinguish available, considered, selected and omitted records and explain the reason. Align complete provider requests with enforced transport/response limits and preserve essential context when optional selection fails; this does not authorize paid retries.

Reconcile the focused tracker and any backlog item. Remove completed backlog items, not inventory entries. Record consequential policy changes in the documentation changelog; update revisitable-policy triggers where relevant. Do not silently change an accepted specification to fit a runtime defect. New numbers are proposals until adopted; don't imply unrun performance or quality evidence.

## This migration’s scope

The original 238-entry audit is retained by ID across feature files and two explicit integrity-only exclusions. The repository already held a copy in the old limits-audit tracker; the two copies were compared, not imported twice. LA176 incorporates the newer streaming-save state. Selected superseded findings (LA014, LA080, LA127, LA164, LA167, LA172, LA176) were reconciled against the merged code. Remaining old findings are clearly historical, not a fresh whole-code audit.

Both supplied implementation reports are assessed item by item in import coverage. Their current numbers are reported baseline choices, not measured optimal values. No runtime limits, permissions or paid-work policies change in this documentation migration. The previously deferred full audit/qualification remains separate from this explicitly requested inventory work.

## Missing bounds and ranking

Explicitly inventory **no bound at this stage**, not only declared constants. For each growing query, loop, queue or retained collection identify what can grow, which supported actions grow it, how often the operation runs, and where selection happens. Distinguish:

- Corpus/candidate rows examined before scoring from returned rows.
- Rows/payload bytes hydrated or accumulated from one SQL page size.
- Total retained bytes from per-record length and age windows.
- Concurrent executions from pending queue depth, age and memory.
- Per-step declared work from wall-time preemption or whole-world throughput.

State actual protections and overflow behavior, including actor/audience scoping, indexes, pruning, pagination, deadlines and required-work failure. “Unbounded” means no explicit independent bound on the named dimension, not literally infinite work or absence of all safeguards. Record whether no cap is deliberate (complete evidence), merely unimplemented (queue admission) or unverified; do not invent an unlimited policy from an incomplete search. Prefer bounded work over lossy truncation. A complete query can be acceptable while a repeatedly formatted whole result is not.

Use the backlog’s [ranking method](../maintainers/limits-audit.md#ranking-method): near-term reachable use and automatic growth, frequency, severity/scope and recovery. Keep restrictiveness separate from priority. A **Too liberal** collection may still be low priority when only extreme authoring grows it. Recheck callers before assuming a supported API is exercised by normal play. Preserve a no-limit entry even when no change is proposed.

## Growth-path review coverage

2026-09-26 source inspection at `af1eb02`, with existing measurements cited separately. This is the reviewed surface, not a proof that every loop/query in the repository is bounded. No new benchmark or runtime change is claimed.

| Path inspected                                                       | Work that can grow                                                                        | Existing protection / disposition                                                                                                                                                                                                                                  |
| -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Exact vector recall and coverage counts                              | All eligible scoped vectors/index entries considered; only results/counts are small       | [MH01/MH02](memory.md#mh01): 300 optional results, actor/generation scope, read lane and statement timeout; no corpus scan cap. C17.                                                                                                                               |
| Lexical history search                                               | Text scored across eligible history before LIMIT                                          | [MH03](memory.md#mh03): scoped/limited output; SQLite query CPU is synchronous. C17.                                                                                                                                                                               |
| Required recall, active conversation, explicit commitment inspection | Entire matched evidence sets hydrated despite bounded SQL chunks                          | [MH04](memory.md#mh04): permission/eligibility and later input checks, not total preparation limits. C17.                                                                                                                                                          |
| Active-history residency and native encounters                       | Six-hour hot evidence volume and real observer/subject pairs                              | [MH05](memory.md#mh05), [NW10](native-work.md#nw10): expiry caches and spatial filtering help; no per-phase time slice. Charged required-work overrun can pause. C18.                                                                                              |
| Reflection/consolidation preparation and publication                 | Continued backlog exists; work is sliced before hydration                                 | [SV09/SV10](memory.md#sv09): 128 sources / 512 KiB; one actor and at most 512 related records per table at publication. Preserve resumable batches; no claim that every SQL execution plan visits only 128 rows.                                                   |
| Scoped memory and inventory pages                                    | Underlying store can grow without growing each hydrated page                              | Memory readPage selects at most 101 per family then 101 combined; returns 100. [QU02/QU03](objects.md#qu02): contents query 201, inventory scans 200 / returns 40 with continuation. These are useful pre-materialization bounds.                                  |
| Subject-note and other cognition candidates                          | All actor notes, known recipes or observed contents formatted before final selection      | [KG01](memory.md#kg01), [CG01](cognition.md#cg01): per-note/model sizes and scoped membership do not bound all preparation. C07/C17.                                                                                                                               |
| Full-dependency owner edit/correction                                | Entire scoped histories rehydrated, potentially under mutation ownership                  | [MH07](memory.md#mh07): exceptional explicit owner path; bounded maintenance is separate. C21.                                                                                                                                                                     |
| Memory history, vectors and indexing                                 | Durable collections grow; indexing work is separately batched                             | [MH06](memory.md#mh06): pending indexing defaults to 32 selected records (repository maximum 1,000); no overall storage/retention quota. C20.                                                                                                                      |
| World mutation / database lane queues                                | Pending promise count, bytes and wait time                                                | [NW11](native-work.md#nw11): serialized execution, selected producer caps and executing-statement deadlines; no queue admission at these owners. C19.                                                                                                              |
| Native reservations                                                  | Terminal receipt bytes accumulate if a consumer creates them                              | [ST09](state-effects.md#st09): retained-work admission is finite, but no ordinary creator caller was found. R01 deferred.                                                                                                                                          |
| Save catalog and checkpoints                                         | Directory visits unbounded by page; capture is bounded; restore accumulates decoded state | [SV17](persistence.md#sv17), [SV04–SV08](persistence.md#sv04), [SB06](persistence.md#sb06): 64-row streamed pages, 256 MiB package, 1 MiB record, 2M records and scan/worker guards. Package bytes do not directly cap decoded heap. C02; extreme catalog R02 low. |

Prior evidence: [exact retrieval and cold-source residency](../verification.md#data-foundation-runtime), [private-note candidate preparation](../verification.md#editable-knowledge-and-observer-names) and [dense-work gaps](../maintainers/performance.md#pf09--population-work-follows-relevance). Figures are fixture observations on their recorded versions/hardware, not current natural-session forecasts.

Still outside this focused inspection: exhaustive native family/controller loops, all legacy migration branches, every projection/editor query, browser rendering and every external provider path. Their existing inventories and PF/EPR/CR qualification remain; do not infer they are bounded because they are absent here. Inspect their input/iteration boundary when a consuming feature or measurement makes them relevant.
