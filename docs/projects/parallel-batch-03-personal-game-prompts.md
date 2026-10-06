# Parallel batch 03 — Personal game — assignment prompts

| Status      | Current progress                                                                                                                      | Last updated |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| In progress | PG01's pricing and explanation fixes pass; one interrupted call awaits exact billing confirmation, and other assignments remain open. | 2026-10-04   |

PG02, PG03 and PG04 are underway on separate branches; their integrated acceptance remains open.

[Prioritized scope](parallel-batch-03-personal-game-feature-spec.md) · [Technical definitions](parallel-batch-03-personal-game-tech-design.md) · [Status and parent mapping](../maintainers/parallel-batch-03-personal-game.md)

Start each assignment from a branch containing this planning packet. PG01–PG04 are delivery assignments; PG05 is design only. They can begin independently; PG01/PG02 live closure additionally requires the configured provider and authorized allowance described in the feature scope. Shared meanings are settled in the technical document, and tasks do not communicate with one another. Follow current AGENTS.md for the development workflow; these prompts add task scope, not separate Git, testing, spending or approval rules.

## Prompt 1 — Make an invention matter in play

```text
Complete PG01: make the existing live invention path deliver a useful result in ordinary play, and repair concrete integration failures you find. Follow AGENTS.md and applicable guidance.

Read docs/projects/parallel-batch-03-personal-game-feature-spec.md: "Recommendation and source baseline", "PG01 — Make an invention matter in play", and "Parallel boundaries and sequencing". Then read docs/projects/parallel-batch-03-personal-game-tech-design.md: "Shared implementation boundary" and "PG01 — Integration definition". Those sections define the full scope, existing source entrypoints, exclusions and completion evidence.

Use the existing supported invention families and ordinary player surfaces. Carry genuine generation through admission, manufacture, equipment/use, finite harvesting, preparation/eating and current-format persistence. Include the supported non-weapon composition and paraphrase/reuse and failure cases specified in the design. Do not seed a finished requested recipe or claim live novelty from a supplied fixture. Reconcile the existing arrow-material assertion against meaningful mechanical rejection. No new invention family, provider deployment or historical accounting waiver is included.

The current native action/preview contracts are already present; other assignments are not prerequisites. Do not communicate with other tasks. Preserve active family-authoring changes and keep UI redesign, character behavior and preview optimization with their defined owners.

Update PG01 in docs/maintainers/parallel-batch-03-personal-game.md and the exact linked INV/WW/NP03/TODO subsets whose acceptance you demonstrate. Keep canonical behavior, limits and existing verification reports synchronized under the documentation policy. Unavailable live execution is an explicit qualification gap; do not mark wider deployment or historical-accounting gates complete. Deliver the entire scoped journey and report actual results and remaining limits.
```

## Prompt 2 — One resident with reasons to act and stop

```text
Complete PG02: improve one resident's attended-world behavior so current motives lead to real action, outcomes reach reconsideration, and obsolete purposes do not cause endless repetition. Follow AGENTS.md and applicable guidance.

Read docs/projects/parallel-batch-03-personal-game-feature-spec.md: "PG02 — One resident with reasons to act and reasons to stop" and "Parallel boundaries and sequencing". Read docs/projects/parallel-batch-03-personal-game-tech-design.md: "Shared implementation boundary" and "PG02 — Character integration definition". Then use docs/projects/compelling-characters-feature-spec.md and docs/maintainers/character-experience.md for the larger target; this assignment is the explicitly bounded initial slice, not all CE work. Apply the behavioral-debugging skill referenced by the technical definition.

Trace the actual trigger, permitted context, offered choices, selection, admission, execution and next decision. Use the existing authored resident, complete accepted identity, body, appraisals, memory, goals and plan owners. Demonstrate the bodily, social and solitary contrasts plus quiet internal opportunity, stopping and interruption/resumption specified in PG02. Diagnose with controlled variations, generalize any successful hardcoded experiment, and simplify the resulting context. Do not prescribe a timetable, install a hunting goal, invent observed experience, add universal psychological meters or create constant paid introspection. Do not treat proximity or an activity name as automatic fulfillment.

The existing native actions and current cognition scheduling are the dependencies; no other assignment must deliver an interface first. Do not communicate with other tasks. Family disclosure/authoring is separately active and excluded. Richer D69 psychological laws and unattended communities remain outside this slice.

Update PG02 and only demonstrated CE01–CE05, AG06/AG07/AG12, CR12 and BW18 subsets using the exact document mapping in the technical definition. Reconcile current behavior, limits and existing evidence without closing broader whole-life acceptance. Report observed behavior, unsuccessful comparisons, total attributable provider cost and genuine remaining gaps.
```

## Prompt 3 — Discover and understand available actions

```text
Complete PG03: make the existing action menu, catalogue and inventory entry points explain useful choices and their commitments clearly. Follow AGENTS.md and applicable UI guidance.

Read docs/projects/parallel-batch-03-personal-game-feature-spec.md: "PG03 — Discover actions and understand their consequences" and "Parallel boundaries and sequencing". Read docs/projects/parallel-batch-03-personal-game-tech-design.md: "Shared implementation boundary" and "PG03 — Presentation definition". Follow its focused handbook and source reading map rather than redesigning the whole interface.

Keep the current context menu, full catalogue and stable player pins. Reuse server-projected action facts for exact target/tool identity, known approach/distance, relevant target condition, duration, consumed resources and meaningful uncertainty. Add only missing permitted detail through the existing projection; no duplicated formulas or universal item score. Keep concise rows and accessible longer details, stable choices during refresh, readable unavailable reasons and remedies, and honest loading/no-match/failure states. Preserve drafts, keyboard focus, narrow/short layouts and exact commands across the full player journey.

PG04 preserves the current command/preview contract, so use that existing interface without waiting for its optimization. Do not communicate with other tasks. Mechanical eligibility, NPC prompt context, family creator controls and renderer/picking changes are outside this assignment.

Demonstrate the full PG03 ordinary and stale/failure acceptance. Update PG03, AC11, relevant UIUX criteria and the scoped DG01/ND13/ND18 records, plus affected action/world-interaction documentation and existing limits/evidence. Do not close remapping, broader first-encounter narration or full accessibility programs from this scoped improvement.
```

## Prompt 4 — Responsive action availability and feedback

```text
Complete PG04: reduce repeated action-preview work while keeping the actual game rules and authoritative command results unchanged. Follow AGENTS.md and applicable performance guidance.

Read docs/projects/parallel-batch-03-personal-game-feature-spec.md: "PG04 — Make action previews cheap without changing admission" and "Parallel boundaries and sequencing". Read docs/projects/parallel-batch-03-personal-game-tech-design.md: "Shared implementation boundary" and "PG04 — Prerequisite evaluation definition". Use docs/maintainers/performance.md#pf05--public-view-and-browser-responsiveness and docs/verification/command-frame-spikes.md for the existing measurements and their limitations.

Confirm current complete-path attribution, then extract/reuse pure prerequisite evaluation for the measured expensive command families through existing semantic owners. Keep previewCommand's current public meaning so callers can work independently. Actual commands must recheck current authority, objects, resources, conditions and targets; preview must not grant authority or consume random values/resources, append events or create durable action state. Do not hide changed behavior in caches, smaller catalogues, reduced rendering quality or weakened sensing.

Demonstrate equivalent enabled/refused decisions and actual transitions, including stale/competing changes, and measure isolated work separately from whole-game command/menu latency and achieved simulation speed. A current profile disproving the hypothesis is a documented no-go, not a reason to manufacture a refactor. Preserve physical-device and broader-load gaps honestly.

Do not communicate with other tasks. PG03 consumes today's interface; its presentation is not yours to redesign. General SQL batching, scheduling changes and family-authoring semantics are excluded. Update PG04, PF05, AC11 and the existing command/frame plan/report with the exact scoped outcome and limits; do not close wider performance qualification without its evidence.
```

## Prompt 5 — Design a first dangerous encounter

```text
Complete PG05 as a design task only: specify one optional wilderness threat that makes observation, movement and useful inventions matter, with meaningful avoidance, confrontation and aftermath. Follow AGENTS.md and applicable design/prioritization guidance. Do not implement runtime combat in this assignment.

Read docs/projects/parallel-batch-03-personal-game-feature-spec.md: "PG05 — Design the first dangerous encounter" and "Parallel boundaries and sequencing". Read docs/projects/parallel-batch-03-personal-game-tech-design.md: "Shared implementation boundary" and "PG05 — Encounter-design assignment definition". Follow its source and canonical-policy reading map, particularly docs/worlds/base/lifecycle-and-protection.md, BW14/MP04 and D07/PS-D01.

Create paired docs/projects/first-threat-encounter-feature-spec.md and docs/projects/first-threat-encounter-tech-design.md. Recommend a concrete first encounter, comparing a territorial animal, hostile person and deferral. Define warning, escape/avoidance, attack and interruption, target loss/disengagement, defeat/recovery and persistent consequences. Distinguish current native support from missing mechanics. Keep policy/content with the authored world and reusable execution with existing engine owners.

Present explicit recommended choices and tradeoffs for unresolved human recovery, NPC lethal consequences, indirect harm and logout; do not silently resolve D07, weaken inactive protection or change cooperative PvP defaults. Cover all PG05 edge scenarios, visible feedback, persistence, costs, implementation stages and acceptance. Avoid raids, factions, deep ecology or a new universal combat framework.

This task has no runtime prerequisite on the other assignments and must not communicate with them. Update PG05 and the linked BW14/DG07/ND11, decision and limits records as proposed design, preserving useful prior requirements and open runtime status. Finish with a concrete owner-decision list and an implementation-ready breakdown conditional on those decisions.
```

## Maintained records

[PG01–PG05](../maintainers/parallel-batch-03-personal-game.md) owns delivery status; the [feature specification](parallel-batch-03-personal-game-feature-spec.md#maintained-records) links canonical requirements and limits. The prompts grant no additional development workflow or operating permission beyond the recipient's actual request and AGENTS.md.
