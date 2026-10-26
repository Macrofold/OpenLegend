# Cognition Lab — implementation and acceptance

The [feature specification](../projects/cognition-lab-feature-spec.md) owns the selected experience; the [technical design](../projects/cognition-lab-tech-design.md) owns contracts; the [repertoire map](../projects/cognition-lab-repertoire-review.md) connects all 28 catalogues to worthwhile experiments. [CLL01–CLL09](../limits/cognition-lab.md) owns lab-specific constraints. Design baseline: `795dae71d1cf6a2e846ebfaaeb7c70342bc01f66`, October 24, 2026. **CL00: Done — designed and reviewed; CL01–CL11 implementation and qualification open.** This work is documentation only; no laboratory runtime or qualification is delivered by a design checkbox.

## Delivery order and ownership

Implement a complete ordinary speech slice through CL01, CL02 and the minimum CL04 directed-speech intake, CL05 result view, CL06 finite One response/hold controller and CL08 actual applied-origin capture. Advanced stepping/breakpoints, the complete saved-work manager, import/export and comparisons are not first-slice dependencies. Extend these same owners afterward; do not build every editor before one real speech reaction is useful. CL03 and CL05 detail may proceed in parallel after their shared contracts exist. CL06 precedes live CL07 interception; full CL08 supplies continued replay and saved-work management; CL09 uses retained captures and does not require parallel world instances. CL10 exposes installed integrations only. CL11 qualifies each completed slice and the complete workspace.

Use the same ordinary game runtime and semantic owners. CR/SC own cognition/context selection; CE owns character experience; SPK/NST own speech; CTR owns combat; ACT/BW/AG own native action and activity; save/load owners retain continuation semantics. UIUX owns shared controls and accessibility. A missing owner capability is an honest dependency, never a lab-only approximation. The lab does not require the entire backlog of any linked owner before its first useful slice.

The design task does not authorize new automated tests. For implementation qualification, inspect and use existing verification paths, targeted native checks and actual browser/manual journeys appropriate to the changed scope. If a genuinely new automated test is needed, follow the repository's separate authorization rule. Do not equate a scripted response, mocked inference, request-only rerun or instruction to perform an action with independent character behavior.

## CL00 — Complete the selected design and reconciliation

- [x] Finish and review the paired specifications, conversation coverage, all-catalogue repertoire map, discretionary bounds and implementation breakdown.
- [x] Reconcile overlapping design-register leaves, focused cognition/character/UI owners and production/repertoire navigation without closing broader implementation or empirical work.
- [x] Verify changed-document formatting, links, identifiers and complete affected diff; record actual verification scope.

**Exit:** every accepted behavior has an observable contract and implementation owner; unresolved dependencies and qualification are explicit. This closes only the selected developer-laboratory design, not DG02/DG04, ND04/ND19/ND20 or broader character quality.

## CL01 — Shared runtime composition and isolated lab startup

- [ ] Extract the narrow shared runtime factory described in the technical design and use it for both ordinary gameplay and one separate lab instance. Keep one host-owned execution pool with scoped store/runtime registrations, recovery and settlement; never multiply process capacity or reconcile one store's uncertain attempts against another.
- [ ] Provision the dedicated lab PostgreSQL database and lab data directory in normal development setup. Initialize it with the same selected world's normal initializer; do not add an ordinary-use setup wizard or fall back to gameplay storage.
- [ ] Give game and lab distinct persistent server-owned execution namespaces in shared remote workspace provisioning and operation identity. Import/reset preserves native source IDs but cannot alias the game's remote worktree/session; no namespace or executable workspace binding comes from the bundle or payload editor.
- [ ] Add authenticated lab identity and distinct runtime-generation, authoring-revision and native source/field freshness checks. Stop/Hold/cancel bind the current generation and exact target without failing on unrelated revision updates; historical metadata uses its selected record's authority. Keep gameplay state/settings independent.
- [ ] Install the initial hold before any lab clock/director admission. Separate authorized driver liveness from explicit physical participation through the shared owner; the default speaker stays present without a game renderer, while real departure/removal retains its effects.

**Dependencies:** existing server/repository/save ownership; no multitenancy rewrite. **Exit:** ordinary game and the renderer-free lab initialize through the same factory with separate stores, authority and native participation. Lab startup/routing cannot change game state or settings; replacement/import isolation is qualified with CL08. Shared provider/process capacity remains honestly visible.

## CL02 — Compact desktop shell and immediate speech workflow

- [ ] Build the fixed header/run strip and three panes with the feature specification's exact geometry, fixed controls, one primary scroller per pane, searchable long collections and shallow replacement views.
- [ ] Keep current inspected character, speaker/actor, target and historical record as independent selections, with focal response actor and autonomous participants explicitly separate in run policy. Historical inspection never rewrites or locks the current left editor.
- [ ] Deliver the opening flow: normal initialized scene, selected character, Say composer ready, Submit, one immediate response and automatically selected Overview without opening settings or raw JSON. Keep the fixed strip compact and show full accepted words/action status and causal facts in the existing body.
- [ ] Use shared light-theme primitives, compact meaningful icons, hover/focus descriptions, visible primary action labels, keyboard focus and readable statuses. Keep controls stable during streaming, long content and empty/error states.

**Exit:** at 1920×1080 and 2560×1440 the selected person, category navigation, timeline filters, composer, run controls and inspector navigation remain visible. A user can identify who spoke, who reacted and what happened without drilling. Common evidence is one direct action away and a full memory at most one more, with only CLL05's explicit actual-call choice exception for a multi-call root without a unique primary. Browser zoom/reduced viewport preserves access without turning the target into a phone-first design.

## CL03 — Current state, evidence and model-only editors

- [ ] Implement the specified native fields for identity/personality, body/needs, feelings, directional relations, work/goals/commitments, inventory/capabilities, surrounding world, recognition, memories and history through their semantic owners.
- [ ] Provide compact forms, multiline expansion, search and focused detail editing; identify native, derived, narrative and model-only values with correct units and direction.
- [ ] Preserve world truth, personal perceived/believed evidence and selected model context as separate scopes. Editing biography names must not imply a recognition binding; adding remembered inventory must not grant custody or capability.
- [ ] Add explicitly model-only custom text, boolean, number and meter fields. Their values reach selected context according to the design, but do not install a trigger, body effect, action, memory retrieval algorithm or canonical emotional mechanic.
- [ ] Expose named atomic Apply groups and elsewhere-dirty counts. Before current-world execution/save, review existing drafts explicitly without running cognition to guess relevance. Running Apply reaches safe Hold, rechecks native tokens and stays Held; unresolved grouped failures cannot execute a queued stimulus. Invalidate affected preparation after accepted edits and preserve actionable drafts/errors.

**Exit:** a change's source, subject, native effects and model visibility are inspectable; hunger/fullness direction and qualitative feelings remain correct. The developer can author unusual individuals without secretly bypassing game rules.

## CL04 — Say, Act and Event through actual intake

- [ ] Route ordinary directed player Say through the shared interactive conversation intake, preserving its single speech occurrence, exact target/job association, hearing, duplicate suppression and native retry rules. Ambient/operator-authored speech retains its actual event/opportunity path; focal selection creates no extra decision.
- [ ] Support installed-action selection and ordinary freeform requests through the shared binding/admission owners. Add the explicit operator-authored actor intention where required; never fake a player scope, change a controller or treat `godAct` as a general executor.
- [ ] Expose scenario/world/perception events through explicit authored source modes. A model-only assertion must not be presented as an occurrence in the world.
- [ ] Record admitted event identity, perception, candidate decision opportunities and actual native outcomes in the center timeline, including pending, no-op, rejected and failed cases.
- [ ] Separate source acceptance from subsequent response/action success in receipts and draft clearing. Reconcile uncertain source submission under its original command ID; a failed response cannot make accepted speech look unsent.

**Exit:** the same input has the same native interpretation in game and lab. The screen distinguishes offered, proposed, admitted, started and completed actions and never uses generated narration as proof of effect.

## CL05 — Exact capture and historical decision inspector

- [ ] Capture the identity-bound processing chain, exact native operation, complete request and supplemental model-readable inputs, model configuration, output, local validation/admission and native result. Include reflection's accepted mind files/tool surface and distinct primary/higher-model attempts; enforce current source disclosure across retained views/export/rerun.
- [ ] Build an immediately readable result summary, flat stage list, direct evidence links and replacement subpanels with breadcrumbs. Preserve capture availability/completeness, chronology and record identity across selection and streaming.
- [ ] Explain not perceived, no opportunity, native-only, continued activity, combined/deferred, cancelled, stale, rejected, unsupported, failed, service/budget unavailable and missing-capture outcomes from actual records.
- [ ] Show memory candidates/selection/exclusion when captured by the owner, exact recognition/reference bindings, known/unknown evidence, questions/options, output, effect changes and request timing/cost where available.
- [ ] Page run children and stage evidence through scoped indexed summary rows; keep workspace/run/stage headers bounded, maintain derived totals at their source changes and load exact payloads/details only on request. Preserve complete captured contents through paging, find and export without repeatedly parsing full manifests.

**Exit:** selecting an old decision displays what that decision actually used exclusively in the right inspector. It never reconstructs historical input from the current left state or invents an explanation where instrumentation is absent. Existing rolling diagnostic eviction cannot silently destroy a deliberately retained run.

## CL06 — Run, step, hold, breakpoint and cancellation

- [ ] Implement the explicit controller/state machine for One response, bounded Run for, Advance time, Continue, next-stage stepping and selected pre-dispatch breakpoints.
- [ ] Supply the basic typed settings operation for run policy at Ready/Held, using existing validation and taking effect at the next explicit interval. CL09 extends this same owner for richer model/configuration variants.
- [ ] Implement lab hold independently of ordinary game pause/cancel behavior across primary, higher-model, maintenance and other native dispatch owners. Gate scoped queue starts and every actual attempt; unsupported input editing never exempts a stage from Hold or guards.
- [ ] Make held waits abort-aware and drainable on Stop/load/disposal. Suspend/re-arm each undispatched owner's actual deadlines, retain no scarce lease through human wait, and preserve any dispatched/uncertain attempt's capacity. Hold must not wait on `AiDirector.idle()` and its own held continuation.
- [ ] Enforce visible run guards and existing provider/spending bounds; distinguish a run limit from a character decision. Renew guards only by explicit continuation.
- [ ] Keep operator wait, simulated elapsed time, active orchestration time and provider execution time distinct. Do not monkey-patch process clocks or refund real work.

**Exit:** One response reaches the focal immediate publication or an explicit bounded disposition; a physical action may remain honestly in progress. No hidden wait for all autonomous thought or recurring background work prevents return to the editor. Cancellation leaves a faithful partial record and cannot publish a stale effect into a replacement scenario.

## CL07 — Exact prepared-request editing and request-only reruns

- [ ] Add the shared typed pre-dispatch seam after complete preparation and before the exact provider call, with immutable original envelope, editable provider-visible fields and protected routing/authority/accounting.
- [ ] Implement one-shot prepared handles, freshness, consumption/idempotency and relevant edit invalidation. Only Submit inside the prepared-input modal consumes its edited request; ordinary Submit always prepares from the current scenario.
- [ ] Close/reopen the same valid held handle without dispatch, with normal modal focus isolation. After invalidation, expose same-source Retry response only when its native owner reports eligibility; otherwise offer explicit origin rerun or a new stimulus without repeating the source silently.
- [ ] Route valid edited results through the same schema validation, output admission and native effect owners. Preserve exact original, submitted and resulting evidence.
- [ ] Support historical captured-call rerun as clearly labeled request-only comparison through its actual operation owner and complete input. Native and remote workspace effects are excluded; a tool-bearing operation without supported isolated replay is visibly unavailable, not replaced by ordinary generation. Continuing an alternative requires a compatible checkpoint with reconstructible prerequisites; otherwise offer a supported full scenario rerun.

**Exit:** dependent calls are intercepted at their own real stages; no UI promises a single final request before its prerequisites exist. Dismissing a modal does not install a hidden override. Expired/stale/cancelled/repeated submissions have explicit outcomes and never consume extra paid calls accidentally.

## CL08 — Starting scenarios, checkpoints and retained runs

- [ ] Provide the explicit current-format, point-in-time game-to-lab import; report source and time and then break all synchronization.
- [ ] Implement the three distinct save intents and their labels: reusable starting scenario, current continuation checkpoint and retained evidence/run.
- [ ] Capture one exact current applied origin automatically when a new run starts: a coherent native checkpoint plus an immutable lab context/settings snapshot, including unsaved applied edits, custom fields, supported holds and participation/autonomy. Publish/restore the pair together, reuse native bytes when the native cut matches, and record later stimuli/interventions without another whole-world copy per interval.
- [ ] Use current-format native world save/restore for scenario/checkpoint content, including required body, action, memory, recognition and queue continuation state according to native ownership.
- [ ] Restore accepted mind files through the existing reseed/fresh-session owner, never an old remote session. Preserve current forgetting/privacy overlays and report effective baseline changes before claiming a matched comparison; unavailable remote continuation remains explicit.
- [ ] Retain exact experiment evidence separately from mutable current state, with explicit annotations, names, provenance, import/export and deliberate removal.
- [ ] Apply one retention allowance to serialized lab metadata, native-only run records, artifacts/checkpoints and pending writes, with reserved terminal receipt space and incremental accounting. Remove shared artifact bytes only after the last eligible lab reference; preserve other runs when removing a descriptor.
- [ ] Reuse the shared load/recovery owner and qualify complete candidate construction, install and pre-load recovery cost. Correct demonstrated blocking preparation there, rather than implementing a lab loader or assuming streamed saving makes restoration nonblocking.
- [ ] Preserve honest partial/error states. Never silently evict pinned work or imply that a capture-only run can resume a world.

**Exit:** repeat from starting conditions, continue interrupted work and read prior evidence are separately reliable. Same-version development data is sufficient; no old-format migration, compatibility matrix, event-sourcing platform or per-call full-world snapshot system is introduced.

## CL09 — Comparisons, configurations and episode recipes

- [ ] Provide searchable optional recipes and compact matched comparison setup: same starting checkpoint, explicit changed factor, named model/configuration variant and preserved output/effects.
- [ ] Extend CL06's typed lab-local settings operation with supported model/stage configuration through native validation. Apply at Ready/Held for the next explicit interval, record an intervention and exact interval configuration, and invalidate affected preparation without changing game config, dispatched requests or current guard counters.
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

- [ ] Complete the feature specification's acceptance journeys using actual native state and inspect the same request/effect path in game and lab; record source revision, configuration and any provider substitution. Include independent background dispatch, aborting held waits, shared capacity with separate uncertain-store receipts, and reset of lab-only inputs/settings with the native origin.
- [ ] Qualify full desktop journeys, stable scroll/focus, keyboard controls, long lists/text, streaming, error recovery, historical/current separation and ordinary speech setup comprehension with Mike.
- [ ] Measure initial readiness, interaction latency and query/DOM work with growing unrelated fields/choices, many intervals in one run and large stage evidence collections. Verify bounded bootstrap/detail projections and paging before hydration through actual production query plans.
- [ ] Measure first origin capture, import and repeated comparison restores with growing cold history while the game runs, including full-operation latency, peak memory and native-lane/event-loop delays. Qualify mixed native-only/model capture admission and shared-reference deletion; tune proposed bounds from evidence.
- [ ] Evaluate meaningful episodes through CE05/IS and the exact CTR10 baseline. Report implemented capability, observed behavior and enjoyable/player-useful evidence separately.
- [ ] Reconcile the final implemented architecture, limits statuses, focused trackers and qualification report without retroactively presenting this design as runtime evidence.

**Exit:** an ordinary speech experiment is quick to set up and understand, deeper investigation remains directly accessible, outcomes reflect the real game, and the recorded evidence supports the precise claimed scope. Broader population scale, unfinished mechanics and unrun model/player comparisons remain explicitly open with their existing owners.

## Decisions and external dependencies

No unresolved product choice blocks the selected lab architecture or its first speech slice. Geometry, defaults, capture budgets and run guards are chosen implementation starting values whose practical qualification belongs to CL11. [SA-D01](decisions/characters-and-evidence.md#sa-d01--psychological-fear-for-controlled-characters) selects authored native interpretation for directly controlled characters; [EP06–EP09](emotional-physiology.md#controlled-character-dependency) retain its implementation and qualification. Those dependencies do not block inspecting installed NPC state or this lab shell. Follow the [technical design](../projects/cognition-lab-tech-design.md) for exact owning contracts and capability boundaries.
