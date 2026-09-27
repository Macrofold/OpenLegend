# Hearing integration with current main

## Scope and baseline

Integrate the complete hearing branch, including review and performance fixes, with current main; reconcile code, accepted contracts, documentation and tracking before recommending merge. Source: `c4379246b8db98974de319e1f5315439ac8176bd` (`feat/hearing-speech-captions`), retained at `codex/hearing-before-main-20260926`. Base: freshly fetched `Macrofold/OpenLegend` `origin/main`, initially `f551e3d8`, refreshed to `a39311dc`. The source contributes about 5,000 added and 800 removed lines across 85 files; cross-layer privacy, immutable-state, persistence and scheduling overlap makes this high-risk work.

The local `codex/hearing-main-integration` branch consolidated the source's final tree into one replay commit, preserving the original published history and backup. The final working branch is `codex/hearing-ready-for-main`; its refreshed base and follow-up reconciliation are recorded below. Rebase this commit onto the selected base without modifying main or force-pushing the published branch. Temporary transfer commits have no independent runtime behavior to carry into the final history.

## Owners and invariants

- HE01–HE05: [hearing delivery](../maintainers/hearing-and-speech.md); accepted [hearing](../hearing-and-speech.md), [captions/lifetimes](../timed-ui.md), [perceived events](../perceived-world-events.md).
- PF03/PF09, SW08 and the cadence/spatial integration: native work, exposure invalidation, deadlines and performance; preserve newer main ownership when it supersedes an older optimization.
- CR/NC/EPR: only listener-permitted evidence reaches history, recall, embeddings, responses or narration. Preserve source revisions, forgetting, authority and asynchronous publication fences.
- SL/production-data: current relational records, scoped cold history, atomic commits, recovery and current-format restore. Development compatibility follows the [root policy](../../AGENTS.md#development-save-policy). The integration retained existing runtime conversions and never re-heard historical utterances or reset worlds.
- Client/protocol: retain current motion/rendering, authentication and UI behavior while adding volume, captions and perceived history. Public DTOs disclose no hidden speech or source coordinates.

## Execution and completion

1. Read both diffs and relevant canonical owners. Inventory conflicts and semantic overlaps, including cleanly merged code. Rebase the consolidated source and resolve each overlap from current contracts.
2. Trace speech from native/player/model admission through immutable event-time perspectives, commits, cold storage, recall, publication and client presentation. Preserve all eligible listeners, source order and committed utterances.
3. Combine draft append ownership, dependency caches, spatial transmission and status preparation with main's current cadence and immutable indexes. Remove replaced helpers rather than retaining competing authority.
4. Reconcile structural upgrades and every affected document/tracker. Historical measurements remain historical; update stale handoff/base claims, colliding task/decision IDs, limits inventories and implementation summaries.
5. Run pinned formatting, full typecheck, production build and generated configuration checks. Follow repository verification policy: no automated test authoring/execution by default, no paid calls; runtime work uses disposable worlds and `AI_BUDGET_USD=0`.
6. Exercise actual service/SQLite/HTTP speech and history, privacy/failure/restart paths and browser captions where available. Compare relevant matched native and hearing stress workloads, including cold/tail observations; do not claim capacity from configuration alone.
7. Inspect the complete resulting diff against the refreshed base and fix in-scope findings. Record actual evidence and remaining external acceptance gates accurately. Completion requires a reconciled, committed local branch with no unresolved integration issues; CI and broader unverified capacity remain explicit merge/acceptance gates.

## Progress

- Source and remote refs inspected; original source preserved; PR #3 attached. Initial PR check is failed and older handoff claims are not current evidence.
- Rebase completed onto `f551e3d8`. Full typecheck and production build passed before final review; the review found and corrected command volume/utterance admission, request-scope history checks, local-session recovery and sweep-skin preservation.
- Main's elapsed-time/cold-memory/authority ownership is retained; current dispatch/publication guards, linguistic conversation selection, captions and actor-scoped history refresh are reconciled.
- Full diff reviewed and consequential integration defects corrected. Pinned formatting, full typecheck, production build and generated configuration checks passed. Current-format restart, HTTP privacy/pagination, browser observations and matched native/speech stress are recorded in [current evidence](../verification/hearing-main-integration.md). Required CI and broader HE05 acceptance remain explicit gates; no paid calls or automated suites ran.
- Final rebase completed cleanly onto `a39311dc`. Its resulting runtime tree is identical to the checked tree; only main's unrelated production-data tracker entry was added. Final refresh incorporates main's `a39311dc` local sign-in recovery, which is identical to the restored handler already checked during review.

## Rebase onto committed local main

The owner requested a new branch ready to merge into local main. `codex/hearing-ready-for-main` starts from the completed squash `a0e1fdac`; its selected base is local `main` at `75ee15f7135703b35c6128fb20fcea8abf70c564`, which contains the native-action integration `5dabc061` and freshly fetched `origin/main` `a39311dc`. During reconciliation that performance work was committed as `45210d41`; the final rebase includes it as well. The previous integration branch remains a recovery reference.

Reconcile main's bounded history construction, append-proven preparation, private encounter batching and navigation invocation with listener evidence and volume. Keep main's SQLite worker/transaction ownership, action revisions/follow and callback cleanup. Resolve policy overlaps through the protected root block, and retain both branches' historical evidence and unmet acceptance items. Qualify the combined result with formatting/type/build/config/guidance checks, disposable native/HTTP/SQLite speech and action continuation, and matched short native/speech workloads. Existing browser/provider/PostgreSQL/CI gaps stay explicit. Record outcomes in the integration evidence before completing the single-commit rebase.

Final outcome: the branch includes main `45210d41` and retains one commit above it. The code conflicts and neighboring clean merges are reconciled; the protected save policy remains unchanged. Full typecheck/build, configuration/guidance/format/link checks, disposable combined speech/follow and HTTP/SQLite recovery scenarios, and matched short native/speech workloads passed as recorded in [current-main evidence](../verification/hearing-main-integration.md#current-main-rebase). No provider spending or automated suites ran; broader HE05/AR/PF acceptance remains open.
