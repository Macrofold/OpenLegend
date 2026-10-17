# Combat and threat responses: limits and constraints

**Selected design, implementation and measurement pending — 2026-10-17.** This inventory owns the new encounter/decision restrictions. Existing physical limits remain in [ranged/evasion](parallel-batch-06-rivals-and-contested-ground.md), animal values in [BW12](base-world.md#bw12--remains-and-native-escape), appraisal representation/tuning in [feelings](feelings.md), provider/context bounds in [cognition](cognition.md) and [AI execution](ai-execution.md), and navigation/native budgets in [spatial](spatial.md) and [native work](native-work.md). Do not copy those limits into competing policy constants.

## CTR-L01 — Short per-opponent presentation continuity

**Proposed — selected for implementation; Restrictiveness: Medium.** The bundled world uses **600 game seconds** of recent hostility for the same exact pair of physical lives, after the latest personally known hostile occurrence or observed active-attack ending. Current observed attacks and an actor's own admitted current attack remain active independently. Pause/downtime do not spend simulation time; normal60:1 makes the grace ten real seconds. Selection, proximity and read refresh do not renew it. [World rules](../worlds/base/combat.md#recent-hostility-grace), [CTR02/CTR09](../maintainers/combat-and-threat-responses.md).

This prevents Speak/Attack flicker during an exchange while allowing ordinary social interaction afterward. A deliberate social override is controller/pair-scoped and expires on fresh hostile evidence or a new explicit offensive choice. Neither the grace nor the override modifies physical permission, emotions or historical memory. The exact duration is a tuning hypothesis, not measured optimal behavior.

## CTR-L02 — Finite prepared response repertoire

**Proposed — selected; Restrictiveness: Medium for first-delivery scope, Liberal for relevant-option retention.** The first world profile has **24 purpose definitions**, composed only with currently installed actions. Stage one semantically judges every natively eligible purpose; stage two selects one exact complete response or an explicit continuation/no-action result. Uncertain relevance is retained. No fixed top-N selection may silently hide a relevant purpose; absent native capability is an explained omission, and incomplete work is not irrelevance. [Catalogue](../worlds/base/threat-response-options.md#3-first-delivery-purposes), CTR05/CTR07.

This avoids mandatory generated thoughts while preserving meaningful motives. It excludes unsupported grapple/disarm/compulsory help and infinite attack loops. Definition count alone does not bound work: target/tool/destination bindings grow with visible density and usable possessions. Filter and share actor/tool preparation before expansion; use existing complete-context/byte/work admission with explicit refusal/defer, not silent truncation. A future catalogue expansion must fit the same supported action, context and installation owners; this file does not grant unbounded provider payloads.

## CTR-L03 — Two-stage work and urgent capacity

**Proposed — selected; Restrictiveness: Safe.** A threat-response pipeline uses a required relevance call followed by a dependent choice call, with no required thought-generation call. Independent source-bound appraisal questions may share stage one. Never run those two stages concurrently or pay for a Cartesian product of purposes and feeling amounts. No automatic paid retry, model-failure retaliation or unlimited generative fallback is selected.

Replace the current single global immediate-decision slot with **at most2 pipelines per world, at most1 per actor, and at most1 ordinary pipeline at a time**; two urgent pipelines may use both positions. Thus ordinary generation cannot occupy both positions and block a fresh urgent actor by itself. Shared provider capacity, durable reservations and task/account funding still apply; a free slot is not money. Queue overflow or missing funds defers truthfully through the existing owner. CTR07/CTR08 own implementation; [technical contract](../projects/combat-and-threat-responses-tech-design.md#bounded-urgent-concurrency).

This is a small initial concurrency envelope, not measured population capacity. Ready-queue actors and retained cues can grow with active population even though simultaneous dispatch is bounded. Coalesce replaceable scheduling signals while retaining distinct causal evidence; preserve current queue admission and fairness, and measure queue age/backlog. Do not discard a person's incident to meet a latency claim.

## CTR-L04 — Chosen pursuit, hold and reassessment limits

**Proposed — selected; Restrictiveness: Safe for first delivery.** The [world commitment profile](../worlds/base/threat-response-options.md#5-first-delivery-commitments-and-reconsideration-tuning) supplies **600 game seconds** for finite pursuit/hold, a **30-metre** pursuit anchor boundary, **120 game seconds** for a selected quiet assessment, and **0.75 metres /12 game seconds** of band hysteresis/stabilization. Each offensive selection authorizes **one strike**, including only its explicitly admitted approach. Actual injury or credible new attack wakes immediately; stabilization does not postpone native loss-of-reach, sight or collision checks.

These values make commitment and stopping inspectable and discourage endless chase. They are independent of CTR-L01 even when a duration happens to match. Restore/resumption preserves the original anchor/deadline; a fresh extension requires a new choice. General repeat attacks, multi-agent command plans and unsupported search patterns remain outside this release. CTR07/CTR08 own delivery; no live choice/latency result is established here.

## CTR-L05 — Complete evidence versus growing transient records

**No independent count cap selected; Restrictiveness: Too liberal until complete-path density is qualified.** Active/recent per-opponent records grow with personally encountered physical lives inside the installed lifetime; anonymous causes and concurrent attacks can also grow. A finite time horizon is not a bound on events per interval. Current ongoing attacks/commitments can retain a relation beyond the recent grace. This project adds no permanent second battle history: current summaries keep source references and native watermarks while historical occurrences remain in their existing owner.

Known-pair queries are direct; actor-local membership and exact observed flight keys replace world-wide pair/projectile scans. Relevant motion, observation and due deadlines update only affected readers. Retire completed transient episodes and controller-local preferences under lifecycle/privacy rules. If complete required preparation exceeds existing budgets, expose incomplete work and keep eligible cues rather than silently dropping opponents. Measure cold reconstruction, local density, two simultaneous actors and repeated short attacks through server publication, not only an isolated map lookup. CTR02/CTR08/CTR10.

## CTR-L06 — Verification sample and realistic claims

**Proposed — selected evidence gate; Restrictiveness: Safe for sample scope, no universal quality guarantee.** Ada's initial release gate is **12 predeclared ordinary cases**, covering idle/moving/interruptible work and unarmed/usable melee contexts, twice each. Every case must independently begin an admitted physical counterattack. Retain failures; do not reroll or inject actions to obtain a pass. Different personality, unknown source, impossible geometry, incapacity and outage cases are separate truthful controls. [Acceptance contract](../projects/combat-and-threat-responses-tech-design.md#independent-character-acceptance--ctr10).

The sample establishes only the specified release evidence. The design introduces no measured maximum provider latency, native speedup, successful population size or proof of enjoyment. Report full observed timing/cost distributions and failure cases. Native animal/model-free checks, independent-person decisions, player usability and balance have separate outcomes. No paid game calls occurred in the documentation task.

## Removed or superseded policies

- **Selected removal, not yet removed from runtime:** non-target-body projectile immunity and post-release target-specific lethal suppression. RC01 and [Player Danger](../worlds/base/player-danger.md#selected-release-time-review-revision) own the exact history and remaining physical/participation boundaries.
- **Selected removal, not yet removed from runtime:** direct human PvP denial and mandatory separate mode/area enrollment for this bundled world. [FT04](base-world.md#ft04--proposed-human-risk-and-recovery) and [world participation](../worlds/base/lifecycle-and-protection.md#human-conflict-and-recovery) own that change; fully inactive protection stays.
- **Selected replacement, runtime pending:** one-threat local animal steering and uniformly slow fleeing. BW12 owns the native escape/speed replacement and deferred ecology.
- **Selected replacement, runtime pending:** damage-proportional automatic fear for the threat-response profile. [Feelings](feelings.md) and the [psychological profile](../worlds/base/psychological-reactions.md#interpreted-threat-reactions) own source-linked personal interpretation.
- **Selected removal, runtime pending:** suppressing relevant ordinary action alternatives solely because work is active. CTR05 preserves real interruption/cost/refusal semantics instead of removing their protection.

## Maintained records

- Implementation: [CTR01–CTR10](../maintainers/combat-and-threat-responses.md).
- Design: [Feature specification](../projects/combat-and-threat-responses-feature-spec.md), [technical design](../projects/combat-and-threat-responses-tech-design.md).
- Review candidates: [Limits to revisit](../maintainers/limits-audit.md); selected numbers require play evidence, not automatic expansion.
