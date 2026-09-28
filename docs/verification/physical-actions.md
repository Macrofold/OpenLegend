# Targeted actions, private encounters and physical contact verification

These are recorded observations from the original verification log, not a new run. “Current” refers to each observation’s recorded revision. [Verification index](../verification.md) · [Current acceptance owners](../maintainers/README.md).

## Targeted punch runtime

September 23: manual native execution with a disposable scene admitted Punch by target ID, approached from outside reach, restored the in-progress action from JSON, and completed exactly one hit (100 → 95 health). Replaying the command returned duplicate without another hit; self-target and unknown-definition commands were rejected. Moving the target out of range during wind-up left health unchanged. Public animation projection included the pinned action's progress/direction; no target identity was exposed by that descriptor. A local 1,000-admission exercise took approximately 1.13 seconds; this is a synthetic command measurement, not concurrent pursuit capacity.

An isolated zero-budget server on port 3219 rendered the procedural arm/fist pose in the browser. The target catalogue displayed enabled “Punch Ada”; selecting it dispatched through the player UI. Simulation ticking was disabled for stable visual inspection, so continuous browser animation/impact timing was not qualified by that preview. Native stepping verified approach, impact and completion separately.

Sequential native stress profiles (Node 22.23.2, 180 steps, zero warmup, requested 3×): gems p50 6.39ms / p95 17.87ms / maximum 168.44ms / headroom 0.612; mixed p50 5.35ms / p95 19.34ms / maximum 1,963.32ms / headroom 0.300. Both remain below 3× headroom. These existing cold fixtures do not isolate punching or prove a regression; pursuing actors still need dedicated scale qualification. Local artifacts are `/tmp/openlegend-punch-{gems,mixed}.json` and corresponding CPU profiles.

The production TypeScript/Vite build passed. No automated tests were written or run; deferred coverage is in [TODO](../maintainers/TODO.md#targeted-strike-validation). No paid APIs were called.

### Punch animation correction

The initial static mesh preview above did not qualify a working character-arm animation or its cleanup. A user report exposed the visual mismatch and a player-delta bug: undefined completion fields disappeared during JSON serialization, retaining the last animation on the client.

The replacement uses three cached character-sprite poses and a short recovery, with explicit null clearing. An isolated zero-budget server manually advanced one action from wind-up to extension and completion while the browser stayed connected. Browser inspection showed the raised arm, extended arm and return to the normal hanging arm without reload; completion's serialized player delta contained `actionAnimation: null`, and target health changed 100 → 95. The production build passed. No automated tests or paid calls were used.

## Observer-private encounters

A fresh-world manual `advanceWorld(world, 1)` execution produced 24 encounter events. Every encounter had private scope and exactly one audience member, its observing actor. Sample awareness records were owner-only, retained observed modality, and used first-person encounter text. This is runtime evidence for emission isolation, not broader EPR03 recognition or exposure-delta acceptance. The emission correction does not rewrite existing historical memories.

## Physical-contact correction runtime

Manual native execution in an isolated touch-demo world verified that a character 0.8 world units from a campfire has neither physical contact nor a perceived campfire contact. At the 0.48-unit combined body-radius edge and at overlapping ground positions, physical contact and the emitted contact agree. The shared physical check accepts resting on the object's 0.7-unit top and rejects a 0.01-unit air gap above it. These use the current generic object cylinder, not artwork or a flame mesh. In-place upgrade changed an old proximity descriptor to body contact, cleared its stale contact and passed current world validation.

Twelve independent native steps with 25/100/250 nearby but non-touching synthetic objects produced zero contacts, with medians 4.99/11.01/23.50 ms and maxima 6.58/40.94/27.99 ms. This is a native-only stress exercise without persistence, browser load or AI; it is not matched evidence of a walking speed improvement. Production build passed with existing bundle warnings. No automated suites or paid calls were run. Remaining coverage is in [TODO](../maintainers/TODO.md#physical-contact-correction); local evidence is `/tmp/ol-body-contact.log`. Earlier dense-contact measurements describe the retired proximity semantics.
