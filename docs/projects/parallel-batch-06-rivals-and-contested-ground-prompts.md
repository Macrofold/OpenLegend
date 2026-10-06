# Batch 06 — Rivals and contested ground implementation prompts

| Status  | Current progress                                                                                                                          | Last updated |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| Blocked | Two independent implementation prompts are complete; three prompts require the owner's NPC participation answer and the remaining design. | 2026-10-06   |

These prompts are future assignments, not authorization for the planning agent to execute them. [Priority and scope](parallel-batch-06-rivals-and-contested-ground-feature-spec.md), [technical definitions](parallel-batch-06-rivals-and-contested-ground-tech-design.md), [tracker](../maintainers/parallel-batch-06-rivals-and-contested-ground.md). Readiness below reflects source/branch inspection on October 6; assuming earlier batches delivered for priority selection does not supply their implementation.

## Allocation and branch names

| Assignment                                       | Planned new branch                  | Prompt readiness                                                    |
| ------------------------------------------------ | ----------------------------------- | ------------------------------------------------------------------- |
| CF01 — Armed opponents with their own purpose    | `codex/purposeful-armed-opponents`  | Pending NPC participation answer and dependent design.              |
| CF02 — Aim, projectiles and real cover           | `codex/aim-projectiles-and-cover`   | Complete below; open final-integration prerequisites stated inside. |
| CF03 — Evade and exploit an opening              | `codex/evasion-and-counterplay`     | Complete below; open final-integration prerequisites stated inside. |
| CF04 — A companion who can help in a fight       | `codex/voluntary-combat-companions` | Pending NPC participation answer and dependent design.              |
| CF05 — A contested ruin and a victory that lasts | `codex/contested-ruin-aftermath`    | Pending NPC participation answer and dependent design.              |

These branch names were not present in inspected local/remote refs. No branch is created by this document. The owner supplies prerequisite revisions; each assignment has its own responsibility rather than an instruction to negotiate with another chat.

## CF02 — Aim, projectiles and real cover

```text
Implement CF02: a character can aim without firing, release one finite projectile, and hit or miss through real target movement, cover and shield contact. Follow AGENTS.md and the applicable repository guidance.

After selecting and refreshing the development base under AGENTS.md, create and switch to the new branch codex/aim-projectiles-and-cover. The starting branch must include the batch 06 planning documents referenced below.

Open prerequisites:
- AV02's compatible equipment and shared contact-defense resolver are proposed in docs/maintainers/parallel-batch-05-adventure-defense-and-home.md, not confirmed implemented or fully merged into main. You can implement aim/flight using current equipment first; final shield/equipment integration requires the supplied AV02 result. Do not create a second equipment or guard store.
- AV03's committed sling-use/competence consumer is also a batch 05 proposal with no confirmed completed main merge. Flight can proceed independently; final practice/coaching integration must consume its existing progress owner and distinguish release from impact. Do not reimplement skill progression.
- The owner has not yet answered whether hostile NPCs may kill other NPCs. CF01 owns that pending world-policy expansion. This assignment can fully define and implement its physical mechanics against current lawful animal targets without deciding the answer. Preserve existing attack permission, direct PvP denial, inactive protection and final-blow review. PG02's bounded personal-evidence/decision work is now on local main at b1357b37; use its shared memory/perspective owner and retain its broader quality limits.

Read in this order:
1. docs/projects/parallel-batch-06-rivals-and-contested-ground-feature-spec.md: “CF02 — Aim, projectiles and real cover” and “Presentation and combined experience.”
2. docs/projects/parallel-batch-06-rivals-and-contested-ground-tech-design.md: “Baseline and evidence,” “Open prerequisites,” “Shared ownership and delivery order,” the complete “CF02 — One ranged execution owner,” and “Documentation and parent reconciliation.”
3. docs/worlds/base/ranged-counterplay.md and docs/limits/parallel-batch-06-rivals-and-contested-ground.md: exact proposed world tuning, limits and changes to accuracy/fleeing interpretation.
4. docs/targeted-actions.md; docs/action-capabilities.md#action-availability-and-temporary-execution; docs/worlds/base/player-danger.md; docs/worlds/base/lifecycle-and-protection.md: existing execution, review and participation authority.
5. docs/maintainers/parallel-batch-06-rivals-and-contested-ground.md#cf02--aim-projectiles-and-real-cover: complete task scope and remaining acceptance.

Start source tracing at packages/domain/src/kernel.ts (hunt admission/completion), strikes.ts, combat-consent.ts, body-state.ts, participation.ts, action-experience.ts, spatial.ts and temporal-boundaries.ts. Trace base-world actions, action-views and recipe-families, plus server action-catalogue/typed-actions/decision-context/world-service/view and current protocol/client consumers. Use the source map in the technical design; confirm names and supplied prerequisite changes on your actual base.

Deliver one ranged owner shared by explicit Aim/Shoot and one-shot hunting composition. Preparation and canceled aim spend no ammunition; committed release spends once, locks the permitted aim point and persists a real flight. Swept collision must account for the interval's moving bodies, not just end positions. Another body intercepts without becoming a new damage target. Reuse one injury/review/guard owner, retain stale/replaced-life and changed-lethality protection, and never refund a released shot on cancellation. Keep authored language/tuning in the world and update all current schemas/callers together without old-format compatibility paths.

Complete the feature/design acceptance, including ordinary player controls, blocked/stale/replay/restore/privacy cases, a different compatible invented launcher, AV02 guard interception once and AV03 release evidence once. Report actual movement/flight and model-choice evidence separately. Verification and whether to author tests follow AGENTS.md.

Keep documentation synchronized: targeted actions, base-world survival/actions and ranged-counterplay; AC02/AC09/AC10/AC11; action experience; INV-3/INV-6 launcher scope; SW04/SW07/SW15/SW16; AV02 and AV03/practical-competence consumers; the CF02 tracker and affected limit inventories. Update Architecture/current implementation summaries only for delivered behavior. Mark only satisfied scoped criteria, preserving broad projectile, indirect-harm, learning and scale gaps. The exact parent map is in the technical design.
```

## CF03 — Evade and exploit an opening

```text
Implement CF03: deliberate short evasive movement that can avoid an attack through actual position, with readable observed recovery that the player or character may choose to exploit. Follow AGENTS.md and applicable repository guidance.

After selecting and refreshing the development base under AGENTS.md, create and switch to the new branch codex/evasion-and-counterplay. The starting branch must include the batch 06 planning documents referenced below.

Open prerequisites:
- AV02's equipment/guard owner remains a batch 05 proposal without confirmed implementation/full main merge. Ordinary evasion against the existing stag can start independently; final guard-interruption/equipment integration requires the supplied AV02 result.
- CF02's projectile execution is a new unimplemented assignment in this batch. Only the combined moving-target/locked-shot acceptance waits for it; do not duplicate flight while implementing evasion.
- The pending NPC combat participation answer does not block this assignment's existing-stag movement/feedback scope. Do not decide new NPC target policy, direct PvP, indirect harm or revival.

Read in this order:
1. docs/projects/parallel-batch-06-rivals-and-contested-ground-feature-spec.md: “CF03 — Evade and exploit an opening” and “Presentation and combined experience.”
2. docs/projects/parallel-batch-06-rivals-and-contested-ground-tech-design.md: “Open prerequisites,” “Shared ownership and delivery order,” the complete “CF03 — Evasion through authoritative movement,” and “Documentation and parent reconciliation.”
3. docs/worlds/base/ranged-counterplay.md#evasion and docs/limits/parallel-batch-06-rivals-and-contested-ground.md: proposed exact distance, duration, cooldown and no-immunity boundary.
4. docs/action-capabilities.md#action-availability-and-temporary-execution; docs/targeted-actions.md; docs/worlds/base/first-threat-encounter.md; docs/spatial-world.md: existing movement, attack, perception and collision responsibilities.
5. docs/maintainers/parallel-batch-06-rivals-and-contested-ground.md#cf03--evade-and-exploit-an-opening: task and full completion scope.

Trace packages/domain/src/kernel.ts, action-capabilities.ts, strikes.ts, spatial.ts, spatial-mutations.ts, motion-boundaries.ts and native-work.ts, then the server action-catalogue/decision-context, protocol intentions and current player action controls. Reuse actual movement/support/collision and the one physical-action lane. World definitions own action wording, supported bodies and numeric tuning.

Deliver exact point selection plus an accessible directional alternative, shared read-only prerequisites, committed swept motion and a saved readiness deadline. Obstructions stop at real valid positions; no teleporting, pushing or immunity. Canceling a preparing attack/guard follows its owner and preserves committed costs and recovery. Evasion cooldown must not disable ordinary walking. No automatic dodge, counterattack, new stamina meter or bonus-damage system.

Expose observable preparation/miss/recovery through current scoped action information and result-triggered reconsideration. Do not project hidden opponents or refresh an unseen countdown. Complete the stag success/too-late/blocked/occupied/interrupted/repeated-command/restore cases, normal walking during cooldown, AV02 coexistence and CF02 combined shot evasion. Qualify ordinary player interaction and a second supported movement profile; distinguish native execution from actual autonomous choice. Verification and test authoring follow AGENTS.md.

Reconcile targeted actions, world ranged-counterplay, AC04/AC08/AC09/AC10/AC11, SW05/SW06/SW07/SW15/SW16, BW23, AG07's result-trigger consumer, AV02's guard consumer, the CF03 tracker and affected limits. Preserve broader NPC-quality, body/terrain, parry/rescue and large-scale qualification. Update current behavior summaries only with delivered and actually verified scope; partial integration is not completion.
```

## Remaining three prompts

CF01, CF04 and CF05 intentionally have no copyable implementation block yet. The unresolved choice changes whom opponents may attack, what a companion is agreeing to, and what losing the site encounter can permanently cost. Complete that dependent design and all three prompts in this planning task after Mike's answer; do not dispatch another agent to invent the policy.
