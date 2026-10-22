# Custom models — implementation plan

| Status      | Current progress                                                                                                                                       | Last updated |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------ |
| In progress | Production routing and tools are implemented; actual API and bounded live external-model gameplay are evidenced; managed-worker recovery remains open. | 2026-10-22   |

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

## Remaining operating qualification

Actual Macrofold HTTP and live external-model checks use the canonical deployment binding, descriptor and receipt projections through the existing transport. The server and generated-client source fingerprints, one ordinary live NPC speech publication, invalid replies, revision/pin recovery and bounded warm/concurrent measurements are retained in [verification](../verification/custom-models.md). No competing complete wire schema or permissive gameplay parser was introduced.

The external model worker is opaque to this installation. Managed-worker restart/replacement, broader GPU workload capacity and final hosting invoices remain unevidenced; no RunPod credential was found and the authorized live setup excludes GPU launch. Keep those MX06 criteria open. The compatible upstream implementation is a fingerprinted local snapshot rather than a published immutable release; ship its matching API, migration and client together. Optional MX07 research is outside this task.

## Requested implementation review

Review the complete feature against the preserved design base and trace its gameplay, transport, accounting and optional-tool consumers. The identified fixes affect approximately 300 logic lines: keep remotely rejected capabilities under the existing cooldown, preserve surviving callers and original deadlines across metadata/source/journal waits, retain full inference bodies only while admission is unknown, let subsequent benchmark requests use the same revision observation/refresh owner as gameplay, and group comparison records once rather than rescanning all records for each arm. Bound required comparison output before constructing it or funding work whose report cannot fit. Reconcile obsolete implementation wording and spending summaries in their existing documentation owners.

Cost grows with failed NPC requests and selected study cases × arms × replicates. Share deployment preparation and in-flight reads; prepare only selected executable work, and retain each admitted request's immutable mode, allowance and revision evidence. Remote capability rejection starts the existing cooldown; an observed new revision invalidates later preparation without replaying the original call. Reporting should visit each record once before per-arm aggregation. Verify these changes with the existing focused AI/benchmark checks and small no-network scenarios covering repeated refusal, later revision changes, partial-run selection and report equivalence. Run static checks and required CI on the final commit; preserve the separately documented MX06 operating gaps.
