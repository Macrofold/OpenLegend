# Bounded network requests — implementation and qualification

**Status: NET01–NET11 implementation, requested review and Linux fixture portability qualification completed.** The [Linux CI evidence](../verification/bounded-network-requests.md#linux-fixture-portability-and-ci--october-24-2026) preserves the earlier failures and the imported repair's passing integrated check. The [feature specification](../projects/completed/bounded-network-requests-feature-spec.md) owns behavior; the [technical design](../projects/completed/bounded-network-requests-tech-design.md) owns contracts, migration coverage and N01–N22 verification; [NET-L01–NET-L08](../limits/bounded-network-requests.md) owns limits. This tracker is the single task-state owner. Mike authorized the complete implementation on October 18, 2026. Cloud deployment is outside that implementation; qualification uses injected external services, disposable local callers and the required small anonymous public-CDN fixture, with no paid model calls.

The pre-migration investigation baseline is `4d57c3074015e97440bdd09bf39502819ad43a0f` on `codex/macrofold-receipt-review`. Existing partial Macrofold/direct-provider fixes and historical subsystem evidence remain valid for their actual scope; none establishes the complete shared guarantee.

## Implementation scope and completion

Delivered and reviewed every NET02–NET11 item on `codex/macrofold-receipt-review` in `/Users/mzw/.codex/worktrees/3fc3/OpenLegend`, starting at `7639f3be2`. Verified repository `https://github.com/Macrofold/OpenLegend.git`, refreshed `origin/main` `80c094c25b12e39182df109d721e91b7abd9414d`, already contained; no history reconciliation is required. The integrated runtime/tooling diff is about 8,100 inserted and 3,000 removed source lines across 73 files, including replacements and formatting. Shared lifecycle ownership, exact caller migration and enforcement account for the larger integrated scope. Cross-layer lifecycle/accounting risk requires staged integration and actual caller qualification.

1. Build the finite operation/owner, HTTP/body/SSE and Node adapters with adversarial lifecycle checks.
2. Integrate browser/presence/subscriptions and server authentication/world-host/assets at disjoint file owners; preserve original semantic recovery and atomic commit rules.
3. Integrate AI/provider/diagnostics, scripts, remote processes and generated cloud source; enforce all reviewed network boundaries in the required check chain.
4. Review complete producers/callers and all changes, run focused tests, static/build/config/enforcement checks and required browser journeys, fix findings, and reconcile all statuses/evidence/current contracts.

Cost grows with admitted operations, bytes and callbacks. Reuse discovery, credentials, exact downloads and current decoders at their existing owners; scope/credential/asset identity changes invalidate that reuse. Measure the full caller including cleanup, retained slots, timers/listeners, files and reconnect rather than only the winning promise. Completion requires all NET exits and required checks; no runtime coverage is inferred from design or synthetic provider quality.

## Requested implementation review plan

**Completed for the October 18 review.** Its confirmed corrections and focused caller checks are delivered; the recorded macOS repository gate and final source/documentation checks passed. The [review evidence](../verification/bounded-network-requests.md#requested-implementation-review--october-18-2026) records findings, measured resource counts and qualification limits. The Linux fixture portability follow-up is also completed under NET11 below.

Review the full branch against refreshed `origin/main` `80c094c25b12e39182df109d721e91b7abd9414d` in `https://github.com/Macrofold/OpenLegend.git`, starting at `cf72470e8b4780d18804dd873413dc8a2dfb4068`. The approximately 8,100 inserted runtime/tooling lines span shared request ownership, browser/AI callers, server/authentication/assets and executable tooling. Preserve the delivered contract; likely corrections are narrow, but lifecycle/privacy/enforcement reach requires independent slice review and one integrator. Reassess the plan before broader changes.

1. Read the complete affected source/diff and downstream callers at disjoint owners: integrator owns `packages/network`; browser reviewer owns browser/AI; server reviewer owns authentication/assets; tooling reviewer owns scripts/enforcement/cloud. Report concrete scenarios before edits and coordinate shared files.
2. Fix the shared Node HTTP request-signal composition and reuse the existing Node stream owner for late SDK bodies. Qualify ignored earlier cancellation, late resource cleanup and normal exact streaming with the existing network fixtures.
3. Preserve the operations screen's existing account/world keyed subtree, which already clears retained private data on owner change while preserving same-owner refresh. Preserve the original invitation warning across same-account/world authority refreshes and share HTTP 408 uncertainty between generation and embeddings. Fix copy retries to await physical source closure, propagate the withdrawal tool's original deadline through bounded storage children and later SQL phase admission, and reject indirect executable acquisition/argument-vector bypasses at the existing source checker. The checker correction affects approximately 300 logic lines plus explicit local Git caller flags; cross-layer fixes remain within this staged plan.
4. Re-read each complete resulting diff, run focused caller/failure checks and relevant bounded stress/resource checks, then strict typecheck, production build, boundary/generated checks, changed-file formatting and links. Run the complete required repository check chain with one worker and the explicit disposable PostgreSQL fixture; reuse unchanged browser/dependency-install evidence honestly. Reconcile actual findings, current contracts, limits and evidence, close NET11 and commit all work locally.

Cost grows with admitted operations, source chunks, parsed frames, subscriptions and script-source size. Retain bootstrap capacities, sequential body/backpressure ownership and current cached discovery/credential/download owners; do not add global per-request maps or queues. Scope/authority changes invalidate private display reuse; physical closure governs transfer reuse. Measure complete local settlement plus retained resource/listener counts through actual affected callers. No paid model, live identity/cloud mutation or deployment is needed; additional and cumulative Jev cost $0.

## Sequence and completion rule

**NET01 → NET02 → NET03 → NET04/NET05/NET06/NET07**, with NET08 coordinated across the relevant browser/server owners. NET09 follows the shared/SDK adapters. NET10 can be developed alongside migration but becomes a required gate only after every inventoried current caller is classified/migrated. NET11 requires NET02–NET10 and their actual-caller evidence. Parallel work must assign disjoint shared files; `main.tsx`, `http.ts`, `macrofold.ts`, package entrypoints and logs need explicit ownership.

Do not stop after introducing a helper or migrating one provider. Do not mark this project complete while raw production/tooling bypasses, required callback/cleanup paths or generated cloud source remain uncovered. Tests of local wait termination do not close unrelated live-provider, hosted-authentication or production-capacity gates.

## NET01 — Complete design and reconcile existing owners

**Owner:** design/documentation. **Dependencies:** source audit and existing contracts.

- [x] Complete and independently review the feature/technical pair, exact clock/lease/body/SDK/stream contracts, migration inventory, selected limits and N01–N22 checks.
- [x] Reconcile maintainer navigation, narrow needs-design disposition, current implementation descriptions, affected subsystem owners and consequential decision history; verify local links/anchors and changed-file formatting.
- [x] Record any genuine unresolved developer decision before dependent implementation; distinguish qualification gaps from unanswered design. **Exit:** another implementer can execute the staged work without inventing timeout, retry, capacity, body or ownership rules; no runtime completion claimed.

## NET02 — Shared operation budgets and bounded owners

**Owners:** `packages/network` operation/owner/error modules; package setup. **Depends on:** NET01.

- [x] Add browser-safe package/default entry and explicit Node subpath; strict types and pinned workspace metadata, with no AI/domain/Node leakage into the browser entry.
- [x] Implement required finite duration, earlier absolute deadline, dual clocks, parent/short-phase inheritance of both clocks, lazy guarded waits, first-cause settlement, resume checks and exact timer/listener disposal.
- [x] Implement finite long-lived owner capacity, no queue, active/unsettled/quarantined lease states, original cleanup tracking and exactly-once release. Existing admission/paid owners remain separate.
- [x] Add focused N01/N02/N08/N09 and repeated-capacity tests, including independent owner isolation and no per-request owner recreation. **Exit:** ignored abort ends the caller wait while repeated abandoned calls plateau at configured capacity; no unhandled rejection or unlimited detached task/listener growth.

## NET03 — Shared HTTP bodies, streams and Node resource closure

**Owners:** network HTTP/body/events/Node modules. **Depends on:** NET02.

- [x] Implement single-dispatch bytes/text and scoped streaming consumption, actual status preservation, per-owner redirect/credentials, byte/exact-length policy and explicit complete-projection capability.
- [x] Guard header/read/callback waits, preserve one reader and once-only cancellation, distinguish natural EOF from cancellation-created EOF, and never await unconstrained cleanup in caller `finally`.
- [x] Implement incremental SSE framing and the finite/continuous mode distinction, with no automatic cursor replay or retry policy.
- [x] Implement Node source/sink and remote child-process lifecycle adapters with known closure accounting and separately bounded termination escalation.
- [x] Exercise N03–N07/N10/N11 with native Web Streams and injected uncooperative cleanup. **Exit:** early terminal success survives stalled cleanup; normal abort retires capacity; unknown cleanup cannot falsely retire it.

## NET04 — Migrate all AI/Macrofold and diagnostic consumers

**Owners:** AI package, server Macrofold/events/logging and injected caller graph. **Depends on:** NET03.

- [x] Migrate direct structured generation, OpenAI decisions, embeddings, Macrofold request/file methods and same-Run lifecycle to the shared operation; thread actual configured deadlines through gameplay/native/creator callers.
- [x] Apply embedding absolute deadline, retain exact admission/acceptance persistence, unknown costs, independent known invoices and no automatic paid retries. Keep cancellation's separate finite allowance.
- [x] Preserve service-owned bounded observation of already-sent authoring admission after conversation closure, including late original Run journaling and exact cancellation; never couple its transport lifetime to the departed UI or allow late gameplay output.
- [x] Replace diagnostic response cloning with bounded already-consumed observation; preserve private stream omission and required final receipt recording.
- [x] Remove superseded current helper implementations/exports, update current fixtures/docs, and exercise N11–N13 through both standalone and server paths. **Exit:** one POST for direct terminal outcomes, same-Run recovery only, no body/callback/cleanup hang or accounting release on local timeout. MW/WW live qualification stays open in its existing owner.

## NET05 — Browser finite reads, mutations and presence

**Owners:** client API and affected actual UI callers. **Depends on:** NET03.

- [x] Migrate every finite browser API call, selecting documented read/mutation/control/save profiles and keeping complete-view semantics. Preserve current authoritative scope/generation/attempt checks and special save/load acknowledgement handling.
- [x] Make initial load, operations refresh and optional reads leave pending states at timeout; preserve current readable content/drafts where permitted and clear obsolete private content.
- [x] Implement the technical design's exact method/path/tool recovery classification, including POST reads, existing explicit identical-request recovery and non-reconstructible invitation links. Preserve original unresolved mutation identity and receipt recovery; no new command from automatic timeout handling. Current state must not be relabeled proof of an uncertain request's completion.
- [x] Bound presence to one active send plus latest desired state; preserve sequence, scope, existing cadence and queued-only beacon semantics.
- [x] Exercise N09/N19 and real browser initial load, refresh, uncertain write recovery, entry/control/logout, scope switch and suspend/resume. **Exit:** finite local observation without duplicated effects, private stale adoption or heartbeat backlog.

## NET06 — Authentication and world-host integration

**Owners:** server authentication, creation client, inbound boundary review. **Depends on:** NET03.

- [x] Add pinned OIDC bounded-buffer custom-fetch bridge and authentication-local operation context; preserve SDK manual redirects/security behavior and one-use login.
- [x] Give shared discovery its own bounded single-flight owner while bounding each subscriber wait; prevent late/expired login from creating a session or a cancelled subscriber from cancelling another.
- [x] Migrate creation check/activation/receipt under the existing ten-second operation and exact durable identity. Classify inbound HTTP/MCP receive timers separately and fix any actual gap required by the stated receive contract without wrapping committed transactions.
- [x] Exercise N14 and actual creation uncertainty, including discovery/token/JWKS/error bodies through pinned SDK code. **Exit:** no network wait escapes the whole operation; no auth shortcut, code replay or repeated activation. IDP/PD live-browser gates remain separate.

## NET07 — Exact assets, SDK preparation and cache ownership

**Owners:** browser asset reader, public/S3/storage/cache/delivery owners. **Depends on:** NET03; shares the SDK preparation pattern with NET06 without coupling credentials.

- [x] Integrate SDK request handlers, nested credential/STS providers and metadata with original operation budgets; preserve exact signing/account/Region/conditional-write behavior and disabled SDK retries.
- [x] Migrate exact download/upload bodies and finite server output pipelines. Keep current byte/hash/version/rights checks and independently admitted storage budgets.
- [x] Change cache transfer contract to adapter source plus cache-owned unique sink/path. Fence publication before abort, retain physical slot/byte reservation until closure, and restrict late cleanup to its exact attempt.
- [x] Preserve one-reader cancellation versus shared transfer, confirmed-process-death recovery, renderer local-resource lifetime and current three-attempt exact conditional transfer policy under one deadline.
- [x] Exercise N15/N16/N22 with delayed credentials, late GetObject, uncooperative source/sink, shared readers, attempted path reuse and actual renderer replacement. **Exit:** no new publication admission after expiry, partial visibility, capacity refund or disk reservation reuse from timeout alone; an already-admitted atomic commit retains ownership through actual settlement and is reconciled without late caller adoption. Complete supported content and existing AS07/broad cache qualification remain tracked.
- [x] Resolve role credentials outside an object read's exact reply allowance. The SDK fetches them lazily inside the first object command; when that file was smaller than AWS's credential reply (about 1.5 KB), the reply was rejected and its cleanup waited out the 5-minute transfer deadline (`Network deadline_exceeded during cleanup`). Found 2026-10-26 while verifying the [interface study archive](../../art-direction/studies/2026-10-18-interface-direct-method/README.md#archive), whose first file is 748 bytes; fixed in `apps/server/src/asset-storage.ts`. A disposable fixture reading a 748-byte private file with a realistic credential reply fails without the change and passes with it; the existing asset network tests pass.

## NET08 — Continuous game/private subscriptions

**Owners:** browser main/private session and server main/private stream producers. **Depends on:** NET03 and NET05 lifecycle integration.

- [x] Add main game heartbeat through existing stream/backpressure ownership; preserve private heartbeat and existing authorization/snapshot cadence.
- [x] Replace native EventSource consumers with the shared fetch/SSE subscription in the same change; select connection/liveness profiles, complete-frame heartbeat renewal and one explicit reconnect owner.
- [x] Preserve reset/patch/scope events, current permitted bootstrap/progress reads, private visibility ownership and no paid cancellation from closing a view.
- [x] Exercise N17/N18 in actual browser with paused unchanged world, missing heartbeat, partial frame trickle, hidden/reopened progress, scope revocation, resume and unresolved old cleanup. **Exit:** healthy quiet streams stay connected; stalled connections end without overlapping reconnect engines or replayed commands.

## NET09 — Scripts, remote subprocesses and cloud handler source

**Owners:** scripts and infrastructure source; exact coverage in the technical migration table. **Depends on:** NET03/NET06/NET07 as applicable.

- [x] Migrate finite setup/profile/health/install/art-study HTTP and browser-evaluated fetch paths; retain native/paid separation, original sequence budgets and completed-work measurement.
- [x] Consolidate AWS CLI and remote clone subprocesses under reviewed finite profiles, output caps, argument-array invocation, TERM/KILL lifecycle and observed closure. Preserve external mutation identities and manual reconciliation.
- [x] Extract/bundle the study-access handler from its inline source, consume the same minimal shared guard, and add deterministic artifact verification. Preserve IAM/auth behavior and remaining-invocation reserve; no deployment in this task without actual authorization.
- [x] Exercise N20 and copied external-workspace/browser-entry resolution, with all external work injected. **Exit:** scripts and generated deployable source meet the same wait contract without a copied timeout implementation, leaked secrets or hidden cloud retry.

## NET10 — Enforce network boundaries and remove bypasses

**Owners:** network source inventory/checker, manifests, root scripts/CI and affected entrypoints. **Depends on:** NET02; final enforcement requires NET04–NET09.

- [x] Add TypeScript-AST/type-assisted boundary check, fixed reviewed path/role inventory and required `pnpm network:check` in `check`; include JS/MJS and embedded/generated executable sources.
- [x] Detect raw/aliased/dynamic network access, injected dispatch, stream constructors, networking SDK/imports and remote subprocess wrappers outside owners; distinguish inbound/browser-managed/local/test roles honestly.
- [x] Add positive/negative N21 fixtures, reject stale allowlist entries and prevent production imports of fixtures. No whole-directory grandfathering or arbitrary inline bypass.
- [x] Re-inventory current source and dependency manifests after migration, delete legacy helpers/aliases and verify browser build isolation. **Exit:** future ordinary bypasses fail required CI and every current application-owned network boundary has an explicit owner/coverage reference.

## NET11 — Integrated qualification and current-truth handoff

**Owners:** all slice owners with one integrator. **Depends on:** NET02–NET10.

- [x] Complete all N01–N22 applicable cases and actual-caller journeys from the technical design; retain exact fixture/native/browser versus live/hosted evidence labels.
- [x] Verify post-timeout resource behavior: finite leases, timers/listeners, stream readers, temporary files/pins, subprocess closure and one reconnect; no stale publication or silent capacity reset.
- [x] Exercise representative large complete projections/assets and record actual bytes/peak retained work. Preserve LA165/PD05 broader sizing/capacity gaps; do not claim a universal memory bound from timeout tests.
- [x] Inspect the full final diff and callers; run changed-file formatting, typecheck, build, network enforcement, focused existing owner checks and required CI. Unavailable required browser/SDK checks remain open.
- [x] Reconcile current architecture/provider/performance/limits/maintainer docs and code comments, record actual evidence in the owning verification report, and commit all task changes. **Exit:** the entire inventoried application-owned wait contract is implemented and verified, with remaining independent MW/IDP/AS/PD gates precisely identified. No model quality, production capacity or remote rollback guarantee is implied.
- [x] Repair portable temporary-directory setup in `apps/server/src/network-asset-delivery.test.ts` and `apps/server/src/network-assets.test.ts`. The imported custom-model integration uses operating-system temporary directories through `tmpdir` and `mkdtemp`, preserving isolated roots, asset restrictions, assertions and cleanup. All 14 focused existing checks pass locally, and the full integrated Linux gate passes at `91d58e5a4ed74eca6c268c36b4b2a5efb8a5d2aa`. The earlier seven-failure comparison and macOS evidence retain their original scope. [Evidence](../verification/bounded-network-requests.md#linux-fixture-portability-and-ci--october-24-2026).

## Related owners retained

MW04/MW05 and WW07/WW11 retain provider deployment, original Run continuation and actual billing qualification. MP/IDP retain identity/control and real sign-in; PD03–PD09 retain hosted operation, recovery and workload acceptance; AS retains publication/rights/recovery and deployed selection. FR02's stale-private-reply proof and FRL02's coalesced reads remain valid but do not establish bounded waiting. NET supplies shared machinery and its focused adversarial checks, not a duplicate of those broader task bodies.

## Open decisions and evidence

No blocking developer choice remains. The [verification report](../verification/bounded-network-requests.md) preserves the pre-migration baseline, shared implementation and requested review corrections, including the October 18 macOS **937/937 tests across 73/73 files**, completed build and focused/browser checks. Those results retain their recorded scope. The [Linux comparison and repair](../verification/bounded-network-requests.md#linux-fixture-portability-and-ci--october-24-2026) preserves **949 passed / 7 failed** at the earlier base/research revisions, followed by the imported fixture fix, 14 focused local passes and the complete passing Linux gate at `91d58e5a4ed74eca6c268c36b4b2a5efb8a5d2aa`. Required CI remains a merge gate. Live/provider billing, hosted identity, cloud rollout, broader complete-view memory and production capacity remain with their existing MW/WW/IDP/AS/PD/LA165 owners. Additional and cumulative merge-task Jev cost are $0.
