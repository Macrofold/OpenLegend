# Full documentation reconciliation TODO

**In progress — October 15: the accumulated review and replay corrections are reconciled with current main; the original exhaustive review and inventory refresh remain open.**

This is the single remaining-work checklist for [Full Documentation Review](../projects/full-documentation-review.md), under CG17 in [agent guidance](agent-guidance.md). It owns reconciliation work, not a second copy of feature requirements. The feature trackers below retain implementation, dependencies, acceptance and verification ownership.

## October 15 integration boundary

Mike's current squash-and-merge request supersedes the earlier ordered-rebase/no-squash instruction. Destination: local `main` at `02faa5f82ecd9357ad4b7c775ed29aab7a346da4`. Inputs: replay `e12df8178333a9a381e5e436f6c9e4e220fb9d62` and original accumulated review `d47995702e485268b80df5f1814f317a22fe9d42`. The backup at the original tip is preserved. The [integration record](../projects/full-documentation-review.md#october-15-integration-and-preservation) owns the composition, conflict decisions and verification. No source history is rewritten; no comparison/synthetic excerpt branch is merged.

The October 14 addendum and its 538-path/84-supporting-file/45-historical-move inventory remain preserved as historical coverage targets. This integration reviews incoming changes and overlaps; it does not certify every inventory path or silently check the exhaustive audit boxes. Below, old source pins and per-file publishing instructions describe the earlier audit workflow, not an instruction to repeat that work during this squash integration. Current source facts and newer authored decisions take precedence over superseded claims.

## Source boundary and inventory

**October 15 focused follow-up:** [Post-integration corrections](../projects/full-documentation-review.md#october-15-post-integration-corrections) repair stale claims restored by the integration and review related passages against current source. This scoped pass does not close the full-file inventory, all-task reconciliation or reverse-coverage gates below.

The [further requested review](../projects/full-documentation-review.md#further-october-15-review) also corrects duplicated limit/status records, inaccurate workload descriptions and the premature completed filing of the readable-promises pair. The active promise paths already listed below now match their reopened status; other historical inventory markers remain unchanged.

**Historical October 14 pins:** Repository: `Macrofold/OpenLegend`. Delivery branch: `docs/full-documentation-review-reconciled-2026-10-03`, read for this update at `931188e5d2616fc0d3435a1cb4f9d91c41ee99d0`. The selected refreshed target is GitHub `refs/heads/main` at `1cf678802d62652d8dd466776d4b95a9d0d19166`, not the stale base SHA reported by PR #28. Common base: `34233ae24365eb8911fe1995c9c232bd57f34616`. No local checkout or local-main ref was supplied. The owner has requested rebase; the earlier synchronization deferral is superseded. These are source pins, not a claim that the rebase has finished.

**Preserved original inputs:** this checklist was published in `66a020ab03e24f944b4088e16e5b4677605e4b5a`, with navigation in `51fcfc0dbc62c3e49ddedfbab140757b2cef9917`. Its initial review input was `bf7366beb621e9c9c4cb03718c542c48ce2b6381`, and its main pin was `7a576214fbb9891b2e9f742db56bbeccaa3a58a1` (562 review commits and 29 main commits beyond the common base). Preserve `backup/full-doc-review-bf7366be-before-7a576214` and `backup/full-doc-review-51fcfc0d-before-1cf67880`; neither is the delivery branch.

The primary register now contains **538 Markdown/text paths**: the original 534, plus four documents from the handoff's comparison to main `1700f3b23a39acfdd14f3a6ab34c8ce330847bc3`; the three Batch 08 project paths are replaced by their completed-area paths, not counted twice. It is supplemented by **84 existing license/example/HTML/JSON source or evidence files** and **45 historical path moves**. The changed `.env.example` remains an explicit source dependency under FDR-02, outside that preserved supporting count. Counts describe coverage targets, not completed semantic reviews or a count of defects. This checklist is validated by the closing gate rather than counted in its own source inventory.

**Remaining freshness boundary:** `1cf67880` contains eight further main commits beyond `1700f3b2`. The 538-path register incorporates the previously unpublished handoff update, but is not yet certified as a complete inventory of that newer target. FDR-01 and FDR-07 remain open for the additional paths, renames and invalidated assumptions; do not report the handoff inventory as exhaustive current-main coverage.

The original upstream file list was obtained through the fully paginated temporary comparison PR #29, not the 300-file-limited commit comparison. Its preserved review inventory is from `7e0f417965579d90dfbe1e49a872a68663efe6d1`; the 149-commit comparison to `bf7366be` changes existing prose and removes temporary tooling, but adds/removes no Markdown/text paths. The handoff adds four documents, three moves and fifty modified existing documents between `7a576214` and `1700f3b2`. Earlier contents and read records must still be refreshed where hashes or assumptions changed.

**R** means present in the preserved review inventory. **U** means an additional upstream documentation path, to read on its pinned main until integration. **M** retains the original register's marker for an R path changed upstream since the common base. **F** marks one of the fifty existing documents changed in the handoff's later `7a576214` → `1700f3b2` comparison. Neither marker proves a textual conflict or a completed review. Historical predecessor paths in FDR-04 are not asserted to exist on either current tip.

Every unchecked file needs a final disposition against the reconciled source; it does not mean the file was never read or that earlier corrections should be repeated. Reuse verifiable prior reading and evidence where the final contents and assumptions are unchanged. For each completed entry record `retained`, `corrected`, `consolidated/moved` or `obsolete`, the reviewed revision, the canonical replacement when applicable, and the relevant correction commit or evidence. Keep detailed read ranges and raw inventories outside Git. Missing historical coverage is unknown, not a pass.

Exclude the `archive/` directory from bulk review. Inspect an archived decision only when it remains an explicitly active dependency; repair archived incoming references when a current file moves. Images, compressed raw traces and executable source are not prose-review entries: inspect them through the document that relies on them, and trace code whenever needed to decide a claim. Do not delete evidence or license material merely because it is historical.

## FDR-01 — Requested rebase and preservation

- [x] Pin the review and main inputs and preserve `backup/full-doc-review-bf7366be-before-7a576214` at the starting review head.
- [x] Prepare the October 15 single-commit integration with both frozen inputs and preserved backups. Mike's explicit squash request supersedes the former ordered-rebase/per-file-history procedure. Publication and required CI are recorded by the resulting commit and its GitHub check, not asserted by completion of the broader audit.
- [x] Reconcile incoming overlaps against the old common base, original review change, partial replay and current implementation/newer accepted intent. The integration record retains significant resolutions; this does not mark every inventory document semantically reviewed.
- [x] Account for the combined original/replay changes, equivalent work, newer main corrections, active project paths and semantic resolutions in the integration candidate. The original backup remains; the partial replay branch itself is not completed or rebased.
- [ ] Refresh the path register for post-pin additions, removals and renames. Reconcile predecessor paths through FDR-04 rather than leaving duplicate active specifications.
- [x] Close temporary comparison PR #29 without merging. Its closed, unmerged state was verified again on October 14; do not reopen it or repeat the closure operation.
- [x] Integrate the handoff update through main `1700f3b2`: four added documents, three Batch 08 path replacements, fifty freshness markers and the configuration/consumer checks below. Further target refresh and semantic reconciliation remain separate open gates.

The earlier temporary source/rebase workflow was blocked before creation; that is historical execution evidence, not a claim that the current GitHub connector lacks Git-object or ref operations. No completed ordered rebase has been published; the authorized October 15 operation is a squash integration. Keep temporary transfer/publishing code out of the delivery branch and leave ordinary CI unchanged. `ops/doc-review-rebase-bf7366be-2026-10-14` is an auxiliary branch at the original review head, not the final delivery branch. The block is not a GitHub repository push-permission denial. Do not label the branch rebased or work around a platform safety block through hidden executable hooks.

## FDR-02 — Concrete reconciliation decisions

- [ ] **Objects, equipment and shelters:** reconcile `docs/maintainers/persistent-objects.md` and its completed foundation links with main's equipment, shelter, reward and catch consumers. Preserve the completed object-foundation scope and the supported newer consumers without inventing a second inventory, custody or attachment owner. Cross-check `editable-shelters.md`, `state-contributions.md`, `spatial-world.md`, their project briefs and the corresponding world/verification files.
- [ ] **Death and danger:** reconcile `docs/worlds/base/lifecycle-and-protection.md`, `combat.md`, `survival.md`, `docs/targeted-actions.md`, the BW/MP/PG trackers and main's player-danger/player-death/first-threat records. Replace superseded collapse or consent assumptions only where accepted changes and implementation support the replacement; preserve privacy, possessions and current-format continuation.
- [ ] **Batch and product status:** reconcile every Batch 03–09 tracker/spec/design/prompt packet with its actual delivered work. Check selected scope, dependencies and assignments without turning a design-only or allocated task into implemented gameplay. Avoid reinstating already-integrated branch prerequisites or making optional simulation detail a prerequisite for a playable loop.
- [ ] **Existing link-repair task:** recheck the five destinations listed at the start of `docs/maintainers/TODO.md`. `docs/limits/interface.md#iw03--creator-editor-layout` already exists on the review branch. Check the three incoming references and both BW22 references; retire only resolved repair work, not unrelated behavior acceptance.
- [ ] **Action documentation status:** reconcile the pending-documentation introduction in `docs/maintainers/action-regressions.md` with completed AR06.2/AR08 in `action-reconciliation.md`. Retain open AR02.2/AR03/AR04.3/AR07.2 and the actual regression cases. Preserve independent PostgreSQL reads and explicitly selected movement to a last-observed location.
- [ ] **Cognition and AI settings:** retain the published `1c705e88` corrections while comparing main's newer character/context changes. Distinguish request-specific model/effort/output settings, fixed settings on an admitted session, full character execution, creator conversations and shared operator-owned compute. Preserve unknown completion, cancellation and paid-request identity; do not reopen removed compatibility work.
- [ ] **Input ownership:** compare the `4e4d832e` number-key shortcut finding with main's changed quick-action code before calling the defect current or repaired. Keep confirmed source gaps separate from browser reproductions; update the existing UIUX task, not a new competing shortcut policy.
- [ ] **World-specific defects previously identified:** recheck promise English/gathering/help/tuning in BW17, gesture wording in NC03 and light eligibility in EWF04 against current implementation. Retain a concrete defect only while it exists; do not document an engine/world boundary violation as an accepted contract to match code.
- [ ] **Performance claims:** reconcile persistence, cognition, perception, sound, native simulation and UI preparation descriptions against current producers and consumers. Distinguish bounded output from bounded preparation, cache capacity from exact-query semantics, cold/steady/long-session measurements and full-server results from isolated timings. Preserve failed large-vector restoration as a distinct workload unless actual matching evidence closes it.
- [ ] **Runtime findings previously identified:** recheck action-description reference exposure under AE03/AE10, goal revision exhaustion under AG02, diagnostic-memory limits and promise-history scanning. Carry verified open work into existing owners; retire superseded findings with their repair evidence, not merely a newer date.
- [ ] **Current-format policy and combined content:** reconcile affected specifications, guidance and RP02 with the [root development policy](../../AGENTS.md#development-save-policy). Mike explicitly approved main's more permissive replacement policy and coherent union of meaningful starting content on October 14; the root correction is published in `931188e5`. Older no-reset wording is superseded, not a reason to reject that decision. Preserve current-format integrity, accounting, privacy and selected integration scope; do not restore legacy readers or incompatible schema unions. No saved world was replaced by the policy documentation commit.
- [ ] **World creation and opening readiness:** read the new Batch 07 implementation plan, playable-opening rules and creation verification alongside their feature/design/prompts and owning tracker. Trace creation host, target selection, initial preparation, authored opening, recovery and public-client callers. Preserve permission checks, exact approval, isolation, bounded preparation, current-format persistence and truthful failure reporting; a source read is not runtime qualification.
- [ ] **Batch 08 completion and perspective:** reconcile the three moved project documents and new missing-belonging verification with the actual scenario, characters and remaining character/perception work. Preserve evidence limits and distinguish an occurrence, each character's perception, private interpretation and information disclosed to the player. The move alone does not close acceptance.
- [ ] **Configuration and broader draft editing:** check `.env.example` against actual configuration and setup owners. Reconcile the upstream rename of `apps/client/src/ui/world-agent-recipe-editor.tsx` to `apps/client/src/ui/world-agent-draft-editor.tsx` and the actual broader edit support; preserve native permissions and exact-approval dependencies rather than treating a filename change as capability or deployment evidence.
- [ ] **Review record and PR:** update `docs/projects/full-documentation-review.md` and PR #28 with the published October 8 corrections, removal of temporary tooling, this checklist, the actual rebase result and final checks. Preserve useful prior evidence while clearly separating historical checkpoints from current status.

## FDR-03 — Completion rule for every file

Read the complete relevant document, not only search hits. For a tracker, reconcile every unchecked item, its full body, linked design, dependencies, blockers and exit criteria with current code and accepted intent; also check completed claims for regressions or unjustified closure. Classify each requirement as delivered and qualified, delivered but unqualified/partial, accepted remaining, proposed, superseded, duplicate or obsolete. Keep stable IDs and unmet criteria. Delete only genuinely unnecessary work, with a replacement pointer where appropriate.

For each accepted requirement in a specification or approved project, check the reverse direction: there must be one current implementation/acceptance owner or valid completion evidence. Proposed examples and repertoire ideas do not automatically become tasks. Missing substantive work goes to its focused tracker; use the general TODO only without a focused owner. This checklist tracks that reconciliation without copying every feature task into itself.

One document owns each current contract. Project briefs retain project-specific rationale; world rules remain world-owned; limits retain their rationale, restrictiveness and revision history; verification reports retain their actual revision, environment, workload, results and failures. Migrate unique useful content before consolidating or removing a file. Do not collapse files merely to reduce file count.

Commit each corrected file before editing the next, naming the exact path in the commit message. For a move, include both paths and complete the accompanying reference repairs in their own named commits. A file can be retained without a cosmetic rewrite; its final disposition still needs evidence. An unchecked audit item never grants authority to implement an unapproved feature or weaken an acceptance gate.

## FDR-04 — Historical path moves to reconcile

These are preservation checks, not instructions to redo completed moves. Inspect both named histories and current incoming references, migrate any unique newer material into the correct current owner, and remove duplicate active copies only after preserving that meaning. Whole-project completion still requires its agreed integration and verification. The two older `next-playable-week` predecessors record intermediate historical names; do not recreate them.

- [ ] `docs/projects/appraisal-social-continuity-feature-spec.md` → `docs/projects/completed/appraisal-social-continuity-feature-spec.md`
- [ ] `docs/projects/appraisal-social-continuity-tech-design.md` → `docs/projects/completed/appraisal-social-continuity-tech-design.md`
- [ ] `docs/projects/completed/next-playable-week/local-branch-integration.md` → `docs/projects/completed/parallel-batch-01-playable-week/local-branch-integration.md`
- [ ] `docs/projects/completed/next-playable-week/memory-retrieval.md` → `docs/projects/completed/parallel-batch-01-playable-week/memory-retrieval.md`
- [ ] `docs/projects/conversation-compaction-feature-spec.md` → `docs/projects/completed/conversation-compaction-feature-spec.md`
- [ ] `docs/projects/conversation-compaction-tech-design.md` → `docs/projects/completed/conversation-compaction-tech-design.md`
- [ ] `docs/projects/data-runtime-hardening.md` → `docs/projects/completed/data-runtime-hardening.md`
- [ ] `docs/projects/dependency-invalidation-feature-spec.md` → `docs/projects/completed/dependency-invalidation-feature-spec.md`
- [ ] `docs/projects/dependency-invalidation-tech-design.md` → `docs/projects/completed/dependency-invalidation-tech-design.md`
- [ ] `docs/projects/foundations-1-5.md` → `docs/projects/completed/foundations-1-5.md`
- [ ] `docs/projects/hearing-main-integration.md` → `docs/projects/completed/hearing-main-integration.md` — historical proposed move; retain the active path while its current required gates remain open.
- [ ] `docs/projects/history-save-recovery.md` → `docs/projects/completed/history-save-recovery.md`
- [ ] `docs/projects/history-storage-efficiency.md` → `docs/projects/completed/history-storage-efficiency.md`
- [ ] `docs/projects/invention-questions-feature-spec.md` → `docs/projects/completed/invention-questions-feature-spec.md`
- [ ] `docs/projects/invention-questions-tech-design.md` → `docs/projects/completed/invention-questions-tech-design.md`
- [ ] `docs/projects/mercenary-scene-pilot.md` → `docs/projects/completed/mercenary-scene-pilot.md`
- [ ] `docs/projects/multiplayer-authority-feature-spec.md` → `docs/projects/completed/multiplayer-authority-feature-spec.md`
- [ ] `docs/projects/multiplayer-authority-tech-design.md` → `docs/projects/completed/multiplayer-authority-tech-design.md`
- [ ] `docs/projects/multiplayer-entry-maintenance.md` → `docs/projects/completed/multiplayer-entry-maintenance.md`
- [ ] `docs/projects/narration-failure-cleanup.md` → `docs/projects/completed/narration-failure-cleanup.md`
- [ ] `docs/projects/ordered-async-saves.md` → `docs/projects/completed/ordered-async-saves.md` — historical proposed move; retain the active path while its current required gates remain open.
- [ ] `docs/projects/parallel-batch-01-playable-week/local-branch-integration.md` → `docs/projects/completed/parallel-batch-01-playable-week/local-branch-integration.md`
- [ ] `docs/projects/parallel-batch-01-playable-week/memory-retrieval.md` → `docs/projects/completed/parallel-batch-01-playable-week/memory-retrieval.md`
- [ ] `docs/projects/persistent-objects-feature-spec.md` → `docs/projects/completed/persistent-objects-feature-spec.md`
- [ ] `docs/projects/persistent-objects-tech-design.md` → `docs/projects/completed/persistent-objects-tech-design.md`
- [ ] `docs/projects/postgresql-cognition-preparation.md` → `docs/projects/completed/postgresql-cognition-preparation.md`
- [ ] `docs/projects/regional-time-and-navigation.md` → `docs/projects/completed/regional-time-and-navigation.md` — historical proposed move; retain the active path while its current required gates remain open.
- [ ] `docs/projects/shared-state-contributions-feature-spec.md` → `docs/projects/completed/shared-state-contributions-feature-spec.md`
- [ ] `docs/projects/shared-state-contributions-tech-design.md` → `docs/projects/completed/shared-state-contributions-tech-design.md`
- [ ] `docs/projects/spatial-cadence-main-integration.md` → `docs/projects/completed/spatial-cadence-main-integration.md`
- [ ] `docs/projects/world-agent-context-feature-spec.md` → `docs/projects/completed/world-agent-context-feature-spec.md`
- [ ] `docs/projects/world-agent-context-tech-design.md` → `docs/projects/completed/world-agent-context-tech-design.md`
- [ ] `docs/projects/world-agent-context/README.md` → `docs/projects/completed/world-agent-context/README.md`
- [ ] `docs/projects/world-agent-context/examples/candidate-graph.yaml` → `docs/projects/completed/world-agent-context/examples/candidate-graph.yaml`
- [ ] `docs/projects/world-agent-context/examples/pipeline-state.yaml` → `docs/projects/completed/world-agent-context/examples/pipeline-state.yaml`
- [ ] `docs/projects/world-agent-context/examples/prompt-template.yaml` → `docs/projects/completed/world-agent-context/examples/prompt-template.yaml`
- [ ] `docs/projects/world-agent-context/examples/recipe-fields.yaml` → `docs/projects/completed/world-agent-context/examples/recipe-fields.yaml`
- [ ] `docs/projects/world-agent-context/examples/recipe-submit.yaml` → `docs/projects/completed/world-agent-context/examples/recipe-submit.yaml`
- [ ] `docs/projects/world-agent-context/examples/sleep-context.yaml` → `docs/projects/completed/world-agent-context/examples/sleep-context.yaml`
- [ ] `docs/projects/world-agent-context/examples/sling-context.yaml` → `docs/projects/completed/world-agent-context/examples/sling-context.yaml`
- [ ] `docs/projects/world-agent-context/initial-foundation.md` → `docs/projects/completed/world-agent-context/initial-foundation.md`
- [ ] `docs/projects/world-agent-context/mechanics.md` → `docs/projects/completed/world-agent-context/mechanics.md`
- [ ] `docs/projects/parallel-batch-08-the-missing-belonging-feature-spec.md` → `docs/projects/completed/parallel-batch-08-the-missing-belonging-feature-spec.md`
- [ ] `docs/projects/parallel-batch-08-the-missing-belonging-prompts.md` → `docs/projects/completed/parallel-batch-08-the-missing-belonging-prompts.md`
- [ ] `docs/projects/parallel-batch-08-the-missing-belonging-tech-design.md` → `docs/projects/completed/parallel-batch-08-the-missing-belonging-tech-design.md`

## FDR-05 — Primary document register

Apply FDR-03 to every entry. The grouping below changes navigation only; all paths are repository-relative. A checked entry certifies reconciliation of that file at the recorded revision, not completion of its feature.

### Other repository documentation — 22 files

Check onboarding, package boundaries, contribution/asset rights, local instructions and recovery guidance. License texts are preservation/reference checks, not permission to rewrite license terms.

- [ ] `.github/pull_request_template.md` — R
- [ ] `.integration/recovery/README.md` — R
- [ ] `AGENTS.md` — R, M, F
- [ ] `CLAUDE.md` — R
- [ ] `CONTRIBUTING.md` — R
- [ ] `LICENSING.md` — R
- [ ] `README.md` — R, F
- [ ] `apps/client/AGENTS.md` — R
- [ ] `apps/client/src/design-system/README.md` — R
- [ ] `apps/client/src/design-system/fonts/atkinsonhyperlegiblenext-OFL.txt` — R
- [ ] `apps/client/src/design-system/fonts/chakrapetch-OFL.txt` — R
- [ ] `apps/client/src/design-system/fonts/cinzel-OFL.txt` — R
- [ ] `apps/client/src/design-system/fonts/cormorantgaramond-OFL.txt` — R
- [ ] `apps/client/src/design-system/fonts/ibmplexmono-OFL.txt` — R
- [ ] `apps/client/src/design-system/icons/ATTRIBUTION.md` — R
- [ ] `apps/server/AGENTS.md` — R, M
- [ ] `licenses/Apache-2.0.txt` — R
- [ ] `packages/ai/AGENTS.md` — R
- [ ] `packages/domain/AGENTS.md` — R, M, F
- [ ] `packages/domain/src/README.md` — R
- [ ] `packages/protocol/AGENTS.md` — R
- [ ] `packages/spatial/AGENTS.md` — R, M

### Guidance — 20 files

Reconcile the reusable review skill, routing and root policies without duplicate or weaker instructions. Preserve the protected development policy; a new skill is not task authorization.

- [ ] `.agents/README.md` — R, M
- [ ] `.agents/references/research.md` — R
- [ ] `.agents/rules/documentation.md` — R
- [ ] `.agents/rules/typescript.md` — R, M
- [ ] `.agents/rules/ui-ux.md` — R
- [ ] `.agents/rules/verification.md` — R, M
- [ ] `.agents/skills/create-parallel-tasks/SKILL.md` — R, M
- [ ] `.agents/skills/create-parallel-tasks/references/planning.md` — R, M
- [ ] `.agents/skills/create-parallel-tasks/references/task-prompts.md` — R, M
- [ ] `.agents/skills/full-documentation-review/SKILL.md` — R
- [ ] `.agents/skills/openlegend-ai/SKILL.md` — R
- [ ] `.agents/skills/openlegend-behavior-debugging/SKILL.md` — R, M
- [ ] `.agents/skills/openlegend-behavior-debugging/references/experiments.md` — R
- [ ] `.agents/skills/openlegend-design/SKILL.md` — R, M
- [ ] `.agents/skills/openlegend-guidance/SKILL.md` — R, M
- [ ] `.agents/skills/openlegend-performance/SKILL.md` — R, M, F
- [ ] `.agents/skills/openlegend-playcanvas/SKILL.md` — R
- [ ] `.agents/skills/openlegend-prioritize/SKILL.md` — R, M
- [ ] `.agents/skills/openlegend-rebase/SKILL.md` — R
- [ ] `.agents/skills/openlegend-review/SKILL.md` — R, M

### Core specifications — 48 files

Check current contracts, implemented-versus-target statements, code consumers, canonical ownership and links to the correct task/limits/evidence owners.

- [ ] `docs/action-capabilities.md` — R, M
- [ ] `docs/action-experience.md` — R, M
- [ ] `docs/agent-agency.md` — R, M
- [ ] `docs/ai-providers.md` — R, M, F
- [ ] `docs/architecture.md` — R, M, F
- [ ] `docs/documentation-changelog.md` — R, M, F
- [ ] `docs/encounter-scaling.md` — R
- [ ] `docs/engine-and-world-boundaries.md` — R, M, F
- [ ] `docs/entity-names.md` — R
- [ ] `docs/events-perception-and-reactions.md` — R, M
- [ ] `docs/extending.md` — R
- [ ] `docs/extensibility-roadmap.md` — R
- [ ] `docs/extensible-world-examples.md` — R
- [ ] `docs/feature-documentation.md` — R, F
- [ ] `docs/food-preparation.md` — U
- [ ] `docs/hearing-and-speech.md` — R
- [ ] `docs/identity-and-references.md` — R, M, F
- [ ] `docs/invention-art-pipeline.md` — R
- [ ] `docs/invention-budgets.md` — R
- [ ] `docs/invention-composition.md` — R
- [ ] `docs/invention-foundation.md` — R, M
- [ ] `docs/invention-graph.md` — R
- [ ] `docs/invention-handoff.md` — R
- [ ] `docs/invention-scenarios.md` — R
- [ ] `docs/invention-validation.md` — R
- [ ] `docs/invention-workshop-tools.md` — R, F
- [ ] `docs/knowledge.md` — R, M, F
- [ ] `docs/live-ai-setup.md` — R
- [ ] `docs/macrofold-world-agent-handoff.md` — R
- [ ] `docs/memory-architecture.md` — R, M, F
- [ ] `docs/narration-and-conversations.md` — R, M, F
- [ ] `docs/openlegend-limits-decisions.md` — R, M
- [ ] `docs/perceived-world-events.md` — R, F
- [ ] `docs/performance.md` — R, M, F
- [ ] `docs/repertoire-foundation.md` — R
- [ ] `docs/save-and-load.md` — R, M, F
- [ ] `docs/simulation-time.md` — R
- [ ] `docs/spatial-world.md` — R, M
- [ ] `docs/status-effects.md` — R
- [ ] `docs/targeted-actions.md` — R, M
- [ ] `docs/timed-ui.md` — R
- [ ] `docs/ui-design-brief.md` — R
- [ ] `docs/verification.md` — R, M, F
- [ ] `docs/world-agent-inspection-and-edits.md` — R
- [ ] `docs/world-agent-mcp.md` — R, F
- [ ] `docs/world-agent-runtime.md` — R, F
- [ ] `docs/world-constitution.md` — R
- [ ] `docs/world-presentation.md` — R

### Maintainer trackers and navigation — 55 files

For each tracker inspect every open task and completed claim under FDR-03. Reconcile shared dependencies, task ownership and approval status; the README remains navigation rather than a second task body.

- [ ] `docs/maintainers/3d-pixel-art.md` — R
- [ ] `docs/maintainers/README.md` — R, M, F
- [ ] `docs/maintainers/TODO.md` — R
- [ ] `docs/maintainers/action-capabilities.md` — R, M
- [ ] `docs/maintainers/action-experience.md` — R, M
- [ ] `docs/maintainers/action-reconciliation.md` — R
- [ ] `docs/maintainers/action-regressions.md` — R
- [ ] `docs/maintainers/actor-model.md` — R
- [ ] `docs/maintainers/agent-agency.md` — R, M, F
- [ ] `docs/maintainers/agent-guidance.md` — R, M, F
- [ ] `docs/maintainers/art-direction.md` — R
- [ ] `docs/maintainers/art/mercenary.md` — R
- [ ] `docs/maintainers/base-world.md` — R, M, F
- [ ] `docs/maintainers/character-experience.md` — R, M, F
- [ ] `docs/maintainers/cognition-redesign.md` — R, M, F
- [ ] `docs/maintainers/creator-edits.md` — R, M
- [ ] `docs/maintainers/dependency-invalidation.md` — R
- [ ] `docs/maintainers/editable-shelters.md` — U
- [ ] `docs/maintainers/events-perception-and-reactions.md` — R, F
- [ ] `docs/maintainers/extensible-world-foundation.md` — R, M, F
- [ ] `docs/maintainers/hearing-and-speech.md` — R, F
- [ ] `docs/maintainers/hearing-handoff.md` — R
- [ ] `docs/maintainers/inventions-and-world-evolution.md` — R, M, F
- [ ] `docs/maintainers/limits-audit.md` — R
- [ ] `docs/maintainers/macrofold-worker-api.md` — R
- [ ] `docs/maintainers/multiplayer.md` — R, M
- [ ] `docs/maintainers/narration-and-conversations.md` — R, M, F
- [ ] `docs/maintainers/needs-design.md` — R, M, F
- [ ] `docs/maintainers/parallel-batch-01-playable-week.md` — R
- [ ] `docs/maintainers/parallel-batch-02-foundations-and-usability.md` — R
- [ ] `docs/maintainers/parallel-batch-03-personal-game.md` — R, M
- [ ] `docs/maintainers/parallel-batch-04-expeditions-and-exchange.md` — R, M
- [ ] `docs/maintainers/parallel-batch-05-adventure-defense-and-home.md` — U
- [ ] `docs/maintainers/parallel-batch-06-rivals-and-contested-ground.md` — U
- [ ] `docs/maintainers/parallel-batch-07-playable-world-creation.md` — U, F
- [ ] `docs/maintainers/parallel-batch-08-the-missing-belonging.md` — U, F
- [ ] `docs/maintainers/parallel-batch-09-reviewed-content-removal.md` — U
- [ ] `docs/maintainers/performance-profiling.md` — R
- [ ] `docs/maintainers/performance.md` — R, M
- [ ] `docs/maintainers/persistent-objects.md` — R, M
- [ ] `docs/maintainers/practical-competence.md` — R, M
- [ ] `docs/maintainers/product-scalability.md` — R, M
- [ ] `docs/maintainers/production-data.md` — R, F
- [ ] `docs/maintainers/production-deployment.md` — R
- [ ] `docs/maintainers/remaining-foundational-work.md` — R
- [ ] `docs/maintainers/revisitable-policies.md` — R, M, F
- [ ] `docs/maintainers/save-and-load.md` — R
- [ ] `docs/maintainers/simulation-boundaries.md` — R
- [ ] `docs/maintainers/simulation-time.md` — R
- [ ] `docs/maintainers/spatial-world.md` — R, M
- [ ] `docs/maintainers/speech-time-integration.md` — R
- [ ] `docs/maintainers/state-contributions.md` — R, M
- [ ] `docs/maintainers/ui-ux.md` — R, M
- [ ] `docs/maintainers/wellbeing-evidence.md` — R
- [ ] `docs/maintainers/world-agent-writes.md` — R, F

### Limits and policy inventories — 33 files

Check every named policy against actual consumers and accepted intent. Preserve IDs, historical removals and measured versus estimated bounds; do not turn every default into speculative new work.

- [ ] `docs/limits/3d-pixel-art.md` — R
- [ ] `docs/limits/README.md` — R
- [ ] `docs/limits/action-experience.md` — R, M
- [ ] `docs/limits/ai-execution.md` — R
- [ ] `docs/limits/authored-stats.md` — R, M
- [ ] `docs/limits/base-world.md` — R, M
- [ ] `docs/limits/cognition.md` — R, M
- [ ] `docs/limits/creator-edits.md` — R, M
- [ ] `docs/limits/editable-shelters.md` — R, M
- [ ] `docs/limits/feelings.md` — R
- [ ] `docs/limits/food-preparation.md` — U
- [ ] `docs/limits/hearing-and-speech.md` — R, F
- [ ] `docs/limits/import-coverage.md` — R
- [ ] `docs/limits/interface.md` — R, F
- [ ] `docs/limits/inventions.md` — R, M
- [ ] `docs/limits/memory.md` — R, M
- [ ] `docs/limits/multiplayer.md` — R
- [ ] `docs/limits/narration.md` — R, M
- [ ] `docs/limits/native-work.md` — R
- [ ] `docs/limits/objects.md` — R, M
- [ ] `docs/limits/observability.md` — R
- [ ] `docs/limits/parallel-batch-04-expeditions-and-exchange.md` — R, M
- [ ] `docs/limits/parallel-batch-05-adventure-defense-and-home.md` — U
- [ ] `docs/limits/parallel-batch-06-rivals-and-contested-ground.md` — U
- [ ] `docs/limits/parallel-batch-08-the-missing-belonging.md` — U, F
- [ ] `docs/limits/persistence.md` — R, M
- [ ] `docs/limits/product-scalability.md` — R
- [ ] `docs/limits/production-deployment.md` — R
- [ ] `docs/limits/spatial.md` — R, M
- [ ] `docs/limits/state-effects.md` — R
- [ ] `docs/limits/ui-ux.md` — R
- [ ] `docs/limits/wellbeing-evidence.md` — R
- [ ] `docs/limits/world-creation.md` — R, M, F

### Active project records — 76 files

Reconcile each project as a set: scope, approval, feature/design agreement, implementation assignments, acceptance and dated status tables. Move the set only when wholly complete.

- [ ] `docs/projects/3d-pixel-art-appearance-families.md` — R
- [ ] `docs/projects/3d-pixel-art-asset-pipeline.md` — R
- [ ] `docs/projects/3d-pixel-art-feature-spec.md` — R
- [ ] `docs/projects/3d-pixel-art-tech-design.md` — R
- [ ] `docs/projects/3d-pixel-art-validation.md` — R
- [ ] `docs/projects/action-experience-feature-spec.md` — R
- [ ] `docs/projects/action-experience-tech-design.md` — R
- [ ] `docs/projects/action-experience.md` — R
- [ ] `docs/projects/attention-and-scenes-feature-spec.md` — R
- [ ] `docs/projects/auth0-sign-in.md` — R
- [ ] `docs/projects/authored-stats-feature-spec.md` — R, M
- [ ] `docs/projects/authored-stats-tech-design.md` — U
- [ ] `docs/projects/camp-fire-and-sharing.md` — R
- [ ] `docs/projects/compelling-characters-feature-spec.md` — R, M
- [ ] `docs/projects/compelling-characters-tech-design.md` — U
- [ ] `docs/projects/composed-activities.md` — R
- [ ] `docs/projects/continuing-lives-feature-spec.md` — R
- [ ] `docs/projects/creator-edit-propagation-feature-spec.md` — R, M
- [ ] `docs/projects/creator-edit-propagation-tech-design.md` — R, M
- [ ] `docs/projects/editable-shelters-feature-spec.md` — R, M
- [ ] `docs/projects/editable-shelters-tech-design.md` — U
- [ ] `docs/projects/embodied-survival-feature-spec.md` — R, M
- [ ] `docs/projects/embodied-survival-tech-design.md` — R, M
- [ ] `docs/projects/five-product-feature-specs.md` — R, M
- [ ] `docs/projects/full-documentation-review.md` — R
- [ ] `docs/projects/immediate-gameplay-limits.md` — R
- [ ] `docs/projects/invention-production-integration.md` — R
- [ ] `docs/projects/level1-decisions.md` — R
- [ ] `docs/projects/native-action-integration.md` — R
- [ ] `docs/projects/parallel-batch-01-playable-week-feature-spec.md` — R
- [ ] `docs/projects/parallel-batch-01-playable-week-tech-design.md` — R
- [ ] `docs/projects/parallel-batch-01-playable-week/camp-activities.md` — R
- [ ] `docs/projects/parallel-batch-01-playable-week/engineer-5-plan.md` — R
- [ ] `docs/projects/parallel-batch-01-playable-week/invention-workspace.md` — R
- [ ] `docs/projects/parallel-batch-01-playable-week/simulation-performance.md` — R
- [ ] `docs/projects/parallel-batch-01-playable-week/survival.md` — R
- [ ] `docs/projects/parallel-batch-03-personal-game-feature-spec.md` — R, M
- [ ] `docs/projects/parallel-batch-03-personal-game-prompts.md` — R, M
- [ ] `docs/projects/parallel-batch-03-personal-game-tech-design.md` — R, M
- [ ] `docs/projects/parallel-batch-04-expeditions-and-exchange-feature-spec.md` — R, M
- [ ] `docs/projects/parallel-batch-04-expeditions-and-exchange-prompts.md` — R, M
- [ ] `docs/projects/parallel-batch-04-expeditions-and-exchange-tech-design.md` — R, M
- [ ] `docs/projects/parallel-batch-05-adventure-defense-and-home-feature-spec.md` — U
- [ ] `docs/projects/parallel-batch-05-adventure-defense-and-home-prompts.md` — U
- [ ] `docs/projects/parallel-batch-05-adventure-defense-and-home-tech-design.md` — U
- [ ] `docs/projects/parallel-batch-06-rivals-and-contested-ground-feature-spec.md` — U
- [ ] `docs/projects/parallel-batch-06-rivals-and-contested-ground-prompts.md` — U
- [ ] `docs/projects/parallel-batch-06-rivals-and-contested-ground-tech-design.md` — U
- [ ] `docs/projects/parallel-batch-07-playable-world-creation-feature-spec.md` — U, F
- [ ] `docs/projects/parallel-batch-07-playable-world-creation-implementation-plan.md` — U
- [ ] `docs/projects/parallel-batch-07-playable-world-creation-prompts.md` — U, F
- [ ] `docs/projects/parallel-batch-07-playable-world-creation-tech-design.md` — U, F
- [ ] `docs/projects/parallel-batch-09-reviewed-content-removal-feature-spec.md` — U
- [ ] `docs/projects/parallel-batch-09-reviewed-content-removal-prompts.md` — U
- [ ] `docs/projects/parallel-batch-09-reviewed-content-removal-tech-design.md` — U
- [ ] `docs/projects/parallel-batches.md` — R, M, F
- [ ] `docs/projects/perception-reaction-intake.md` — R
- [ ] `docs/projects/player-clarity-ui.md` — R
- [ ] `docs/projects/priority-followups-plan.md` — R
- [ ] `docs/projects/product-scalability-feature-spec.md` — R
- [ ] `docs/projects/product-scalability-tech-design.md` — R
- [ ] `docs/projects/production-deployment-feature-spec.md` — R
- [ ] `docs/projects/production-deployment-playbook.md` — R
- [ ] `docs/projects/production-deployment-tech-design.md` — R
- [ ] `docs/projects/proportional-step-work.md` — R
- [ ] `docs/projects/readable-promises-feature-spec.md` — R
- [ ] `docs/projects/readable-promises-tech-design.md` — R
- [ ] `docs/projects/save-round-trip-batching-feature-spec.md` — R
- [ ] `docs/projects/save-round-trip-batching-tech-design.md` — R
- [ ] `docs/projects/shadow-quality-feature-spec.md` — R
- [ ] `docs/projects/shadow-quality-tech-design.md` — R
- [ ] `docs/projects/story-perspectives-feature-spec.md` — R
- [ ] `docs/projects/three-times-scene-performance.md` — R
- [ ] `docs/projects/wellbeing-evidence-feature-spec.md` — R
- [ ] `docs/projects/world-configured-survival.md` — R
- [ ] `docs/projects/world-creation-feature-spec.md` — R, M, F

### Completed project records — 72 files

Preserve completion evidence and unique rationale. Determine whether new work is a distinct extension or truly reopens this project; do not reopen a completed foundation for unrelated capacity work.

- [ ] `docs/projects/completed/README.md` — R
- [ ] `docs/projects/completed/appraisal-social-continuity-feature-spec.md` — R
- [ ] `docs/projects/completed/appraisal-social-continuity-tech-design.md` — R
- [ ] `docs/projects/completed/character-visibility.md` — R
- [ ] `docs/projects/completed/conversation-compaction-feature-spec.md` — R
- [ ] `docs/projects/completed/conversation-compaction-tech-design.md` — R
- [ ] `docs/projects/completed/conversation-layout-and-local-ai.md` — R
- [ ] `docs/projects/completed/data-runtime-hardening.md` — R
- [ ] `docs/projects/completed/dependency-invalidation-feature-spec.md` — R
- [ ] `docs/projects/completed/dependency-invalidation-tech-design.md` — R
- [ ] `docs/projects/completed/editable-shelters-final-review-plan.md` — U
- [ ] `docs/projects/completed/editable-shelters-implementation-plan.md` — U
- [ ] `docs/projects/completed/editable-shelters-lean-to-plan.md` — U
- [ ] `docs/projects/completed/editable-shelters-review-plan.md` — U
- [ ] `docs/projects/completed/embodied-feedback-plan.md` — R
- [ ] `docs/projects/completed/embodied-feedback-review-plan.md` — R
- [ ] `docs/projects/completed/entity-name-articles-plan.md` — R
- [ ] `docs/projects/completed/family-authoring-feature-spec.md` — R
- [ ] `docs/projects/completed/family-authoring-tech-design.md` — R
- [ ] `docs/projects/completed/first-threat-encounter-feature-spec.md` — U
- [ ] `docs/projects/completed/first-threat-encounter-tech-design.md` — U
- [ ] `docs/projects/completed/foundations-1-5.md` — R
- [ ] `docs/projects/completed/hearing-main-integration.md` — R
- [ ] `docs/projects/completed/history-save-recovery.md` — R
- [ ] `docs/projects/completed/history-storage-efficiency.md` — R
- [ ] `docs/projects/completed/invention-questions-feature-spec.md` — R
- [ ] `docs/projects/completed/invention-questions-tech-design.md` — R
- [ ] `docs/projects/completed/mercenary-scene-pilot.md` — R
- [ ] `docs/projects/completed/multiplayer-authority-feature-spec.md` — R
- [ ] `docs/projects/completed/multiplayer-authority-tech-design.md` — R
- [ ] `docs/projects/completed/multiplayer-entry-maintenance.md` — R
- [ ] `docs/projects/completed/narration-failure-cleanup.md` — R
- [ ] `docs/projects/completed/ordered-async-saves.md` — R
- [ ] `docs/projects/completed/parallel-batch-01-playable-week/local-branch-integration.md` — R
- [ ] `docs/projects/completed/parallel-batch-01-playable-week/memory-retrieval.md` — R
- [ ] `docs/projects/completed/parallel-batch-02-foundations-and-usability-feature-spec.md` — R
- [ ] `docs/projects/completed/parallel-batch-02-foundations-and-usability-prompts.md` — R
- [ ] `docs/projects/completed/parallel-batch-02-foundations-and-usability-tech-design.md` — R
- [ ] `docs/projects/completed/parallel-batch-08-the-missing-belonging-feature-spec.md` — U
- [ ] `docs/projects/completed/parallel-batch-08-the-missing-belonging-prompts.md` — U
- [ ] `docs/projects/completed/parallel-batch-08-the-missing-belonging-tech-design.md` — U
- [ ] `docs/projects/completed/perception-overlays.md` — R
- [ ] `docs/projects/completed/perception-range-polish.md` — R
- [ ] `docs/projects/completed/persistent-objects-feature-spec.md` — R
- [ ] `docs/projects/completed/persistent-objects-tech-design.md` — R
- [ ] `docs/projects/completed/player-danger-feature-spec.md` — U
- [ ] `docs/projects/completed/player-danger-tech-design.md` — U
- [ ] `docs/projects/completed/player-death-feature-spec.md` — U
- [ ] `docs/projects/completed/player-death-tech-design.md` — U
- [ ] `docs/projects/completed/postgresql-cognition-preparation.md` — R
- [ ] `docs/projects/completed/product-design-groups-11-15.md` — R, M
- [ ] `docs/projects/completed/px02-barter-review-plan.md` — U
- [ ] `docs/projects/completed/px02-reciprocal-barter-plan.md` — U
- [ ] `docs/projects/completed/px04-voluntary-outings-plan.md` — U
- [ ] `docs/projects/completed/regional-time-and-navigation.md` — R
- [ ] `docs/projects/completed/rewarding-expeditions-implementation.md` — U
- [ ] `docs/projects/completed/river-meal-implementation-plan.md` — U
- [ ] `docs/projects/completed/river-meal-review-plan.md` — U
- [ ] `docs/projects/completed/river-meal-second-review-plan.md` — U
- [ ] `docs/projects/completed/save-editor-family-plan.md` — R
- [ ] `docs/projects/completed/shared-state-contributions-feature-spec.md` — R
- [ ] `docs/projects/completed/shared-state-contributions-tech-design.md` — R
- [ ] `docs/projects/completed/spatial-cadence-main-integration.md` — R
- [ ] `docs/projects/completed/tab-resume-feature-spec.md` — R
- [ ] `docs/projects/completed/tab-resume-tech-design.md` — R
- [ ] `docs/projects/completed/validation-purpose-audit.md` — R
- [ ] `docs/projects/completed/wilderness-expansion-plan.md` — R
- [ ] `docs/projects/completed/world-agent-context-feature-spec.md` — R
- [ ] `docs/projects/completed/world-agent-context-tech-design.md` — R
- [ ] `docs/projects/completed/world-agent-context/README.md` — R
- [ ] `docs/projects/completed/world-agent-context/initial-foundation.md` — R
- [ ] `docs/projects/completed/world-agent-context/mechanics.md` — R

### Bundled-world contracts — 32 files

Check authored rules, vocabulary, tuning, supported scenarios and useful player outcomes against their native world owners. Keep generic infrastructure in its engine owner.

- [ ] `docs/worlds/README.md` — R
- [ ] `docs/worlds/base/README.md` — R, M
- [ ] `docs/worlds/base/actions.md` — R, M
- [ ] `docs/worlds/base/camp-containers.md` — R
- [ ] `docs/worlds/base/camp-routines.md` — R
- [ ] `docs/worlds/base/combat.md` — R, M
- [ ] `docs/worlds/base/connection-study-outing.md` — R
- [ ] `docs/worlds/base/contested-watchpost.md` — U
- [ ] `docs/worlds/base/editable-shelters.md` — R, M
- [ ] `docs/worlds/base/first-threat-encounter.md` — U
- [ ] `docs/worlds/base/invention-families.md` — R
- [ ] `docs/worlds/base/items.md` — R, M
- [ ] `docs/worlds/base/knowledge.md` — R
- [ ] `docs/worlds/base/landscape.md` — R
- [ ] `docs/worlds/base/lifecycle-and-protection.md` — R, M
- [ ] `docs/worlds/base/missing-belonging.md` — U, F
- [ ] `docs/worlds/base/navigation.md` — R
- [ ] `docs/worlds/base/places.md` — U
- [ ] `docs/worlds/base/playable-openings.md` — U
- [ ] `docs/worlds/base/player-danger.md` — U
- [ ] `docs/worlds/base/player-death.md` — U
- [ ] `docs/worlds/base/practical-competence.md` — R, M
- [ ] `docs/worlds/base/ranged-counterplay.md` — U
- [ ] `docs/worlds/base/rewarding-expeditions.md` — U
- [ ] `docs/worlds/base/river-fishing.md` — U
- [ ] `docs/worlds/base/shield-defense.md` — U
- [ ] `docs/worlds/base/sleep.md` — R
- [ ] `docs/worlds/base/social.md` — R, M, F
- [ ] `docs/worlds/base/story-perspectives.md` — R
- [ ] `docs/worlds/base/survival.md` — R, M
- [ ] `docs/worlds/base/time.md` — R
- [ ] `docs/worlds/base/typed-requests.md` — R

### Repertoires and prioritization — 42 files

Reconcile canonical catalogues, stable IDs, cross-references and gameplay-first selection. Examples are ideas, not a claim that all listed mechanics are installed or approved.

- [ ] `docs/repertoires/README.md` — R
- [ ] `docs/repertoires/abilities-progression.md` — R
- [ ] `docs/repertoires/actions.md` — R
- [ ] `docs/repertoires/adventure-discovery.md` — R
- [ ] `docs/repertoires/arts-leisure.md` — R
- [ ] `docs/repertoires/automation-creators.md` — R
- [ ] `docs/repertoires/bodies-species.md` — R, M
- [ ] `docs/repertoires/characters-backstories.md` — R
- [ ] `docs/repertoires/combat-rescue.md` — R
- [ ] `docs/repertoires/combinations.md` — R
- [ ] `docs/repertoires/coverage.md` — R
- [ ] `docs/repertoires/design-foundation.md` — R
- [ ] `docs/repertoires/diplomacy-conflict.md` — R
- [ ] `docs/repertoires/ecology-weather.md` — R
- [ ] `docs/repertoires/economy-logistics.md` — R
- [ ] `docs/repertoires/faith-ritual.md` — R
- [ ] `docs/repertoires/gameplay-priorities.md` — R
- [ ] `docs/repertoires/group-3-reading-progress.md` — R
- [ ] `docs/repertoires/group-6-reading-progress.md` — R
- [ ] `docs/repertoires/group-7-research-progress.md` — R
- [ ] `docs/repertoires/history-myth.md` — R
- [ ] `docs/repertoires/institutions-politics.md` — R
- [ ] `docs/repertoires/languages-knowledge.md` — R
- [ ] `docs/repertoires/magic.md` — R
- [ ] `docs/repertoires/materials-resources.md` — R
- [ ] `docs/repertoires/mechanics.md` — R
- [ ] `docs/repertoires/needs.md` — R
- [ ] `docs/repertoires/objects.md` — R
- [ ] `docs/repertoires/psychology-behavior.md` — R
- [ ] `docs/repertoires/relationships.md` — R
- [ ] `docs/repertoires/selection-and-scale.md` — R
- [ ] `docs/repertoires/settlements-architecture.md` — R
- [ ] `docs/repertoires/simulation-experiments.md` — R
- [ ] `docs/repertoires/source-atlas.md` — R
- [ ] `docs/repertoires/technology.md` — R
- [ ] `docs/repertoires/traits.md` — R
- [ ] `docs/repertoires/unusual-realities.md` — R
- [ ] `docs/repertoires/work-crafting.md` — R
- [ ] `docs/repertoires/worlds/living-fantasy.md` — R
- [ ] `docs/repertoires/worlds/medieval-survival.md` — R
- [ ] `docs/repertoires/worlds/modern-life.md` — R
- [ ] `docs/repertoires/worlds/planetary-scifi.md` — R

### Product scalability — 8 files

Keep approved targets, proposals and real hosted delivery distinct. Trace authority, funding, persistence and operations responsibilities without speculative infrastructure.

- [ ] `docs/product-scalability/README.md` — R
- [ ] `docs/product-scalability/alternatives.md` — R
- [ ] `docs/product-scalability/attention-and-scenes.md` — R
- [ ] `docs/product-scalability/background-progression.md` — R
- [ ] `docs/product-scalability/capacity-and-economics.md` — R
- [ ] `docs/product-scalability/participation-and-protection.md` — R
- [ ] `docs/product-scalability/shared-campaigns.md` — R
- [ ] `docs/product-scalability/worlds-and-belonging.md` — R

### UI/UX handbook — 10 files

Reconcile shared control/input/accessibility conventions and actual evidence; avoid duplicated input rules and claims that code inspection or screenshots prove full interaction acceptance.

- [ ] `docs/ui-ux/README.md` — R
- [ ] `docs/ui-ux/chat-and-invention.md` — R
- [ ] `docs/ui-ux/controls.md` — R
- [ ] `docs/ui-ux/foundations.md` — R
- [ ] `docs/ui-ux/inventory.md` — R, M
- [ ] `docs/ui-ux/react.md` — R, M, F
- [ ] `docs/ui-ux/research.md` — R, M
- [ ] `docs/ui-ux/system-feedback.md` — R
- [ ] `docs/ui-ux/verification.md` — R
- [ ] `docs/ui-ux/world-interaction.md` — R, M

### Verification reports — 92 files

Preserve the specific historical revision and workload. Link current acceptance to relevant evidence, distinguish fixture/native/browser/provider/stress checks, and retain failures rather than rewriting them into passes.

- [ ] `docs/verification/action-experience-artifacts/active-save-result.txt` — R
- [ ] `docs/verification/action-experience-artifacts/existing-tests.txt` — R
- [ ] `docs/verification/action-experience-artifacts/final-inputs.md` — R
- [ ] `docs/verification/action-experience-artifacts/independent-replay-result.txt` — R
- [ ] `docs/verification/action-experience-artifacts/independent-result.txt` — R
- [ ] `docs/verification/action-experience-artifacts/native-result.txt` — R
- [ ] `docs/verification/action-experience-artifacts/server-result.txt` — R
- [ ] `docs/verification/action-experience.md` — R
- [ ] `docs/verification/action-reconciliation.md` — R
- [ ] `docs/verification/actor-agency-and-inventions.md` — R
- [ ] `docs/verification/agency-documentation-integration.md` — R
- [ ] `docs/verification/attributes-and-actor-state.md` — R
- [ ] `docs/verification/camp-life.md` — R
- [ ] `docs/verification/character-visibility.md` — R
- [ ] `docs/verification/checkpoints-and-recovery.md` — R
- [ ] `docs/verification/cognition-context.md` — R, M
- [ ] `docs/verification/command-frame-spikes.md` — R
- [ ] `docs/verification/composed-activities.md` — R
- [ ] `docs/verification/consolidation-and-content-limits.md` — R
- [ ] `docs/verification/conversation-compaction.md` — R
- [ ] `docs/verification/creator-tools-and-diagnostics.md` — R
- [ ] `docs/verification/data-foundation.md` — R
- [ ] `docs/verification/data-runtime-hardening.md` — R
- [ ] `docs/verification/editable-shelters.md` — U
- [ ] `docs/verification/eight-fire-three-times.md` — R
- [ ] `docs/verification/embodied-feedback.md` — R
- [ ] `docs/verification/embodied-survival.md` — R
- [ ] `docs/verification/entity-names.md` — R
- [ ] `docs/verification/existing-test-repairs.md` — R
- [ ] `docs/verification/family-authoring.md` — R
- [ ] `docs/verification/first-threat-encounter.md` — U
- [ ] `docs/verification/foundations-1-5.md` — R
- [ ] `docs/verification/hearing-8x-continuation.md` — R
- [ ] `docs/verification/hearing-cache-review.md` — R
- [ ] `docs/verification/hearing-eight-times.md` — R
- [ ] `docs/verification/hearing-main-integration.md` — R
- [ ] `docs/verification/hearing-runtime-and-reviews.md` — R
- [ ] `docs/verification/historical-baseline.md` — R
- [ ] `docs/verification/history-storage-efficiency.md` — R
- [ ] `docs/verification/immediate-gameplay-limits.md` — R
- [ ] `docs/verification/integration-summaries.md` — R
- [ ] `docs/verification/invention-foundation.md` — R
- [ ] `docs/verification/invention-handoff.md` — R
- [ ] `docs/verification/invention-main-integration.md` — R
- [ ] `docs/verification/invention-questions.md` — R
- [ ] `docs/verification/items-and-knowledge.md` — R
- [ ] `docs/verification/level1-decisions.md` — R
- [ ] `docs/verification/macrofold-worker.md` — R
- [ ] `docs/verification/mercenary-default.md` — R
- [ ] `docs/verification/mixed-spatial-review.md` — R
- [ ] `docs/verification/multiplayer-entry-maintenance.md` — R
- [ ] `docs/verification/narration-and-chat-retry.md` — R, F
- [ ] `docs/verification/native-action-integration.md` — R
- [ ] `docs/verification/npc-reply-preview.md` — R
- [ ] `docs/verification/ordered-async-saves.md` — R
- [ ] `docs/verification/parallel-batch-01-playable-week-engineer-2.md` — R
- [ ] `docs/verification/parallel-batch-01-playable-week-engineer-4.md` — R
- [ ] `docs/verification/parallel-batch-08-the-missing-belonging.md` — U
- [ ] `docs/verification/perception-overlays.md` — R
- [ ] `docs/verification/perception-reaction-intake.md` — R
- [ ] `docs/verification/performance-investigation.md` — R
- [ ] `docs/verification/physical-actions.md` — R
- [ ] `docs/verification/playable-world-creation.md` — U
- [ ] `docs/verification/player-clarity-ui.md` — R
- [ ] `docs/verification/postgresql-cognition-preparation.md` — R
- [ ] `docs/verification/practical-competence.md` — U
- [ ] `docs/verification/recast-finalization.md` — R
- [ ] `docs/verification/recast-integration.md` — R
- [ ] `docs/verification/reciprocal-barter.md` — U
- [ ] `docs/verification/regional-time-and-navigation.md` — R
- [ ] `docs/verification/rewarding-expeditions.md` — U
- [ ] `docs/verification/river-meal.md` — U
- [ ] `docs/verification/shadow-1080p.md` — R
- [ ] `docs/verification/shadow-quality.md` — R
- [ ] `docs/verification/shield-defense.md` — U
- [ ] `docs/verification/simulation-and-cognition-audit.md` — R
- [ ] `docs/verification/simulation-cadence.md` — R
- [ ] `docs/verification/spatial-cadence-main-integration.md` — R
- [ ] `docs/verification/spatial-rebase-eightx.md` — R
- [ ] `docs/verification/spatial-scaling-followup.md` — R
- [ ] `docs/verification/spatial-world-and-scaling.md` — R
- [ ] `docs/verification/three-times-scene-performance.md` — R
- [ ] `docs/verification/useful-discoveries.md` — U
- [ ] `docs/verification/validation-purpose.md` — R
- [ ] `docs/verification/voluntary-outings.md` — U
- [ ] `docs/verification/wilderness-expansion.md` — R
- [ ] `docs/verification/workshop-continuation.md` — R
- [ ] `docs/verification/workshop-navigation.md` — R
- [ ] `docs/verification/workshop-transport-funding.md` — R
- [ ] `docs/verification/world-agent-context.md` — R
- [ ] `docs/verification/world-configured-survival.md` — R
- [ ] `docs/verification/world-startup.md` — R

### Art direction — 28 files

Distinguish selected direction, rejected experiments, source/reference rights, vendor-era guidance and actual delivered assets. Preserve feedback meaning; treat external prices/features as dated until reverified.

- [ ] `art-direction/README.md` — R
- [ ] `art-direction/START-HERE.md` — R
- [ ] `art-direction/assets/README.md` — R
- [ ] `art-direction/decisions.md` — R
- [ ] `art-direction/feedback.md` — R
- [ ] `art-direction/final-board/README.md` — R
- [ ] `art-direction/final-board/creative-brief.md` — R
- [ ] `art-direction/midjourney/01-versions-and-features.md` — R
- [ ] `art-direction/midjourney/02-writing-prompts.md` — R
- [ ] `art-direction/midjourney/03-parameter-reference.md` — R
- [ ] `art-direction/midjourney/04-references-and-consistency.md` — R
- [ ] `art-direction/midjourney/05-workflow-and-troubleshooting.md` — R
- [ ] `art-direction/midjourney/06-game-concept-art.md` — R
- [ ] `art-direction/midjourney/07-open-legend-house-style.md` — R
- [ ] `art-direction/midjourney/08-plans-costs-rights-privacy.md` — R
- [ ] `art-direction/midjourney/09-sources.md` — R
- [ ] `art-direction/midjourney/README.md` — R
- [ ] `art-direction/prompts/halven-rusk-midjourney.md` — R
- [ ] `art-direction/prompts/maer-fen-midjourney.md` — R
- [ ] `art-direction/references.md` — R
- [ ] `art-direction/round-01-analysis.md` — R
- [ ] `art-direction/round-01-feedback-record.md` — R
- [ ] `art-direction/round-02-analysis.md` — R
- [ ] `art-direction/round-02/README.md` — R
- [ ] `art-direction/round-02/START-HERE.md` — R
- [ ] `art-direction/round-02/references.md` — R
- [ ] `art-direction/round-03/README.md` — R
- [ ] `art-direction/round-03/references.md` — R

## FDR-06 — Existing supporting material

These 84 files are already retained source/evidence, not new generated review output. Check executable examples against current contracts, authored art feedback/reference data against its narrative owner, and recorded JSON results against the report that cites them. A historical trace is not a current acceptance pass. Preserve existing raw evidence; do not add fresh probe dumps to the repository. Inspect referenced images and compressed traces only where needed to resolve a claim or asset decision.

- [ ] `LICENSE`
- [ ] `art-direction/board-template.html`
- [ ] `art-direction/feedback-round-02.json`
- [ ] `art-direction/feedback.json`
- [ ] `art-direction/final-board/board-template.html`
- [ ] `art-direction/final-board/index.html`
- [ ] `art-direction/final-board/references.json`
- [ ] `art-direction/index.html`
- [ ] `art-direction/references.json`
- [ ] `art-direction/round-01-feedback-reviewed.json`
- [ ] `art-direction/round-02-feedback-reviewed.json`
- [ ] `art-direction/round-02/board-template.html`
- [ ] `art-direction/round-02/index.html`
- [ ] `art-direction/round-02/references.json`
- [ ] `art-direction/round-03/board-template.html`
- [ ] `art-direction/round-03/index.html`
- [ ] `art-direction/round-03/references.json`
- [ ] `docs/projects/completed/world-agent-context/examples/candidate-graph.yaml`
- [ ] `docs/projects/completed/world-agent-context/examples/pipeline-state.yaml`
- [ ] `docs/projects/completed/world-agent-context/examples/prompt-template.yaml`
- [ ] `docs/projects/completed/world-agent-context/examples/recipe-fields.yaml`
- [ ] `docs/projects/completed/world-agent-context/examples/recipe-submit.yaml`
- [ ] `docs/projects/completed/world-agent-context/examples/sleep-context.yaml`
- [ ] `docs/projects/completed/world-agent-context/examples/sling-context.yaml`
- [ ] `docs/verification/action-capability-smoke.json`
- [ ] `docs/verification/action-experience-artifacts/automatic-final-results.json`
- [ ] `docs/verification/action-experience-artifacts/receipts.json`
- [ ] `docs/verification/action-experience-artifacts/wording.json`
- [ ] `docs/verification/action-perf-closeout.json`
- [ ] `docs/verification/action-perf-density.json`
- [ ] `docs/verification/action-perf-exposure.json`
- [ ] `docs/verification/action-perf-final-native.json`
- [ ] `docs/verification/action-perf-final-review.json`
- [ ] `docs/verification/action-perf-finalization.json`
- [ ] `docs/verification/action-perf-integration.json`
- [ ] `docs/verification/action-perf-pending-upgrade.json`
- [ ] `docs/verification/action-perf-rebase.json`
- [ ] `docs/verification/action-perf-static-review.json`
- [ ] `docs/verification/action-review-closeout.json`
- [ ] `docs/verification/action-review-core.json`
- [ ] `docs/verification/action-review-final.json`
- [ ] `docs/verification/action-review-runtime.json`
- [ ] `docs/verification/action-server-dense-after.json`
- [ ] `docs/verification/action-server-mixed-after.json`
- [ ] `docs/verification/action-server-mixed-before.json`
- [ ] `docs/verification/action-server-small-after.json`
- [ ] `docs/verification/action-server-small-before.json`
- [ ] `docs/verification/action-server-summary.json`
- [ ] `docs/verification/invention-extensibility-review.json`
- [ ] `docs/verification/invention-live-macrofold-continuation.json`
- [ ] `docs/verification/invention-live-macrofold-retry.json`
- [ ] `docs/verification/invention-main-integration.json`
- [ ] `docs/verification/invention-performance-review.json`
- [ ] `docs/verification/invention-questions.json`
- [ ] `docs/verification/native-action-integration.json`
- [ ] `docs/verification/perception-capture-deferred.json`
- [ ] `docs/verification/perception-cooperative.json`
- [ ] `docs/verification/perception-exposure-reuse.json`
- [ ] `docs/verification/perception-final-performance.json`
- [ ] `docs/verification/perception-intake.json`
- [ ] `docs/verification/perception-private-batching.json`
- [ ] `docs/verification/perception-service.json`
- [ ] `docs/verification/performance-continued.json`
- [ ] `docs/verification/performance-native.json`
- [ ] `docs/verification/persistence-bounded-summary.json`
- [ ] `docs/verification/persistence-bounded.json`
- [ ] `docs/verification/persistence-final-history.json`
- [ ] `docs/verification/persistence-final-review.json`
- [ ] `docs/verification/persistence-final-server.json`
- [ ] `docs/verification/persistence-final-worker.json`
- [ ] `docs/verification/persistence-linearization.json`
- [ ] `docs/verification/persistence-postgres.json`
- [ ] `docs/verification/persistence-review-stress.json`
- [ ] `docs/verification/persistence-review-summary.json`
- [ ] `docs/verification/persistence-worker-review.json`
- [ ] `docs/verification/persistence-worker-summary.json`
- [ ] `docs/verification/persistence-worker.json`
- [ ] `docs/verification/postgresql-cognition-preparation.json`
- [ ] `docs/verification/repertoire-foundation.json`
- [ ] `docs/verification/simulation-cognition-audit.json`
- [ ] `docs/verification/workshop-navigation.json`
- [ ] `docs/verification/workshop-postgres.json`
- [ ] `docs/verification/workshop-transport-funding.json`
- [ ] `docs/verification/world-agent-context.json`

## FDR-07 — Cross-document closure gates

- [ ] **Complete coverage:** every primary and supporting entry has a final disposition; FDR-04 covers every moved predecessor and any later moves. Reinventory the actual final tip and account for new, deleted, moved and untracked task files. Do not count merely reading bytes, formatting or link success as semantic reconciliation.
- [ ] **All open work:** every current maintainer checkbox, unnumbered TODO and task embedded in another active document has a supported decision and one owner. Check dependencies and exit criteria, not only titles; retain independent unmet acceptance.
- [ ] **Reverse requirement coverage:** every accepted but unimplemented requirement has a task, or a documented reason it is no longer required. Proposed ideas remain distinct. Verify cross-layer work includes its runtime, world content, API/UI, save/load, limits and actual acceptance requirements where applicable.
- [ ] **Canonical ownership:** no conflicting current specification, duplicated authoritative task body or world-specific rule in generic-engine guidance. Preserve historical rationale with a clear superseding owner instead of deleting useful context.
- [ ] **Project filing:** status tables agree across each project's briefs and tracker, use the actual review date, and distinguish design completion from whole-project completion. The old 21-missing-tables count was already superseded by a 101-project structural pass; recheck the final set rather than carrying that stale count forward.
- [ ] **Navigation and anchors:** check all changed relative links, explicit/derived heading anchors and repository-wide incoming references to moved files, including code comments and copyable commands. Inspect only the archived incoming references affected by these moves.
- [ ] **Evidence and failures:** historical verification retains source, workload, environment and limitations. Newer evidence closes only the same required behavior and workload. Preserve unknown outcomes and meaningful production/hosted/browser/capacity gaps rather than claiming qualification from implementation.
- [ ] **Review preservation:** inspect the accumulated original-to-rebased diff and all removals for lost requirements, checkbox state, stable IDs, accepted decisions and useful examples. Explain every substantive drop or reversal with supporting evidence.
- [ ] **Changed-file static checks:** run repository-pinned formatting on changed Markdown; check whitespace, links and the guidance graph. Do not introduce unrelated repository formatting or dependency churn. Document checks are not game stress tests.
- [ ] **Current CI gate:** inspect checks on the actual final branch head. The historical `bf7366be` CI passed guidance, configuration, formatting and TypeScript, then had 321 passing and 22 failing tests; build did not run. Main has since changed related tests/code. Classify final-head failures against the chosen base instead of assuming all are stale or still present; never weaken gates to make the rebase look green.
- [ ] **Rebase-specific verification:** follow the existing rebase/verification skills for semantic resolutions and unchanged evidence. No browser/server environment or provider calls merely for rebase reconciliation. Any unrelated feature qualification stays with its existing owner and is not silently included or waived.
- [ ] **Publication and handoff:** verify the requested main is an ancestor of the final review branch, preserve per-file commits and backup, confirm no task-owned edits are unpublished, close temporary comparisons without merging and update PR #28 with actual results. Do not mark the exhaustive review completed while any of these review obligations remain.

The current assignment to create this checklist does not itself satisfy its unchecked reconciliation work. Likewise, publishing all prepared corrections did not complete the original review. No new game, browser, database or provider execution is claimed by this document.
