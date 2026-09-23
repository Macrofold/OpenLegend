# Invention relationship graph

**Status: accepted target design; not a claim of an implemented general graph.** This document owns the typed relationship projection, traversal/completeness contract, impact-index maintenance, and graph visualization boundary. [Validation](invention-validation.md) owns acceptance planning, [world-module runtime](../archive/07-technical-architecture/world-module-runtime.md) owns executable interfaces, and [declarations](../archive/07-technical-architecture/declarations-and-evolution.md) owns installation. Delivery is under INV-15 in the [invention tracker](maintainers/inventions-and-world-evolution.md). Current direct recipe references and module pins remain documented in [Architecture](architecture.md).

## 1. Purpose and authority

Use one relationship model for agent investigation, player inspection, validation planning, and change-impact explanation. Do not construct four incompatible dependency graphs. The graph is a typed multigraph over existing identities, not a new registry of world truth, an ontology of every possible fictional noun, or a requirement for Neo4j.

Definitions, host contracts, installations, policy records, accepted evidence, and presentation manifests remain authoritative in their existing repositories. A graph edge is either a projection with a source pointer or an explicitly retained hypothesis/evidence record under its owning subsystem. There is no general `add_edge` operation that installs behavior. Editing a connection in a future visual editor edits a permitted definition port through normal draft validation.

Initially use maps for a small immutable definition snapshot and indexed SQL projections where persistent queries need them. Runtime truth must remain recoverable if an index is deleted. Do not copy full world snapshots, private actor memories, or every live object into every graph response.

## 2. Identity and node kinds

A node reference has `kind`, stable `id`, and exact `version`/`digest` where applicable. World installation, draft candidate, interface, artifact version, and live instance are different identities. Display names are searchable labels, never keys. Use existing content identity where suitable, but do not treat a short/non-cryptographic label as a security proof. Approval and integrity-sensitive bindings need canonical byte comparison or a collision-resistant digest under the owning contract. Even a strong digest does not establish rights, trust, or semantic equivalence.

| Node class           | Examples and boundaries                                                                                                                                  |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Definition/artifact  | Recipe, material, attribute, sense, action, predicate, effect, lifetime, organism configuration, composition, module, or parameterized template.         |
| Host/interface       | Reviewed implementation and semantic port/query/contribution interface. A world cannot create a host implementation by adding this node.                 |
| Governing policy     | Constitution references, world premise, applicable validation obligations, freeze records, and approved source/conversion policies.                      |
| Evidence             | Versioned validation report, scenario/counterexample, qualified observation, or unresolved interaction hypothesis. Private evidence remains protected.   |
| Presentation         | Visual requirement, rig family, immutable asset manifest, and approved binding.                                                                          |
| Installation/release | Exact world installation and portable release manifest. Neither is the definition itself.                                                                |
| Live overlay         | Paged instance/process/reference summaries with current world revision. Load only on demand; do not expand one node per actor/item in the default graph. |

World-scoped IDs, exact installed versions, and origin lineage remain explicit when a definition is shared across worlds. Draft nodes use candidate identity and never masquerade as installed definitions. Interface nodes may have many implementations; graphs must not silently replace one with another.

## 3. Relationship vocabulary

An edge records `id`, `source`, `target`, `relation`, `sourceRecord`, `sourceRevision`, `assertion`, and bounded qualifiers. Qualifiers can include port/role, applicability predicate reference, resource identity/units, effect or observation scope, timing category, and required/optional status. Use a stable key derived from source identity, relation, target, and semantic qualifier identity; do not use list position or a renderer's edge ID.

| Family                      | Relations                                                             | Meaning                                                                                                          |
| --------------------------- | --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Definition and construction | `requires`, `derives_from`, `specializes`, `binds_port`, `implements` | Exact dependency, provenance, specialization, interface binding.                                                 |
| Invocation                  | `precedes`, `uses_result`, `schedules`                                | Execution order and bounded temporal continuation, not package dependencies.                                     |
| State and effects           | `reads`, `owns`, `contributes_to`, `queries`                          | Semantic state owner, admitted operation, and candidate-query membership.                                        |
| Resources                   | `consumes`, `produces`, `transfers`, `converts`                       | Named resource/source/sink/conversion semantics; matching numbers do not establish compatibility.                |
| Events and cognition        | `emits`, `subscribes_to`, `observes`, `offers_action`                 | Potential registered interaction, disclosure, concern, or affordance—not proof that an actor witnessed an event. |
| Governance                  | `installed_as`, `constrained_by`, `protected_by`, `approved_against`  | Current manifest, rules, protection, and exact reviewed scope.                                                   |
| Evidence                    | `validated_by`, `supported_by`, `contradicted_by`, `invalidated_by`   | Provenance and applicability of evidence, not blanket proof.                                                     |
| Presentation                | `requires_visual`, `depicted_by`, `compatible_with`                   | Supported visual meaning, asset binding, and explicit compatibility.                                             |

This is a closed software vocabulary that can be extended deliberately; fictional kinds and parameter values remain registered world data. An arbitrary `related_to` label is insufficient for mandatory impact analysis.

`assertion` distinguishes **host-enforced**, **compiler-derived**, **observed**, and **hypothesized** relationships. Derived summaries identify their trusted source contracts. Runtime reads identify actual execution but cannot prove an omitted dependency was unnecessary. A model suggestion such as smoke affecting breathing is a hypothesis until accepted through a supported mechanism. The UI and tools must never style or report it as an installed effect.

Edges to broad domains express potential interactions. Actual invocation targets remain live facts. A heat source may potentially affect all matching thermal consumers; it does not currently heat every such object in the world.

## 4. Graph slices and completeness

Expose a shared `GraphReader` with `inspect`, `neighbors`, `traverse`, `explain_path`, and `impact` responsibilities through the tool service. These are methods, not mandatory separate services. Requests select a root/reference, direction, relation classes, and bounded scope. Server authority determines the world and permitted view.

Return a snapshot identity, authorized nodes/edges, source provenance, unresolved requirements, applied filters, completeness, and continuation. Suggested envelope:

```json
{
  "snapshot": { "worldId": "w1", "generation": "g4", "manifestRevision": 12, "graphRevision": 31 },
  "nodes": [],
  "edges": [],
  "coverage": { "scope": "authorized_projection", "status": "page", "reason": "edge_limit" },
  "nextCursor": "opaque-server-cursor",
  "unresolved": []
}
```

Completeness is relative to a named query and snapshot. A page may be complete for one node's permitted direct requirements without establishing complete behavioral interaction coverage. Separate `impactCoverage` on validation results identifies whether all mandatory relationships were considered. Do not infer missing mechanics from empty results when the adapter, permission, or index is unavailable.

Cursors bind the world generation, query/filter, source revisions, and authorization scope. Do not paginate across silently changing graphs. Immutable artifact neighborhoods can remain reusable when unrelated world state changes; live overlays use their own observation revision. On relevant changes, return a stale cursor and a restart path. Current grants are rechecked even for a pinned snapshot.

Do not leak the number or labels of hidden relationships. Where privileged validation needs evidence the recipient cannot read, the validator can inspect it under its own authority and return a permitted blocker or report; a human-facing graph must not claim world-complete coverage of a restricted view.

The full World Agent receives authorized **world-level** data, not a character's sight/knowledge filter. NPC tooling remains separately scoped. Graph access never exposes credentials, unrelated worlds, or ungranted real-user information.

## 5. Impact closure and cycles

Compute the affected set from the candidate diff, exact dependencies, reverse consumers, shared resource identities, event subscriptions, query-membership domains, governing rules, visual semantics, and relevant active references. Expand according to family-owned obligations. A new object can join a broad query without a direct reference from the querying system; a new subscriber can invalidate an earlier negative lookup.

Do not generate the full Cartesian product of all inventions. Group by an explicitly justified family/interface equivalence; keep exceptions whose actual contracts differ. Use visited node/edge identities and iterative worklists. A shortest explanatory path can be useful; enumerating every path is not a prerequisite for reachability or acceptance.

Distinguish cycle semantics. Recursive definition expansion and zero-time scheduling must be rejected or resolved by an expressly supported construct. Resource-conversion cycles need source/loss/quantity checks under the world premise. Temporal weather/heat feedback can be legitimate when it advances simulation time and respects aggregate limits. Collapse strongly connected components for visualization; do not erase their original edges or treat every cycle as invalid.

Large mandatory closures run as bounded resumable analysis jobs over a pinned snapshot. The planner may reuse a justified aggregate contract, obtain a larger admitted analysis allocation, or require a narrower candidate. Top-K semantic retrieval is never a substitute for an incomplete mandatory closure. Incomplete analysis cannot authorize activation.

## 6. Index maintenance and retention

Extract edges when source definitions/contracts/policies are admitted, revised, retired, or restored—not per frame or model turn. The same transaction should record source changes and enough projection invalidation to rebuild safely. Initially, small graph projections may be rebuilt synchronously outside the native tick; later use a durable dirty-source list only if measured rebuild cost warrants it.

Index outgoing and incoming references by scope/relation/source/target and source revision. Maintain separate domain-membership revisions for broad queries. Never precompute and store every transitive path. An index readiness watermark must match the source snapshot before using it as mandatory acceptance evidence; otherwise derive the missing portion from authority or return pending.

Partial rebuilds never replace the last complete generation as current. Projection swaps are atomic; source versions remain available for retained validation reports and saves. After restoration, reconstruct indexes under a new generation and reject old in-flight results. Retired definitions can remain referenced; garbage collection follows the existing save/release retention rules.

Caches are bounded by bytes and source/scope identity. Large visual layouts and optional summaries are evictable. Caching a complete public topology does not make its private evidence readable, and a same-name imported definition is not the same version.

## 7. Player visualization and agent navigation

Start with a focused read-only graph: selected invention in the center, expandable requirements/consumers, collapsed subsystem groups, a legend for enforced/derived/observed/hypothesized edges, and a detail panel showing the exact source. Supply an equivalent keyboard-accessible relationship list. Show draft-versus-active diff overlays and unresolved edges without suggesting the draft is live.

Use React Flow as a lazy-loaded presentation candidate, with a simple layered layout first. Keep layout in the browser and independent of authoritative IDs; use an asynchronous layout worker only when required. Dagre is a smaller starting option; ELK is a later option for compound ports and routing. The [tooling research](../archive/02-research/mcp-tooling-and-integration.md) records the primary-source comparison. No force layout should run forever during gameplay, and no full-world graph should be sent merely to draw a thumbnail.

Expanding a node queries the same service the agent uses. An agent cites node/edge/report IDs; the UI can highlight them. Loading limits are visibly paged, not misleadingly complete. A future port editor creates a draft change through its kind adapter; moving nodes only changes personal layout preferences.

## 8. Incremental proof

First expose existing recipe/material/base/module pins with honest extraction coverage. Next add enforced port/effect/resource summaries for one real composition, reverse impact checks, and a focused visualization. Then add world-authored obligations and shared-law change analysis. Live-instance overlays, extensive history, and cross-world comparison follow actual consumers.

A graph can initially be useful before it is sufficient to certify arbitrary composition. Tooling must report that distinction. The scenario packet's shelter, charge-creature, and invented-combustion journeys are the generality proofs; no special case for the word `combustibility` may be the reason the common graph works.
