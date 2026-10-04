# Creator-authored family tree — technical design

| Status    | Current progress                                                                                        | Last updated |
| --------- | ------------------------------------------------------------------------------------------------------- | ------------ |
| Completed | Runtime integration, current-format persistence, privacy changes and focused verification are complete. | 2026-10-03   |

## Authority and owners

Save parent links with stable ID, parent ID and child ID in one world collection. No sibling records, derived descriptions or second writable graph. The compiled bundled-world family owner supplies parent meaning, maximum parent count, relationship wording, topology validation and transitions. Generic server/protocol/client code transports intentions and projected descriptions without restating the world's relation vocabulary. This native world specialization has a deliberate seam: different reproduction or adoption rules need their own admitted policy before extending this contract.

Build parent/child adjacency per immutable link collection. Validate cycles with linear graph traversal, not repeated whole-graph passes. Saved-state validation checks shape, identity, endpoints, duplicate pairs, parent counts and all cycles. Rejections preserve graph identity. The existing record store persists individual links. Change the current database marker and reject incompatible saves, without migration.

## Derived inspection

For a selected character, traverse ancestors/descendants with visited sets and enumerate siblings through parents' children. World-owned descriptions distinguish incomplete shared-parent information. Do not precompute every character pair. Several legitimate paths can produce several descriptions. Initial vocabulary covers parents/children, siblings and ancestor/descendant distances; cousins and social-family roles are future expansion, not stored exceptions.

Server creator projection labels characters and pages search/relationships, thirty results per page. Full roster selection and graph traversal still cost O(V+E), with additional result sorting and digest work documented in BW05. No graph work runs each tick or in ordinary NPC input. Cursors bind the roster/tree projection and generation; changed data requires refresh. The client retains selections separately from query text and ignores stale responses.

## Writes, retries and deletion

Requests carry a unique command ID, timeline, expected tree revision and a new parent link or exact existing link to remove. Reuse the creator-authorized serialized transition and permanent operation receipts. Fingerprint the complete intention including principal/world/timeline; look up receipts before checking revisions. A successful late retry returns its prior outcome without resurrecting a deleted link. Conflicting identity rejects. Increment the tree revision for every change, including delete/recreate. Persist mutation and receipt atomically and acknowledge only after durable commit. HTTP validates strict bounded shapes; the world owner checks invariants.

Deletion changes one selected link. Recomputing descriptions is neither a destructive cascade nor a memory rewrite. No hard actor deletion is added; future actor removal must handle explicit parent-link dependencies through the approved dependency owner. Death retains ancestry.

## Knowledge

Remove objective kinship injection and kinship-driven entity lookup from both NPC context paths. Existing permitted observations, memories and knowledge documents supply learned claims. Hearing does not certify a claim; editing the tree does not erase it. This resolves the previous unspecified learning path without a family-specific belief store.

## Implementation plan and verification

Estimated 600–900 changed logic lines; medium/high risk from persistence, authority and privacy. Sequence: record designs/future work; verify branch/local main; implement parentage/current validation; creator projection/durable writes; accessible Family editor/navigation; remove omniscient NPC injection; focused verification/full diff review/tracker reconciliation. No new dependencies or paid model work.

Use focused existing checks and a disposable-database scenario for full/incomplete/half sibling inference, multigeneration cycles, third-parent rejection, deletion, late retries, stale revisions/authority, reload and current validation. Exercise actual UI search/create/delete, keyboard and narrow layout. Inspect NPC input construction without claiming live model quality. Measure a sizeable tree query and report its workload/timing. Formatting, typecheck and production build cover integration.

## Maintained records

- Implementation: [BW16](../../maintainers/base-world.md#bw16--family-authoring-and-inspection).
- Limits and constraints: [BW05](../../limits/base-world.md#bw05).
- Feature specification: [family tree](family-authoring-feature-spec.md).
- General creator edits: [propagation design](../creator-edit-propagation-tech-design.md).

## Delivered evidence

[October 3 verification](../../verification/family-authoring.md) records native/service/restart, chain/star scale, focused existing tests and actual creator browser/visual checks. The first interpretation is biological ancestry; both endpoints must share a known biological species, with constructs excluded. Existing placeholder birth times cannot establish genealogical chronology.
