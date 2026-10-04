# Injury, aftermath and direct world interaction

| Status    | Current progress                                                                                             | Last updated |
| --------- | ------------------------------------------------------------------------------------------------------------ | ------------ |
| Completed | All requested behavior, native/browser verification, subsequent review fixes and documentation are complete. | 2026-10-04   |

## Scope and boundaries

Deliver every requested update: visible injury health bars; general overhead stat deltas; inventory secondary-click eating; gentler hover emphasis after 0.3 seconds; T targeting with equipped-item actions; quieter and smoother sight/hearing guides; retained fire illumination with frozen remembered fire imagery; more capable animal escape; dead bodies, rotting after three game days and cleanup.

Estimated affected logic: 900–1,500 lines. Risk is material because lifecycle changes persist, animal movement participates in exact sensory timing, and public projections must preserve privacy. Existing health/action/placement owners remain authoritative. No legacy save support, new framework, automatic paid retries or speculative controller system.

The work starts from local `main` at `dd21d1c74a6d1cacc5a804ecff2bb463955acf92`, in `/Users/mzw/.codex/worktrees/54e5/OpenLegend`, on `codex/embodied-feedback`. The main checkout receives no edits.

## Decisions

- Health feedback consumes visible bodily effects and authored meter presentation; unknown private meters stay unknown. Exact owner meters may display changes. Passive drift must aggregate rather than generate a notice every network update.
- Targeting uses server-projected equipped-item actions, and normal native admission rechecks the exact target and item. Escape cancels; typing, dialogs and drags retain their input ownership.
- Decay durations and native animal motives belong to the bundled world. Generic runtime mechanisms track deadlines and lifecycle; they do not assume all realities rot or all animals fear humans.
- Bodies becoming unavailable terminate actions and active senses while retaining the actor's identity, knowledge and relationships. Cleanup never silently destroys possessions or prevents existing creator revival.
- Unseen fire imagery retains only the last permitted appearance and animation frame. Light is a visible environmental effect; its projection must not disclose the unseen fire's current private details.
- Preserve the existing player collapse/recovery law. Every actual death produces remains. Bodies begin rotting after three game days and are removed after seven days, dropping carried possessions through ordinary ground custody and retaining actor identity. The timing is authored policy, not an engine law.
- Native escape chooses among reachable directions using perceived danger, route clearance and continuity. Threat memory decays with safety rather than a fixed flee countdown. This avoids species scripts and provider calls while keeping native animal movement deterministic and bounded.

## Owners and implementation order

1. Public feedback and input: `apps/server/src/view.ts`, protocol entity/meter views, `character-status.tsx`, inventory UI, `main.tsx`, renderer interface and scene picking. Reuse existing notices, inventory actions and equipped tool bindings.
2. Rendering: scene hover, perception overlay and presentation lights. Reduce visual intensity; decouple smooth presentation movement from expensive guide reconstruction. Preserve obstacle clipping, depth, current observer scope and resource disposal.
3. Lifecycle: body reconciliation, installed body policy, saved remains, simulation deadlines, current-format validators, projection, harvest/cleanup actions and revival. Author three-day decay in the base world, retain identity outside physical participation and move possessions through ordinary custody.
4. Fleeing: diagnose attack → known threat → movement; implement the approved decision approach through existing permitted sensing, motion/action owners and world-authored content. Keep motion prediction consistent with actual movement and saved randomness.
5. The measured 40–50ms synchronous guide builds require short cooperative calculation slices, retaining current graphics until replacement and cancelling stale scope/map/sense work. Preserve the same pure field result for native callers; measure calculation slices and graphics commit costs during ordinary walking.
6. Reconcile canonical survival/lifecycle/presentation/spatial docs, affected limits and focused maintainer tasks. Inspect the complete diff, fix in-scope findings, and commit all task changes.

## Verification and completion

Use focused existing native checks covering body effects, attacks, movement, current save validation and inventory. Run pinned formatting, TypeScript checks, configuration checks when definitions change, and the production build. Exercise representative native downstream scenarios for death/decay/cleanup/revival and threatened escape including a blocked route; verify coherent restore and refusal on invalid targets.

Use a disposable PostgreSQL world and actual browser interaction for injury feedback, eating, equipped targeting/cancel/typing/drag, hover, guides during walking and remembered fire. Measure bounded guide rebuild/render costs with matched settings; no claimed improvement without evidence. Native checks use `AI_BUDGET_USD=0`. Any live AI animal work shares the $10 task ceiling, with explicit reservation and reported costs.

Complete only when every requested behavior, integration, required documentation, full diff review and selected checks are finished. Track genuine platform/budget blockers honestly; unfinished agreed scope is not a follow-up. Make local progress commits at least every fifteen minutes from the first edit and commit remaining changes before handoff.

## Completion evidence

[Verification](../../verification/embodied-feedback.md) records current-format native and PostgreSQL restoration, actual browser interactions, blocked-route escape and bounded costs. The cooperative guide extension preserves identical pure geometry and demonstrates shorter calculation blocks during the repeated ordinary walk; wider device/geometry qualification remains SW09.4b. TypeScript, production build and generated-configuration checks pass, with existing build warnings. The selected existing native checks passed; full CI remains a merge gate. No provider calls were made; additional Jev cost and cumulative task total are $0.

The subsequent [completed implementation review](embodied-feedback-review-plan.md) corrected joined-terrain animal movement and overhead feedback correctness/rendering. [Review evidence](../../verification/embodied-feedback.md#implementation-review--october-4-2026) records the fixes and their limits; the original delivered scope remains complete.
