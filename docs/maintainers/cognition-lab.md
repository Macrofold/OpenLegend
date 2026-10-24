# Cognition Lab — implementation and acceptance

The [feature specification](../projects/cognition-lab-feature-spec.md) owns the selected experience; the [technical design](../projects/cognition-lab-tech-design.md) owns contracts; the [repertoire map](../projects/cognition-lab-repertoire-review.md) connects all 28 catalogues to worthwhile experiments. [CLL01–CLL09](../limits/cognition-lab.md) owns lab-specific constraints. Design baseline: `795dae71d1cf6a2e846ebfaaeb7c70342bc01f66`, October 24, 2026. **CL00: Done — designed and reviewed; CL01–CL11 implementation and qualification open.** This work is documentation only; no laboratory runtime or qualification is delivered by a design checkbox.

## Delivery order and ownership

Implement a complete ordinary speech slice through CL01, the minimal CL02/CL04 intake and CL05 summary, then extend the same owners. Do not build every editor or an elaborate comparison framework before one real speech reaction is useful. CL03 and CL05 detail may proceed in parallel after their shared contracts exist. CL06 precedes live CL07 interception; CL08 supplies the checkpoint required for continued replay; CL09 uses retained captures and does not require parallel world instances. CL10 exposes installed integrations only. CL11 qualifies each completed slice and the complete workspace.

Use the same ordinary game runtime and semantic owners. CR/SC own cognition/context selection; CE owns character experience; SPK/NST own speech; CTR owns combat; ACT/BW/AG own native action and activity; save/load owners retain continuation semantics. UIUX owns shared controls and accessibility. A missing owner capability is an honest dependency, never a lab-only approximation. The lab does not require the entire backlog of any linked owner before its first useful slice.

The design task does not authorize new automated tests. For implementation qualification, inspect and use existing verification paths, targeted native checks and actual browser/manual journeys appropriate to the changed scope. If a genuinely new automated test is needed, follow the repository's separate authorization rule. Do not equate a scripted response, mocked inference, request-only rerun or instruction to perform an action with independent character behavior.

## CL00 — Complete the selected design and reconciliation

- [x] Finish and review the paired specifications, conversation coverage, all-catalogue repertoire map, discretionary bounds and implementation breakdown.
- [x] Reconcile overlapping design-register leaves, focused cognition/character/UI owners and production/repertoire navigation without closing broader implementation or empirical work.
- [x] Verify changed-document formatting, links, identifiers and complete affected diff; record actual verification scope.

**Exit:** every accepted behavior has an observable contract and implementation owner; unresolved dependencies and qualification are explicit. This closes only the selected developer-laboratory design, not DG02/DG04, ND04/ND19/ND20 or broader character quality.

## CL01 — Shared runtime composition and isolated lab startup

- [ ] Extract the narrow shared runtime factory described in the technical design and use it for both ordinary gameplay and one separate lab instance in the existing server process.
- [ ] Provision the dedicated lab PostgreSQL database and lab data directory in normal development setup. Initialize it with the same selected world's normal initializer; do not add an ordinary-use setup wizard or fall back to gameplay storage.
- [ ] Add authenticated lab identity, explicit active scenario and revision checks. Keep gameplay pause, control, selected character, model settings, saves and live world independent.
- [ ] Provide the explicit current-format, point-in-time game-to-lab import; report source and time and then break all synchronization.

**Dependencies:** existing server/repository/save ownership; no multitenancy rewrite. **Exit:** the lab and game can run in two tabs; edits, new/reset/import, hold, cancellation and load in one cannot alter the other's world or settings. Shared provider/process capacity remains honestly visible. Ordinary game startup still uses the same implementation.

## CL02 — Compact desktop shell and immediate speech workflow

- [ ] Build the fixed header/run strip and three panes with the feature specification's exact geometry, fixed controls, one primary scroller per pane, searchable long collections and shallow replacement views.
- [ ] Keep current inspected character, speaker/actor, target and historical record as independent selections, with focal response actor and autonomous participants explicitly separate in run policy. Historical inspection never rewrites or locks the current left editor.
- [ ] Deliver the opening flow: normal initialized scene, selected character, Say composer ready, Submit, one immediate response and readable result summary without opening settings or raw JSON.
- [ ] Use shared light-theme primitives, compact meaningful icons, hover/focus descriptions, visible primary action labels, keyboard focus and readable statuses. Keep controls stable during streaming, long content and empty/error states.

**Exit:** at 1920×1080 and 2560×1440 the selected person, category navigation, timeline filters, composer, run controls and inspector navigation remain visible. A user can identify who spoke, who reacted and what happened without drilling. Common evidence is one direct action away and a full memory at most one more, with only CLL05's explicit actual-call choice exception for a multi-call root without a unique primary. Browser zoom/reduced viewport preserves access without turning the target into a phone-first design.

## CL03 — Current state, evidence and model-only editors

- [ ] Implement the specified native fields for identity/personality, body/needs, feelings, directional relations, work/goals/commitments, inventory/capabilities, surrounding world, recognition, memories and history through their semantic owners.
- [ ] Provide compact forms, multiline expansion, search and focused detail editing; identify native, derived, narrative and model-only values with correct units and direction.
- [ ] Preserve world truth, personal perceived/believed evidence and selected model context as separate scopes. Editing biography names must not imply a recognition binding; adding remembered inventory must not grant custody or capability.
- [ ] Add explicitly model-only custom text, boolean, number and meter fields. Their values reach selected context according to the design, but do not install a trigger, body effect, action, memory retrieval algorithm or canonical emotional mechanic.
- [ ] Apply coherent edit transactions with visible drafts/errors and expected revision; mark prepared input invalid after accepted relevant scenario edits. Preserve current values and actionable error messages on failed edits.

**Exit:** a change's source, subject, native effects and model visibility are inspectable; hunger/fullness direction and qualitative feelings remain correct. The developer can author unusual individuals without secretly bypassing game rules.

## CL04 — Say, Act and Event through actual intake

- [ ] Route Say through real speech/hearing with exact speaker, target, content and installed volume semantics; show actual listeners rather than assuming the focal person heard it.
- [ ] Support installed-action selection and ordinary freeform action requests, preserving chosen actor, available options, targets, admission and execution.
- [ ] Expose scenario/world/perception events through explicit authored source modes. A model-only assertion must not be presented as an occurrence in the world.
- [ ] Record admitted event identity, perception, candidate decision opportunities and actual native outcomes in the center timeline, including pending, no-op, rejected and failed cases.

**Exit:** the same input has the same native interpretation in game and lab. The screen distinguishes offered, proposed, admitted, started and completed actions and never uses generated narration as proof of effect.

## CL05 — Exact capture and historical decision inspector

- [ ] Capture the identity-bound processing chain, full normalized provider-visible request, model configuration, output, local validation/admission and native result; retain exact effective state at each real preparation stage.
- [ ] Build an immediately readable result summary, flat stage list, direct evidence links and replacement subpanels with breadcrumbs. Preserve capture availability/completeness, chronology and record identity across selection and streaming.
- [ ] Explain not perceived, no opportunity, native-only, continued activity, combined/deferred, cancelled, stale, rejected, unsupported, failed, service/budget unavailable and missing-capture outcomes from actual records.
- [ ] Show memory candidates/selection/exclusion when captured by the owner, exact recognition/reference bindings, known/unknown evidence, questions/options, output, effect changes and request timing/cost where available.
- [ ] Load large payloads/details only on request; preserve complete captured contents through paging, find and export without a recursively expanded object tree.

**Exit:** selecting an old decision displays what that decision actually used exclusively in the right inspector. It never reconstructs historical input from the current left state or invents an explanation where instrumentation is absent. Existing rolling diagnostic eviction cannot silently destroy a deliberately retained run.

## CL06 — Run, step, hold, breakpoint and cancellation

- [ ] Implement the explicit controller/state machine for One response, bounded Run for, Advance time, Continue, next-stage stepping and selected pre-dispatch breakpoints.
- [ ] Implement lab hold independently of ordinary game pause/cancel behavior. Preserve or cancel pending work exactly as the technical contract states and expose the actual state.
- [ ] Enforce visible run guards and existing provider/spending bounds; distinguish a run limit from a character decision. Renew guards only by explicit continuation.
- [ ] Keep operator wait, simulated elapsed time, active orchestration time and provider execution time distinct. Do not monkey-patch process clocks or refund real work.

**Exit:** One response reaches the focal immediate publication or an explicit bounded disposition; a physical action may remain honestly in progress. No hidden wait for all autonomous thought or recurring background work prevents return to the editor. Cancellation leaves a faithful partial record and cannot publish a stale effect into a replacement scenario.

## CL07 — Exact prepared-request editing and request-only reruns

- [ ] Add the shared typed pre-dispatch seam after complete preparation and before the exact provider call, with immutable original envelope, editable provider-visible fields and protected routing/authority/accounting.
- [ ] Implement one-shot prepared handles, freshness, consumption/idempotency and relevant edit invalidation. Only Submit inside the prepared-input modal consumes its edited request; ordinary Submit always prepares from the current scenario.
- [ ] Route valid edited results through the same schema validation, output admission and native effect owners. Preserve exact original, submitted and resulting evidence.
- [ ] Support historical captured-call rerun as clearly labeled request-only comparison. It may validate a response but does not execute it in today's world. Continuing an alternative requires an actual compatible checkpoint at that breakpoint; otherwise offer a full scenario rerun.

**Exit:** dependent calls are intercepted at their own real stages; no UI promises a single final request before its prerequisites exist. Dismissing a modal does not install a hidden override. Expired/stale/cancelled/repeated submissions have explicit outcomes and never consume extra paid calls accidentally.

## CL08 — Starting scenarios, checkpoints and retained runs

- [ ] Implement the three distinct save intents and their labels: reusable starting scenario, current continuation checkpoint and retained evidence/run.
- [ ] Capture one exact current applied origin automatically when a new run starts, including unsaved applied edits, without a naming dialog; reuse it for subsequent intervals and record ordered stimuli/interventions. Reset identifies its origin; New uses the normal initializer.
- [ ] Use current-format native world save/restore for scenario/checkpoint content, including required body, action, memory, recognition and queue continuation state according to native ownership.
- [ ] Retain exact experiment evidence separately from mutable current state, with explicit annotations, names, provenance, import/export and deliberate removal.
- [ ] Implement bounded capture/storage admission and honest partial/error states. Never silently evict pinned work or imply that a capture-only run can resume a world.

**Exit:** repeat from starting conditions, continue interrupted work and read prior evidence are separately reliable. Same-version development data is sufficient; no old-format migration, compatibility matrix, event-sourcing platform or per-call full-world snapshot system is introduced.

## CL09 — Comparisons, configurations and episode recipes

- [ ] Provide searchable optional recipes and compact matched comparison setup: same starting checkpoint, explicit changed factor, named model/configuration variant and preserved output/effects.
- [ ] Execute new variants serially in the one active lab runtime; present retained summaries side by side without shifting the current editor or adding nested scrolling dashboards.
- [ ] Keep human expected behavior, notes and evaluation rubric outside every model request. Distinguish stochastic variation, unmatched setup and missing evidence from causal conclusions.
- [ ] Implement episode bookmarks/continuation and explicit outcome notes using the existing CE/IS/CTR expectations rather than a new universal score or verbosity leaderboard.

**Exit:** a developer can compare one meaningful change and explain what actually differed. The [repertoire recipes](../projects/cognition-lab-repertoire-review.md) cover distinct character voices, recognition, useful help, legitimate refusal, ordinary pleasure, remembered objects, interruption/return and threat response without scripting the tested answer.

## CL10 — Installed feelings and background cognition

- [ ] Expose installed body reactions, interpreted feelings, derived effects and maintenance/reflection stages without collapsing them into one universal emotion vector.
- [ ] Show qualitative grief, cause/target/lifetime and individual provenance; preserve native aggregation rules and installed availability.
- [ ] Support explicit time/rest/maintenance experiments through ordinary scheduling and the lab's bounded controls, with pending work and actual contribution visible.
- [ ] Consume the separate emotional-physiology and other cognition designs only when their shared implementation is installed. Clearly identify unsupported controls and model-only authoring.

**Exit:** grief or bodily distress is neither fabricated into a number nor silently rewritten by a custom meter. A future mechanic remains its owner's delivery work; adding its name to lab context does not install it.

## CL11 — Integrated usefulness, performance and parity

- [ ] Complete the feature specification's acceptance journeys using actual native state and inspect the same request/effect path in game and lab; record source revision, configuration and any provider substitution.
- [ ] Qualify full desktop journeys, stable scroll/focus, keyboard controls, long lists/text, streaming, error recovery, historical/current separation and ordinary speech setup comprehension with Mike.
- [ ] Measure initial readiness, interaction latency, captured/detail payload sizes and bounded query/DOM work. Verify pagination before hydration and fair shared-process capacity; tune proposed bounds from evidence.
- [ ] Evaluate meaningful episodes through CE05/IS and the exact CTR10 baseline. Report implemented capability, observed behavior and enjoyable/player-useful evidence separately.
- [ ] Reconcile the final implemented architecture, limits statuses, focused trackers and qualification report without retroactively presenting this design as runtime evidence.

**Exit:** an ordinary speech experiment is quick to set up and understand, deeper investigation remains directly accessible, outcomes reflect the real game, and the recorded evidence supports the precise claimed scope. Broader population scale, unfinished mechanics and unrun model/player comparisons remain explicitly open with their existing owners.

## Decisions and external dependencies

No unresolved product choice blocks the selected lab architecture or its first speech slice. Geometry, defaults, capture budgets and run guards are chosen implementation starting values whose practical qualification belongs to CL11. The separate emotional-physiology branch's SA-D01 question about interpreting directly controlled human characters remains that design's unresolved decision; it does not block inspecting installed NPC state or this lab shell. Follow the [technical design](../projects/cognition-lab-tech-design.md) for exact external-branch links and capability boundaries.
