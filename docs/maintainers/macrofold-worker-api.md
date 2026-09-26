# Macrofold Worker API cutover

Canonical integration: [AI providers](../ai-providers.md) and [Worker ownership](../architecture.md#macrofold-worker-ownership). Creator-specific behavior remains in the [world-agent handoff](../macrofold-world-agent-handoff.md). This tracker replaces the obsolete Sandbox-specific validation targets in [TODO](TODO.md#macrofold-worker-reuse--deferred-validation); reconcile that section when implementation lands.

## Scope and baseline

Authorized implementation on `feat/macrofold-worker-api`, created from OpenLegend `main` at `fba16a249d38328db5c2386d4be8ce5b0abbd5e7`; no conflicts. Target Macrofold `feat/worker-economics-autoscaling`, inspected at `31c8136def29930d1bca238a4e79c14f0dc6d0ba`, especially `docs/features/execution/workers.md` and the actual Run/Worker contracts. No Macrofold repository changes are part of this task.

Accepted target: application/world compute ownership, separate actor Worktrees and Sessions, Run-scoped cancellation, demand-first submission to sleeping Workers, and unchanged direct inference. Do not rename old Sandbox identities or accounting records into Worker identities. Preserve saved context, request bodies, reservations, and uncertain-run fencing through a coordinated server/caller cutover.

## MW01 — Contract and ownership migration

- [ ] Verify Worker creation/selection, Run request/response, lifecycle, scopes, and economics against the pinned server implementation.
- [ ] Remove native Sandbox API use and per-lane compute ownership. Keep compute policy under one application/world owner, not actor cleanup.
- [ ] Submit `worker_id` with both new and continued native Sessions without an unconditional readiness wait; retain bounded queue/execution deadlines and per-Worktree serialization.
- [ ] Preserve existing actor Worktree/Session mappings and uncertain operation records. No replacement allocation or paid prompt replay on transport ambiguity.
- [ ] Keep `/v1/inferences` independent of Worker configuration/allocation.

## MW02 — Lifecycle and accounting

- [ ] Closing a conversation cancels only its own Run, including close during admission; never pause/destroy shared compute.
- [ ] Keep Worker allocation economics separate from Run/model charges. Do not reinterpret the old finite Sandbox allowance as an hourly Worker ceiling or refund historical compute holds without authoritative reconciliation.
- [ ] Document missing/paused/expired/destroyed Worker behavior and explicit owner recovery without automatic paid renewal.

## MW03 — Documentation and verification

- [ ] Reconcile configuration/setup, canonical architecture/provider docs, creator handoff, maintainer index/TODO, implementation status and decision history.
- [ ] Inspect the complete diff and run relevant formatting, TypeScript and production checks where available; distinguish baseline failures.
- [ ] Exercise the real changed downstream caller with disposable, no-paid-call scenarios: shared Worker with distinct contexts, sleeping-worker demand, actor close/cancellation race, continued Session, uncertain admission and inference-only operation.
- [ ] Record actual evidence and remaining live cutover gaps in `docs/verification.md`. Live provider/compute qualification is not established by fixtures. No automated suites are to be authored or manually run for this task; existing CI remains unchanged.

## Handoff

Implementation in progress. Preserve the exact upstream revision used for verification. No deployment, live Worker mutation, paid model request, data reset or main-branch merge is authorized by this branch task.
