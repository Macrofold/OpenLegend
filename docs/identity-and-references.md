# Identity and references

Identity and reference changes must preserve the reconstruction and compatibility constraints in the [save/load design](save-and-load.md).

This document owns the identity contract. [Agent agency runtime](../archive/07-technical-architecture/agent-agency-runtime.md#2-decision-envelope-and-translation) owns response shape and admission semantics; [Narration and conversations](narration-and-conversations.md) retains speech targets and audience behavior.

## Contract

Names, labels and descriptions are display prose. Entity, item instance, definition, recipe, event, memory, conversation, request and job relationships use the appropriate stable ID, scoped to their world or owning record. Renaming or duplicate names must not change relationships. Memory perspective uses event source IDs to identify self-authored speech; an unknown source must not be inferred from a matching name. IDs may be readable strings; their authority comes from an exact stored key, never text matching. Enumerated kinds, verbs and control roles are values, not entity identities.

The application allocates durable identities; generated prose cannot create or resolve them. Agency response-local aliases identify only objects proposed within that response; they are not stored IDs or authority. Client intentions and generated structured fields must supply IDs of the expected kind. Admission validates existence, permissions and current mechanical prerequisites. No name lookup, fuzzy resolution, role substitution or paid repair retry is allowed. New generated definitions use the existing validated declaration path and application-owned content identities.

## Actor context

Keep the narrative sections in English. Finish immediate response prompts with References containing the permitted entity IDs, permitted labels, self/trigger relationships and currently visible positions to distinguish duplicate names. Action IDs are explicitly scoped to that response. Unrecognized sources receive generic labels; historical awareness must not reveal their current location.

Generate the reference table and response binding together. Reserve required reference bytes before optional recall; recheck the full refreshed prompt before dispatch. Never silently remove required mappings to fit a budget. The provider schema and local parser constrain reference fields to the same permitted IDs. Domain admission independently checks current state. Component failures explain the invalid field or prerequisite; successful components may still commit.

## Control and projection

A saved world binding identifies the local controlled entity and the starting resident used by legacy optional-target interfaces. Resolve bindings by ID in constant time. Do not scan names or search for the player every frame. Keep the existing explicit player DTO, ID-keyed nearby entities and incremental public patches. Include the controlled ID in projection cache dependencies. Private NPC state remains outside the player projection.

The local host has one authenticated principal. Its history perspective follows the saved controlled entity binding. A future multi-user host must move control bindings to authenticated principal/world associations; it must not add a second role-derived entity ID or accept arbitrary client actor authority.

## Shared-world scaling integration

The [current-code audit](scaling/current-code-audit.md#sca01) identifies the remaining local-host assumptions: one profile, controlled actor, process session, presence policy and public snapshot. These are not a delivered multi-user authorization system. [SC01](maintainers/scaling.md#sc01) owns the focused control/privacy migration; [SC02](maintainers/scaling.md#sc02) owns recipient-specific view and replay integration under the synchronization owner.

Keep account identity, authenticated session, controller generation, world/timeline, entity identity, authority placement/generation, source incarnation and observer reference distinct. Moving an entity or authority must not rename it. Reusing an entity/source ID after restore must not make an old model or index result current. The production-data source contract, [SC04](maintainers/scaling.md#sc04) and [SC11](maintainers/scaling.md#sc11) own the corresponding durable checks; do not add a competing ID format here.

Bind the acting human at every command, history, preference, conversation, save and editor entry point. Cache and continuation identities must carry the applicable observer/disclosure scope, not only a world revision. Creator powers exclude human-private messages and private character notes under the [human-private contract](../archive/07-technical-architecture/data-queries-and-mcp.md#human-private-content-boundary). A copied Entity record with a few private fields deleted is not a safe default for newly added private components; use explicitly permitted projection contracts and verify every consumer.

Sequence/presence metadata also has a lifecycle. Expired session identities must be rejected before their anti-replay guards are reclaimed; neither unlimited process maps nor dropping watermarks without an expiry contract is sufficient. [SC03](maintainers/scaling.md#sc03) owns that admission/lifecycle work.

Qualification must include two independently authenticated humans with different knowledge of the same entity, duplicate names, controller revocation, multiple tabs, old timeline requests and a delayed source result after restore. Each client/model receives only its permitted references and content. Adding more sockets or including an actor ID in a payload does not close the gate. No such qualification is claimed by this documentation update.

### Massive-scale research: stage-specific work

[The foundation research](../archive/02-research/massive-scale/now/foundations.md) and [browser/scope research](../archive/02-research/massive-scale/domains/browser-networking.md) inform this integration. Task bodies live once in their owners; [G0–G4](scaling/sequence-and-gates.md) prevents later distribution from blocking early identity correctness.

| Stage | Specific work | Required result |
|---|---|---|
| NOW / G0 | SC01.1 request identity map, SC01.4 positive DTO contract, SC02.1 recipient keys, SC04.1 namespaces, SC11.1 source incarnations | New APIs and records do not embed local-player, machine identity or another observer's disclosure assumptions. |
| Before public shared P2 / G2 | SC01.2 authentication/roles, SC01.3 shared presence, SC02.2–SC02.4 join/replay, SC03.3 expiry, SF09/SF12 qualification | Independent humans and creator tools cannot cross control/privacy boundaries, including reconnect and restore. |
| LATER / G3 | [LT-R03 fencing](maintainers/scaling-long-term/regions.md#lt-r03), [LT-R04 transfer](maintainers/scaling-long-term/regions.md#lt-r04) | A former owner and delayed job cannot act after migration; stable character/source identity survives placement changes. |

The local adapter may remain simple while the G0 seam is established. Production auth is not required for every local feature, but must precede relaxing the local-host restrictions. Distributed identity does not itself authorize global shared-world control or access.

## Compatibility

New worlds seed people as `entity-0001` and `entity-0002`; other existing definition and entity IDs remain stable keys. Loading older worlds adds the control binding from controller metadata once. Existing bindings are authoritative. This does not rename entities or rewrite historical IDs, request fingerprints, response digests or provider audit data. Old diagnostic fields are read only for display.

Consequently an older save can still have a canonical entity ID literally spelled `player` or `ada`. Those strings are accepted only when present in its permitted ID set. Eliminating those spellings from every existing save remains a separate coordinated migration across domain state and durable database references; a partial JSON rewrite is not safe. Names such as Mike are never accepted merely because they match a label.

Interrupted paid jobs retain the existing stale-on-restart behavior and are never automatically resubmitted. New response requests use cognition contract version 6.
