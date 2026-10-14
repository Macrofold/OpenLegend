# Foundation review — immediate work

These are the material near-term recommendations from the [October 14 review](../verification/foundation-review.md), originally against local `main` at `fa904e1da`. **All FR01–FR13 immediate fixes, the documentation audit and required local verification are complete under Mike's approval**, reconciled with Macrofold/OpenLegend local `main` at `b72e9d9aab8072eb1b5ae9d25f620a4421509148`. Comparison, remembered-appearance and full Resume acceptance pass, as do the existing clock/control and spatial browser journeys, 390 native tests across 43 files, TypeScript, production build and final static checks. The [implementation evidence](../verification/foundation-hardening.md) preserves earlier failures and verification limits; no GitHub CI result is claimed. Original finding descriptions below remain audit provenance; checked tasks are repaired. Conditional future improvements and broader feature/release gates remain open under their subsystem owners.

“Now” means repair a demonstrated correctness/privacy boundary or remove a concrete foundation constraint before adding more consumers. It does not mean every item blocks local experimentation. Do privacy and shared-correctness work first; the world-boundary extraction follows as its own scoped change. Do not replace this list with a general refactor or broad coverage project.

## Execution order and ownership

| Order | Work                                                                   | Existing parent                                                                                                                              |
| ----- | ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | FR01 — Fence private history after asynchronous reads                  | [World Agent writes](world-agent-writes.md), [multiplayer](multiplayer.md), [memory](cognition-redesign.md)                                  |
| 1     | FR02 — Hide stale comparison text as soon as evidence changes          | [Hearing and perceived history](hearing-and-speech.md), [UI/UX](ui-ux.md)                                                                    |
| 1     | FR11 — Restrict non-speech evidence to what each observer can perceive | [Events and reactions](events-perception-and-reactions.md), [existing disclosure work](TODO.md#encounter-acquisition-privacy)                |
| 2     | FR03 — Represent removed fields in incremental client updates          | [Public-view performance](performance.md#pf05--public-view-and-browser-responsiveness), [multiplayer](multiplayer.md)                        |
| 2     | FR04 — Require current ownership for held resources                    | [State contributions](state-contributions.md), [save/load](save-and-load.md)                                                                 |
| 2     | FR05 — Remove obsolete draft recovery across account changes           | [UI/UX](ui-ux.md), [multiplayer](multiplayer.md)                                                                                             |
| 2     | FR10 — Preserve same-character drafts and camera on Resume             | [Multiplayer](multiplayer.md), [persistent objects](persistent-objects.md), [spatial world](spatial-world.md)                                |
| 2     | FR12 — Consume usable numeric action ratings consistently              | [Level-1 decisions](parallel-batch-02-foundations-and-usability.md), [AI provider contract](../ai-providers.md#provider-behavior-and-limits) |
| 2     | FR13 — Complete the existing durable cognition prerequisite            | [EPR05](events-perception-and-reactions.md#epr05--change-fed-actorwork-and-one-reaction-intake)                                              |
| 3     | FR06 — Preserve remembered-object appearance during animation          | [Spatial world](spatial-world.md), [UI/UX](ui-ux.md)                                                                                         |
| 3     | FR07 — Move authored terrain and bodies out of geometry                | [World foundation](extensible-world-foundation.md), [spatial world](spatial-world.md)                                                        |
| 3     | FR08 — Remove the unused legacy checkpoint branches                    | [Save/load](save-and-load.md), [production data](production-data.md)                                                                         |
| 3     | FR09 — Reconcile misleading current architecture claims                | [Remaining foundations](remaining-foundational-work.md), [documentation policy](../../.agents/rules/documentation.md)                        |

FR01 and FR02 address separate server/browser boundaries; one does not fix the other. FR03 must update server, protocol and client together. FR04 should land before adding more resource consumers. FR07 needs a scoped design under the existing world/spatial contracts before implementation; preserve current outcomes and avoid a general plugin loader.

## FR01 — Fence private history after asynchronous reads

- [x] Repair selected-character permission and evidence freshness at final disclosure.

**Problem and evidence.** In [world-tools.ts](../../apps/server/src/world-tools.ts), `memoryRecord` checks subject permission before awaiting memory preparation and retrieval (lines 266–291). `execute` then rechecks the requester's inspection grant and timeline (185–228), but not the chosen subject or changed memory evidence. An injected delayed-repository probe through the real `WorldToolService` returned old private text after the fixture changed subject permission or the actor evidence revision. This demonstrates the missing service fence, not a PostgreSQL or real multiplayer reproduction. The [private retrieval contract](../memory-architecture.md#private-retrieval-fencing) explicitly requires this check.

**Why now.** More history tools and multiplayer roles will reuse this path. A correct permission check before an asynchronous wait is insufficient when memory is forgotten or access changes during the read.

**Implementation instructions.**

1. At the existing private-read owner, capture the exact subject, authenticated scope, timeline and current actor evidence revision after required preparation. Keep the selected source's identity/revision where available.
2. Immediately after the last asynchronous read and before projecting/returning text, recheck subject permission against the current world, plus timeline and evidence revision. Refuse stale/forbidden data explicitly; do not automatically retry or return old text with a warning.
3. Apply the same owner helper to exact tool memory inspection and its graph route. Include `ol_evidence`'s final current subject/ancestor permission: it already checks the actor evidence revision, which must be preserved. Review the neighboring owner editor reads in `WorldService.personMemoryJson` and `personEditor`, whose current post-await checks cover permission/generation but not the evidence revision; preserve each surface's actual permission policy.
4. Reuse the established pattern in `WorldService.inspectMemoryContext`; do not introduce another memory store, broad world hash, or universal lock around private reads.

**Acceptance.** Hold a real cold read while committing forgetting/correction, then release it: no old body is returned. Repeat with current subject access denied and a stable requester grant. An unchanged authorized read still succeeds. Exercise UI and MCP callers, with disposable PostgreSQL for integration; the audit fixture is not that acceptance. Add one focused deterministic service test for the fence, not model-quality tests.

## FR02 — Hide stale comparison text when evidence changes

- [x] Retain comparison selections without retaining revoked source bodies.

**Implementation status (October 14, 20:49 UTC).** Implemented, reviewed and browser-verified: two retained selections survive correction and forgetting, obsolete bodies clear during delayed/failed refresh, Retry restores only permitted details, an older response delivered last cannot replace them, and keyboard source return/Escape restore focus. The adversarial transport deliberately ignored cancellation; six real detail requests completed with no page exceptions. [Final comparison evidence](../verification/foundation-hardening.md#comparison-browser-acceptance--october-14) supersedes the earlier blocked verification status.

**Problem and evidence.** [world-events.tsx](../../apps/client/src/ui/world-events.tsx) deliberately retains the two selected sources across correction/forgetting by removing the history epoch from the component's ownership key (35–48). Its details dictionary survives revision changes; reloading marks a request busy but rendering still uses the preceding `available` body (103–157, 560–563, 625 onward). A failed refresh can leave that body visible indefinitely. This is source-traced; no browser race was run in the audit.

**Why now.** When a private source is explicitly edited, removed or made inaccessible, its inspection must update immediately. This protects truthful inspection and account boundaries; it does not introduce automatic fictional forgetting or erase historical beliefs merely because they were corrected. Keeping a source selected is useful; displaying an obsolete or revoked body is not.

**Implementation instructions.**

1. Bind displayed details to the current viewer scope, evidence revision and complete source reference. On a revision change, suppress the previous body during render, before an effect starts the new request.
2. Keep the two selection slots and navigation positions. Show loading, unavailable or failed detail in the existing cards; do not clear unrelated user choices.
3. Reject delayed completion for an old revision/selection even if abort arrives too late. An error must not restore the old body. Use the existing request generation and source identity owner, rather than a second history cache.

**Acceptance.** In an actual browser, open two sources, forget/correct one elsewhere, delay or fail its refresh, and confirm the old text disappears immediately while the other selection remains. Resolve an older request last and verify it cannot replace current details. Verify keyboard return-to-source and retry still work. No screenshot snapshot is needed.

## FR03 — Represent removed fields in incremental client updates

- [x] Make serialized updates semantically equivalent to the next permitted view.

**Problem and evidence.** [view.ts](../../apps/server/src/view.ts) creates field changes from the next object's keys; [api.ts](../../apps/client/src/api.ts) shallow-merges player updates. A field changing to `undefined` vanishes during JSON serialization; a completely absent field is not enumerated. A provider-free probe connected the actual `projectActivityStatus`, `projectPatch` and `applyGamePatch` helpers through JSON on synthetic public views. The reconstructed client view retained a removed activity as active. The unencoded patch contained `activity: undefined`, but its wire form contained an empty player object. Some changes force a full view reset, so this does **not** establish that every revival displays a corpse.

**Why now.** Every future optional player status can inherit the same bug. Fixing each panel independently would duplicate the transport contract and leave other callers wrong.

**Implementation instructions.**

1. Choose one explicit removal representation in the existing [protocol](../../packages/protocol/src/index.ts): a typed removal list, complete replacement of the affected small record, or explicit null where null already expresses absence. Compare bandwidth and simplicity; do not add legacy decoding.
2. Generate changes from both previous and next keys where removals are supported, and consume removal semantics before publishing the new browser view. Apply the same reasoning to clock/AI/other partial records, preserving existing audience and revision fences.
3. Keep the existing deliberate `actionAnimation: null` convention unless replacing it coherently. Avoid a blanket full-scene reset for every removed field.

**Acceptance.** Extend the existing API test file with JSON-roundtrip equivalence for added, changed and removed optional fields, empty collections and entity removals. Reproduce starting then replacing/stopping a composed activity through its real caller; its card must clear without waiting for an unrelated reset. Wrong audience/base revision still refuses the patch.

## FR04 — Require current ownership for held resources

- [x] Remove the older-record exception from resource-hold validation.

**Problem and evidence.** [resource-claims.ts](../../packages/domain/src/resource-claims.ts) makes `actorId` optional and skips owner checks when it is absent. Current `reserveResource` always requires a claimant. A native probe admitted a real gather action and held 3 of 5 units of wood. Removing its active work correctly failed validation while the claimant remained; deleting only the claimant made both resource and world-module validation accept the record. Reconciliation left only 2 units available, with no expiry to release the stranded hold.

**Why now.** A malformed current save can strand useful materials. Additional crafting, construction and transfer consumers would build on that hole. The old-record exception also conflicts with the [development save policy](../../AGENTS.md#development-save-policy).

**Implementation instructions.**

1. Make the current reservation type and validator require its exact claimant. Reuse the owning resource/work checks; do not infer a claimant from custody or reconstruct missing records.
2. Require each held reservation to resolve to its permitted current action/work owner, with correct participant and resource. Retained consumed/released history follows its existing permitted-absence rules; do not require all historical actors to stay live.
3. Review release/reconciliation consumers and current producers together. Remove the matching legacy exception from the state-contribution contract/tracker, retaining historical rationale as history only.
4. Reject malformed current data before installation; do not add a migration or silently release unknown holds during load.

**Acceptance.** A real current hold continues after a same-version roundtrip; cancellation releases it once. Missing/wrong claimant and missing live owner fail the ordinary validator. Two independent consumers cannot spend the held amount. Add the focused FT04 tests with this fix; broader resource and database acceptance remains with SC/PO/SL.

## FR05 — Remove obsolete composer draft recovery

- [x] Stop recovering older private drafts and centralize account-scope clearing.

**Problem and evidence.** [draft.ts](../../apps/client/src/draft.ts) still reads the earlier `composer-draft:v1` value when the current record is missing or malformed; [draft.test.ts](../../apps/client/src/draft.test.ts) preserves that conversion. [api.ts](../../apps/client/src/api.ts) clears only the current key on access changes. An obsolete key can therefore survive a clear and become readable afterward. Saving a current draft removes the old key, so this concerns retained older storage, not every account switch.

**Why now.** Private unsent text should not reappear under another account. There is no current development requirement to retain the earlier representation.

**Implementation instructions.** Remove the fallback reader and compatibility-only assertions. Expose one draft-owner clear operation used by access changes, removing the current key and known obsolete key without loading/migrating its text. Keep storage-unavailable editing and same-account current draft persistence. A key rename alone is not necessary for the fix.

**Acceptance.** Seed an obsolete private draft, perform the real access-clearing path, and confirm `readDraft` returns empty. Repeat for missing/malformed current data and current account replacement. Preserve normal current draft save/reload and blocked-storage behavior.

## FR06 — Preserve remembered-object appearance during animation

- [x] Ensure the frame update retains the distinction between seeing and remembering.

**Implementation status (October 14).** Implemented, independently reviewed and verified against the final production browser build. Actual screenshots exposed and verified a further repair for opaque multipart objects: every owned appearance part now fades without overwriting material alpha. Crate/sprite frame persistence, unchanged-crate sight return, interaction refusal, hidden art replacement, scope renewal, explicit renderer disposal and fresh-scene recovery all pass in the [browser evidence](../verification/foundation-hardening.md#remembered-appearance-browser-acceptance--october-14).

**Problem and evidence.** [scene.ts](../../apps/client/src/scene.ts) assigns a faded opacity to a remembered unseen sprite during view synchronization, then the per-frame animation path overwrites opacity. A remembered location can consequently look like a currently seen object. This is a source-traced rendering conflict, not a measured browser result.

**Implementation instructions.** Derive one final opacity from the existing remembered/visible state and transient animation factor. Keep the base visibility factor with the sprite's presentation data, and apply it consistently when updating shared/front/back materials. Do not let animation grant visibility or picking. Preserve existing physical geometry and observer authority.

**Acceptance.** In a browser, see an object, move out of sight while retaining its permitted remembered marker, and advance several frames: it remains visibly remembered. Return to sight, change art, switch scope and dispose/recreate the scene. Verify remembered markers retain the current non-interactive behavior. Use a small calculation test only if a real shared presentation helper is warranted.

## FR07 — Move authored terrain and body choices out of geometry

- [x] Establish the existing world-owned seam before adding more terrain/body families.

**Problem and evidence.** [spatial types](../../packages/spatial/src/types.ts) owns the `grass/sand/water/rock` terrain union and person/hare/deer/bird dimensions. [geometry.ts](../../packages/spatial/src/geometry.ts) decides grass/sand walkability and manufactures rock height/material/transmission; [validation.ts](../../packages/spatial/src/validation.ts) repeats the terrain catalogue. The comment calling these default-world profiles does not change their dependency direction. This is authored policy inside the reusable geometry authority, beyond deliberate composition imports elsewhere.

**Why now.** New worlds and invented bodies would otherwise have to modify engine geometry or adopt wilderness assumptions. This is a concrete extension barrier; it does not justify arbitrary generated physics or a new plugin framework.

**Implementation instructions.**

1. Inventory actual consumers and define the smallest immutable terrain/body input needed by current support, collision, navigation and acoustic queries. Use the existing installed-world/definition owner; preserve exact identity and revision dependencies.
2. Move bundled names, dimensions, walkability and terrain-derived solid descriptors to `packages/domain/src/worlds/base/`. Keep generic coordinates, conservative bounds, finite shapes, numerical tolerances and geometry integrity limits in spatial.
3. Pass resolved body profiles explicitly at meaningful boundaries; remove implicit person defaults from generic query entrypoints after updating all callers. Compile terrain geometry once per relevant immutable input, never once per actor/query.
4. Update protocol projections and client presentation consumers from the same authored source. Preserve current save validation and the engine/world/spatial documentation. No legacy schema or parallel rule catalogue.

**Acceptance.** Existing bundled geometry/movement/hearing outcomes remain equivalent. A materially different fixture can use a differently named walkable terrain and body without editing `packages/spatial`; a blocked surface still blocks. Run focused spatial/native cases and measure cold preparation plus actual warm callers. Do not claim population capacity from that fixture.

- [x] **Separate small first slice: active action wording.**

[action-descriptions.ts](../../apps/server/src/action-descriptions.ts), lines 66–84, also owns bundled preparation/hunting/remains/fire rules beside its generic projector. Move those descriptions and matching duplicated prompt fragments into their existing base-world action/content owners; let the server compose grammar from them, as neighboring `BASE_*` consumers already do. Preserve current wording, offer identity and admission, checking one preparation and one combat/fire caller. This needs no spatial dependency and no new registry. Full action-family registration and protocol generalization remain later AC02/EWF06/INV-3 work.

## FR08 — Remove unused legacy checkpoint branches

- [x] Keep one current checkpoint representation across reading, backup and recovery.

**Problem and evidence.** All current checkpoint creation in [game-saves.ts](../../apps/server/src/game-saves.ts) uses the streamed writer, but `read` (510–551) retains inline/whole-JSON branches and a separate 64 MiB legacy allowance. [save-files.ts](../../apps/server/src/save-files.ts) permits missing encoding/count metadata and chooses `world.json`; [operational-backup.ts](../../apps/server/src/operational-backup.ts) copies that representation. Payload validation still checks the current save marker, so this is not evidence that arbitrary old schemas bypass validation. It is an unused alternative path and contradictory maintenance burden under the current-only policy.

**Implementation instructions.** Inventory current creation/recovery callers, require current stream metadata, remove obsolete inline/whole-JSON read/write/copy branches, and keep the integrity-checked recovery pointer. Preserve atomic publication, current-format validation, current forgetting/accounting overlays and failure cleanup. Reconcile README, SL/SB15/SV14 and save-layout descriptions without changing the controlling development policy. Refuse incompatible development slots explicitly; do not delete unrelated files or add conversion.

**Final-review extension (October 14).** Remove the old database-document/journal importer and orphan storage helpers/tables too. Current writes and backups exclusively use independent records; no supported current caller needs conversion. Preserve current knowledge, accounting, empty-database creation and concurrent-write protection. Verify current reopen/creation and the actual backup/restore CLI; do not retain old-format fixtures as supported data.

**Acceptance.** Current manual, auto, recovery and operational backup/restore paths roundtrip in disposable PostgreSQL and temporary directories. Missing required stream metadata and obsolete payloads fail before installation; corrupt pointer/checksum cases retain the last valid world. No current writer or retained current-format test depends on the removed branch.

## FR09 — Reconcile misleading architecture entry points

- [x] Correct current-state claims that would misdirect subsequent design work.

**Evidence.** [Engine/world boundaries](../engine-and-world-boundaries.md#4-what-must-remain-protected) describes the current spatial authority as a two-dimensional ground plane, despite implemented XYZ support, ramps and stacked surfaces. README still promises older JSON save readability, while current-only policy and SB15 say otherwise. [Save/load tracking](save-and-load.md) describes a preceding-layout reader after its referenced limit says that reader was removed. These are meaningful contradictions, not a request to reformat the documentation collection.

The [domain module guide](../../packages/domain/src/README.md) also describes recipes as empty/fixture-only and native NPC food choices that current tests contradict. The [base-world guide](../worlds/base/README.md) lists shields, fishing, containers, canopies and practice as proposed despite their current runtime owners. Reconcile these onboarding summaries while preserving the distinction between implemented mechanisms, actually exposed gameplay and outstanding acceptance.

**Implementation instructions.** Check each current claim against its real producer/consumer and accepted contract; correct the current specification, leave historical observations dated, and link the precise implementation/remaining limitation. Reconcile FR07/FR08 descriptions with their final implementation rather than claiming those recommendations already shipped. For future touch-ups, inspect relevant required-read entry points during the same change instead of creating another architecture handbook.

**Acceptance.** A developer following README → architecture → subsystem contract receives one consistent account of supported geometry and current save formats. Links and anchors resolve; no accepted requirement is relaxed to match a defect, and no historical evidence is erased.

## FR10 — Preserve same-character work and camera on Resume

- [x] Separate private draft ownership, current request authority and presentation identity.

**Implementation status (October 14).** Implemented, independently reviewed and verified in the final production browser build. The complete open-bag/search/selection/unfinished-quantity journey preserves drafts and the exact camera across competing-tab Resume and explicit blur/focus events. Failed current reads hide private details, late obsolete reads cannot restore them, and recovery restores the retained draft. Actual timeline, character and account replacement clear private work. Unchanged terrain stays at one build; an actual geometry edit rebuilds it, and explicit scene disposal/reload succeeds. See [Resume browser evidence](../verification/foundation-hardening.md#resume-and-private-draft-browser-acceptance--october-14).

The continuation also defers initial 3D construction until the tab has entered play, keeping cold graphics preparation out of control acquisition. Existing scenes still receive paused-view invalidation and preserve permitted resources. Earlier automation outages and entry failures remain historical evidence in the report; they no longer leave FR10 acceptance open.

**Problem and evidence.** [Inventory](../../apps/client/src/ui/inventory.tsx), lines 210–219, keys its entire workspace by `access.scope`. The [renderer](../../apps/client/src/scene.ts), lines 329–356, also uses that scope as part of its world identity. Releasing/reacquiring control increments the generation in [authority.ts](../../apps/server/src/authority.ts), lines 615–623. Returning to the same character therefore remounts inventory, losing selection/search/quantity/transfer drafts, and clears/rebuilds scene assets and recenters the camera even with follow disabled. The server already supplies a distinct private-draft scope that excludes transient control generation. This is a static lifecycle trace; frame-time cost and browser behavior remain unmeasured.

**Why now.** Resuming play should not erase the player's unfinished inventory choices or deliberate camera position. The repeated rebuild is also avoidable work, but its timing is not the basis of the correctness recommendation.

**Implementation instructions.**

1. Key inventory's local editing state by world, timeline, character and the server-issued private-draft scope. Keep full current access scope in the read/command identity, and disable execution until the selected item's current facts are refreshed.
2. Keep renderer world/map/observer identity separate from transient control renewal. Reuse unchanged public terrain and currently permitted assets; revoke hidden information, transient captions and unauthorized selections immediately.
3. Reset camera focus on actual world/timeline/character replacement or an explicit recenter, not ordinary control renewal. Preserve follow-off behavior.
4. Use the existing identity helpers already used by trade and workshop. Extract a small shared meaning only where two real callers agree; never use the draft scope to authorize a request.

**Acceptance.** In a browser, type a partial inventory quantity, navigate into a bag, pan with follow off, switch away and Resume. Drafts/navigation/camera remain, current facts refresh, and old reads cannot overwrite new results. Account/character/timeline replacement clears private work. Instrument map build/dispose counts to show unchanged terrain is reused; then verify changed geometry does rebuild. Qualify timing separately.

## FR11 — Restrict action evidence to what each observer can perceive

- [x] Complete observer-specific disclosure for non-speech action facts.

**Problem and evidence.** [event-audience.ts](../../packages/domain/src/event-audience.ts) selects non-speech witnesses by visibility of the acting source. [events.ts](../../packages/domain/src/events.ts) then records the target and rendered outcome, and [speech.ts](../../packages/domain/src/speech.ts) projects target/data without an equivalent fact-by-fact visibility decision. A real admitted Gather → `advanceWorld` probe placed a witness within sight of the gatherer but beyond sight of the resource. The witness received the hidden `branches` target, `wood` definition and exact quantity 2. All three positions passed support/clearance checks; the witness could not see the target before or after gathering. This is native evidence, not a model experiment.

**Why now.** Perception feeds both the player's history and a character's later reasoning. Broad prompts cannot undo secret facts already recorded as observations. Existing [targeted-event disclosure work](TODO.md#encounter-acquisition-privacy) remains relevant; this item gives the immediate general fix and does not replace its broader acceptance.

**Implementation instructions.**

1. Keep exact authoritative action events intact. At the existing observer-evidence owner, decide which source, target, material, quantity and outcome facts the witness can actually perceive under the supported event family's policy.
2. Record the permitted structured facts at event time, then derive captions/history/context from that record. Do not later fill gaps using current world truth, raw `event.data`, or an unfiltered target label.
3. Preserve legitimate witnessing of the visible person's activity. Do not hide every action merely because its target is unseen, require a universal two-visible-actors rule, or blur precise facts that were legitimately perceived.
4. Trace gather, attacks, handovers and other targeted event consumers through personal history and AI preparation. Reuse the existing speech/perspective boundaries and EPR contract; no second event stream or prompt-only filter.

**Acceptance.** Repeat visible-source/hidden-target and visible-both cases for gathering plus a materially different targeted action. Establish an actual committed outcome before testing its disclosure. The actor retains their permitted own evidence, nearby witnesses retain only observable facts, and unrelated observers receive none. Verify target identity/quantity/health are absent where unavailable in native history, server projection and NPC context, including later recall. Add a small observer-evidence regression case with the fix; do not snapshot narration prose.

## FR12 — Consume usable numeric action ratings consistently

- [x] Remove the duplicate conventional-range rejection in the level-1 consumer.

**Problem and evidence.** [validation.ts](../../packages/ai/src/validation.ts), line 159, accepts finite numeric ratings under the current provider contract. [level1-selection.ts](../../apps/server/src/level1-selection.ts), lines 86–104, then rejects the entire decision if any rating is outside 0–1. A provider-free probe decoded an offered rating of 1.01 successfully, but the actual selector returned `defer / invalid-answers`. Existing test expectations preserve the obsolete restriction. Provider frequency and live behavior were not measured.

**Why now.** A usable ranking can cause a character to do nothing despite an available permitted action. This contradicts the accepted purpose-based validation rule; it is not a request to change choice thresholds or make every answer executable.

**Implementation instructions.** Remove only the conventional range check. Retain missing-answer, wrong-type and nonfinite checks, offered-handle matching, the authored selection threshold, explicit deferral/escalation outcomes and current native action admission. Update the existing selection cases rather than add parallel selection logic or paid retries.

**Acceptance.** An offered finite 1.01 rating can win; negative ratings remain numeric and undergo the normal threshold decision; missing/nonfinite/wrong-type values still defer; unoffered handles cannot execute; equal scores retain the owning tie rule. Run the focused existing selector/decoder tests. These checks establish numeric consumption, not model quality. Audit Jev cost: $0 additional, $0 cumulative; no calls were made.

## FR13 — Complete the existing durable cognition prerequisite

- [x] Complete and qualify [EPR05](events-perception-and-reactions.md#epr05--change-fed-actorwork-and-one-reaction-intake) before expanding autonomous cognition scheduling.

**Follow-up implementation (October 14).** Delayed maintenance scheduling writes retain the selecting world generation and use the existing serialized publication boundary. A real held PostgreSQL read reproduced an old scheduler erasing a reflection queued after restore; the fix preserves the new request and permits later current work. Pending metadata writes retain cancellation, and failed writes release the active marker. The operational real-time throttle remains outside gameplay rewind. See the [review evidence](../verification/foundation-hardening.md#requested-follow-up-review); no provider call or new scheduling queue is required.

**Evidence and limit.** `ActorWork` has a durability predicate, but the reviewed construction does not connect it. `AiDirector.considerThought` reads live unseen-event state, constructs the thought's event watermark and later persists that watermark. `WorldService` already exposes durability tickets and completion callbacks. EPR05 explicitly retains the missing scheduler integration and watermark clamping. Deeper memory preparation does flush sources, so this review does **not** prove that a paid call precedes required persistence or that billing is lost. This is a known unfinished foundation prerequisite, not a newly reproduced failure.

**Why now.** More autonomous work should not depend on incidental flushing by a particular context reader. The scheduler needs an explicit account of which committed observations a character may consume and acknowledge.

**Implementation instructions.** Keep EPR05 as the implementation and acceptance owner. Trace each decision entry point through its actual preparation and persistence sequence; connect the existing readiness predicate/ticket callbacks, and clamp acknowledged event positions to the successfully durable evidence used by that decision. Preserve urgent native actions, explicit cancellation and distinct uncertain outcomes. Do not create another queue, polling loop or automatic paid retry. Keep scheduler scan optimization in [FRL03](performance.md#future-improvements-from-the-foundation-review) until measurement justifies it.

**Acceptance.** Finish EPR05's existing delayed-write, failed-write, restore, cancellation and duplicate-notification checks with injected provider results and disposable storage. No decision consumes unavailable evidence or acknowledges uncommitted events; unchanged eligible actors still progress. Prove whether every current entry point already flushes rather than assuming a missing callback alone establishes a production failure. Record any live model qualification separately with explicit funding; none was performed in this audit.
