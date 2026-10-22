# Custom models — implementation plan

| Status      | Current progress                                                                                                                                                                               | Last updated |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| In progress | Production routing, shared inference and benchmark extensions are implemented; actual Macrofold HTTP compatibility is demonstrated, while live hosted-model operating acceptance remains open. | 2026-10-22   |

## Scope and completion

Implement [the approved feature](custom-models-feature-spec.md) and [technical design](custom-models-tech-design.md), including production MX01–MX03/MX06/MX08 and thin benchmark/report extensions MX04–MX05. MX07 research and changing the default model are excluded. [MX](../maintainers/custom-models.md) owns task status and acceptance; this file owns the implementation sequence.

The implementation branch is `feat/production-custom-models`. Its preserved design base is `05d2bb034cea0f717c54efedee019f74906849c6`, descending from verified `Macrofold/OpenLegend` `origin/main` `27c6fb8152ec58c34334e74ba91a9d5bec6a30ff`. Only `/Users/mzw/.codex/worktrees/7370/OpenLegend` receives implementation edits. Preserve unrelated checkouts and work.

Initial estimate was approximately 1,000–1,800 changed logic lines. Integrated scope is approximately 2,100 added/changed logic lines across shared AI preparation, strict server configuration, capability caching, existing execution/accounting owners and thin benchmark tools. The larger scope retains these existing owners; no second executor or new test infrastructure was introduced. The consequential risks are wrong-purpose routing, accepting stale world authority, duplicate dispatch/settlement, inaccurate hosting attribution, and incompatible generated request types.

## Sequence and owners

1. **Trusted configuration:** add the pure server generation configuration owner, strict `OPENLEGEND_MODEL_TARGETS_JSON` admission, unchanged default selection and explicit NPC-purpose resolution. This local configuration work does not depend on remote deployment execution.
2. **Shared target and capabilities (MX01/MX02):** consume the actual compatible Macrofold generated types; add shared preparation to the existing AI entrypoint. Resolve output format and reduced output bounds before reservation. Cache immutable revision facts and coalesce bounded descriptor reads; apply the design's stale/negative-cache behavior.
3. **Ordinary gameplay (MX02/MX03):** select only the actual fast/complex NPC producer, then reuse its existing context/schema, request allowance, attempt reservation, Macrofold single inference, streaming, durable Run observation and local decoder. Preserve unrelated generation, native judgment, escalation, no-call controls, and final native action admission.
4. **Recovery and charges (MX03):** retain the selected target/body and accepted Run through existing operational records. Decode actual admitted revision and separate request fees from hosting. Keep original deadlines, cancellation and once-only settlement; no new executor, replay or host management.
5. **Production acceptance (MX06):** exercise real serializer/decoder HTTP requests against the exact compatible Macrofold build, then normal NPC preparation through native publication. Cover both purposes and unconfigured callers, supported output/streaming modes, permissions, no-call controls, cancellation, capacity/unavailability, accepted-Run recovery, updates/pins and same-revision worker recovery. Record warm/concurrent/recovery measurements and actual known/unknown costs.
6. **Thin tools (MX04/MX05):** extend existing finite benchmark plans, journals and reports using the same production target/executor. Keep study metadata, reproducibility and raw-text output in tools; none becomes a gameplay dependency or bypasses gameplay validation.
7. **Reconcile and finish (MX08):** update affected provider/setup docs, specs, limits, architecture and tracker in place; inspect the full affected diff and fix in-scope review findings. Run selected existing checks, commit all task changes, and open a reviewable PR without merging main.

## Performance and verification

Work grows with admitted generation count, request/schema bytes and concurrent demand. Share immutable capability/schema preparation and identical in-flight descriptor reads. Target changes, remotely reported capability failures and newly observed admitted revisions invalidate only later preparation; cached permission/readiness never authorizes inference. Compatible warm requests add no hosting, pricing, Hugging Face or experiment reads.

Measure the complete ordinary NPC request and publication path, including preparation reads, bytes, first useful permitted output, completion, concurrency and recovery. Separate local configuration/static/fixture evidence from actual hosted/game acceptance. No new automated tests are authorized; use existing focused checks and small suitable ad-hoc scenarios. Required checks include changed-file pinned formatting, TypeScript checking, production build and relevant current checks after inspecting their effects.

All paid work shares the existing $10 task ceiling. Dispatch only with bounded outstanding commitments and authorized credentials. Record settled/estimated/unknown request and hosting costs separately. Do not start or stop a borrowed Macrofold service or leave newly started paid hosting running without its applicable authorization.

## Current external dependency

Implement against the approved canonical Macrofold contract using its deployment binding, descriptor and receipt projections through the existing HTTP transport. The shared contract remains authoritative; no competing complete wire schema is introduced. A compatible implemented server/generated client is needed for final joint acceptance, rather than prerequisite to the OpenLegend implementation. Reconcile actual upstream differences before claiming integration success. [Verification](../verification/custom-models.md) retains exact inspected versions and evidence limits. Keep the corresponding MX acceptance boxes open until evidenced.
