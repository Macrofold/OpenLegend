# Creator edit propagation — technical design

| Status      | Current progress                                                                                               | Last updated |
| ----------- | -------------------------------------------------------------------------------------------------------------- | ------------ |
| In progress | Batch 09 completes the first condition-removal consumer; general-family deletion and memory tools remain open. | 2026-10-14   |

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

CE01 (earlier): Batch 09 implements installed status-effect removal through complete typed predicate references, retained exact previews and the existing status transition/receipt owner. Its [native/PostgreSQL and browser evidence](../verification/reviewed-content-removal.md) qualifies status-only cold history, retained pins, object coverage, exact optional review/approval/Apply, stale/privacy/refusal/recovery and the selected keyboard/layout journey. [CE01 limits](../limits/creator-edits.md#ce01-b--complete-review-and-growing-work) records the implemented admission envelopes and measured storage workload. CE02 (later): actor scope and semantic lookup, multiselection/manual edits, then separately bounded AI diff proposals. General-family work and scale acceptance remain separate from this finite adapter.

The original October 3 request authorized documenting these capabilities during the family-tree work. The October 11 allocation supplies Batch 09's implementation design and prompt; creating these documents does not itself authorize executing that prompt.

The first concrete delivery is [Batch 09](completed/parallel-batch-09-reviewed-content-removal-feature-spec.md), with its [owner-specific technical design](completed/parallel-batch-09-reviewed-content-removal-tech-design.md). This supplies the selected consumer without turning the general policy into a promise to remove every record kind.

## Maintained records

- Implementation: [creator edit propagation tasks](../maintainers/creator-edits.md).
- Limits and constraints: [creator edits](../limits/creator-edits.md).
- Feature specification: [creator edit propagation](creator-edit-propagation-feature-spec.md).
- Existing memory obligations: [memory architecture](../memory-architecture.md).
