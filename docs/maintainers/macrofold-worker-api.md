# Macrofold Worker API cutover

Canonical integration: [AI providers](../ai-providers.md) and [Worker ownership](../architecture.md#macrofold-worker-ownership). Creator-specific behavior remains in the [world-agent handoff](../macrofold-world-agent-handoff.md). This tracker replaces the obsolete Sandbox-specific validation targets in [TODO](TODO.md#macrofold-worker-reuse--deferred-validation); historical ledger/provisioning obligations remain there.

## Scope and baseline

Authorized implementation on `feat/macrofold-worker-api`, created from OpenLegend `main` at `fba16a249d38328db5c2386d4be8ce5b0abbd5e7`; no conflicts. Target Macrofold `feat/worker-economics-autoscaling`, inspected at `31c8136def29930d1bca238a4e79c14f0dc6d0ba`, especially `docs/features/execution/workers.md` and the actual Run/Worker contracts. Upstream was rechecked at `68ebce827d96e0f427aaa43315e5a81762cc62c4`; only a temporary workflow changed, not the API. No Macrofold repository changes are part of this task.

Review on September 26 rebased an isolated `codex/macrofold-worker-review` copy onto current main `c70f4c1e932fb9bf0fdcc61efe30ccd1bdb64041`; independent verification/changelog additions were both retained. The upstream Worker revision remained `68ebce827d96e0f427aaa43315e5a81762cc62c4`. Reconciliation builds on remote review `5468f89`, retaining its late-acceptance cancellation fix and adding the final pre-dispatch check. Review fixes stay below 200 logic lines and preserve the accepted ownership contract.

Accepted target: application/world compute ownership, separate actor Worktrees and Sessions, Run-scoped cancellation, demand-first submission to sleeping Workers, and unchanged direct inference. Do not rename old Sandbox identities or accounting records into Worker identities. Preserve saved context, request bodies, reservations, and uncertain-run fencing through a coordinated server/caller cutover.

## MW01 — Contract and ownership migration

- [x] Verify Worker creation/selection, Run request/response, lifecycle, scopes, and economics against the pinned server implementation.
- [x] Remove native Sandbox API use and per-lane compute ownership. Keep compute policy under one application/world owner, not actor cleanup.
- [x] Submit `worker_id` with both new and continued native Sessions without an unconditional readiness wait; retain bounded queue/execution deadlines and per-Worktree serialization.
- [x] Preserve existing actor Worktree/Session mappings and uncertain operation records. No replacement allocation or paid prompt replay on transport ambiguity.
- [x] Keep `/v1/inferences` independent of Worker configuration/allocation.

## MW02 — Lifecycle and accounting

- [x] Closing a conversation cancels only its own Run, including close during admission; never pause/destroy shared compute. Check cancellation after journal awaits before dispatch, then preserve an already-sent acceptance response for cancellation by Run ID.
- [x] Keep Worker allocation economics separate from Run/model charges. Do not reinterpret the old finite Sandbox allowance as an hourly Worker ceiling or refund historical compute holds without authoritative reconciliation.
- [x] Document missing/paused/expired/destroyed Worker behavior and explicit owner recovery without automatic paid renewal.
- [x] Release lane fencing after confirmed never-started queue failure/expiry as well as cancellation; retain fencing for started or uncertain work, including after backend reconstruction.

## MW03 — Documentation and verification

- [x] Reconcile configuration/setup, canonical architecture/provider docs, creator handoff, maintainer index/TODO, implementation status and decision history.
- [x] Inspect the complete diff and run relevant formatting, TypeScript and production checks where available; distinguish baseline failures.
- [x] Exercise the real changed downstream caller with disposable, no-paid-call scenarios: shared Worker with distinct contexts, sleeping-worker demand, actor close/cancellation race, continued Session, uncertain admission and inference-only operation.
- [x] Record actual evidence and remaining live cutover gaps in `docs/verification.md`. Live provider/compute qualification is not established by fixtures. No new automated cases/suites were added or suites manually run; the existing cognition fixture was migrated to preserve its CI contract. Existing CI remains unchanged.
- [x] Adapt the existing cognition fixture to the Worker contract; retain assertions for the selected Worktree and absence of Worker-management calls.

## MW04 — Remaining deployment and qualification gates

- [ ] Before hosted deployment, the operator must approve its offering, isolation/trust boundary, capacity, effective compute-rate ceiling and credit controls; create/select the Worker; grant `workers:use` to the runtime key; and set `MACROFOLD_WORKER_ID`. The original cutover made no Worker/credential changes. The separately authorized October 3 local setup below subsequently selected real local compute and scoped authoring access; that local completion is not an unmet setup task or production approval.
- [ ] For an installation with outstanding pre-cutover Sandbox allocations or charges, reconcile and drain those actual obligations through authorized operator tooling before retiring the old service. Preserve financial/operational history and original uncertain request identity; a fresh Worker installation has no hypothetical Sandbox migration prerequisite. This is settlement of real obligations, not permission to restore legacy APIs/readers under the [development policy](../../AGENTS.md#development-save-policy). Do not run an old recovery script after its API is removed.
- [ ] Qualify the actual deployment: sleeping-Worker first demand, independent actor/creator/reflection contexts, cancellation while another actor is active, capacity/queue deadlines, explicit owner pause/resume/expiry, real allocation versus Run billing and delayed usage. Local HTTP simulation does not close this gate or establish autoscaling/capacity.
- [ ] Obtain passing normal CI, including the migrated `apps/server/src/cognition.test.ts` fixture. The fixture now uses the selected Worker and retained Worktree; full static typechecking and production build pass after rebasing onto main, which already resolved the old 168 test-source errors. Automated suites were not manually run. CI on `6324c82` reached tests and failed 107 cases across 17 files; the Worker fixture fails on inherited fixed actor IDs before provider dispatch. Resolve [suite compatibility](TODO.md#existing-automated-suite-compatibility) and rerun this gate; static checks and local HTTP scenarios do not close it.
- [ ] Extend failure/recovery qualification beyond the observed single-process caller, especially process loss while an acceptance is arriving, unresolved persistence and financial settlement, and restore while old remote work remains in flight. Existing WorldService ownership is not a distributed cancellation guarantee.

## MW05 — Outcome classification and request-body fixtures

Found by the [level-1 decisions](../projects/level1-decisions.md) work and originally deferred until invention integration. That prerequisite is present on `c2e670b0`. [NP01](next-priority-batch.md#np01--reliable-ai-outcomes-and-spending) now delivers the bounded outcome, price and settlement repair with [synthetic adapter/director/PostgreSQL evidence](../verification/level1-decisions.md#np01-reliable-ai-outcomes-and-spending--october-2-2026). Deployment qualification remains MW04. The [October 3 review](../verification/level1-decisions.md#thorough-review--october-3-2026) additionally exercises shared final-completion validation, original-Run cancellation recovery and dispatch-preserving late settlement; the request-body automation below remains open.

- [x] Map judgment, short/native generation and reflection to the existing distinct outcomes; separate caller cancellation from deadlines, reject malformed completed output as invalid, and retain exposure for ambiguous dispatch. Confirmed 401/403/404/413/422/429 and explicit native admission conflicts are undispatched. Generic transport failures, including a `TypeError`, cannot prove that a request was never accepted; the September 29 refused-connection observation remains historical and does not grant a refund without trustworthy transport evidence. The director preserves uncertain-completion precedence and never publishes failed output.
- [x] Validate reported costs consistently before settlement and independently at the authoritative ledger. Explicit zero, decimal round-up, integer/aggregate safety, complete attributable Run usage, immutable request/Run identity, late pricing and repeated settlement are demonstrated in the NP01 evidence. Invalid/missing prices retain the original reserve; actual charges above the estimate remain recorded.

- [ ] Add a transport fixture for `/v1/inferences` request bodies (model binding, `max_tokens`, reasoning effort, `require_parameters`). Forwarding is confirmed by code inspection and one live run, not by a fixture.

## Decisions and handoff

The application/world operator owns Worker creation, lifetime, rates and lifecycle. The runtime selects an existing Worker instead of adding a second allocation policy, requiring admin credentials, or converting a finite allowance into recurring spend. This is an intentional setup change; a blank Worker ID leaves inference available but disables native calls. Changing the ID is an explicit drained/reconciled owner reconfiguration, never an automatic fallback.

MW01–MW03 implementation and local verification are complete; MW04 is open. Preserve the exact upstream revision used for verification. No deployment, live Worker mutation, paid model request, data reset or main-branch merge is authorized by this branch task.

October 3 local setup under Mike's separate completion authorization: real Auth0 sign-in/control, dedicated Jev/structured inference, four native memory/restart/reflection/dream Runs and an NPC reply passed. The later [scoped authoring qualification](../verification/macrofold-worker.md#scoped-local-authoring-completion--october-3-2026) supersedes the earlier pending permission/binding condition: the thirty-tool world connection ceiling is operator-approved, organization-wide access stays off, exact profile workspaces are granted before paid admission, and actual read-only World Agent Runs completed with question/model-error safeguards retained. Native Apply without exact approval was refused in an AI-disabled PostgreSQL scenario. Matching existing Macrofold source/image runs locally without altering its dirty main checkout. Cumulative recorded cost is $0.040713644 plus $0.760 retained uncertainty; no uncertain request was replayed. MW04 remains open for broader CI, recovery, hosted capacity/lifecycle and production billing qualification.
