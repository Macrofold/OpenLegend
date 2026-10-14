# Creator edit propagation

[Feature specification](../projects/creator-edit-propagation-feature-spec.md) · [Technical design](../projects/creator-edit-propagation-tech-design.md) · [Limits](../limits/creator-edits.md)

The accepted policy is no automatic semantic memory rewrites or deletion after creator edits. Explicit dependencies and privacy obligations retain their existing meaning.

## CE01 — Reviewed explicit dependency cascades

[Batch 09](parallel-batch-09-reviewed-content-removal.md) selects installed status-effect definitions as the first concrete consumer and owns the complete creator journey. Its [technical design](../projects/parallel-batch-09-reviewed-content-removal-tech-design.md) covers transitive required removals, optional related definitions, unsupported-owner blockers and actual active-effect teardown. Generic recipe/material/stock deletion and CE02 remain outside that scope. Implementation is not started; the full general policy remains accepted.

- [ ] **Earlier priority; first consumer allocated, implementation not started.** Implement complete deletion previews through actual semantic dependency owners. List every deletion and its reason, permit optional selections, lock required dependents, recompute closure and require approval of the exact set. Reject incomplete/stale coverage; apply atomically with authority and retry fencing. Coordinate existing INV-15 impact work instead of creating a rival dependency registry. Completion requires an actual creator journey plus transitive/optional/stale/cancel/retry and persistence evidence. Deliver and qualify the selected Batch 09 consumer before extending removal to other owners.

## CE02 — Optional memory propagation tools

- [ ] **Later priority; explicitly not needed soon.** Scoped semantic vector search after edits; creator multiselect; optional deletion/manual editing and AI-generated bulk-edit diffs. Reuse memory/forgetting, privacy and spending owners. Search suggestions never trigger automatic changes. Completion requires truthful coverage, false-positive handling, exact selected diffs, stale-source rejection, cancellation, paid admission and preservation of unselected/private memories. Not a prerequisite for CE01 or BW16.
