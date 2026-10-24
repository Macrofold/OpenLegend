# Stealth player experience — implementation and qualification

## Status and ownership

**Design: complete for SAD-G's selected scope; cross-specialist integration open. Implementation: not started by this work. UX, accessibility, performance and security qualification: not performed.** Updated 2026-10-24.

[Feature behavior](../projects/stealth-player-experience-feature-spec.md) owns controls, feedback and all ten player journeys. [Technical design](../projects/stealth-player-experience-tech-design.md) owns projection, input, component boundaries, invalid states and G-AC acceptance. [Limits](../limits/stealth-player-experience.md) owns discretionary defaults and remaining capacity questions. [SA coordination](stealth-awareness.md) owns A–G/I integration; this tracker is the focused SAI-G implementation owner.

The branch was created from contracts tip `a3d40b4d71e29d6504e9f3fcc21e76344a0a284e`. All six specialist branches were fetched/read separately at the [recorded commits](../projects/stealth-player-experience-tech-design.md#source-manifest); none was merged. This work changes documentation only. Checked design boxes do not stand for shipped features, executed tests or observed enjoyment.

## SPX00 — Source-grounded design

**Status: Done — designed.** Scope: ordinary movement/posture/gaze, finite attention, honest current/history/sound projection, targeting, own warning/startle feedback, creator separation and basic remapping/accessibility behavior.

- [x] Read root/applicable rules and inspect actual current client, server, protocol and native action/spatial owners; distinguish source findings from runtime verification.
- [x] Read shared contracts and completed A–F designs; retain one world/mechanical owner per meaning and immutable source links.
- [x] Resolve current W/Create and C/Crafting conflicts, camera versus physical gaze, release versus full Stop, text/IME/modal ownership and pointer alternatives.
- [x] Specify accepted, pending, refused, interrupted, incomplete, stale and invalidated states without optimistic physical success.
- [x] Specify per-fact current authorization, explicit history, approximate evidence-bound sound, source-safe assets and target reference roles.
- [x] Specify all ten journeys, useful nonlethal outcomes, failed ambush/recovery and distinct human/animal behavior.
- [x] Specify complete minimum interface, progressive polish, component ownership and developer acceptance.
- [x] Review all repertoire scopes and full directly relevant entries; make focused presentation/control additions without closing final broad priority reconciliation.
- [x] Record numerical defaults, remaining integration decisions, implementation tasks and evidence limits.

**Exit:** the selected product/interface design is explicit enough for implementation planning. SA-D01 remains a deliberately open controlled-player emotion policy; SA-D02/03 and G-I01–08 are integration gates, not permission to invent mechanics.

## SPX01 — Integrate contracts and protect publication

**Status: Not started.** Dependencies: SAD-I; A current/history/reference families; B visible patch/detail/illumination; C cue precision; existing server authority.

- [ ] Reconcile SA-D02 revision-family types, A/B Perception scope, B/C motion composition and actual document filenames. Preserve exact family types and one installed rule.
- [ ] Replace whole-entity publication with permitted facet/contact records across full views, patches, descriptions, histories and all lazy reads.
- [ ] Separate current body, historical/source association and anonymous cue references; bind action targeting only through eligible current body references.
- [ ] Restrict map/dynamic geometry, appearance assets, animation, shadow, light, sound, DOM/accessibility and diagnostic metadata to the same audience.
- [ ] Replace remembered fire illumination with history-only art; permit current source-free glow only from current authorized appearance.
- [ ] Apply facet removals and scope invalidation before rendering; fence async reads/asset loads/receipts and stale patches.
- [ ] Qualify G-AC01–12 and all applicable lifecycle/projection cases in the technical acceptance table.

**Exit:** ordinary clients cannot receive or reconstruct prohibited current facts through any changed endpoint or presentation surface. Hiding sprites alone is not an exit. No claim of penetration testing is made by this design.

## SPX02 — Integrate direct movement, posture and physical gaze

**Status: Not started.** Dependencies: SPX01; B/C installed supported bodies/actions; ordinary command/control and spatial movement owners.

- [ ] Add the narrow direction variant and same-action amendments inside ordinary move; preserve identity, distance progress, costs, gaze/watch compatibility and actual native obstruction handling.
- [ ] Implement scoped gesture/session sequencing, cancel-before-start handling, prioritized neutral delivery, bounded latest-value traffic and server freshness expiry. Do not add a parallel movement lane or client physics.
- [ ] Extend existing input routing for WASD, X, Z, F, Q/E and Shift+W; update all affected hints/help. Preserve text/IME, construction, camera, Speak/Act, selection, targeting and pause ownership.
- [ ] Distinguish released held movement, action cancellation and full Stop including waiting/queued work.
- [ ] Show requested versus actual pose/gaze and exact pending/refused/interrupted consequences. No automatic standing to evade; no fake crouch on clearance failure.
- [ ] Implement B orient-once controls and button/keyboard alternatives; do not turn the body/shield or grant sensing because the camera moved.
- [ ] Qualify direct steering/clearance, input races, crouch/evasion, camera-orbit basis and all applicable G-AC controls/time cases.

**Exit:** ordinary movement is responsive and trustworthy through actual native work, including short taps, delayed start replies, blockers and lost focus. Timing defaults are qualified against complete input-to-native behavior.

## SPX03 — Attention, history and sensory interaction

**Status: Not started.** Dependencies: SPX01–02; E methods and own fulfillment; A/C original evidence; SA-D03/F readiness handoff where preparation is displayed.

- [ ] Expose installed finite Watch, Watch for danger, Listen, Scan, Inspect and Investigate through existing action discovery and Current work.
- [ ] Implement the scoped area/vantage selector through existing placement/known-place/activity owners: keyboard and tap choices, offered region extents, Confirm distinct from Start, Cancel restoring the draft, exact stale-input handling and no hidden-source defaults.
- [ ] Preserve default observation-only Watch; explicit danger anticipation and actual preparing/maintaining/unfulfilled/ended/incomplete feedback. Physically maintained coverage cannot substitute for F's completed preparation lead.
- [ ] Preserve parent work and original deadlines across compatible amendments; expose exact Stop watching, end only owned gaze on stop/expiry and end the facet with parent work.
- [ ] Investigate original region/bearing with a player-selected permitted vantage when range is unknown. Report partial/empty findings without proving absence or rebinding to the wrong person.
- [ ] Extend current captions/Noticed and Events (J) readers using original listener frame, acquired time, precision and permitted wording. Historical inspection opens exact eligible records; Character records keeps its separate purpose. Retain critical acquired cues through reading overflow.
- [ ] Deliver explicit Last seen/heard/Suspected inspection, independent facet ages, hollow markers and safe selection demotion.
- [ ] Qualify G-J01–05/J09 and relevant G-AC sensory/history cases; verify a learned voice never becomes a body target.

**Exit:** players can understand and act on uncertainty using the same information through audio, text and keyboard. Reading/open inspectors do not manufacture sensory work.

## SPX04 — Combat, surprise and recovery feedback

**Status: Not started.** Dependencies: D/F actual effects and own feedback; SPX01–03; existing combat/CTR exact methods and lethal review.

- [ ] Integrate own preparing/maintaining/ended/not-enough-information and actually noticed/registered warning states without other actors' preparedness or emotions.
- [ ] Keep ordinary movement, speech, Stop and compatible action available during startle; reflect only actual mechanical restrictions.
- [ ] Preserve admitted evasion geometry and enforce current range before new cost. Separate finite startle end from persistent applicable effects.
- [ ] Keep surprise eligibility private, injury composition native and lethal confirmation invariant to hidden target readiness. No new confirmation after ranged release.
- [ ] Present only permitted actual contact/defense/injury/aftermath and useful recovery options. Qualify a registered warning with failed defense, retained expectation after guard ends, zero-injury shield contact and an unperceived miss without inventing cues or injury.
- [ ] Resolve any claimed controlled-player persistent emotion behavior through the full SA-D01 decision before implementing or presenting it.
- [ ] Qualify G-J06–08 and relevant G-AC combat/time cases at 1×, permitted pause and debug speeds.

**Exit:** betrayal/failed ambush/recovery continue playable ordinary action without a detection oracle or categorical startle lock.

## SPX05 — Creator, multiplayer and lifecycle boundaries

**Status: Not started.** Dependencies: SPX01; existing permission/control/history owners.

- [ ] Use separate explicitly selected authorized creator request/view scope and a persistent creator banner. Holding inspect/create grants alone never promotes ordinary publication or grants other players' private mind access; gate tools, detailed work and detached reads too.
- [ ] Clear privileged geometry, contacts, cues, caches, asset/inspector/target state and pending callbacks before an ordinary baseline is rendered.
- [ ] Retire held input on blur, hidden tab, pause, restore, connection loss, control transfer and actor/body/life change; no replay on resumption.
- [ ] Preserve actual character knowledge across creator viewing; do not import human debugger knowledge into the character's memory.
- [ ] Qualify G-J10 and G-AC scope, reset, delayed completion, out-of-order and two-observer cases.

**Exit:** mode switches and stale clients cannot cross audience/time/control boundaries. A creator-assisted playthrough is clearly ineligible as an unspoiled discoverability observation.

## SPX06 — Accessible controls and equivalent cues

**Status: Not started.** Dependencies: shared UI primitives, preferences, SPX02–04.

- [ ] Make every essential action operable without WASD, audio, color discrimination, drag or a sustained chord; preserve visible keyboard focus and narrow-screen sheets.
- [ ] Add scoped basic remapping and conflict resolution for new/affected bindings, printable-shortcut disabling, hold alternatives and accurate current hints.
- [ ] Keep auditory, visual, text, screen-reader and optional haptic cues equivalent in knowledge and precision; label age/uncertainty without relying on opacity.
- [ ] Apply reduced motion, contrast and readable current-work/history states without removing mechanical consequences or disclosing private facts.
- [ ] Review focus/IME/screen-reader interactions and narrow/enlarged layouts using actual implementation. Document device/assistive coverage and untested combinations.

**Exit:** the selected desktop/responsive interface is usable through the promised alternatives. Full controller/virtual-stick/device-profile support remains separately scoped polish; ND13's broader customization/recommendation questions remain open.

## SPX07 — Integrated verification, performance and player fun

**Status: Not started.** Dependencies: applicable SPX01–06; integrated A–F runtime.

- [ ] Execute every G-AC acceptance case through its actual native/server/client caller; include malicious/stale requests as well as UI behavior.
- [ ] Run all ten G-J journeys, record actual screen/input sequence, invalid outcomes and accessible alternatives; do not substitute native-only tests.
- [ ] Measure complete cue acquisition → publication → readable display → human input → native admission/action, separately from simulation's acquired/unacquired decision.
- [ ] Measure cold/warm/dense cue/publication/restore/creator downgrade costs and bound retention/input queues under the limits inventory; record remaining scaling risks.
- [ ] Conduct uncoached normal-speed play: can people distinguish current/history, move/look/crouch/stand, choose a watch, investigate a wrong sound and recover without explanation?
- [ ] Assess whether quiet approach offers a useful choice versus ordinary movement; whether a nonlethal hare observation, voice encounter and empty search can feel worthwhile; record dead time and confusing costs.
- [ ] Check sound-off, color/contrast/reduced-motion and promised input alternatives separately. Identify invisible acquired cues versus correctly unacquired world cues.
- [ ] Update the existing topic verification owners with actual evidence and fix concrete failures; do not claim general usability or hardware capacity from one environment.

**Exit:** integrated behavior, information boundaries and the promised player decisions are observed and honestly bounded. Only then can the implementation rows close; enjoyable play requires its own evidence.

## Integration handoff

Keep the detailed [contradiction register](../projects/stealth-player-experience-tech-design.md#contradictions-and-integration-recommendations) canonical rather than duplicating its contract text here. SAD-I must reconcile SA-D01's full scope, SA-D02 typed evidence revisions, SA-D03 actual preparation start time, A/B detection policy, B/C movement, source-free light/daylight, E's opted-in curiosity contrast and F's warning producers. Broad repertoire/priority reconciliation remains with SAD-I.

This design narrows the **needs-design** work for controls, perspective and basic remapping; it does not close all ND13 recommendations/devices, SA implementation, FPV play qualification or unrelated repertoire ideas. Source inspection and documentation review are the only verification conducted here.
