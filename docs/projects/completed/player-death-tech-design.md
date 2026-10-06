# Player Death — technical design

| Status    | Current progress                                                                                          | Last updated |
| --------- | --------------------------------------------------------------------------------------------------------- | ------------ |
| Completed | Selected runtime and optional world-scar correction are delivered; broader qualification remains tracked. | 2026-10-05   |

## Scope, source and plan

The implementation base is freshly fetched `origin/main` d36ec3bd in branch `codex/pg05-first-threat`, `/Users/mzw/.codex/worktrees/1dfa/OpenLegend`. The initial additional estimate was 650–1,100 production logic lines excluding tests; the integrated durable estimate/risk and stages are in [first-threat execution](first-threat-encounter-tech-design.md#scope-baseline-and-plan). Identity/custody/privacy/current-format persistence are high-risk boundaries. The earlier draft's quantity-unit/hypergeometric lottery and two-minute radius were explicitly replaced by Mike's distinct-type selection and one minute; they are not compatibility modes.

## One authored law, existing mutation owners

[death.ts](../../../packages/domain/src/worlds/base/death.ts) owns type fraction, rounding convention, rest family/radius, new-life physiology, scars/treatment and wording; the installed body policy selects true player death. `living.ts` is the sole body mutation owner. `reincarnation.ts` supplies supported separation/placement/treatment using existing indexed objects, saved randomness, spatial support, remains, participation and events. Server control/records own durable authenticated Continue and current-format reconstruction. Client/protocol present permitted facts and intentions.

A different installed world may omit reincarnation or choose another supported fraction/rest family/scar policy. No second actor database, loot journal, generalized resurrection graph or speculative loader exists.

## Optional world scars correction

Mike approved scar-free reincarnation on October 5. The bounded correction estimates 40–80 changed production logic lines across death execution/validation, treatment callers and server projection. An empty authored scar list disables scar selection; `treatment: null` removes unused material/time dependencies. Nonempty scar definitions still require valid treatment. The bundled world retains its three scars and all existing death/recovery rules.

Delivered through existing owners: skip scar randomness/state/event metadata when the list is empty, admit the optional treatment shape, guard treatment execution/discovery and keep current saved-scar validation. The scar-free full-retention world passes fatal body effects, ordinary Continue, current-format round-trip, SQL storage and player projection; unsupported saved scars and forged treatment are refused. Focused kernel/static checks and the complete correction review are recorded in [the evidence](../../verification/first-threat-encounter.md#optional-world-scars--october-5-2026). This changes supported policy values without new storage fields, migrations or an alternate death implementation.

## One death transition

1. Body reconciliation commits fatal health once, stops old work/plans/conversation and releases unused reservations. Already committed costs/effects remain.
2. Copy only the physical body into a separate corpse record with the old life/location. Keep stable identity, history, mind and permissions with the nonparticipating player. The corpse has no private cognition/history copy.
3. Traverse direct-child custody indexes once, canonicalize distinct type IDs and partially shuffle the installed retained fraction using saved randomness; the bundled world selects exactly half. Quantities never become lottery entries. All lots of a type share fate; deepest-first existing moves preserve same-fate nesting and promote mixed-fate children to roots without capacity/depth violations or cloning.
4. Record pending death, exact corpse link, event-time own-inventory summary and one scar when the installed law supplies scar definitions in the same transition. The original identity leaves physical membership/live perception. A failed publication consumes no committed second draw; retry/replay remains under current command/record owners.

Lot count drives traversal/moves, distinct types drive sorting/sampling, and quantity magnitude drives neither an expanded array nor per-unit work. Existing object mutation charges and atomic native work admission remain authoritative; budget failure cannot publish a partial split. Large inventory measurement is evidence, not an independent item/history cap.

## Rest selection, life pins and treatment

A pending Continue request scans exposed roots for installed rest kind, computes straight-line distance from death, checks usable in-range fires and selects uniformly from distinct fires. Nearest fallback checks candidates lazily in deterministic distance order. A finite eight-point neighborhood uses each fire's actual support height, collision, occupancy and nearby contact checks; no corpse-to-camp path or all-world threat scan occurs. Fewer constructed camps make this rare scan sufficient. An indexed rest-family query becomes justified when a real large constructed-rest workload shows cost, not as unused infrastructure now.

One accepted Continue increments physical life, restores health/configured meters, clears old injury/motion/work and emits authored arrival. Feedback keeps the exact second-person arrival message; a separate authored event template reuses the existing name/perspective renderer for history. Current control and pending/alive checks admit only one successor; duplicate request acknowledgement does not create another. Targeted attack/review life pins and current action/generation invalidation prevent delayed effects from reaching a new or creator-revived body. Pending player/old successor-corpse creator revival is explicitly refused.

Scar factors reuse movement and outgoing/incoming injury. Treatment admission/completion recheck current scar, supported campfire, reach and free directly carried fiber. Injury/cancel/movement/death invalidates unfinished work; debit and decrement happen together once at completion with body revision/dependency reconciliation. Repeated category count does not apply repeated category factors.

## Persistence, privacy and growth

Current actor/entity records save life, scars, pending summary/corpse reference and retained custody; world random state and departure exposure are coupled in existing commits. Native death keeps the existing simulation durability window; Continue has durable human acknowledgement. Full checkpoint restore restores the coherent prior world and current privacy/account overlays; no selective inventory rewind, old reader, migration or automatic reset/deletion exists.

Corpse rot/removal uses the existing remains owner and releases ground loot. No new corpse/history/ground-item retention cap is selected; repeated deaths can grow current records and histories. Dead players have no live senses or remote corpse inspection; only their own event-time summary is returned. Observers see ordinary body/loot according to current sight and known names, not the dead person's private memory/inventory. Current-format cold validation checks life, supported scars, summary, corpse links and definitions.

## Verification and completion

Use the integrated [acceptance](player-death-feature-spec.md#acceptance-and-delivery) and [evidence](../../verification/first-threat-encounter.md): real fatal stag contact, conserved nested/split types, missing-fire refusal, actual pickup/theft, treatment interruption/completion, tied departure/death and current SQL reconstruction. Native lot stress separates lot quantity from entity count. No paid provider or physical lower-end/hosted capacity claim follows. Future towns/rest construction, richer scars and NPC ghosts/ordinary revival remain separate work.

## Maintained records

- Implementation: [PG05](../../maintainers/parallel-batch-03-personal-game.md#pg05--first-threat-encounter-design), [BW14](../../maintainers/base-world.md#accepted-lifecycle-and-protection-delivery), [DG07/ND11](../../maintainers/needs-design.md#dg07--human-participation-and-recoverable-conflict), [MP04](../../maintainers/multiplayer.md#mp041--participation-and-bounded-exit-contract).
- Limits and constraints: [FT01–FT07](../../limits/base-world.md#ft01--proposed-first-threat-scope-and-reward), [native work](../../limits/native-work.md), [objects](../../limits/objects.md), [persistence](../../limits/persistence.md).
- Related contract/design: [Current authored encounter](../../worlds/base/first-threat-encounter.md), [lifecycle/protection](../../worlds/base/lifecycle-and-protection.md), [verification](../../verification/first-threat-encounter.md), [D07/PS-D01 decision record](../../../archive/05-project/open-decisions.md#pg05--proposed-first-encounter-choices).

- Related counterpart: [Feature specification](player-death-feature-spec.md).
