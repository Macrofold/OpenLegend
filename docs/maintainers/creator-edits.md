# Creator edit propagation

[Feature specification](../projects/creator-edit-propagation-feature-spec.md) · [Technical design](../projects/creator-edit-propagation-tech-design.md) · [Limits](../limits/creator-edits.md)

The accepted policy is no automatic semantic memory rewrites or deletion after creator edits. Explicit dependencies and privacy obligations retain their existing meaning.

## CE01 — Reviewed explicit dependency cascades

- [ ] **Earlier priority; deferred implementation.** Implement complete deletion previews through actual semantic dependency owners. List every deletion and its reason, permit optional selections, lock required dependents, recompute closure and require approval of the exact set. Reject incomplete/stale coverage; apply atomically with authority and retry fencing. Coordinate existing INV-15 impact work instead of creating a rival dependency registry. Completion requires an actual creator journey plus transitive/optional/stale/cancel/retry and persistence evidence. Select the first concrete deletion consumer before implementation.

## CE02 — Optional memory propagation tools

- [ ] **Later priority; explicitly not needed soon.** Scoped semantic vector search after edits; creator multiselect; optional deletion/manual editing and AI-generated bulk-edit diffs. Reuse memory/forgetting, privacy and spending owners. Search suggestions never trigger automatic changes. Completion requires truthful coverage, false-positive handling, exact selected diffs, stale-source rejection, cancellation, paid admission and preservation of unselected/private memories. Not a prerequisite for CE01 or BW16.
