# Living actor model implementation tracker

## Spatial body integration

Use [SW02/SW04/SW07/SW12](spatial-world.md) for physical anchors, clearance, safe support/flight loss and flight families. Species, controller, mind, speech and body capability remain separate. A bird sprite is not permission to fly; the current native bird profile/routine supplies that behavior. Do not duplicate physical position in an anatomy or animation record.

This is the sole implementation tracker for the living-actor migration. Canonical behavior is defined by [Actor means any living being](../architecture.md#actor-means-any-living-being), the [agent and social-simulation design](../../archive/03-design-proposals/agents-and-social-simulation.md), and [F74](../../archive/01-requirements/product-baseline.md#living-actor-model--f74).

## Tasks

ACT01–ACT05 are implemented; acceptance gates remain open with automated coverage deferred to [TODO](TODO.md#three-program-deferred-validation). God revival now follows the accepted [actor model](../architecture.md#actor-means-any-living-being), including harvested bodies. Schema 3 migrates physical state without resetting identity; legacy animal fields are import-only.

- [ ] **ACT01 — Define the capability model and migration.** Specify shared lifecycle/body components plus independent species, body plan, controller, cognition, memory, inner-world and speech capabilities. Version current state and reject incompatible development saves; preserve stable entity IDs and animal state through same-version recovery without granting every animal human cognition.
- [ ] **ACT02 — Preserve animal identity through death.** Replace or adapt the destructive animal-to-remains conversion so a dead animal remains a revivable actor while still supporting finite, idempotent harvesting. Define and test what revival means before and after partial or complete harvesting.
- [ ] **ACT03 — Generalize lifecycle actions.** Make Revive admit any dead actor with the required lifecycle/body capabilities, including animals, through the same authoritative domain transition and god-mode action path. Reject living, missing, incompatible and stale targets without mutation.
- [ ] **ACT04 — Generalize living-body effects.** Introduce bounded condition/effect contracts for wetness, fire, injury, healing and health changes that target capabilities rather than human-only types. Express species/body susceptibility explicitly, compose simultaneous effects deterministically and keep generated prose from becoming effect authority.
- [ ] **ACT05 — Support optional animal minds and communication.** Allow a selected animal to receive an intelligent controller, memory, scoped inner world and speech without changing its species or exposing private state. Native lightweight animal behavior remains the default and ordinary animals require no model calls. Creation seeds initial operational goals once under [AG02](agent-agency.md#ag02--one-actor-owned-operational-intention-store); later choices are actor-owned. Planning grants neither hands nor speech nor human embodiment.
- [ ] **ACT06 — Verify compatibility and projections.** Add current-format rejection/restart, revival, harvesting, status-effect, cognition/privacy, action-catalogue, protocol/client projection and rollback coverage. Confirm existing wilderness animals continue wandering, fleeing, taking damage, dying and yielding finite resources through same-version restore; update architecture, extension guidance, implementation status and verification with actual evidence before marking the track complete.

## Advanced emotional-state foundation

- [ ] **ACT07 — Persistent, sparse appraisal contract.** Implement the [accepted appraisal continuity](../../archive/03-design-proposals/agents-and-social-simulation.md#accepted-appraisal-continuity) through one semantic owner and CR's accepted mind/projection boundary. Support event, memory, enduring condition and personality causes; optional expiry/decay; sustained/regenerated emotion; current evidence/privacy and bounded stacking. Prove persistent grief and a disposition-linked internally arising emotion without per-tick paid work, fabricated events or duplicate writable state. Include source correction/forgetting treatment, save/restart and permitted cognition/UI use; exact world taxonomy is not an engine constant. Coordinates EWF02/EPR04/SL00. No substantial dedicated implementation was found in the [branch audit](remaining-foundational-work.md#branch-coverage-snapshot).

- [ ] **ACT08 — Character-owned social continuity.** Publish/query the already accepted directional free-text relationship descriptions from one accepted actor-owned revision, separately from objective kinship, membership and obligations. Coordinate CR knowledge/mind publication and data queries; no score thresholds or reciprocal-label inference. Exit: one character revises their view without rewriting the other's view, kinship or promise; save/restart and private projections preserve that distinction. Reuse useful invention graph readers without turning that derived graph into a second social-state authority.

## Priority 5 implementation slices

**Design status:** [feature specification](../projects/appraisal-social-continuity-feature-spec.md) and [technical design](../projects/appraisal-social-continuity-tech-design.md) are proposed; this documentation task implements or qualifies none of the following. These are child items of ACT07/ACT08, not a second cognition/social backlog. Current save/load in-place migration policy and default verification guidance supersede older rejection-only/test-running prose above. Obtain design approval and reconcile DF02/current CR branches before overlapping implementation.

### ACT07.1 — Appraisal, source and publication baseline

- [ ] Audit `social.ts`, current `mind_appraisals` records, all `activeAppraisals` callers, `appraiseEvent` hooks, knowledge edits, accepted workspace publication, source correction/forgetting and save codecs.
- [ ] Record current damage-derived fear/discomfort semantics, fixed decay, strongest-16 truncation and missing stable instance IDs versus record-list keys. Capture actual retained state and history gaps without inventing lost records.
- [ ] Map every meaning to its single owner: native appraisal, self-understanding, subject knowledge, objective kinship and obligations. Reconcile obsolete relationship ownership comments without deleting unrecognized character prose.

**Dependencies:** current source/data review; DF02 where overlapping. **Exit:** a complete caller/source/referrer map, exact base and native compatibility trace, with stable-ID conversion and current policy discrepancies explicitly identified.

### ACT07.2 — Stable appraisal records and optional policy types

- [ ] Extend the existing appraisal owner and canonical `mind_appraisals` record codec with stable ID/revision, exact policy/scale pin, typed cause/target, lifecycle and source version. No duplicate emotion table or universal taxonomy.
- [ ] Define finite reviewed policy interfaces for qualitative/optional scaled value, stacking and persistent/expiry/decay/sustained/recurring modes. New persistent appraisals have no implicit decay; existing native decay remains explicitly pinned.
- [ ] Convert current records in place with deterministic collision-safe identity and preserved magnitude/time/source. Ensure positional reordering cannot change instance identity or erase retained state.

**Dependencies:** ACT07.1; current data and EWF definition owners. **Exit:** stable current records and strict unsupported/stale/source validation, without imposing emotions/cognition on all living actors.

### ACT07.3 — Multi-cause native lifecycle and deduplication

- [ ] Admit perceived-event, remembered, enduring-condition, explicitly configured disposition and authorized authored causes through current perspective/source checks. Raw world event IDs and trait prose alone are insufficient.
- [ ] Implement stable cause/episode stacking, duplicate-safe reinforcement/reframe/resolve, and meaningful native expiry/decay/condition transitions. Preserve saved RNG and read-only projection behavior.
- [ ] Deliver persistent grief and one opt-in internal/disposition example through the same owner, with no fabricated external event, compulsory timer or paid tick. Replace silent strongest-N loss with explicit bounded work/retention behavior.

**Dependencies:** ACT07.2; EPR04/current intake and P4 contracts as applicable. **Exit:** repeated evidence/recall does not multiply feelings; persistent state survives quiet time, and native survival does not wait for optional appraisal interpretation.

### ACT07.4 — Accepted reflection, context and ordinary surfaces

- [ ] Add optional typed appraisal changes coherently across the existing reflection prompt/schema/decoder/adapter/publication path; default empty and preserve current receipt/cancellation/accounting ownership.
- [ ] Validate coupled reflection output against current source, appraisal/note/mind revisions, subject bindings, obligations and authority before publication. Invalid/stale output leaves the prior accepted state coherent; prose itself grants no effect.
- [ ] Project relevant permitted appraisals through existing context and actor panels once, without duplicating About me/social notes, requiring provider calls to inspect state or coercing human controls.

**Dependencies:** ACT07.2–ACT07.3; CR/current publication, MP01 scope. **Exit:** actual supported native/accepted-publication callers agree on current state, with provider unavailability reported honestly and no second harness or writable mirror.

### ACT07.5 — Source correction, forgetting and human privacy

- [ ] Integrate cause/source-version dependencies with existing correction/erasure and derived-context owners, including summaries, internal/private sources, accepted prose and pending results.
- [ ] Apply conservative invalidation where selective provenance is unproved; prevent forgotten causes from surviving in appraisals, note/social views, counts, embeddings, debug payloads or restored saves.
- [ ] Preserve current NPC inspection versus human-private owner/participant access and actual outward-expression audiences. Independently valid later causes cannot resurrect erased episode identity/text.

**Dependencies:** ACT07.2–ACT07.4; CR erasure/knowledge, MP01/P4. **Exit:** forgetting/correction/revocation during reads or publication leaves no stale private causal representation or automatic re-creation path.

### ACT07.6 — Save, source retirement and definition lifecycle

- [ ] Register stable appraisal state, permitted compact cause lineage, policy pins, recurrence/opportunity state, note revisions and accepted source versions with SL00's consistent capture/restore.
- [ ] Keep current privacy/accounting outside rewind, rebuild indexes without reappraising history or replaying generation, and distinguish cold history coverage from erasure.
- [ ] Supply EWF07/INV-5 active/history/save dependencies and supported transitions; reject unsupported policy retirement rather than resolving every feeling or dropping references silently.

**Dependencies:** each introducing state slice; SL00/DF02. **Exit:** save/restart/restore and source/definition changes preserve coherent identity, current state, time/RNG and private continuity without reset or duplicate work.

### ACT07.7 — Integrated appraisal qualification

- [ ] Exercise all paired-spec success/failure cases with disposable native/manual scenarios and zero provider budget; compare old native damage behavior and new persistent/internal-source behavior.
- [ ] Verify stable record migration, quiet-time/read-only behavior, many retained instances, stale/duplicate/mixed reflection output and source privacy in actual context/network payloads.
- [ ] Measure owner-scoped changes, wake count, query/record cardinality, context size and save/cold-query cost. Record actual evidence in Verification, current behavior in Architecture and remaining CR/EPR/SL/hosted/behavioral-quality gaps here; keep CI and default no-suite instructions.

**Dependencies:** ACT07.1–ACT07.6 and relevant ACT08 integrations. **Exit:** native continuity/privacy and permitted use are evidenced; fixtures do not certify live characterization quality or broader actor acceptance.

### ACT08.1 — Subject-note social view and one edit owner

- [ ] Expose directional relationship understanding directly from the current actor-owned subject knowledge document and exact accepted revision; reuse full replacement, code-point limits and empty tombstones.
- [ ] Add a read-only social view linked to the existing subject-note editor. No independent relationship text field, mandatory heading, score, label classifier or reciprocal mutation.
- [ ] Preserve mixed practical/subjective notes and stale-edit feedback; any abbreviated/search representation remains explicitly derived and source-versioned.

**Dependencies:** current CR knowledge owner; does not wait for full ACT07 or a live provider. **Exit:** Ada can revise her view of Bo without editing Bo's view or creating two authoritative copies.

### ACT08.2 — Subject identity and objective-fact separation

- [ ] Use current observer/encounter and document-only subject bindings, including absent/retired subjects. A remembered note must not grant current recognition, visibility or action targeting.
- [ ] Keep kinship, group membership, native obligations and operational plans under their existing typed owners. Text edits cannot create/cancel/fulfill them or authorize inventory access.
- [ ] Audit older relationship facets/files for duplicate authority; use explicit source-to-subject mappings when migration is needed, never name/sentiment parsing or silent deletion.

**Dependencies:** ACT08.1; current knowledge/recognition/commitment owners. **Exit:** conflicting directional interpretations coexist with unchanged objective facts and promises; ambiguous/private subject references reject safely.

### ACT08.3 — Scoped context, queries and derived graph readers

- [ ] Integrate actor-specific social knowledge with current attention/context, permitted inspection and paginated subject queries. Invalidate only relevant actor/document-derived views.
- [ ] Reuse useful graph readers as source-bound derived access, not a writable social graph; scope counts, snippets, exports and cached results as strictly as source documents.
- [ ] Join correction/forgetting and restore invalidation with ACT07.5–ACT07.6 and current CR/P2 behavior. Do not duplicate notes into About me or require paid extraction on reads.

**Dependencies:** ACT08.1–ACT08.2; MP01, CR; ACT07 privacy integration where shared. **Exit:** ordinary actors/creators/humans receive only their permitted current source-derived social information across edits and delayed reads.

### ACT08.4 — Social continuity acceptance

- [ ] Exercise two independent directional notes, one revision, unchanged kinship/obligation, retired/unknown subject, concurrent edits, empty tombstone, correction/forgetting and save/restart.
- [ ] Inspect human-private network/context/derived-query payloads and current native database behavior; use the real supported accepted-text adapter separately where needed.
- [ ] Record evidence and remaining qualification with ACT07.7/CR/SL, preserving existing actor gates and deferred automated/live-quality work.

**Dependencies:** ACT08.1–ACT08.3. **Exit:** one accepted actor-owned revision drives every relationship surface, with no scores, reciprocity inference or competing text store.
