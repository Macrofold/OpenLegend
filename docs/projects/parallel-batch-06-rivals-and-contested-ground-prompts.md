# Batch 06 — Rivals and contested ground implementation prompt

| Status      | Current progress                                                                                                                           | Last updated |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------ |
| Not started | One assignment covers all CF01–CF05 work; required earlier implementations are available on local main, and runtime delivery remains open. | 2026-10-08   |

This replaces the five separate prompts at the owner's request. Their interleaving dependencies are now internal steps for one agent, on one branch; all existing scope and acceptance remain. CF01–CF05 identify work parts, not separate workers. This document prepares a future implementation assignment; updating it does not launch that work.

[Full feature scope](parallel-batch-06-rivals-and-contested-ground-feature-spec.md) · [Technical design and readiness evidence](parallel-batch-06-rivals-and-contested-ground-tech-design.md#open-prerequisites) · [Work tracker](../maintainers/parallel-batch-06-rivals-and-contested-ground.md)

## One assignment — Complete rivals and contested ground

Planned branch: `codex/rivals-and-contested-ground`. It was absent from inspected local/remote refs on October 8; this documentation task creates no branch. Readiness is based on local `main` at `fcea9e572785018edbc67192a7c0d80d9b7676e0`, also the refreshed `origin/main` from `https://github.com/Macrofold/OpenLegend.git`. Use a starting checkout that includes this consolidated prompt as well as those implementations.

```text
Implement all of Batch 06 — Rivals and contested ground, covering CF01–CF05 as one complete assignment. Deliver purposeful armed opponents, real aiming/projectile flight/cover, evasion, voluntary combat help and the Broken Watchpost with finite rewards and persistent consequences. Follow AGENTS.md and applicable repository guidance.

Start from local main containing this consolidated Batch 06 prompt. After selecting and refreshing that base under AGENTS.md, create and switch to the new branch codex/rivals-and-contested-ground.

Start readiness: Ready on the documented local-main baseline. Equipment/shield defense, sling practice, physical method learning, known places, voluntary outings and ordinary resident decisions are already available. The technical design records the inspected commits and evidence; confirm the required implementation is present on your actual base.
Open prerequisites: None. CF01–CF05 are parts of your assignment, not deliveries to obtain from other agents. Complete them together without peer communication, intermediate handoffs or waiting for another task.

Read these documents first:
1. docs/projects/parallel-batch-06-rivals-and-contested-ground-feature-spec.md — full player experience, accepted NPC lethality, all CF01–CF05 scope and completion criteria, presentation and combined experience.
2. docs/projects/parallel-batch-06-rivals-and-contested-ground-tech-design.md — baseline and available prerequisites; Shared ownership and delivery order; every CF01–CF05 section, including its source map, mechanics and acceptance; Documentation and parent reconciliation.
3. docs/maintainers/parallel-batch-06-rivals-and-contested-ground.md and docs/limits/parallel-batch-06-rivals-and-contested-ground.md — retained work IDs, completion tracking and supported limits.

Use the linked canonical sources as each part requires them: docs/worlds/base/ranged-counterplay.md for exact shot/evasion rules and tuning; docs/worlds/base/contested-watchpost.md for people, motives, equipment, routes and stock; docs/worlds/base/lifecycle-and-protection.md#npc-combat-participation for accepted attack permissions. The design also links current action, movement, knowledge, character-authorship, consent, equipment, practice and persistence owners. Reuse those implementations; do not rebuild earlier batches.

Implement in this internal order, preserving every requirement in the feature/design pair:
1. CF01 foundation: one common attack-permission result across player, model, plan, temporary and restored actions, plus the ordinary melee path. Hostile NPCs may kill other NPCs, including Ada. Preserve direct PvP denial, inactive-player protection, exact human lethal review and attribution of who issued an attack. Permission must never itself choose aggression.
2. CF02: one aiming/release/flight owner shared by explicit Aim/Shoot/Cancel and one-shot hunting. Commit finite ammunition once, resolve real swept collision against moving bodies and cover, and integrate existing shields and practice evidence. Preserve review, physical-life identity, interruption, privacy and current-format restoration. No old direct-injury fallback or collateral damage.
3. CF03: deliberate short evasive movement through existing movement/support/collision, with readable observed preparation and recovery. Preserve committed costs and cooldowns, normal walking, blocked/interrupted outcomes and restoration. No teleportation, immunity, automatic dodge or automatic counterattack. Include actual projectile evasion.
4. Finish CF01: authored Kest/Orin content and real loadouts using ordinary goals, knowledge, decisions and bounded continuation. Demonstrate independently chosen melee/ranged/evasive behavior, lost-sight limits, adverse-result adaptation and meaningful refusal/withdrawal alternatives. No actor-ID controller or tactical script hidden in biographies.
5. CF04: extend existing exact request/consent for voluntary help against one known opponent. Acceptance establishes a revocable purpose, not remote control or an automatic attack. Preserve refusal, separate outing consent, participant/opponent lives, lost-contact uncertainty and committed consequences when helping ends. Include clear request/termination controls and a second ordinary helper.
6. CF05 and combined acceptance: author Broken Watchpost with two real approaches, visible physical cover, the specified occupants and finite equipment/cache. Reuse discovery, custody, remains and physical method learning. Implement actual reward use and persistent aftermath without kill-count locks, duplicate drops, respawns, refill or a second victory flag.

Keep world content, rules, tuning and wording with the authored world; shared execution stays with its existing engine owners. Complete player controls and truthful character/observer information alongside each feature. Follow the existing presentation requirements for readable action details, reachable cancellation, keyboard/reduced motion, chat interaction and narrow/short layouts.

Completion means all CF01–CF05 acceptance and the ordinary-player encounter are demonstrated: discovery, both approaches, real opposition, cover/evasion/guard, optional willing help, finite reward use, departure and save/load revisit. Include loss/return, persistent NPC death, an outcome without killing both occupants, competing visitors, and the design's stale/replay/interruption/privacy cases. Distinguish native execution from actual character-choice evidence; record the specified latency/work and usability limitations without claiming general scale or enjoyment. Verification, whether to author tests, paid calls and cost reporting follow AGENTS.md. These stages are internal implementation order, not separate stopping points.

Keep the feature spec, technical design, Batch 06 tracker, limits and prompt status synchronized. Follow the technical design's Documentation and parent reconciliation table to update every overlapping canonical specification and maintainer criterion, including action capabilities/experience, world content, agency/character experience, spatial work, invention launcher scope, physical custody, and the scoped AV01–AV03/PX03–PX04 consumers. Preserve broader unfulfilled parent criteria. Record evidence under the existing documentation policy. When the entire agreed project and required checks are complete, mark it completed and move its project documents with repaired references as AGENTS.md requires.
```
