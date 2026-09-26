# Macrofold Worker API cutover

Canonical integration: [AI providers](../ai-providers.md) and [Worker ownership](../architecture.md#macrofold-worker-ownership). Creator-specific behavior remains in the [world-agent handoff](../macrofold-world-agent-handoff.md). This tracker replaces the obsolete Sandbox-specific validation targets in [TODO](TODO.md#macrofold-worker-reuse--deferred-validation); historical ledger/provisioning obligations remain there.

## Scope and baseline

Authorized implementation on `feat/macrofold-worker-api`, created from OpenLegend `main` at `fba16a249d38328db5c2386d4be8ce5b0abbd5e7`; no conflicts. Target Macrofold `feat/worker-economics-autoscaling`, inspected at `31c8136def29930d1bca238a4e79c14f0dc6d0ba`, especially `docs/features/execution/workers.md` and the actual Run/Worker contracts. Upstream was rechecked at `68ebce827d96e0f427aaa43315e5a81762cc62c4`; only a temporary workflow changed, not the API. No Macrofold repository changes are part of this task.

Accepted target: application/world compute ownership, separate actor Worktrees and Sessions, Run-scoped cancellation, demand-first submission to sleeping Workers, and unchanged direct inference. Do not rename old Sandbox identities or accounting records into Worker identities. Preserve saved context, request bodies, reservations, and uncertain-run fencing through a coordinated server/caller cutover.

## MW01 — Contract and ownership migration

- [x] Verify Worker creation/selection, Run request/response, lifecycle, scopes, and economics against the pinned server implementation.
- [x] Remove native Sandbox API use and per-lane compute ownership. Keep compute policy under one application/world owner, not actor cleanup.
- [x] Submit `worker_id` with both new and continued native Sessions without an unconditional readiness wait; retain bounded queue/execution deadlines and per-Worktree serialization.
- [x] Preserve existing actor Worktree/Session mappings and uncertain operation records. No replacement allocation or paid prompt replay on transport ambiguity.
- [x] Keep `/v1/inferences` independent of Worker configuration/allocation.

## MW02 — Lifecycle and accounting

- [x] Closing a conversation cancels only its own Run, including close during admission; never pause/destroy shared compute.
- [x] Keep Worker allocation economics separate from Run/model charges. Do not reinterpret the old finite Sandbox allowance as an hourly Worker ceiling or refund historical compute holds without authoritative reconciliation.
- [x] Document missing/paused/expired/destroyed Worker behavior and explicit owner recovery without automatic paid renewal.

## MW03 — Documentation and verification

- [x] Reconcile configuration/setup, canonical architecture/provider docs, creator handoff, maintainer index/TODO, implementation status and decision history.
- [x] Inspect the complete diff and run relevant formatting, TypeScript and production checks where available; distinguish baseline failures.
- [x] Exercise the real changed downstream caller with disposable, no-paid-call scenarios: shared Worker with distinct contexts, sleeping-worker demand, actor close/cancellation race, continued Session, uncertain admission and inference-only operation.
- [x] Record actual evidence and remaining live cutover gaps in `docs/verification.md`. Live provider/compute qualification is not established by fixtures. No automated suites are to be authored or manually run for this task; existing CI remains unchanged.

## MW04 — Remaining deployment and qualification gates

- [ ] The operator must approve an offering, isolation/trust boundary, capacity, effective compute-rate ceiling and credit controls; create/select the Worker; grant `workers:use` to the runtime key; and set `MACROFOLD_WORKER_ID`. No Worker or credential was created/changed by this branch.
- [ ] Before the coordinated server/caller release, drain old Sandbox allocations with the old server/operator tooling and reconcile outstanding launches/charges. Preserve verified context, the database's operational history and original uncertain request identity. Do not run an old recovery script after its API is removed.
- [ ] Qualify the actual deployment: sleeping-Worker first demand, independent actor/creator/reflection contexts, cancellation while another actor is active, capacity/queue deadlines, explicit owner pause/resume/expiry, real allocation versus Run billing and delayed usage. Local HTTP simulation does not close this gate or establish autoscaling/capacity.
- [ ] Adapt the pre-existing Sandbox-based fixture in `apps/server/src/cognition.test.ts` when automated coverage is authorized. Full static typechecking already has 168 unchanged baseline test-source errors; no automated suites were authored or manually run here. Keep the normal CI gate intact.
- [ ] Extend failure/recovery qualification beyond the observed single-process caller, especially process loss while an acceptance is arriving, unresolved persistence and financial settlement, and restore while old remote work remains in flight. Existing WorldService ownership is not a distributed cancellation guarantee.

## Decisions and handoff

The application/world operator owns Worker creation, lifetime, rates and lifecycle. The runtime selects an existing Worker instead of adding a second allocation policy, requiring admin credentials, or converting a finite allowance into recurring spend. This is an intentional setup change; a blank Worker ID leaves inference available but disables native calls. Changing the ID is an explicit drained/reconciled owner reconfiguration, never an automatic fallback.

MW01–MW03 implementation and local verification are complete; MW04 is open. Preserve the exact upstream revision used for verification. No deployment, live Worker mutation, paid model request, data reset or main-branch merge is authorized by this branch task.
