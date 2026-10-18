# Art, audio and game feel

**Status: In progress — focused Sea of Stars pass incorporated October 18, 2026. Topic: PRESENT.** Wider source comparison remains open.

[Topic map](README.md) · [Coverage tracker](coverage.csv) · [Assessment records](assessment-records.md#sea-of-stars-focused-incorporation--october-18-2026) · [Sea of Stars dossier](../dossiers/sea-of-stars.md)

## Scope and questions

What makes ordinary moments expressive, legible and satisfying?

- Compare coherent visual identity, silhouettes, animation, camera, sound, music and tactile feedback.
- How do cues communicate action, material, danger, emotion and inhabited place without excessive noise?
- Which expressive choices earn production cost, and when do spectacle or fidelity undermine clarity and tone?
- When an action asks the player for physical timing or precision, does the interaction clarify the action and deepen mastery, or merely add repeated attention cost?

## Ownership boundary

PRESENT owns expressive execution and immediate feedback. Navigation/controls belong to TRAVEL and UX, the world's physical result belongs to the action/world owner, and setting meaning belongs to LORE. A visual or audio cue may communicate a fact without becoming the source of that fact. This is research, not an approved OpenLegend implementation.

## Focused evidence — Sea of Stars

Evidence: [G178 dossier](../dossiers/sea-of-stars.md), [ten-image art study](../../../../art-direction/research/sea-of-stars/README.md), six independent reviews, player testimony and creator accounts. This is a single-game source, not cross-game consensus.

Sea of Stars is useful because it exposes both sides of presentation quality. Reviewers repeatedly praise its color, lighting, animation, movement and music, while several of the same reviewers criticize repeated combat decisions or timing inputs. Beautiful feedback can amplify a worthwhile action, but cannot create strategic variety by itself.

The official imagery also shows a consistent composition pattern: large forms establish the place, medium-scale materials and uses explain it, and fine accents reward attention. Open water, ground or shadow gives those details room to read. Lighting is strongest when nearby surfaces participate in one understandable event rather than when bright accents are spread uniformly.

## Consolidated lessons and tradeoffs

### PRESENT-L001 — Organize richness before increasing detail

A scene should read at three levels: a recognizable large form or route, medium features that explain material and use, and selected fine accents. Quiet regions are part of the composition rather than unused space.

This supports expressive environments without making every surface equally detailed. It also gives performance work a better target: removing indiscriminate noise need not remove the scene's identity. The [Sea of Stars tree and coastal examples](../../../../art-direction/research/sea-of-stars/README.md#1-a-memorable-route-can-also-explain-its-environment) are evidence for the visual pattern, not proof that the same camera or sprite construction should be copied.

### PRESENT-L002 — Light should belong to an event and a place

A dominant light is more convincing when neighboring stone, cloth, water, skin and vegetation respond coherently while retaining their material differences. The player's eye can then infer source, reach and atmosphere.

OpenLegend's implication is already consistent with its current art direction: prefer a small number of purposeful light relationships over unexplained bright patches. A screenshot cannot establish the source game's renderer, moving-shadow stability or performance.

### PRESENT-L003 — Execution feedback should clarify a meaningful action

Sea of Stars uses different gestures for different actions: impact timing, hold/release, repeated deflection and defensive timing. The strongest example is Sunball, where preparation visibly changes before release. Several reviewers nevertheless report that repeated active inputs become tiring or fail to compensate for limited tactical growth.

The transferable principle is not “add timing minigames.” It is: when an admitted action benefits from human skill expression, its input should communicate what the character is doing and produce a legible consequence. If the surrounding decision no longer changes, extra execution demand can become busywork. This research question is registered as [ND38](../../../../docs/maintainers/needs-design.md#nd38--player-skill-during-action-execution).

### PRESENT-L004 — Presentation convenience must not rewrite physical identity

A distinctive scar, handed tool, closure, missing part or carried object should stay attached to the same side and person across supported views. A creator account describes Sea of Stars deliberately mirroring a scar for retro presentation; OpenLegend's grounded-world target chooses continuity instead.

This is more than polish for a world of remembered individuals. Recognition, equipment and later evidence can refer to persistent physical facts, while the renderer remains only their depiction.

## Current OpenLegend baseline and existing design owners

The [creative brief](../../../../art-direction/final-board/creative-brief.md), [current art decisions](../../../../art-direction/decisions.md), [3D pixel-art feature specification](../../../../docs/projects/3d-pixel-art-feature-spec.md) and [scene production workflow](../../../../docs/production-workflows/scenes-and-interfaces.md) already own the selected visual direction and production route. This pass strengthens their acceptance questions; it does not select a renderer or reopen the current believable-proportion requirement.

Player interaction is separately owned by the UI handbook and action contracts. [ND38](../../../../docs/maintainers/needs-design.md#nd38--player-skill-during-action-execution) records the newly explicit design gap between choosing an action and skillfully executing it. Existing combat response design remains authoritative until a later scoped design is selected.

## Complete situations and cross-topic consequences

| Situation | Useful presentation | Failure to avoid |
| --- | --- | --- |
| A player crosses a distinctive fallen tree above water | The tree's silhouette and material establish the route before bark/moss detail; open water preserves legibility. | Decorative foliage obscures footing or implies unsupported traversal. |
| A fire or magical event lights nearby people | Nearby materials share the event's light while retaining distinct responses. | A bright texture claims illumination the world does not provide or exposes hidden facts. |
| A player prepares and releases an attack | Preparation, release and result each have readable visual/audio cues; any skill interaction corresponds to the actual action. | The input becomes an unrelated overlay, repeats after the decision is solved, or invents success before native admission. |
| A recognizable person turns around | Body proportions, scar side, clothing asymmetry and held equipment remain coherent. | Mirroring or camera convenience changes the person's persistent identity. |

## Open questions and missing evidence

This is a one-source incorporation. Wider PRESENT research should compare games with very different budgets, cameras and action models before generalizing production cost or feedback intensity. Motion stability, ordinary-play readability and OpenLegend player enjoyment still require direct evidence.

For action execution specifically, future design must separate the selected world's mechanics, character competence, human input skill, accessibility, client authority and multiplayer fairness. Sea of Stars does not answer those OpenLegend-specific contracts.

## Design subtopics

| Subtopic ID | Intended experience and scope | Research lesson / evidence | Design register entry | Feature specification | Technical design |
| --- | --- | --- | --- | --- | --- |
| ND38 | Optional player skill during the execution of an already admitted action, without making every action a timing test. | PRESENT-L003 and the G178 combat/reception evidence. | [ND38](../../../../docs/maintainers/needs-design.md#nd38--player-skill-during-action-execution) | Not yet selected; create a pair only after the product scope/trust boundary is chosen. | Not yet selected. |
