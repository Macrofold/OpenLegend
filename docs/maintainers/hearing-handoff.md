# Hearing feature — fresh-conversation handoff

This is an onboarding and audit index, not another specification or task tracker. A new agent can continue this feature without the original conversation by following the owners below. Read from **`feat/hearing-speech-captions`**, not the repository default branch or the earlier documentation-only branch.

## Current checkpoint and integration

The runtime/documentation checkpoint audited here is `408c2b240e4c08cd2f6653f649dbae6cc56b96b6`. Its committed implementation, review fixes, profiling drivers, accepted specifications and recovery tracker are on the remote feature branch. This handoff adds documentation only; it is not new runtime or benchmark evidence.

Main is integrated through `03105fed9209c126e4e69e9faeb4687f42d1e74a`, including the substantial `fdcbd31fc9e4eb31daaf00d997648aba588c8577` rules update. Earlier integration preserved checkpoints with connector-published merges; it was **not** a completed linear rebase. At this audit, main had advanced to `8f72e945894340fa262ef0196c2520492c04e16a`: the feature was four main commits behind and [PR #3](https://github.com/Macrofold/OpenLegend/pull/3) was draft with conflicts. Re-read both refs and PR state before acting. The preceding conversation's statement that there were no conflicts is no longer current. Integration after the audited checkpoint is not verified by the older measurements.

## Start here

1. Read [AGENTS.md](../../AGENTS.md), then the applicable review, performance, design, documentation and verification routes it names. Discover applicable nested instructions. The repository rules are part of the integrated branch, not assumptions from the original chat.
2. Read [Hearing delivery — recovery and next execution](hearing-and-speech.md#recovery-checkpoint-and-next-execution). It owns HE01–HE05 status, execution order, strict invariants and rejected experiments. Read its whole delivery/deferred section before choosing work; a checked implementation item is not acceptance of every target behavior.
3. Read [Hearing and speech](../hearing-and-speech.md), [Timed UI](../timed-ui.md) and [Perceived World Events](../perceived-world-events.md). These are the accepted feature contracts.
4. Read the [implemented hearing architecture](../architecture.md#hearing-captions-and-perceived-events), [performance design](../performance.md), [performance tracker](performance.md), and [latest 8× evidence](../verification/hearing-8x-continuation.md). PF03/PF09 and HE05 own the immediate remaining scale work; SW08 remains the related spatial owner.
5. Use [the maintainer index](README.md), [deferred regression coverage](TODO.md#hearing-captions-and-perceived-events--deferred-validation), [policies to revisit](revisitable-policies.md) and the decision register for dependencies. Follow linked subsystem owners rather than reading the entire research archive.

## Conversation decision map

This map preserves the material accepted decisions and their evolution without copying the full contracts. Numeric defaults remain reversible tuning, not universal world laws.

| Topic from the conversation | Canonical owner / location |
| --- | --- |
| Continuous referenced dB SPL, source/received/noise/floor separation, three thresholds and four outcomes; whisper/normal/shout and source-specific reach | [Hearing §§2–4](../hearing-and-speech.md#2-continuous-quantities-three-thresholds); authored coefficients remain under `packages/domain/src/worlds/base/` |
| Audible-but-unintelligible versus undetected sound; clear words do not imply an identified speaker; visible-only speaking has no heard words | [Hearing §1](../hearing-and-speech.md#1-product-behavior) and [recognition](../hearing-and-speech.md#source-and-delivery-recognition) |
| One speech world event; immutable listener evidence shared across UI, Talk/history, cognition, memory, recall, embeddings and Narrator; no second speech log | [Hearing §5](../hearing-and-speech.md#5-one-occurrence-listener-specific-evidence) and [World Events](../perceived-world-events.md) |
| Stable partial fragments near 50%, one-word behavior, Unicode, missing negations, no hidden original text in CSS/ARIA/client data, no reroll or retroactive identity | [Hearing §6](../hearing-and-speech.md#6-partial-text-and-privacy) |
| Whispering is physical rather than a private message; intended addressee/conversation membership grants no hearing; missed replies preserve volume; no omniscient listener receipt | [Hearing §4](../hearing-and-speech.md#4-speech-volume-and-admission) |
| Plain white readable quoted speech with a small icon, contrast backing, screen-sized text, chunking, bounded queues and distinct narration/private thoughts | [Hearing §7](../hearing-and-speech.md#7-caption-component-and-lifetime) |
| Player-centered invisible directional ring, not screen-edge or hidden-source coordinates; coarse arrow, vertical/neutral fallback, loss-of-sight behavior and historical-bearing movement cutoff | [Hearing §8](../hearing-and-speech.md#8-listener-centered-directional-captions) |
| Reusable small countdown ring and separate presentation lifetime; reading time independent of simulation/physical speech; pause, hidden tab, reduced motion and stale hidden-caption residence | [Timed UI](../timed-ui.md) and [speech queue policy](../hearing-and-speech.md#7-caption-component-and-lifetime) |
| World Events below Journal, All/Speech filters, cross-conversation speech history, durable actor-scoped pagination, no private-thought/diagnostic dump, scoped invalidation | [Perceived World Events](../perceived-world-events.md) |
| Event-time admission, instantaneous committed speech in v1, no streaming of uncommitted provider drafts, no hearing upgrade by approaching later | [Hearing §9](../hearing-and-speech.md#9-event-time-semantics-and-delivery) |
| No generic historical speech rewriting; ordinary spoken corrections, importance edits and guarded deletion remain supported | [Editing committed speech](../hearing-and-speech.md#editing-committed-speech). The future administrative re-authoring question is now [D63](../../archive/05-project/open-decisions.md#d63--re-authoring-committed-speech), not the old D61 number used earlier in chat |
| 8× target, exact listeners/privacy and one-second evolution, safe conservative filtering/caches, bounded native slices, transactional persistence and optional derived-work deferral | [Performance](../performance.md), [PF03/PF09](performance.md) and [HE05](hearing-and-speech.md#he05--runtime-and-performance-qualification) |
| The explicit performance compromise: routine visual discovery every four simulated seconds; not sampled speech, contact or explicit interaction | [Base-world routine visual discovery](../worlds/base/survival.md#routine-visual-discovery) and [RP03](revisitable-policies.md#rp03--base-world-visual-discovery-cadence) |
| Engine/world separation, pure native authority, one mutation owner, no speculative runtime/framework, and finite extensible families | [AGENTS.md](../../AGENTS.md#boundaries), [engine/world boundary](../engine-and-world-boundaries.md), [status effects](../status-effects.md) and the hearing extension boundaries |
| No historical utterance remasking, later in-place structural save evolution, and the still-unimplemented pre-hearing shape upgrade | [Hearing §10](../hearing-and-speech.md#10-persistence-cutover-and-integration-boundaries), [active save policy](../save-and-load.md#active-development-policy), [RP02](revisitable-policies.md#rp02--development-state-compatibility) and the unchecked HE05/SL task |

## Do not confuse these states

**Transfer-ready is not merge-ready or scale-qualified.** HE01–HE04 describe delivered feature implementation; HE05 still contains acceptance failures and unfinished work. The latest named 344-entity, 60-second disk-SQLite run accepted 480/480 utterances and kept up with its active 8× clock, but cold/tail slices and the 100-person native workload still fail their targets. Other hosts previously failed even the smaller whole-runtime workload. Read the workload and denominator with every result. Real PlayCanvas/camera, PostgreSQL, live-provider, named-save rewind, accessibility and long-session qualification remain open.

**The initial reset policy is superseded.** Earlier chat and historical verification describe a hearing-specific save format and a fresh data directory. The integrated current rule is narrow in-place structural evolution without replaying old hearing. The hearing architecture section and save/load owner express that rule. Some older spatial/attribute overview paragraphs and D60 wording still reflect the superseded blanket no-migration approach; do not use them to reinstate a feature reset gate. Reconcile that remaining overview wording with SL ownership when touching compatibility. The pre-hearing structural upgrade is explicitly unfinished, not silently supported.

**Target requirements can remain undelivered.** Explicit caption-overflow/gap notices, a dynamic filter catalogue, large-list windowing, cold-history hydration for a retried chat, further indexing fairness, invention embedding batching and cross-runtime tokenizer qualification are named in [HE deferred expansion](hearing-and-speech.md#deferred-expansion). Advanced room acoustics, physical timed speech, voice recognition, language comprehension, waking/injury and full environmental sound processes remain deliberate extensions, not implicit features.

**Rejected experiments are not branch code.** The mutable-entity working-set prototype, per-condition read snapshots and per-status-instance copying were discarded or never published. Rationale and observed limits are retained in the verification annexes. Continue from remote source, not reconstructed snippets of those prototypes.

**Raw experimental artifacts are not all preserved in Git.** Temporary programs, private disposable databases, raw CPU profiles and intermediate logs were kept outside the repository. The branch preserves substantive conclusions, measured summaries, comparison scope/digests and committed repeatable profiling drivers. It is not a verbatim chat archive or a claim that every temporary diagnostic can be recovered byte-for-byte.

## Review evidence and code entry points

[Verification](../verification.md#hearing-runtime-and-performance) records the initial implementation and three review passes: unknown-identity/backfill and editor fixes, indexed history/persistence, no-word recall filtering, caption queue/scoping fixes, actor-local indexing, byte-aware embedding batches, budget isolation and dispatch/publication/forgetting races. [Cache review](../verification/hearing-cache-review.md) records crowd-cache behavior and independent speech demand. [8× continuation](../verification/hearing-8x-continuation.md) records prepared predicates, exact opaque-path rejection, current measurements and failed gates. These are historical observations, not checks newly run by reading this handoff.

Useful code owners are `packages/domain/src/{acoustics,speech,perception,events,conversations,draft,kernel,status-effects}.ts`, `packages/spatial/src/{geometry,segment-bounds}.ts`, `apps/server/src/{history,perceived-events,recall,speech-recall,embedding-batches,world-service,view,http}.ts`, and `apps/client/src/{speech-captions,ui-lifetime,scene,world-renderer,main}.tsx/ts` plus `ui/world-events.tsx` and `design-system/progress-ring.tsx`. Resolve exact filenames from the tree; these groups are navigation, not a new ownership layer.

Use the existing [profiling guide](performance-profiling.md), `scripts/stress-native.ts`, `scripts/stress-hearing.ts`, `scripts/stress-hearing-cache.ts` and `scripts/performance/scenarios/mixed-8x.json`. Always use fresh disposable output paths. Native throughput, disk/server demand, graphical response and live inference are different measurements.

## Continuation discipline

Work on `feat/hearing-speech-captions`; use the GitHub connector for Git reads/writes/integration and commit coherent progress at least every five minutes while changing it. Do not modify or merge into main without authorization. Start each resumed pass by making intended work and recovery status accurate in the existing focused trackers.

The inherited task authorizes runtime/manual execution and stress profiling, not automated suite authoring/execution. Follow [verification guidance](../../.agents/rules/verification.md); do not weaken normal CI or erase unmet regression tasks. Earlier full typing retained 168 baseline test/fixture diagnostics; a passing production build was not a green full check. Recheck after integration rather than treating that diagnostic count as permanent.

One aggregate $10 ceiling covers this continuing implementation task; earlier recorded provider spending was $0. A new conversation, provider or delegate does not reset uncertain/settled spending. Native work uses zero provider budget. Paid verification still needs credible accounting and authorized credentials.

After rechecking current integration, follow the HE recovery order: preserve comparable workloads, address measured dense/cold costs, verify intermediate semantics and immutable ownership, rerun independent-demand/persistence stress, and reconcile implementation/acceptance status in its owners. Do not move benchmarks into accepted design or declare 8× success by dropping eligible listeners, events, admitted time or output demand.
