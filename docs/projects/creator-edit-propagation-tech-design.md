# Creator edit propagation — technical design

| Status      | Current progress                                                                                             | Last updated |
| ----------- | ------------------------------------------------------------------------------------------------------------ | ------------ |
| Not started | Direction and safety contracts are recorded; concrete owner adapters and runtime tooling remain future work. | 2026-10-03   |

## Boundaries

This design records Mike's October 3 policy across creator editors. Existing semantic mutation owners remain authoritative. Do not add a global memory-cascade listener to creator mutations. Family parent-link removal changes its graph and derived reads only. Explicit forgetting/privacy already has stronger source-dependency handling; preserve it under the memory contract.

## Explicit dependency plans

Each participating owner must expose its actual enforced dependencies, deletion validation and commit operation. Reuse [invention graph](../invention-graph.md) discovery where its coverage applies; exploratory traces or model hypotheses cannot certify complete deletion closure. Before supporting a deletion kind, establish complete dependency coverage through its semantic owner. Do not claim a universal registry while owners remain unsupported.

Construct a plan containing roots, exact record revisions, dependency reasons/paths, mandatory closure, optional associations and selected optional roots. Compute required closure from the selected roots; the client can deselect optional roots but cannot subtract required members. Do not confuse mutually dependent components with impossible ancestry cycles: the owning law determines valid topology. Recompute after selection changes.

Bind approval to principal, world, timeline, selected set, exact revisions and a digest of the complete plan. Revalidate authority and closure in the existing serialized mutation lane; changed coverage or revisions rejects the stale plan. Atomically commit through existing owners and durable receipts, with dependency-safe ordering. No partial world mutation on failure. Retain ordinary operation evidence without creating a parallel audit database. Large previews page the complete retained plan, not a truncated approximation. Final approval is a UI interaction on the concrete preview.

## Optional memory tool

Use existing actor-scoped memory repositories and semantic-vector lookup. Pin search results to source identities/revisions and disclosure scope. Similarity determines suggested candidates only; absence of a match is not a claim that every affected memory was found. Show missing vectors or incomplete coverage, and never substitute lexical matching while calling it semantic search.

Manual editing/deletion calls the existing memory editor/forgetting owner, including its explicit dependency safeguards and vector invalidation. AI bulk editing generates proposed per-record diffs under existing provider admission and spending limits. It cannot grant access, certify truth or mutate. Apply only selected approved revisions, reject conflicts and preserve untouched records. Privacy revocation cancels pending output; no automatic paid retry. Embedding refresh and native integrity maintenance remain distinct from rewriting a memory's meaning.

## Stages and verification

CE01 (earlier): select a concrete explicit-dependency deletion consumer, map complete owners, then implement preview/selection/approval/atomic apply with invalid/stale/retry checks and actual UI qualification. CE02 (later): actor scope and semantic lookup, multiselection/manual edits, then separately bounded AI diff proposals. Establish numerical work/retention/page limits and scale evidence during each implementation; no invented capacity claims now.

No runtime implementation is authorized by this future plan alone. Mike's current request authorizes documenting/tracking these capabilities while implementing the family tree.

## Maintained records

- Implementation: [creator edit propagation tasks](../maintainers/creator-edits.md).
- Limits and constraints: [creator edits](../limits/creator-edits.md).
- Feature specification: [creator edit propagation](creator-edit-propagation-feature-spec.md).
- Existing memory obligations: [memory architecture](../memory-architecture.md).
