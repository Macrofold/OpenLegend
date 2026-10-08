# Authored stats — scoped sling competence technical design

| Status      | Current progress                                                                                                                      | Last updated |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| In progress | Selected sling practice and voluntary coaching are delivered and reviewed; human appreciation and broader stat proposals remain open. | 2026-10-08   |

## Scope and delivery contract

Implement only [section 16 of the product specification](authored-stats-feature-spec.md#16-dg14-expansion--become-more-capable-at-something-worth-doing), under [AV03's selected technical decisions](parallel-batch-05-adventure-defense-and-home-tech-design.md#av03--practical-skill-from-committed-experience). The [base-world profile](../worlds/base/practical-competence.md) owns the numbers, wording, applicability and outcomes. The optional roof/2d6 example, other skills, general XP, recipe teaching, personality change and paid teaching are excluded.

Initial implementation used supplied local `main`, `378228e6f388e60efe5e1a446dcf138872e37ffc`, in Macrofold/OpenLegend (`origin`: `https://github.com/Macrofold/OpenLegend.git`). Work is isolated on `codex/av03-practical-competence` in `/Users/mzw/.codex/worktrees/e7af/OpenLegend`. Delivered scope is roughly 1,900 changed logic lines across domain, server, protocol and existing character presentation. The main checkout at `/Users/mzw/Documents/ChatGPT/OpenLegend` is unaffected. The initial detached HEAD at that commit was switched to the named branch. The requested review subsequently rebased onto newer supplied local `main` as recorded below. Material risks were duplicate credit, interrupted cooperation, saved-work integrity and private evidence disclosure.

## Owners and data flow

The installed attribute manifest binds a trusted finite-release competence consumer to an exact supported recipe mechanism. Its authored definition supplies thresholds, accuracy contribution and cooperation/practice descriptions. Another world can omit or revise that definition; engine code does not infer applicability from an item's name.

`practical-competence.ts` owns compact support and reconciliation. Applicable characters hold authored starting support, a bounded set of occurrence/event references and at most one completed coaching reference. The typed attribute reader derives the current value from that support; there is no independently editable earned value or XP counter. Creator initialization is explicit, distinct from earned evidence. Inapplicable bodies have no record; missing applicable state is unavailable, never silently zero.

The existing kernel admits each selected action through shared read-only prerequisites, rechecks release conditions, consumes one compatible projectile and performs the existing single random comparison. A committed outcome records the tool/mechanism, ammunition, applied competence, chance and actual result. Only then does the competence owner add the learner's occurrence/event reference. The sixth independent release and third coached release therefore use the previous value. Later real shots continue filling independent support after early coached improvement.

Existing action occurrences, personal experience and event audiences remain the authoritative records. Explicit correction/forgetting invalidates matching compact support through the current experience owner, including current privacy overlays during restore. Ordinary compaction does not remove support. No correction rerolls or refunds historical material effects. The new practice/coaching occurrences are excluded from automatic learned-method retention; ordinary hunting keeps its existing separate eligibility. Editing other character meters cannot silently convert an earned value into authored starting support. Current-format validation rejects contradictory/malformed progress or unsupported active work; no old-save reader or migration is added. Database format 8 and the current save marker include separate owned practice and active-episode records. Continuously present NPC work survives reopening; existing human departure/load rules cancel unfinished physical work, preserving completed releases and coaching. This consumer does not change presence policy.

## Practice target and safety

The prepared scene supplies a nonliving target component. It never receives animal health, damage, remains or rewards. The new single-shot command uses the existing ranged approach and work lifecycle, with its own target applicability and release checks. The installed profile supplies windup and labels. One active shooter is enforced using current actions; refusal queues nothing.

Safe clearance uses current geometry plus living bodies along the firing segment. Admission permits ordinary approach; clearance is rechecked at the real firing position immediately before release. A newly obstructed lane blocks the shot before ammunition or randomness is spent. This is an abstract hit/miss consumer, not simulated projectile travel. Once windup begins, replacement/cancellation finishes preparation without suspension; already committed shots remain exact.

## Voluntary finite coaching

The learner's request identifies a coach and the exact installed competence revision. The coach's own accept/decline command supplies the second consent. A request schedules no shot, speech or future attendance. Each participant can occupy at most one unfinished episode. Public refusal text does not reveal the coach's private value or progress.

The episode binds a learner release only when the coach actually perceives the event-time action and result through the current observation owner. A remembered story, prior shot or fixture assertion is insufficient. After observation, each participant separately selects feedback. The first selection is explicit cancellable waiting for the other person's choice; no unchosen activity is queued. Both feedback actions belong to one native-work allocation, and its validator checks their episode, participant and pinned-rule ownership on save/reopen. Once both choose, both occupy the feedback activity for its authored duration. Completion rechecks participation, observation support, communication/reach and practiced coach eligibility. Replacement, withdrawal, departure or loss of requirements ends the episode without completed coaching credit; released shots survive.

Completion records one actual episode and native method guidance, without inventing dialogue. The compact benefit does not stack, expire on separation or transfer recipe/method knowledge. Native action choices enter the existing NPC shortlist and judgment path, retaining genuine refusal, alternatives, spending admission and uncertainty.

## Disclosure, lifecycle and work

Server projections expose progress only to the controlled character or separately authorized private inspection. Target inspection can explain its known chance; hunting presents the handling contribution without leaking an animal's hidden condition. Character and action surfaces reuse existing panels and controls. NPC context contains relevant own progress and episode choices, not another character's private evidence. All coaching labels use the observer's known name for the other person. A busy NPC is offered existing stop/continue choices rather than another practice shot that would discard current work. Readable private release evidence is hydrated through the existing indexed history owner in bounded batches, fenced by current world generation and history epoch before disclosure; the UI does not invent past shot details when records are unavailable.

Progress storage is bounded by the installed finite thresholds. Active episodes are separate owned records with participant references and current action identities; terminal episodes leave event/occurrence evidence and release their active allocation. Existing recording, spatial and work limits remain controlling. No native practice/coaching calculation invokes a provider. Real NPC decisions use existing accounting, one shared task ceiling and no automatic paid retries.

## Implementation and verification plan

1. Install the world-authored definition, derived typed state, exact mechanism recognition and correction hook; validate starting support and current-format state.
2. Integrate ordinary-hunt release evidence and later-shot accuracy; add the actual inert target, pure action admission and finish-or-cancel practice lifecycle.
3. Integrate finite request/accept/decline/withdraw and separately chosen feedback, event-time observation, interruption and completion.
4. Connect server admission, private projection, action catalogue, NPC context and existing character/action UI; retain recipe teaching and learned methods under their current owners.
5. Exercise a disposable native scenario through downstream callers: ordinary beginner hunting; six independent releases; three plus completed coaching; missing/declining coach; interrupted feedback; mixed hunts/practice; blocked release; repeated requests; different tools/unsupported bows; correction with and without independent support; save during windup/feedback and reopening. Compare exact projectiles, random state and material results.
6. Obtain separate live NPC choice evidence through ordinary cognition, including a sensible refusal/alternative; record costs and uncertainty. Fixtures establish accounting/lifecycle only. Inspect UI interaction and relevant failure states. Run changed-file formatting, TypeScript and build checks plus selected existing native checks.
7. Review the complete diff, reconcile canonical behavior, limits, trackers and verification report, and commit all task-owned changes. Player appreciation requires human evidence; arithmetic alone cannot satisfy that criterion.

## Delivered evidence and limits

[Qualification](../verification/practical-competence.md) records complete native comparisons, exact ammunition/randomness, correction, PostgreSQL save/restore and browser interaction separately from real model-selected agreement, feedback and refusal. Current prepared-world measurements qualify this narrow workload, not population capacity. The focused existing checks passed 20 of 21 cases; seed 31's territorial-stag placement also fails on the exact selected base. That unrelated scene gap is tracked by PG05. Human appreciation remains unmeasured, so PC06 and the broader project remain open.

## Requested implementation review

The October 6 follow-up authorizes a complete review with fixes, performance checks and documentation reconciliation. The unpublished branch was rebased onto supplied local `main` at `d6544ee7cbc57f997bc60b91138361ae7cc984a0`; patch comparison confirmed unchanged runtime code and retained both newer documentation decisions. The checkout and branch remain those named above, and the main checkout is unaffected.

The review plan covered the complete consumer through action availability and execution, evidence/correction, cooperative work, SQL/private projection, NPC discovery and the target/character UI. It estimated roughly 150–350 changed logic lines, with risks of stale disclosure, duplicate/lost credit, unsafe release, inconsistent saved work and costs that grow with unrelated entities. Fixes preserve authored scope, exact projectile/random/material accounting and voluntary participation, using existing semantic owners and derived indexes rather than duplicate writable state.

The completed review measured matched before/after target checks with increased distant inert objects, reran native comparisons and PostgreSQL continuity/correction, and inspected narrow/short windows and the game's 130% UI scale. It fixed endpoint/height safety, saved ownership, repeated observation announcements, repeated episode scans and exact equipped-tool presentation. Menu/context construction now uses compact status without rendering historical release text. Unchanged live-choice evidence was reused. [Review evidence](../verification/practical-competence.md#requested-review--october-6-2026) records the results and limits; no additional paid calls ran.

Immutable snapshots reuse a derived target/action index maintained from existing exact entity writes, rather than a second writable reservation. Drafts/builders read their current actions directly. A living-only spatial selector rejects inert objects before exact segment/body checks, with conservative bounds accounting for bodies indexed at their feet. Each feedback update checks its own episode; one transition-end sweep also reconciles requests/observation and prunes the empty collection. Saved validation protects participant/action/pinned-rule ownership, record identity and valid start time. The first qualifying observation is retained and announced once. These are rebuildable selectors and stricter integrity checks, with no new world cap or policy.

Cold root/index construction, the once-per-transition active-episode sweep, dense living crowds, long history and full-server capacity still need broader qualification before expansion; [PC05](../maintainers/practical-competence.md#pc05--continuity-authority-and-cost) owns that work. Human appreciation remains open.

## Second requested review — October 7, 2026

Review the complete consolidated delivery after reconciliation with supplied local main `c3800cba0465f1e30ef45306eda793579fd02310`, including reciprocal barter and newer guidance. Preserve both command schemas, exact resource/randomness ownership and all prior supported behavior. The rebase maps delivery `524284cd3` to `243163b06`; conflicts combine imports, independent command fields and documentation, retaining main's broader performance read requirement.

The review plan identified missing reverse ownership of active feedback actions and their actual partner target, estimating roughly 20–40 changed logic lines in the existing validator. The completed fix rejects detached feedback, a wrong partner target and feedback saved as travel. Valid work remains the already-chosen activity; no malformed save is repaired or migrated. Native comparisons, a genuine episode with malformed copies, frozen target-ownership and elevated-body checks, disposable SQL restoration/correction, TypeScript, build and guidance/format checks qualify the selected paths. The validator reuses its existing entity scan with constant checks per action; no new runtime polling, index or framework was introduced. [Second-review evidence](../verification/practical-competence.md#second-requested-review--october-7-2026) retains the exact scope and limits. Unaffected live-choice/browser evidence is reused. No new product rule or paid call is selected; human appreciation and broader capacity remain separate unqualified work.

## Open decisions and completion

No unresolved product choice blocks this selected consumer. Native checks and actual choice evidence are required delivery work. Player enjoyment remains an explicit evidence limit until observed; it must not be represented as proved by a finite counter or probability calculation. Completion means all authorized runtime integration, correction/lifecycle cases, selected verification and documentation are delivered; broader authored-stat proposals remain unimplemented.

## Maintained records

- Implementation and unmet acceptance: [PC02–PC06](../maintainers/practical-competence.md), [AV03](../maintainers/parallel-batch-05-adventure-defense-and-home.md#av03--useful-competence-and-voluntary-coaching).
- Limits and constraints: [ST-L08–ST-L13](../limits/authored-stats.md).
- Product counterpart: [authored stats](authored-stats-feature-spec.md); authored rules: [practical competence](../worlds/base/practical-competence.md).
- Shared contracts: [action experience](../action-experience.md), [action capabilities](../action-capabilities.md), [save/load](../save-and-load.md), [memory/evidence](../memory-architecture.md).
